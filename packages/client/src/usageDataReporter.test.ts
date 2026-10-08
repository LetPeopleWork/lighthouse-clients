import { describe, expect, it } from "vitest";
import {
  type ConnectivityFetchResponse,
  createLighthouseClient,
} from "./index";
import type { StoredUsageDataAnswer } from "./usageData";
import {
  settleUsageDataStep,
  type UsageDataOutcome,
  type UsageDataStep,
} from "./usageDataReporter";
import type {
  LighthouseUsageDataStore,
  UsageDataStoreReading,
} from "./usageDataStore";

const NOW = new Date("2026-10-08T09:00:00Z");
const HOUR = 60 * 60 * 1000;
const KEPT_TOKEN = "kept-token-5c1e";
const MINTED_TOKEN = "minted-token-9a7b";
const EVERY_OUTCOME: readonly UsageDataOutcome[] = [
  "nothing",
  "sent",
  "kept-yes",
  "kept-no",
  "unanswered",
  "not-recorded",
];

type UsageDataRoute = "state" | "consent" | "events";

type SeenRequest = {
  readonly route: UsageDataRoute;
  readonly token: string | undefined;
  readonly body: unknown;
};

type LighthouseBehaviour = {
  /** The state Lighthouse answers for the token it is shown. */
  readonly stateFor?: (token: string | undefined) => unknown;
  /** Takes usage data requests and never answers them, as a hung server does. */
  readonly neverAnswers?: boolean;
};

const reply = (status: number, body?: unknown): ConnectivityFetchResponse => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (body === undefined ? "" : JSON.stringify(body)),
  json: async () => body,
});

const aStateRecognising = (knownToken: string) => (token: string | undefined) =>
  ({
    decision: token === knownToken ? "Granted" : null,
    mayAsk: token !== knownToken,
    administratorDisabled: false,
    acceptedSources: ["Browser", "Cli", "Mcp"],
  }) as const;

const routeOf = (url: string): UsageDataRoute | null => {
  const match = /\/usagedata\/(state|consent|events)$/u.exec(url);
  return match === null ? null : (match[1] as UsageDataRoute);
};

const tokenOf = (init: RequestInit | undefined): string | undefined =>
  (init?.headers as Record<string, string> | undefined)?.[
    "X-Lighthouse-UsageData-Token"
  ];

const hangUntilAborted = (signal: AbortSignal | null | undefined) =>
  new Promise<ConnectivityFetchResponse>((_, reject) => {
    signal?.addEventListener("abort", () => reject(signal.reason));
  });

const aLighthouse = (behaviour: LighthouseBehaviour = {}) => {
  const seen: SeenRequest[] = [];
  const fetch = async (
    url: string,
    init?: RequestInit,
  ): Promise<ConnectivityFetchResponse> => {
    const route = routeOf(url);
    if (route === null) {
      return { ok: true, status: 200, text: async () => "26.10.8" };
    }
    const body =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    seen.push({ route, token: tokenOf(init), body });
    if (behaviour.neverAnswers === true) {
      return hangUntilAborted(init?.signal);
    }
    switch (route) {
      case "state":
        return reply(
          200,
          (behaviour.stateFor ?? aStateRecognising(KEPT_TOKEN))(tokenOf(init)),
        );
      case "consent":
        return reply(200, { token: MINTED_TOKEN });
      default:
        return reply(204);
    }
  };
  return {
    seen,
    client: createLighthouseClient(
      { connection: { kind: "explicit", lighthouseUrl: "https://lh.example" } },
      { fetch },
    ),
  };
};

const aStore = (kept: StoredUsageDataAnswer | undefined) => {
  let answer: UsageDataStoreReading = kept;
  const store: LighthouseUsageDataStore = {
    read: async () => answer,
    answer: async (given) => {
      if (answer !== undefined) {
        return false;
      }
      answer = given;
      return true;
    },
    replace: async (given) => {
      answer = given;
    },
    renew: async (token, given) => {
      if (answer === "unreadable" || answer?.answer !== "yes") {
        return false;
      }
      if (answer.token !== token) {
        return false;
      }
      answer = given;
      return true;
    },
  };
  return { store, kept: () => answer };
};

const aYesConfirmed = (agoMs: number): StoredUsageDataAnswer => ({
  answer: "yes",
  token: KEPT_TOKEN,
  confirmedAt: new Date(NOW.getTime() - agoMs).toISOString(),
});

const aForecastRun: UsageDataStep = {
  reached: true,
  occurrences: [{ name: "TeamManualForecastRun" }],
};

const settle = (
  lighthouse: ReturnType<typeof aLighthouse>,
  store: LighthouseUsageDataStore,
  step: UsageDataStep = aForecastRun,
) =>
  settleUsageDataStep(
    {
      lighthouse: lighthouse.client,
      store,
      source: "Cli",
      env: {},
      now: () => NOW,
    },
    step,
  );

describe("settling usage data against a Lighthouse that never answers", () => {
  it.each([
    ["a fresh yes, straight to sending", 1 * HOUR],
    ["a day-old yes, through the state read", 25 * HOUR],
  ])("ends within a second with %s", async (_, agoMs) => {
    const lighthouse = aLighthouse({ neverAnswers: true });
    const { store, kept } = aStore(aYesConfirmed(agoMs));
    const started = performance.now();

    const outcome = await settle(lighthouse, store);

    expect(performance.now() - started).toBeLessThan(1_500);
    expect(outcome).toBe("nothing");
    expect(lighthouse.seen).toHaveLength(1);
    expect(kept()).toEqual(aYesConfirmed(agoMs));
  });
});

describe("a grant Lighthouse no longer recognises", () => {
  it("is granted again, kept under the new token as confirmed now, and the events go with it", async () => {
    const lighthouse = aLighthouse({
      stateFor: aStateRecognising(MINTED_TOKEN),
    });
    const { store, kept } = aStore(aYesConfirmed(31 * 24 * HOUR));

    const outcome = await settle(lighthouse, store);

    expect(outcome).toBe("sent");
    expect(lighthouse.seen).toEqual([
      { route: "state", token: KEPT_TOKEN, body: undefined },
      { route: "consent", token: undefined, body: { decision: "granted" } },
      {
        route: "events",
        token: MINTED_TOKEN,
        body: {
          source: "Cli",
          events: [{ name: "TeamManualForecastRun", offsetMs: 0, sequence: 0 }],
        },
      },
    ]);
    expect(kept()).toEqual({
      answer: "yes",
      token: MINTED_TOKEN,
      confirmedAt: NOW.toISOString(),
    });
  });
});

describe("an outcome never carries the consent token", () => {
  it.each<
    [string, StoredUsageDataAnswer | undefined, UsageDataStep, UsageDataOutcome]
  >([
    ["a fresh yes sends", aYesConfirmed(1 * HOUR), aForecastRun, "sent"],
    ["a day-old yes sends", aYesConfirmed(25 * HOUR), aForecastRun, "sent"],
    [
      "a lapsed yes is renewed and sends",
      { answer: "yes", token: "lapsed-token", confirmedAt: "2026-08-01" },
      aForecastRun,
      "sent",
    ],
    [
      "a first yes is kept",
      undefined,
      { ...aForecastRun, ask: async () => "yes" },
      "kept-yes",
    ],
  ])("%s", async (_, stored, step, expected) => {
    const lighthouse = aLighthouse();
    const { store } = aStore(stored);

    const outcome = await settle(lighthouse, store, step);

    expect(outcome).toBe(expected);
    expect(EVERY_OUTCOME).toContain(outcome);
    for (const token of [KEPT_TOKEN, MINTED_TOKEN, "lapsed-token"]) {
      expect(JSON.stringify(outcome)).not.toContain(token);
    }
  });
});
