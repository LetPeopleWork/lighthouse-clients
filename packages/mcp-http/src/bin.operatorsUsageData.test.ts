import type {
  UsageDataBatch,
  UsageDataLighthouse,
} from "@letpeoplework/lighthouse-client";
import { describe, expect, it, vi } from "vitest";
import { operatorsUsageDataPort } from "./bin";

const aMoment = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** A Lighthouse that labels the MCP source and takes a while to mint each grant. */
const aSlowGrantingLighthouse = () => {
  const handedIn: { batch: UsageDataBatch; token: string }[] = [];
  let grants = 0;
  const lighthouse: UsageDataLighthouse = {
    getUsageDataState: async () => ({
      ok: true,
      value: {
        decision: null,
        mayAsk: false,
        administratorDisabled: false,
        acceptedSources: ["Browser", "Cli", "Mcp"],
      },
    }),
    grantUsageData: async () => {
      grants += 1;
      const token = `token-${grants}`;
      await aMoment(50);
      return { ok: true, value: token };
    },
    revokeUsageData: async () => ({ ok: true, value: undefined }),
    handInUsageData: async (batch, { token }) => {
      handedIn.push({ batch, token });
      return { ok: true, value: undefined };
    },
  };
  return { lighthouse, grants: () => grants, handedIn: () => [...handedIn] };
};

describe("operatorsUsageDataPort", () => {
  it("requests one grant for three steps arriving at once, and asks nobody", async () => {
    const lighthouse = aSlowGrantingLighthouse();
    const ask = vi.fn(async () => "yes" as const);
    const port = operatorsUsageDataPort({
      lighthouse: lighthouse.lighthouse,
      env: {},
      now: () => new Date(),
    });

    await Promise.all(
      (
        [
          "TeamRefreshTriggered",
          "PortfolioRefreshTriggered",
          "TeamManualForecastRun",
        ] as const
      ).map((name) => port({ reached: true, occurrences: [{ name }], ask })),
    );

    await vi.waitFor(() => expect(lighthouse.handedIn()).toHaveLength(3));
    expect(lighthouse.grants()).toBe(1);
    expect(lighthouse.handedIn().map(({ token }) => token)).toEqual([
      "token-1",
      "token-1",
      "token-1",
    ]);
    expect(ask).not.toHaveBeenCalled();
  });

  it.each<[string, number, number]>([
    ["a minute short of an hour", 59, 1],
    ["a full hour", 60, 2],
  ])(
    "after a refusal, reads the state again only once %s has passed",
    async (_after, minutesLater, readsExpected) => {
      let reads = 0;
      const vetoed: UsageDataLighthouse = {
        getUsageDataState: async () => {
          reads += 1;
          return {
            ok: true,
            value: {
              decision: null,
              mayAsk: true,
              administratorDisabled: true,
              acceptedSources: ["Browser", "Cli", "Mcp"],
            },
          };
        },
        grantUsageData: async () => ({ ok: true, value: "never-minted" }),
        revokeUsageData: async () => ({ ok: true, value: undefined }),
        handInUsageData: async () => ({ ok: true, value: undefined }),
      };
      let clock = new Date("2026-10-08T09:00:00Z");
      const port = operatorsUsageDataPort({
        lighthouse: vetoed,
        env: {},
        now: () => clock,
      });
      const aRefresh = {
        reached: true,
        occurrences: [{ name: "TeamRefreshTriggered" }],
      } as const;

      await port(aRefresh);
      // The port returns before its attempt settles; the next call must find the refusal already settled.
      await aMoment(20);
      clock = new Date(clock.getTime() + minutesLater * 60_000);
      await port(aRefresh);
      await aMoment(20);

      expect(reads).toBe(readsExpected);
    },
  );
});

describe("operatorsUsageDataPort, over days", () => {
  /** A Lighthouse that labels the MCP source and knows the grants listed in `knows`. */
  const aLighthouseKnowing = (knows: (token: string) => boolean) => {
    const asked: string[] = [];
    let grants = 0;
    const lighthouse: UsageDataLighthouse = {
      getUsageDataState: async (options) => {
        asked.push(`state ${options?.token ?? "-"}`);
        const known = options?.token !== undefined && knows(options.token);
        return {
          ok: true,
          value: {
            decision: known ? "Granted" : null,
            mayAsk: false,
            administratorDisabled: false,
            acceptedSources: ["Browser", "Cli", "Mcp"],
          },
        };
      },
      grantUsageData: async () => {
        grants += 1;
        asked.push(`grant token-${grants}`);
        return { ok: true, value: `token-${grants}` };
      },
      revokeUsageData: async ({ token }) => {
        asked.push(`revoke ${token}`);
        return { ok: true, value: undefined };
      },
      handInUsageData: async (_batch, { token }) => {
        asked.push(`events ${token}`);
        return { ok: true, value: undefined };
      },
    };
    return { lighthouse, asked };
  };

  const aRefresh = {
    reached: true,
    occurrences: [{ name: "TeamRefreshTriggered" }],
  } as const;

  const HOUR = 60 * 60 * 1000;

  const aPortAt = (lighthouse: UsageDataLighthouse) => {
    let clock = new Date("2026-10-08T09:00:00Z");
    const port = operatorsUsageDataPort({
      lighthouse,
      env: {},
      now: () => clock,
    });
    return {
      callAfter: async (hours: number) => {
        clock = new Date(clock.getTime() + hours * HOUR);
        await port(aRefresh);
        await aMoment(20);
      },
    };
  };

  it("confirms a day-old grant with Lighthouse once, then sends without reading the state again", async () => {
    const { lighthouse, asked } = aLighthouseKnowing(() => true);
    const port = aPortAt(lighthouse);

    await port.callAfter(0);
    await port.callAfter(25);
    await port.callAfter(1);

    expect(asked).toEqual([
      "state -",
      "grant token-1",
      "events token-1",
      "state token-1",
      "events token-1",
      "events token-1",
    ]);
  });

  it("grants again when Lighthouse has forgotten the grant, and sends under the new one", async () => {
    const { lighthouse, asked } = aLighthouseKnowing(
      (token) => token !== "token-1",
    );
    const port = aPortAt(lighthouse);

    await port.callAfter(0);
    await port.callAfter(25);

    expect(asked).toEqual([
      "state -",
      "grant token-1",
      "events token-1",
      "state token-1",
      "grant token-2",
      "events token-2",
    ]);
  });

  it.each<
    [
      string,
      {
        reached: boolean;
        occurrences: readonly [] | readonly [{ name: "TeamRefreshTriggered" }];
      },
    ]
  >([
    [
      "a call that did not reach Lighthouse",
      { reached: false, occurrences: [{ name: "TeamRefreshTriggered" }] },
    ],
    ["a call that counted nothing", { reached: true, occurrences: [] }],
  ])("asks Lighthouse nothing for %s", async (_what, step) => {
    const { lighthouse, asked } = aLighthouseKnowing(() => true);
    const port = operatorsUsageDataPort({
      lighthouse,
      env: {},
      now: () => new Date(),
    });

    await port(step);
    await aMoment(20);

    expect(asked).toEqual([]);
  });
});
