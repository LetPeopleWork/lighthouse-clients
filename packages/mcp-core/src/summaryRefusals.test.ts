import { describe, expect, it } from "vitest";
import {
  gravity,
  gravitysForecast,
  ok,
  type Reads,
  refused,
} from "../../../test-support/lighthouseAnswers";
import { anAssistantOn, answerOf } from "../test-support/mcpHarness";

const REFUSAL = refused("forbidden", "No access");

describe("a refused read stays the error it always was, with no summary", () => {
  it.each<{
    tool: string;
    reads: Reads;
    argumentsPayload: Record<string, unknown>;
    error: string;
  }>([
    {
      tool: "lighthouse_worktracking_list",
      reads: { listWorkTrackingConnections: REFUSAL },
      argumentsPayload: {},
      error: "worktracking: forbidden (No access)",
    },
    {
      tool: "lighthouse_team_list",
      reads: { listTeams: REFUSAL },
      argumentsPayload: {},
      error: "teams: forbidden (No access)",
    },
    {
      tool: "lighthouse_team_get",
      reads: { getTeam: REFUSAL },
      argumentsPayload: { id: 3 },
      error: "team: forbidden (No access)",
    },
    {
      tool: "lighthouse_feature_get",
      reads: { getFeaturesByIds: REFUSAL },
      argumentsPayload: { ids: [2] },
      error: "features: forbidden (No access)",
    },
    {
      tool: "lighthouse_feature_workitems",
      reads: { getFeatureWorkItems: REFUSAL },
      argumentsPayload: { id: 2 },
      error: "feature workitems: forbidden (No access)",
    },
    {
      tool: "lighthouse_delivery_list",
      reads: { listDeliveries: REFUSAL },
      argumentsPayload: { id: 2 },
      error: "delivery: forbidden (No access)",
    },
    {
      tool: "lighthouse_blackout_create",
      reads: { createRecurringBlackoutRule: REFUSAL },
      argumentsPayload: {
        weekdays: ["Friday"],
        intervalWeeks: 2,
        start: "2026-10-09",
        description: "Focus Friday",
      },
      error: "blackout: forbidden (No access)",
    },
    {
      tool: "lighthouse_blackout_delete",
      reads: { deleteRecurringBlackoutRule: REFUSAL },
      argumentsPayload: { id: 5 },
      error: "blackout: forbidden (No access)",
    },
    {
      tool: "lighthouse_forecast_backtest",
      reads: { getTeam: ok(gravity()), runBacktest: REFUSAL },
      argumentsPayload: {
        id: 3,
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        historicalStartDate: "2026-07-01",
        historicalEndDate: "2026-08-31",
      },
      error: "backtest: forbidden (No access)",
    },
  ])("$tool", async ({ tool, reads, argumentsPayload, error }) => {
    const result = await anAssistantOn(reads).call(tool, argumentsPayload);

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([{ type: "text", text: error }]);
  });
});

describe("summaries that leave nothing dangling", () => {
  it("states a forecast with no target date without an empty line for the likelihood it cannot give", async () => {
    const result = await anAssistantOn({
      getTeam: ok(gravity()),
      runManualForecast: ok(gravitysForecast({ targetDate: null })),
    }).call("lighthouse_forecast_manual", { id: 3, remainingItems: 25 });

    const { summary } = answerOf(result, "forecast: ");
    expect(summary).toBe("Gravity · 25 Work Items");
  });
});

describe("the tool descriptions", () => {
  it("tell an assistant about `summary` on every tool that answers with one", () => {
    const tools = anAssistantOn({}).runtime.listTools();
    const withoutSummary = tools
      .filter((tool) => !tool.description.includes("`summary"))
      .map((tool) => tool.name);

    expect(withoutSummary).toEqual([
      "lighthouse_team_metrics_cumulativeStateTimeCandidates",
      "lighthouse_portfolio_metrics_cumulativeStateTimeCandidates",
    ]);
  });
});
