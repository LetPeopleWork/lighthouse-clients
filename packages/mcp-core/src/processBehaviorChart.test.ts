import {
  getDefaultMetricsDateRange,
  type ProcessBehaviorMetricType,
} from "@letpeoplework/lighthouse-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aChart,
  chartFromAnOlderLighthouse,
  chartNotReady,
  chartWithCausesAsNumbers,
  chartWithoutABaseline,
  gravityBeforeTheDaily,
  throughputWithABlackoutDay,
  totalAgeWithALargeChange,
} from "../../../test-support/dailyFlowAnswers";
import { aPortfolio, ok } from "../../../test-support/lighthouseAnswers";
import { anAssistantOn, answerOf } from "../test-support/mcpHarness";

// A Process Behaviour Chart with the signals Lighthouse found on it, read by an assistant over MCP: the
// server's chart unchanged, and a summary naming each signal and the days it fired. Lighthouse computes the
// signals; the clients never work them out again.

const TEAM_TOOL = "lighthouse_team_metrics_processBehaviorChart";
const PORTFOLIO_TOOL = "lighthouse_portfolio_metrics_processBehaviorChart";
const TEAM_LABEL = "team processBehaviorChart: ";
const SIGNAL_NAMES = [
  "Large Change",
  "Moderate Change",
  "Moderate Shift",
  "Small Shift",
];

type ChartRead = { readonly args: readonly unknown[] };

const gravitysChart = (chart: unknown) => {
  const reads: ChartRead[] = [];
  const assistant = anAssistantOn({
    getTeam: ok(gravityBeforeTheDaily()),
    getTeamProcessBehaviorChart: (...args) => {
      reads.push({ args });
      return ok(chart);
    },
  });
  return { assistant, reads };
};

const readTotalWorkItemAge = async (chart: unknown) => {
  const { assistant } = gravitysChart(chart);
  const result = await assistant.call(TEAM_TOOL, {
    id: 3,
    metricType: "WorkItemAge",
    startDate: "2026-10-02",
    endDate: "2026-10-08",
  });
  expect(result.content[0]?.text ?? "").toMatch(
    new RegExp(`^${TEAM_LABEL}`, "u"),
  );
  const { summary, ...facts } = answerOf(result, TEAM_LABEL);
  return { result, summary: String(summary ?? ""), facts };
};

const namedSignals = (summary: string): string[] =>
  SIGNAL_NAMES.filter((name) => summary.includes(name));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T09:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("an assistant reads a chart and the signals Lighthouse found on it", () => {
  // @driving_port @contract-shape:bounded-change
  it("names the signal and the days it fired, beside the server's chart unchanged", async () => {
    const { result, summary, facts } = await readTotalWorkItemAge(
      totalAgeWithALargeChange(),
    );

    expect(result.isError).toBe(false);
    expect(facts).toEqual(totalAgeWithALargeChange());
    expect(summary).toContain("Total Work Item Age");
    expect(summary).toContain("Large Change");
    expect(summary).toContain("7 Oct");
    expect(summary).toContain("8 Oct");
  });

  // @driving_port @contract-shape:bounded-change
  it("says there are no signals when every day is inside the limits", async () => {
    const { summary } = await readTotalWorkItemAge(aChart());

    expect(summary).toContain("No signals");
    expect(namedSignals(summary)).toEqual([]);
  });

  // @driving_port @contract-shape:bounded-change
  it("reads the range every metric tool reads when no dates are given", async () => {
    const { assistant, reads } = gravitysChart(aChart());

    await assistant.call(TEAM_TOOL, { id: 3, metricType: "Throughput" });

    expect(reads).toEqual([
      { args: [3, getDefaultMetricsDateRange(), "Throughput"] },
    ]);
  });

  // @driving_port @contract-shape:bounded-change
  it("reads a Portfolio's Feature Size chart", async () => {
    const reads: ChartRead[] = [];
    const result = await anAssistantOn({
      getPortfolio: ok(aPortfolio()),
      getPortfolioProcessBehaviorChart: (...args) => {
        reads.push({ args });
        return ok(aChart());
      },
    }).call(PORTFOLIO_TOOL, {
      id: 2,
      metricType: "FeatureSize",
      startDate: "2026-07-11",
      endDate: "2026-10-08",
    });

    expect(result.isError).toBe(false);
    expect(reads).toEqual([
      {
        args: [
          2,
          { startDate: "2026-07-11", endDate: "2026-10-08" },
          "FeatureSize" satisfies ProcessBehaviorMetricType,
        ],
      },
    ]);
  });
});

describe("a chart whose limits mean little claims no signal", () => {
  // @error @contract-shape:pure-function
  // Pending until the clients read Process Behaviour Charts.
  it.skip("says no baseline is set and the limits come from the range shown, and names no signal", async () => {
    const { summary, facts } = await readTotalWorkItemAge(
      chartWithoutABaseline(),
    );

    expect(summary.toLowerCase()).toContain("no baseline");
    expect(namedSignals(summary)).toEqual([]);
    expect(facts).toEqual(chartWithoutABaseline());
  });

  // @error @contract-shape:pure-function
  // Pending until the clients read Process Behaviour Charts.
  it.skip("passes on why Lighthouse could not compute the chart", async () => {
    const { summary } = await readTotalWorkItemAge(chartNotReady());

    expect(summary).toContain(
      "At least 15 days of data are needed to compute the limits.",
    );
    expect(summary).not.toContain("No signals");
  });

  // @error @contract-shape:pure-function
  // A blackout day is a day the Team did not work; whatever the chart flagged on it is not a signal.
  // Pending until the clients read Process Behaviour Charts.
  it.skip("lists a blackout day as one and never as a signal", async () => {
    const { summary } = await readTotalWorkItemAge(
      throughputWithABlackoutDay(),
    );

    expect(summary.toLowerCase()).toContain("blackout");
    expect(summary).toContain("3 Oct");
    expect(namedSignals(summary)).toEqual([]);
  });

  // @error @contract-shape:pure-function
  // Pending until the clients read Process Behaviour Charts.
  it.skip("still names the signals on a chart from a Lighthouse that predates blackout days and baselines", async () => {
    const { summary, facts } = await readTotalWorkItemAge(
      chartFromAnOlderLighthouse(),
    );

    expect(namedSignals(summary)).toEqual(["Large Change"]);
    expect(summary.toLowerCase()).not.toContain("no baseline");
    expect(facts).toEqual(chartFromAnOlderLighthouse());
  });

  // @error @contract-shape:pure-function
  // Pending until the clients read Process Behaviour Charts.
  it.skip("names no signal it cannot read, and still hands over the chart", async () => {
    const { result, summary, facts } = await readTotalWorkItemAge(
      chartWithCausesAsNumbers(),
    );

    expect(result.isError).toBe(false);
    expect(namedSignals(summary)).toEqual([]);
    expect(facts).toEqual(chartWithCausesAsNumbers());
  });
});

describe("a question the chart tools cannot take", () => {
  // @error @contract-shape:bounded-change
  // Feature Size is charted for Portfolios only.
  it("refuses a Team's Feature Size chart without asking Lighthouse", async () => {
    const { assistant, reads } = gravitysChart(aChart());

    const result = await assistant.call(TEAM_TOOL, {
      id: 3,
      metricType: "FeatureSize",
    });

    expect(result.content).toEqual([
      { type: "text", text: "team metrics: invalid metricType" },
    ]);
    expect(reads).toEqual([]);
  });

  // @error @contract-shape:bounded-change
  it("asks which chart when none is named, without asking Lighthouse", async () => {
    const { assistant, reads } = gravitysChart(aChart());

    const result = await assistant.call(TEAM_TOOL, { id: 3 });

    expect(result.content).toEqual([
      { type: "text", text: "team metrics: invalid metricType" },
    ]);
    expect(reads).toEqual([]);
  });
});
