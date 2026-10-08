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
