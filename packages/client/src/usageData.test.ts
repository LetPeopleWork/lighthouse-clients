import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isDoNotTrackSet,
  planUsageDataStep,
  readUsageDataState,
  type UsageDataPlan,
  type UsageDataState,
  type UsageDataStepFacts,
} from "./usageData";

const NOW = new Date("2026-10-08T09:00:00Z");
const HOUR = 60 * 60 * 1000;
const TOKEN = "lenas-token";

const anHourAgo = new Date(NOW.getTime() - HOUR).toISOString();
const twoDaysAgo = new Date(NOW.getTime() - 48 * HOUR).toISOString();

const aState = (overrides: Partial<UsageDataState> = {}): UsageDataState => ({
  decision: null,
  mayAsk: true,
  administratorDisabled: false,
  acceptedSources: ["Browser", "Cli", "Mcp"],
  ...overrides,
});

const facts = (
  overrides: Partial<UsageDataStepFacts> = {},
): UsageDataStepFacts => ({
  doNotTrack: false,
  stored: undefined,
  state: "unread",
  source: "Cli",
  mayPrompt: true,
  reached: true,
  occurrences: [{ name: "TeamManualForecastRun" }],
  now: NOW,
  ...overrides,
});

const A_FORECAST_BATCH = {
  source: "Cli",
  events: [{ name: "TeamManualForecastRun", offsetMs: 0, sequence: 0 }],
} as const;

const NOTHING: UsageDataPlan = { kind: "nothing" };

describe("reading DO_NOT_TRACK", () => {
  it.each(["1", "true", "TRUE", "yes", " 1 "])(
    "honours DO_NOT_TRACK=%j",
    (value) => {
      expect(isDoNotTrackSet({ DO_NOT_TRACK: value })).toBe(true);
    },
  );

  it.each([undefined, "", " ", "0", "false", "FALSE"])(
    "does not take DO_NOT_TRACK=%j as a request to stop",
    (value) => {
      expect(isDoNotTrackSet({ DO_NOT_TRACK: value })).toBe(false);
    },
  );
});

describe("reading Lighthouse's usage data state", () => {
  it("reads the exact state the backend serves after a grant", () => {
    const served: unknown = JSON.parse(
      readFileSync(
        new URL(
          "../../../test-support/usageDataContract/state-a-client-reads-after-its-grant.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );

    expect(readUsageDataState(served)).toEqual({
      decision: "Granted",
      mayAsk: false,
      administratorDisabled: false,
      acceptedSources: ["Browser", "Cli", "Mcp"],
    });
  });

  it("reads a server that predates labelled sources as labelling none", () => {
    expect(
      readUsageDataState({
        sending: false,
        decision: null,
        mayAsk: true,
        administratorDisabled: false,
      })?.acceptedSources,
    ).toBeNull();
  });

  it.each([
    null,
    "Granted",
    [],
    { mayAsk: "yes", administratorDisabled: false },
  ])("refuses %j as a state", (json) => {
    expect(readUsageDataState(json)).toBeNull();
  });
});

describe("planning a usage data step", () => {
  const aFreshYes = {
    answer: "yes",
    token: TOKEN,
    confirmedAt: anHourAgo,
  } as const;
  const aStaleYes = {
    answer: "yes",
    token: TOKEN,
    confirmedAt: twoDaysAgo,
  } as const;

  it.each<[string, Partial<UsageDataStepFacts>]>([
    ["DO_NOT_TRACK overrides a yes", { doNotTrack: true, stored: aFreshYes }],
    [
      "DO_NOT_TRACK overrides a question",
      { doNotTrack: true, state: aState() },
    ],
    [
      "a command that did not reach Lighthouse",
      { reached: false, stored: aFreshYes },
    ],
    ["an unreadable store", { stored: "unreadable", state: aState() }],
    ["a kept No", { stored: { answer: "no", decidedAt: anHourAgo } }],
    ["a yes and nothing to report", { stored: aFreshYes, occurrences: [] }],
  ])("does nothing for %s", (_why, given) => {
    expect(planUsageDataStep(facts(given))).toEqual(NOTHING);
  });

  it("sends a fresh yes's events without reading the state", () => {
    expect(planUsageDataStep(facts({ stored: aFreshYes }))).toEqual({
      kind: "send",
      token: TOKEN,
      batch: A_FORECAST_BATCH,
      reconfirmed: false,
    });
  });

  it.each([twoDaysAgo, "not a date"])(
    "reads the state with the token first when the yes was confirmed at %j",
    (confirmedAt) => {
      expect(
        planUsageDataStep(
          facts({ stored: { answer: "yes", token: TOKEN, confirmedAt } }),
        ),
      ).toEqual({ kind: "read-state", token: TOKEN });
    },
  );

  it("sends and keeps the yes as confirmed when Lighthouse still knows the grant", () => {
    expect(
      planUsageDataStep(
        facts({ stored: aStaleYes, state: aState({ decision: "Granted" }) }),
      ),
    ).toEqual({
      kind: "send",
      token: TOKEN,
      batch: A_FORECAST_BATCH,
      reconfirmed: true,
    });
  });

  it("grants again, without asking, when Lighthouse has forgotten the grant", () => {
    expect(
      planUsageDataStep(facts({ stored: aStaleYes, state: aState() })),
    ).toEqual({
      kind: "re-grant-then-send",
      formerToken: TOKEN,
      batch: A_FORECAST_BATCH,
    });
  });

  it.each<[string, UsageDataStepFacts["state"]]>([
    ["cannot be read", "unavailable"],
    ["labels no sources", aState({ acceptedSources: null })],
    [
      "does not label the command line",
      aState({ acceptedSources: ["Browser", "Mcp"] }),
    ],
    [
      "was stopped by its administrator",
      aState({ decision: "Granted", administratorDisabled: true }),
    ],
  ])("sends nothing for a stale yes when the Lighthouse %s", (_why, state) => {
    expect(planUsageDataStep(facts({ stored: aStaleYes, state }))).toEqual(
      NOTHING,
    );
  });

  it.each<[string, Partial<UsageDataStepFacts>, UsageDataPlan]>([
    ["nobody to ask", { mayPrompt: false }, NOTHING],
    [
      "nobody to ask, whatever the state",
      { mayPrompt: false, state: aState() },
      NOTHING,
    ],
    ["a person and no state yet", {}, { kind: "read-state", token: undefined }],
    ["a person and a state that may ask", { state: aState() }, { kind: "ask" }],
    ["a young install", { state: aState({ mayAsk: false }) }, NOTHING],
    [
      "an administrator's stop",
      { state: aState({ administratorDisabled: true }) },
      NOTHING,
    ],
    [
      "a server that labels no sources",
      { state: aState({ acceptedSources: null }) },
      NOTHING,
    ],
    [
      "a server that does not label this source",
      { state: aState({ acceptedSources: ["Browser", "Mcp"] }) },
      NOTHING,
    ],
    [
      "an MCP server it labels",
      { source: "Mcp", state: aState({ acceptedSources: ["Browser", "Mcp"] }) },
      { kind: "ask" },
    ],
    ["a state that cannot be read", { state: "unavailable" }, NOTHING],
  ])("for an undecided Lighthouse with %s", (_why, given, plan) => {
    expect(planUsageDataStep(facts(given))).toEqual(plan);
  });
});
