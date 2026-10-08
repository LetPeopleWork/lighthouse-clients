import { describe, expect, it, vi } from "vitest";
import {
  aChart,
  gravitysSleRisk,
  totalAgeWithALargeChange,
} from "../../../test-support/dailyFlowAnswers";
import {
  gravity,
  oceanExplorer,
  ok,
  refused,
} from "../../../test-support/lighthouseAnswers";
import {
  gravitysMetrics,
  oceanExplorersMetrics,
  percentilesHistory,
} from "../../../test-support/metricsAnswers";
import {
  anAssistantOn,
  answerOf,
  factsBlockOf,
  summaryBlockOf,
  type ToolResult,
} from "../test-support/mcpHarness";

const GRAVITYS_RANGE = {
  id: 3,
  startDate: "2026-09-07",
  endDate: "2026-10-06",
};
const OCEAN_EXPLORERS_RANGE = {
  id: 2,
  startDate: "2026-07-09",
  endDate: "2026-10-06",
};
const GRAVITYS_HEADING = "Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)";
const OCEAN_EXPLORERS_HEADING =
  "Ocean Explorer · Thu 9 Jul 2026 – Tue 6 Oct 2026 (90 days)";
const AGE_PERCENTILES =
  "Work Item Age Percentiles: 50th 3 days · 70th 6 days · 85th 11 days · 95th 18 days";

const anAssistant = (reads = {}) =>
  anAssistantOn({
    getTeam: ok(gravity()),
    getPortfolio: ok(oceanExplorer()),
    ...gravitysMetrics(),
    ...oceanExplorersMetrics(),
    ...reads,
  });

// A list answer carries its summary in a second block, an object answer in a `summary` field.
const summaryOf = (result: ToolResult, label: string): unknown => {
  const block = summaryBlockOf(result);
  if (block !== null) {
    return block.replace(/^summary: /u, "");
  }
  return answerOf(result, label).summary;
};

describe("every per-metric tool, under its own label and its owner's heading", () => {
  it.each([
    {
      tool: "lighthouse_team_metrics_throughput",
      label: "team throughput: ",
      summary: `${GRAVITYS_HEADING}\nTotal Throughput: 31 Work Items, 1.0 / day`,
    },
    {
      tool: "lighthouse_team_metrics_cycleTimePercentiles",
      label: "team cycleTimePercentiles: ",
      summary: `${GRAVITYS_HEADING}\nCycle Time Percentiles: 50th 5 days · 70th 8 days · 85th 12 days · 95th 21 days`,
    },
    {
      tool: "lighthouse_team_metrics_workItemAgePercentiles",
      label: "team workItemAgePercentiles: ",
      summary: `Gravity · as of Tue 6 Oct 2026\n${AGE_PERCENTILES}`,
    },
    {
      tool: "lighthouse_team_metrics_blockedCountHistory",
      label: "team blockedCountHistory: ",
      summary: `${GRAVITYS_HEADING}\nBlocked Work Items: 1 on Mon 7 Sep → 2 on Tue 6 Oct`,
    },
    {
      tool: "lighthouse_team_metrics_percentilesOverTime",
      label: "team percentilesOverTime: ",
      summary: `${GRAVITYS_HEADING}\nCycle Time per recorded day`,
    },
    {
      tool: "lighthouse_team_metrics_processBehaviorOverTime",
      label: "team processBehaviorOverTime: ",
      summary: `${GRAVITYS_HEADING}\nThroughput natural process limits per recorded day`,
    },
    {
      tool: "lighthouse_team_metrics_cumulativeStateTime",
      label: "team cumulativeStateTime: ",
      summary: `${GRAVITYS_HEADING}\nTime in State`,
    },
    {
      tool: "lighthouse_team_metrics_cumulativeStateTimeItems",
      label: "team cumulativeStateTimeItems: ",
      summary: `${GRAVITYS_HEADING}\nWork Items contributing to Review`,
    },
    {
      tool: "lighthouse_team_metrics_workItemAge",
      label: "team workItemAge: ",
      summary: `Gravity · as of Tue 6 Oct 2026\n${AGE_PERCENTILES}`,
    },
    {
      tool: "lighthouse_team_metrics_totalWorkItemAge",
      label: "team totalWorkItemAge: ",
      summary: `${GRAVITYS_HEADING}\nTotal Work Item Age: 84 days across 9 Work Items on Tue 6 Oct 2026`,
    },
  ])("$tool", async ({ tool, label, summary }) => {
    const result = await anAssistant().call(tool, {
      ...GRAVITYS_RANGE,
      state: "Review",
    });

    expect(result.isError).toBe(false);
    expect(factsBlockOf(result).startsWith(label)).toBe(true);
    expect(summaryOf(result, label)).toBe(summary);
  });

  it.each([
    {
      tool: "lighthouse_portfolio_metrics_throughput",
      label: "portfolio throughput: ",
      summary: `${OCEAN_EXPLORERS_HEADING}\nTotal Throughput: 7 Features, 0.1 / day`,
    },
    {
      tool: "lighthouse_portfolio_metrics_workItemAgePercentiles",
      label: "portfolio workItemAgePercentiles: ",
      summary: `Ocean Explorer · as of Tue 6 Oct 2026\n${AGE_PERCENTILES}`,
    },
    {
      tool: "lighthouse_portfolio_metrics_blockedCountHistory",
      label: "portfolio blockedCountHistory: ",
      summary: `${OCEAN_EXPLORERS_HEADING}\nBlocked Features: 1 on Mon 7 Sep → 2 on Tue 6 Oct`,
    },
    {
      tool: "lighthouse_portfolio_metrics_percentilesOverTime",
      label: "portfolio percentilesOverTime: ",
      summary: `${OCEAN_EXPLORERS_HEADING}\nCycle Time per recorded day`,
    },
    {
      tool: "lighthouse_portfolio_metrics_processBehaviorOverTime",
      label: "portfolio processBehaviorOverTime: ",
      summary: `${OCEAN_EXPLORERS_HEADING}\nThroughput natural process limits per recorded day`,
    },
    {
      tool: "lighthouse_portfolio_metrics_cumulativeStateTime",
      label: "portfolio cumulativeStateTime: ",
      summary: `${OCEAN_EXPLORERS_HEADING}\nTime in State`,
    },
    {
      tool: "lighthouse_portfolio_metrics_cumulativeStateTimeItems",
      label: "portfolio cumulativeStateTimeItems: ",
      summary: `${OCEAN_EXPLORERS_HEADING}\nFeatures contributing to Review`,
    },
    {
      tool: "lighthouse_portfolio_metrics_workItemAge",
      label: "portfolio workItemAge: ",
      summary: `Ocean Explorer · as of Tue 6 Oct 2026\n${AGE_PERCENTILES}`,
    },
    {
      tool: "lighthouse_portfolio_metrics_totalWorkItemAge",
      label: "portfolio totalWorkItemAge: ",
      summary:
        "Ocean Explorer · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)\nTotal Work Item Age: 84 days across 9 Features on Tue 6 Oct 2026",
    },
  ])("$tool", async ({ tool, label, summary }) => {
    const result = await anAssistant().call(tool, {
      ...OCEAN_EXPLORERS_RANGE,
      state: "Review",
    });

    expect(result.isError).toBe(false);
    expect(factsBlockOf(result).startsWith(label)).toBe(true);
    expect(summaryOf(result, label)).toBe(summary);
  });

  // This one reads as of today, so the day is fixed rather than taken from a range.
  it("lighthouse_team_metrics_wip", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T09:00:00Z"));
    try {
      const result = await anAssistant().call("lighthouse_team_metrics_wip", {
        id: 3,
      });

      expect(result.isError).toBe(false);
      expect(factsBlockOf(result).startsWith("team wip: ")).toBe(true);
      expect(summaryOf(result, "team wip: ")).toBe(
        "Gravity · as of Tue 6 Oct 2026\nWork Items in Progress: 9 (System WIP Limit: 10 Work Items)\nBlocked Work Items: 2",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  // Lighthouse answers SLE Risk only for today, so the day is fixed rather than taken from a range.
  it("lighthouse_team_metrics_sleRisk", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T09:00:00Z"));
    try {
      const result = await anAssistant({
        getTeamSleRisk: ok(gravitysSleRisk()),
      }).call("lighthouse_team_metrics_sleRisk", { id: 3 });

      expect(result.isError).toBe(false);
      expect(factsBlockOf(result).startsWith("team sleRisk: ")).toBe(true);
      expect(summaryOf(result, "team sleRisk: ")).toBe(
        [
          "Gravity · as of Tue 6 Oct 2026",
          "SLE Risk",
          "2 of 8 Work Items in progress are at risk of missing the SLE (85% within 12 days).",
          "GR-058 · — · — · past the SLE",
          "GR-061 · Export flow report as PDF · 14 days · 78% · 7 of 9 finished Work Items that reached this age went past 12 days",
          "GR-063 · — · — · 55% · 6 of 11 finished Work Items that reached this age went past 12 days",
          "GR-064 · Retry failed Jira sync · 9 days · 30% · 6 of 20 finished Work Items that reached this age went past 12 days",
          "GR-065 · — · — · 12% · 3 of 25 finished Work Items that reached this age went past 12 days",
          "GR-066 · Show SLE on the refinement tab · 6 days · 8% · 2 of 25 finished Work Items that reached this age went past 12 days",
          "GR-067 · — · — · 8% · 2 of 25 finished Work Items that reached this age went past 12 days",
          "GR-068 · — · — · 3% · 1 of 40 finished Work Items that reached this age went past 12 days",
        ].join("\n"),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("lighthouse_team_metrics_processBehaviorChart", async () => {
    const result = await anAssistant({
      getTeamProcessBehaviorChart: ok(totalAgeWithALargeChange()),
    }).call("lighthouse_team_metrics_processBehaviorChart", {
      ...GRAVITYS_RANGE,
      metricType: "WorkItemAge",
    });

    expect(result.isError).toBe(false);
    expect(summaryOf(result, "team processBehaviorChart: ")).toBe(
      [
        GRAVITYS_HEADING,
        "Total Work Item Age Process Behaviour Chart",
        "Large Change on Wed 7 Oct, Thu 8 Oct",
      ].join("\n"),
    );
  });

  it("lighthouse_portfolio_metrics_processBehaviorChart", async () => {
    const result = await anAssistant({
      getPortfolioProcessBehaviorChart: ok(aChart()),
    }).call("lighthouse_portfolio_metrics_processBehaviorChart", {
      ...OCEAN_EXPLORERS_RANGE,
      metricType: "FeatureSize",
    });

    expect(result.isError).toBe(false);
    expect(summaryOf(result, "portfolio processBehaviorChart: ")).toBe(
      [
        OCEAN_EXPLORERS_HEADING,
        "Feature Size Process Behaviour Chart",
        "No signals",
      ].join("\n"),
    );
  });

  it("names a Portfolio it cannot read by its term and id", async () => {
    const result = await anAssistant({
      getPortfolio: refused("forbidden", "No access"),
    }).call(
      "lighthouse_portfolio_metrics_blockedCountHistory",
      OCEAN_EXPLORERS_RANGE,
    );

    expect(summaryBlockOf(result)).toBe(
      "summary: Portfolio [id: 2] · Thu 9 Jul 2026 – Tue 6 Oct 2026 (90 days)\nBlocked Features: 1 on Mon 7 Sep → 2 on Tue 6 Oct",
    );
  });

  it("reads no Team settings when no cycle time definition was asked for", async () => {
    const assistant = anAssistant();

    await assistant.call(
      "lighthouse_team_metrics_cycleTimePercentiles",
      GRAVITYS_RANGE,
    );

    expect(assistant.asked()).not.toContain("getTeamSettings");
  });
});

describe("which percentile and process-limit histories get a summary", () => {
  it("states no Work Item Age history as Cycle Time, even when no family was asked for", async () => {
    const ageHistory = percentilesHistory().map((day) => ({
      ...day,
      metricType: "WorkItemAge",
    }));

    const result = await anAssistant({
      getTeamPercentilesOverTime: ok(ageHistory),
    }).call("lighthouse_team_metrics_percentilesOverTime", GRAVITYS_RANGE);

    expect(summaryBlockOf(result)).toBeNull();
  });

  it("states the Throughput process limits whether asked for by name or by default", async () => {
    const result = await anAssistant().call(
      "lighthouse_team_metrics_processBehaviorOverTime",
      { ...GRAVITYS_RANGE, metricType: "Throughput" },
    );

    expect(summaryBlockOf(result)).toBe(
      `summary: ${GRAVITYS_HEADING}\nThroughput natural process limits per recorded day`,
    );
  });

  it("states no other family's process limits as Throughput", async () => {
    const result = await anAssistant().call(
      "lighthouse_team_metrics_processBehaviorOverTime",
      { ...GRAVITYS_RANGE, metricType: "CycleTime" },
    );

    expect(summaryBlockOf(result)).toBeNull();
  });
});
