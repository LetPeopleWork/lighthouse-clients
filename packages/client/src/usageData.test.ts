import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isAPersonAtTheTerminal,
  isDoNotTrackSet,
  planUsageDataStep,
  readUsageDataState,
  refinementDayVerdictOf,
  sizingMomentOf,
  type TerminalStreams,
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

describe("deciding, before any request, whether a person may be asked", () => {
  const A_FULL_TERMINAL: TerminalStreams = {
    stdinIsTTY: true,
    stdoutIsTTY: true,
    stderrIsTTY: true,
  };

  const firstPlanFor = (
    streams: TerminalStreams,
    env: Readonly<Record<string, string | undefined>>,
  ): UsageDataPlan =>
    planUsageDataStep(
      facts({
        doNotTrack: isDoNotTrackSet(env),
        mayPrompt: isAPersonAtTheTerminal(streams, env),
      }),
    );

  it.each<[string, TerminalStreams, Record<string, string>]>([
    [
      "no terminal at all",
      { stdinIsTTY: false, stdoutIsTTY: false, stderrIsTTY: false },
      {},
    ],
    [
      "stdin a terminal and nothing else",
      { stdinIsTTY: true, stdoutIsTTY: false, stderrIsTTY: false },
      {},
    ],
    ["stdout piped", { ...A_FULL_TERMINAL, stdoutIsTTY: false }, {}],
    ["stderr redirected", { ...A_FULL_TERMINAL, stderrIsTTY: false }, {}],
    ["stdin piped", { ...A_FULL_TERMINAL, stdinIsTTY: false }, {}],
    ["a full terminal under CI=true", A_FULL_TERMINAL, { CI: "true" }],
    ["a full terminal under CI=1", A_FULL_TERMINAL, { CI: "1" }],
    ["DO_NOT_TRACK=1", A_FULL_TERMINAL, { DO_NOT_TRACK: "1" }],
    ["DO_NOT_TRACK=true", A_FULL_TERMINAL, { DO_NOT_TRACK: "true" }],
    ["DO_NOT_TRACK=TRUE", A_FULL_TERMINAL, { DO_NOT_TRACK: "TRUE" }],
    ["DO_NOT_TRACK=yes", A_FULL_TERMINAL, { DO_NOT_TRACK: "yes" }],
  ])("stays silent, reading nothing, with %s", (_why, streams, env) => {
    expect(firstPlanFor(streams, env)).toEqual(NOTHING);
  });

  it.each<[string, Record<string, string>]>([
    ["nothing set", {}],
    ["CI empty", { CI: "" }],
    ["DO_NOT_TRACK=0", { DO_NOT_TRACK: "0" }],
    ["DO_NOT_TRACK=false", { DO_NOT_TRACK: "false" }],
    ["DO_NOT_TRACK=FALSE", { DO_NOT_TRACK: "FALSE" }],
    ["DO_NOT_TRACK empty", { DO_NOT_TRACK: "" }],
  ])("goes on to ask in a full terminal with %s", (_why, env) => {
    expect(firstPlanFor(A_FULL_TERMINAL, env)).toEqual({
      kind: "read-state",
      token: undefined,
    });
  });
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
    [
      "an MCP server it does not label",
      { source: "Mcp", state: aState({ acceptedSources: ["Browser", "Cli"] }) },
      NOTHING,
    ],
    ["a state that cannot be read", { state: "unavailable" }, NOTHING],
    [
      "a command that was refused or never reached it",
      { reached: false, state: aState() },
      NOTHING,
    ],
  ])("for an undecided Lighthouse with %s", (_why, given, plan) => {
    expect(planUsageDataStep(facts(given))).toEqual(plan);
  });

  it.each<[string, UsageDataState["acceptedSources"], UsageDataPlan]>([
    [
      "labels it",
      ["Browser", "Mcp"],
      {
        kind: "send",
        token: TOKEN,
        batch: { ...A_FORECAST_BATCH, source: "Mcp" },
        reconfirmed: true,
      },
    ],
    [
      "labels only the browser and the command line",
      ["Browser", "Cli"],
      NOTHING,
    ],
  ])(
    "for an MCP server's stale yes, when the Lighthouse %s",
    (_why, acceptedSources, plan) => {
      expect(
        planUsageDataStep(
          facts({
            source: "Mcp",
            stored: aStaleYes,
            state: aState({ decision: "Granted", acceptedSources }),
          }),
        ),
      ).toEqual(plan);
    },
  );
});

// The same cases the web's own vote casting is tested with, so a vote counts at the same moment from
// either side. The day is Lighthouse's answer, never this machine's clock.
describe("when a vote counts as cast, relative to the Team's Refinement", () => {
  it.each<[string | null, boolean, string]>([
    [null, false, "NoCadence"],
    [null, true, "NoCadence"],
    ["2026-10-08", true, "OnRefinementDay"],
    ["2026-10-08", false, "OnOtherDay"],
  ])(
    "with next Refinement %s and Refinement day %s, it is %s",
    (nextRefinementDate, isRefinementDay, moment) => {
      expect(sizingMomentOf({ nextRefinementDate, isRefinementDay })).toBe(
        moment,
      );
    },
  );
});

// The same cases the web's Refinement tab reports its verdict by: only a Refinement day with Work Items listed
// counts, and a Refinement that shows no number counts as None. The day is Lighthouse's answer.
describe("which verdict a Refinement day showed", () => {
  it.each<
    [string, boolean, number, "Below" | "In" | "Above" | null, string | null]
  >([
    ["a Refinement day showing Below", true, 3, "Below", "Below"],
    ["a Refinement day showing In", true, 3, "In", "In"],
    ["a Refinement day showing Above", true, 1, "Above", "Above"],
    ["a Refinement day showing no number", true, 3, null, "None"],
    ["another day", false, 3, "Below", null],
    ["a Refinement day with no Work Item listed", true, 0, "Below", null],
  ])("on %s", (_day, isRefinementDay, workItemsListed, verdict, reported) => {
    expect(
      refinementDayVerdictOf({ isRefinementDay, workItemsListed, verdict }),
    ).toBe(reported);
  });
});
