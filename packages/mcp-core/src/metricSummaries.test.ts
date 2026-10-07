import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  gravity,
  oceanExplorer,
  ok,
  refused,
} from "../../../test-support/lighthouseAnswers";
import {
  blockedHistory,
  gravitysMetrics,
  oceanExplorersMetrics,
} from "../../../test-support/metricsAnswers";
import {
  anAssistantOn,
  answerOf,
  factsBlockOf,
  summaryBlockOf,
} from "../test-support/mcpHarness";

// Story 6218, slice 03: the per-metric tools add the sentence lh prints above that metric's table. A list
// answer keeps its facts block byte for byte and gains a second block `summary: …`; an object answer gains a
// `summary` field (ADR-224).

const gravitysRange = { id: 3, startDate: "2026-09-07", endDate: "2026-10-06" };
const oceanExplorersRange = {
  id: 2,
  startDate: "2026-07-09",
  endDate: "2026-10-06",
};

const gravitysAssistant = (reads = {}) =>
  anAssistantOn({
    getTeam: ok(gravity()),
    getPortfolio: ok(oceanExplorer()),
    ...gravitysMetrics(),
    ...oceanExplorersMetrics(),
    ...reads,
  });

const answered = (read: string): unknown =>
  (
    ({ ...gravitysMetrics(), ...oceanExplorersMetrics() })[read] as {
      value: unknown;
    }
  ).value;

describe("the per-metric tools' summary, on a list answer", () => {
  // @driving_port @US-03 @contract-shape:bounded-change
  it.each([
    {
      tool: "lighthouse_team_metrics_cycleTimePercentiles",
      read: "getTeamCycleTimePercentiles",
      label: "team cycleTimePercentiles: ",
      says: "Cycle Time Percentiles: 50th 5 days · 70th 8 days · 85th 12 days · 95th 21 days",
    },
    {
      tool: "lighthouse_team_metrics_workItemAgePercentiles",
      read: "getTeamWorkItemAgePercentiles",
      label: "team workItemAgePercentiles: ",
      says: "Work Item Age Percentiles: 50th 3 days · 70th 6 days · 85th 11 days · 95th 18 days",
    },
    {
      tool: "lighthouse_team_metrics_blockedCountHistory",
      read: "getTeamBlockedCountHistory",
      label: "team blockedCountHistory: ",
      says: "Blocked Work Items: 1 on Mon 7 Sep → 2 on Tue 6 Oct",
    },
    {
      tool: "lighthouse_team_metrics_percentilesOverTime",
      read: "getTeamPercentilesOverTime",
      label: "team percentilesOverTime: ",
      says: "per recorded day",
    },
    {
      tool: "lighthouse_team_metrics_processBehaviorOverTime",
      read: "getTeamProcessBehaviorOverTime",
      label: "team processBehaviorOverTime: ",
      says: "Throughput natural process limits per recorded day",
    },
  ])(
    "keeps $tool's facts as they are and adds '$says' in a second block",
    async ({ tool, read, label, says }) => {
      const assistant = gravitysAssistant();

      const result = await assistant.call(tool, gravitysRange);

      expect(result.isError).toBe(false);
      expect(factsBlockOf(result)).toBe(
        `${label}${encode(answered(read) as never)}`,
      );
      const summary = summaryBlockOf(result) ?? "";
      expect(summary.startsWith("summary: ")).toBe(true);
      expect(summary).toContain(says);
    },
  );

  // @error @US-03 — AC-03.2 on the MCP side
  it("says nothing is recorded yet, in the web's words, for an empty percentile history", async () => {
    const assistant = gravitysAssistant({
      getTeamPercentilesOverTime: ok([]),
    });

    const result = await assistant.call(
      "lighthouse_team_metrics_percentilesOverTime",
      gravitysRange,
    );

    expect(factsBlockOf(result)).toBe("team percentilesOverTime: []");
    expect(summaryBlockOf(result)).toContain(
      "Nothing to show for the selected range. Days appear here as Lighthouse records them.",
    );
  });
});

describe("the per-metric tools' summary, on an object answer", () => {
  // @driving_port @US-03 @contract-shape:bounded-change
  it.each([
    {
      tool: "lighthouse_team_metrics_throughput",
      read: "getTeamThroughput",
      label: "team throughput: ",
      range: gravitysRange,
      says: "Total Throughput: 31 Work Items, 1.0 / day",
    },
    {
      tool: "lighthouse_portfolio_metrics_throughput",
      read: "getPortfolioThroughput",
      label: "portfolio throughput: ",
      range: oceanExplorersRange,
      says: "Total Throughput: 7 Features, 0.1 / day",
    },
    {
      tool: "lighthouse_team_metrics_totalWorkItemAge",
      read: "getTeamTotalWorkItemAgeOverTime",
      label: "team totalWorkItemAge: ",
      range: gravitysRange,
      says: "Total Work Item Age: 84 days across 9 Work Items on Tue 6 Oct 2026",
    },
  ])(
    "hands $tool's facts over with a summary that says '$says'",
    async ({ tool, read, label, range, says }) => {
      const assistant = gravitysAssistant();

      const result = await assistant.call(tool, range);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      const { summary, ...facts } = answerOf(result, label);
      expect(facts).toEqual(answered(read));
      expect(String(summary)).toContain(says);
    },
  );
});

describe("the per-metric tools' summary, as lh heads it", () => {
  it("states a Work Item Age answer under the as-of heading with its percentiles", async () => {
    const result = await gravitysAssistant().call(
      "lighthouse_team_metrics_workItemAge",
      gravitysRange,
    );

    const { summary, ...facts } = answerOf(result, "team workItemAge: ");
    expect(facts).toEqual(answered("getTeamWorkItemAgeOverTime"));
    expect(summary).toBe(
      "Gravity · as of Tue 6 Oct 2026\nWork Item Age Percentiles: 50th 3 days · 70th 6 days · 85th 11 days · 95th 18 days",
    );
  });

  it("states a Work Item Age answer without a summary when its percentiles cannot be read", async () => {
    const result = await gravitysAssistant({
      getTeamWorkItemAgePercentiles: refused("unexpected", "down"),
    }).call("lighthouse_team_metrics_workItemAge", gravitysRange);

    expect(result.content).toEqual([
      {
        type: "text",
        text: `team workItemAge: ${encode(answered("getTeamWorkItemAgeOverTime") as never)}`,
      },
    ]);
  });

  it("states a Portfolio's history under the Portfolio's heading, in Features", async () => {
    const result = await gravitysAssistant().call(
      "lighthouse_portfolio_metrics_blockedCountHistory",
      oceanExplorersRange,
    );

    expect(factsBlockOf(result)).toBe(
      `portfolio blockedCountHistory: ${encode(answered("getPortfolioBlockedCountHistory") as never)}`,
    );
    expect(summaryBlockOf(result)).toBe(
      `summary: ${oceanExplorer().name} · Thu 9 Jul 2026 – Tue 6 Oct 2026 (90 days)\nBlocked Features: 1 on Mon 7 Sep → 2 on Tue 6 Oct`,
    );
  });

  it("names the cycle time definition it was asked for", async () => {
    const result = await gravitysAssistant({
      getTeamSettings: ok({
        cycleTimeDefinitions: [{ id: 4, name: "Lead Time" }],
      }),
    }).call("lighthouse_team_metrics_cycleTimePercentiles", {
      ...gravitysRange,
      definitionId: 4,
    });

    expect(summaryBlockOf(result)).toContain(
      "Lead Time Percentiles: 50th 5 days",
    );
  });

  it("states no other family's percentiles as Cycle Time", async () => {
    const result = await gravitysAssistant().call(
      "lighthouse_team_metrics_percentilesOverTime",
      { ...gravitysRange, metricType: "WorkItemAge" },
    );

    expect(summaryBlockOf(result)).toBeNull();
  });
});

describe("the per-metric tools without a summary", () => {
  // @error @version-skew @US-03 — ADR-224 rule 3
  it("adds no summary to a percentile history it does not recognise", async () => {
    const recognised = await gravitysAssistant().call(
      "lighthouse_team_metrics_blockedCountHistory",
      gravitysRange,
    );
    expect(summaryBlockOf(recognised)).not.toBeNull();
    const reshaped = blockedHistory().map(({ recordedAt, blockedCount }) => ({
      day: recordedAt,
      count: blockedCount,
    }));
    const assistant = gravitysAssistant({
      getTeamBlockedCountHistory: ok(reshaped),
    });

    const result = await assistant.call(
      "lighthouse_team_metrics_blockedCountHistory",
      gravitysRange,
    );

    expect(result.content).toEqual([
      {
        type: "text",
        text: `team blockedCountHistory: ${encode(reshaped)}`,
      },
    ]);
  });

  // @error @US-03 — guard, green today: a refusal stays today's error, with no summary
  it("passes a refused metric straight through", async () => {
    const assistant = gravitysAssistant({
      getTeamCycleTimePercentiles: refused("not-found", "Team 3 not found"),
    });

    const result = await assistant.call(
      "lighthouse_team_metrics_cycleTimePercentiles",
      gravitysRange,
    );

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "team metrics: not-found (Team 3 not found)" },
    ]);
  });
});
