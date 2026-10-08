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
});
