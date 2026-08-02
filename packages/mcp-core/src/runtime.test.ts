import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { createMcpCoreRuntime, registerMcpTools } from "./index";

const emptyDeliveryHistory = {
  deliveryDate: "2026-06-30T00:00:00Z",
  firstSnapshotDate: null,
  points: [],
};

describe("createMcpCoreRuntime", () => {
  it("lists baseline Lighthouse tools", () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.2.3" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
      }),
    });

    const tools = runtime.listTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "lighthouse_health_check",
      "lighthouse_version_get",
      "lighthouse_worktracking_list",
      "lighthouse_worktracking_get",
      "lighthouse_team_list",
      "lighthouse_team_get",
      "lighthouse_team_refresh",
      "lighthouse_portfolio_list",
      "lighthouse_portfolio_get",
      "lighthouse_portfolio_refresh",
      "lighthouse_team_metrics_throughput",
      "lighthouse_team_metrics_cycleTimePercentiles",
      "lighthouse_team_metrics_workItemAgePercentiles",
      "lighthouse_portfolio_metrics_workItemAgePercentiles",
      "lighthouse_team_metrics_blockedCountHistory",
      "lighthouse_portfolio_metrics_blockedCountHistory",
      "lighthouse_team_metrics_percentilesOverTime",
      "lighthouse_portfolio_metrics_percentilesOverTime",
      "lighthouse_team_metrics_processBehaviorOverTime",
      "lighthouse_portfolio_metrics_processBehaviorOverTime",
      "lighthouse_portfolio_metrics_throughput",
      "lighthouse_team_metrics_workItemAge",
      "lighthouse_team_metrics_totalWorkItemAge",
      "lighthouse_portfolio_metrics_workItemAge",
      "lighthouse_portfolio_metrics_totalWorkItemAge",
      "lighthouse_feature_get",
      "lighthouse_feature_workitems",
      "lighthouse_delivery_list",
      "lighthouse_delivery_metrics",
      "lighthouse_blackout_list",
      "lighthouse_blackout_create",
      "lighthouse_blackout_update",
      "lighthouse_blackout_delete",
      "lighthouse_forecast_manual",
      "lighthouse_forecast_backtest",
      "lighthouse_team_metrics_cumulativeStateTime",
      "lighthouse_team_metrics_cumulativeStateTimeItems",
      "lighthouse_team_metrics_cumulativeStateTimeCandidates",
      "lighthouse_portfolio_metrics_cumulativeStateTime",
      "lighthouse_portfolio_metrics_cumulativeStateTimeItems",
      "lighthouse_portfolio_metrics_cumulativeStateTimeCandidates",
    ]);
  });

  it("calls health-check tool and returns success", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.2.3" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
      }),
    });

    const result = await runtime.callTool("lighthouse_health_check", {});

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("success");
  });

  it("calls version tool and returns version", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v2.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
      }),
    });

    const result = await runtime.callTool("lighthouse_version_get", {});

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("v2.0.0");
  });

  it("returns error for unknown tools", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v2.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
      }),
    });

    const result = await runtime.callTool("lighthouse_unknown", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Unknown tool");
  });

  it("propagates client errors through MCP tool responses", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({
          category: "unauthorized",
          reason: "token missing",
        }),
        getVersion: async () => ({ ok: true, value: "v2.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
      }),
    });

    const result = await runtime.callTool("lighthouse_health_check", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("unauthorized");
  });

  it("calls worktracking, team, and portfolio tools", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v2.0.0" }),
        listWorkTrackingConnections: async () => ({
          ok: true,
          value: [{ id: 1, name: "Jira" }],
        }),
        getWorkTrackingConnection: async () => ({
          ok: true,
          value: { id: 1, name: "Jira" },
        }),
        listTeams: async () => ({
          ok: true,
          value: [{ id: 5, name: "Team A" }],
        }),
        getTeam: async () => ({
          ok: true,
          value: { id: 5, name: "Team A" },
        }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({
          ok: true,
          value: [{ id: 9, name: "Portfolio A" }],
        }),
        getPortfolio: async () => ({
          ok: true,
          value: { id: 9, name: "Portfolio A" },
        }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const worktrackingList = await runtime.callTool(
      "lighthouse_worktracking_list",
      {},
    );
    expect(worktrackingList.isError).toBe(false);
    expect(worktrackingList.content[0]?.text).toContain("Jira");

    const teamGet = await runtime.callTool("lighthouse_team_get", { id: 5 });
    expect(teamGet.isError).toBe(false);
    expect(teamGet.content[0]?.text).toContain("Team A");

    const portfolioRefresh = await runtime.callTool(
      "lighthouse_portfolio_refresh",
      { id: 9 },
    );
    expect(portfolioRefresh.isError).toBe(false);
    expect(portfolioRefresh.content[0]?.text).toContain("portfolio refreshed");
  });

  it("lists metrics tools in the tool registry", () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const toolNames = runtime.listTools().map((t) => t.name);

    expect(toolNames).toContain("lighthouse_team_metrics_throughput");
    expect(toolNames).toContain("lighthouse_portfolio_metrics_throughput");
    expect(toolNames).toContain("lighthouse_feature_get");
    expect(toolNames).toContain("lighthouse_delivery_list");
    expect(toolNames).toContain("lighthouse_forecast_manual");
    expect(toolNames).toContain("lighthouse_forecast_backtest");
  });

  it("calls team throughput metrics tool", async () => {
    const throughputData = { labels: ["2026-01-01"], data: [3] };
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: throughputData }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const result = await runtime.callTool(
      "lighthouse_team_metrics_throughput",
      { id: 5 },
    );

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain(encode(throughputData));
  });

  it("calls team cumulativeStateTime tool and passes itemIds through", async () => {
    const calls: { id: number; itemIds?: readonly number[] }[] = [];
    const bar = { states: [{ state: "Doing", totalDays: 5 }] };
    const runtime = createMcpCoreRuntime({
      createClient: () =>
        ({
          getTeamCumulativeStateTime: async (
            id: number,
            _range?: unknown,
            itemIds?: readonly number[],
          ) => {
            calls.push({ id, itemIds });
            return { ok: true as const, value: bar };
          },
        }) as never,
    });

    const result = await runtime.callTool(
      "lighthouse_team_metrics_cumulativeStateTime",
      { id: 9, itemIds: [4, 2] },
    );

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain(encode(bar));
    expect(calls).toEqual([{ id: 9, itemIds: [4, 2] }]);
  });

  it("rejects the cumulativeStateTimeItems tool when state is missing", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () =>
        ({
          getTeamCumulativeStateTimeItems: async () => ({
            ok: true as const,
            value: { state: "", items: [] },
          }),
        }) as never,
    });

    const result = await runtime.callTool(
      "lighthouse_team_metrics_cumulativeStateTimeItems",
      { id: 9 },
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("state");
  });

  it("calls forecast manual tool", async () => {
    const forecastResult = {
      remainingItems: 3,
      whenForecasts: [],
      howManyForecasts: [],
    };
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: forecastResult }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const result = await runtime.callTool("lighthouse_forecast_manual", {
      id: 2,
      remainingItems: 3,
    });

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("whenForecasts");
  });

  it("calls delivery list tool", async () => {
    const deliveries = [{ id: 1, name: "Release 1" }];
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: deliveries }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const result = await runtime.callTool("lighthouse_delivery_list", {
      id: 4,
    });

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("Release 1");
  });

  const deliveryHistoryWithEpics = {
    deliveryDate: "2026-06-30T00:00:00Z",
    firstSnapshotDate: "2026-06-01T00:00:00Z",
    points: [
      {
        date: "2026-06-01T00:00:00Z",
        targetDateAtSnapshot: "2026-06-30T00:00:00Z",
        totalWork: 20,
        doneWork: 4,
        remainingWork: 16,
        estimatedItemCount: 6,
        forecastHowMany: 12,
        likelihoodPercentage: 70,
        whenDistribution: [
          { probability: 0.5, expectedDate: "2026-06-28T00:00:00Z" },
        ],
        featureBreakdown: [
          {
            referenceId: "EPIC-A",
            name: "Checkout",
            completion: 25,
            likelihood: 80,
            totalItems: 8,
            isUsingDefaultSize: false,
          },
        ],
      },
    ],
  };

  const getDeliveryMetricsRuntime = (
    result:
      | {
          readonly ok: true;
          readonly value: typeof deliveryHistoryWithEpics;
        }
      | {
          readonly ok: false;
          readonly error: {
            readonly category: string;
            readonly reason: string;
          };
        },
  ) =>
    createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true as const, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({
          ok: true as const,
          value: [],
        }),
        getWorkTrackingConnection: async () => ({
          ok: true as const,
          value: {},
        }),
        listTeams: async () => ({ ok: true as const, value: [] }),
        getTeam: async () => ({ ok: true as const, value: {} }),
        refreshTeam: async () => ({ ok: true as const, value: undefined }),
        listPortfolios: async () => ({ ok: true as const, value: [] }),
        getPortfolio: async () => ({ ok: true as const, value: {} }),
        refreshPortfolio: async () => ({ ok: true as const, value: undefined }),
        getTeamThroughput: async () => ({ ok: true as const, value: {} }),
        getTeamCycleTimePercentiles: async () => ({
          ok: true as const,
          value: [],
        }),
        getPortfolioThroughput: async () => ({ ok: true as const, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({
          ok: true as const,
          value: {},
        }),
        getTeamTotalWorkItemAgeOverTime: async () => ({
          ok: true as const,
          value: {},
        }),
        getPortfolioWorkItemAgeOverTime: async () => ({
          ok: true as const,
          value: {},
        }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true as const,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true as const, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true as const, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true as const, value: [] }),
        listDeliveries: async () => ({ ok: true as const, value: [] }),
        getDeliveryMetricsHistory: async () => result,
        createDelivery: async () => ({ ok: true as const, value: {} }),
        updateDelivery: async () => ({ ok: true as const, value: {} }),
        deleteDelivery: async () => ({ ok: true as const, value: undefined }),
        runManualForecast: async () => ({ ok: true as const, value: {} }),
        runBacktest: async () => ({ ok: true as const, value: {} }),
      }),
    });

  it("summarises a delivery's history by default, leaving the heavy shapes out", async () => {
    const runtime = getDeliveryMetricsRuntime({
      ok: true,
      value: deliveryHistoryWithEpics,
    });

    const result = await runtime.callTool("lighthouse_delivery_metrics", {
      id: 42,
    });

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("epicCount");
    expect(result.content[0]?.text).not.toContain("EPIC-A");
    expect(result.content[0]?.text).not.toContain("whenDistribution");
  });

  it("returns the whole payload when detail is epics", async () => {
    const runtime = getDeliveryMetricsRuntime({
      ok: true,
      value: deliveryHistoryWithEpics,
    });

    const result = await runtime.callTool("lighthouse_delivery_metrics", {
      id: 42,
      detail: "epics",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("EPIC-A");
    expect(result.content[0]?.text).toContain("isUsingDefaultSize");
  });

  it("reports an unsupported server rather than an empty trend", async () => {
    const runtime = getDeliveryMetricsRuntime({
      ok: false,
      error: {
        category: "misconfigured",
        reason: "deliveryMetricsHistory requires a newer Lighthouse",
      },
    });

    const result = await runtime.callTool("lighthouse_delivery_metrics", {
      id: 42,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("deliveryMetricsHistory");
  });

  it("rejects a delivery metrics call with no id", async () => {
    const runtime = getDeliveryMetricsRuntime({
      ok: true,
      value: deliveryHistoryWithEpics,
    });

    const result = await runtime.callTool("lighthouse_delivery_metrics", {});

    expect(result.isError).toBe(true);
  });

  it("calls recurring blackout-rule list tool", async () => {
    const rules = [
      {
        id: 3,
        weekdays: ["Monday"],
        intervalWeeks: 2,
        start: "2026-06-01",
        end: null,
        description: "Sprint review",
        summary: "Every 2 weeks on Mon from 2026-06-01",
      },
    ];
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v26.5.29.6" }),
        getRecurringBlackoutRules: async () => ({ ok: true, value: rules }),
        createRecurringBlackoutRule: async () => ({ ok: true, value: {} }),
        updateRecurringBlackoutRule: async () => ({ ok: true, value: {} }),
        deleteRecurringBlackoutRule: async () => ({
          ok: true,
          value: undefined,
        }),
      }),
    });

    const result = await runtime.callTool("lighthouse_blackout_list", {});

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("Sprint review");
  });

  it("calls recurring blackout-rule create tool and forwards the payload", async () => {
    let received: unknown;
    const created = {
      id: 4,
      weekdays: ["Monday", "Wednesday"],
      intervalWeeks: 1,
      start: "2026-06-01",
      end: null,
      description: "Recurring",
      summary: "Every week on Mon, Wed from 2026-06-01",
    };
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v26.5.29.6" }),
        getRecurringBlackoutRules: async () => ({ ok: true, value: [] }),
        createRecurringBlackoutRule: async (payload) => {
          received = payload;
          return { ok: true, value: created };
        },
        updateRecurringBlackoutRule: async () => ({ ok: true, value: {} }),
        deleteRecurringBlackoutRule: async () => ({
          ok: true,
          value: undefined,
        }),
      }),
    });

    const result = await runtime.callTool("lighthouse_blackout_create", {
      weekdays: ["Monday", "Wednesday"],
      intervalWeeks: 1,
      start: "2026-06-01",
      end: null,
      description: "Recurring",
    });

    expect(result.isError).toBe(false);
    expect(received).toEqual({
      weekdays: ["Monday", "Wednesday"],
      intervalWeeks: 1,
      start: "2026-06-01",
      end: null,
      description: "Recurring",
    });
  });

  it("calls recurring blackout-rule update tool with the id stripped from the payload", async () => {
    let receivedId: number | undefined;
    let receivedPayload: Record<string, unknown> | undefined;
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v26.5.29.6" }),
        getRecurringBlackoutRules: async () => ({ ok: true, value: [] }),
        createRecurringBlackoutRule: async () => ({ ok: true, value: {} }),
        updateRecurringBlackoutRule: async (id, payload) => {
          receivedId = id;
          receivedPayload = payload as Record<string, unknown>;
          return { ok: true, value: { id } };
        },
        deleteRecurringBlackoutRule: async () => ({
          ok: true,
          value: undefined,
        }),
      }),
    });

    const result = await runtime.callTool("lighthouse_blackout_update", {
      id: 7,
      weekdays: ["Friday"],
      intervalWeeks: 3,
      start: "2026-06-01",
      end: "2026-12-31",
      description: "Updated",
    });

    expect(result.isError).toBe(false);
    expect(receivedId).toBe(7);
    expect(receivedPayload).not.toHaveProperty("id");
    expect(receivedPayload?.description).toBe("Updated");
  });

  it("calls recurring blackout-rule delete tool", async () => {
    let deletedId: number | undefined;
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v26.5.29.6" }),
        getRecurringBlackoutRules: async () => ({ ok: true, value: [] }),
        createRecurringBlackoutRule: async () => ({ ok: true, value: {} }),
        updateRecurringBlackoutRule: async () => ({ ok: true, value: {} }),
        deleteRecurringBlackoutRule: async (id) => {
          deletedId = id;
          return { ok: true, value: undefined };
        },
      }),
    });

    const result = await runtime.callTool("lighthouse_blackout_delete", {
      id: 9,
    });

    expect(result.isError).toBe(false);
    expect(deletedId).toBe(9);
  });

  it("reports the upgrade error when the server gates recurring blackout rules", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v26.5.29.5" }),
        getRecurringBlackoutRules: async () => ({
          ok: false,
          error: {
            category: "misconfigured",
            reason:
              'does not support "recurringBlackoutRules" — Upgrade Lighthouse',
          },
        }),
        createRecurringBlackoutRule: async () => ({ ok: true, value: {} }),
        updateRecurringBlackoutRule: async () => ({ ok: true, value: {} }),
        deleteRecurringBlackoutRule: async () => ({
          ok: true,
          value: undefined,
        }),
      }),
    });

    const result = await runtime.callTool("lighthouse_blackout_list", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("misconfigured");
  });

  it("calls team workItemAge metrics tool", async () => {
    const ageData = {
      startDate: "2026-01-01",
      endDate: "2026-01-03",
      daily: [
        {
          date: "2026-01-01",
          items: [{ id: 1, name: "Task A", referenceId: "T-1", age: 3 }],
        },
      ],
    };
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({
          ok: true,
          value: ageData,
        }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const result = await runtime.callTool(
      "lighthouse_team_metrics_workItemAge",
      { id: 5 },
    );

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("Task A");
  });

  it("calls team totalWorkItemAge metrics tool", async () => {
    const totalAgeData = {
      startDate: "2026-01-01",
      endDate: "2026-01-03",
      daily: [{ date: "2026-01-01", totalAge: 10, itemCount: 3 }],
    };
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: totalAgeData,
        }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const result = await runtime.callTool(
      "lighthouse_team_metrics_totalWorkItemAge",
      { id: 5 },
    );

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("itemCount");
  });

  it("calls portfolio workItemAge metrics tool", async () => {
    const ageData = {
      startDate: "2026-01-01",
      endDate: "2026-01-03",
      daily: [
        {
          date: "2026-01-01",
          items: [{ id: 2, name: "Feature B", referenceId: "F-2", age: 5 }],
        },
      ],
    };
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({
          ok: true,
          value: ageData,
        }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const result = await runtime.callTool(
      "lighthouse_portfolio_metrics_workItemAge",
      { id: 9 },
    );

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("Feature B");
  });

  it("calls team workItemAgePercentiles metrics tool", async () => {
    const percentiles = [{ percentile: 85, value: 11 }];
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getTeamWorkItemAgePercentiles: async () => ({
          ok: true,
          value: percentiles,
        }),
        getPortfolioWorkItemAgePercentiles: async () => ({
          ok: true,
          value: [],
        }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const result = await runtime.callTool(
      "lighthouse_team_metrics_workItemAgePercentiles",
      { id: 5 },
    );

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("team workItemAgePercentiles");
  });

  it("calls portfolio workItemAgePercentiles metrics tool", async () => {
    const percentiles = [{ percentile: 50, value: 4 }];
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getTeamWorkItemAgePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioWorkItemAgePercentiles: async () => ({
          ok: true,
          value: percentiles,
        }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: {},
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const result = await runtime.callTool(
      "lighthouse_portfolio_metrics_workItemAgePercentiles",
      { id: 9 },
    );

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain(
      "portfolio workItemAgePercentiles",
    );
  });

  it("calls the over-time tools and passes family and horizon through", async () => {
    const percentiles = [
      {
        recordedAt: "2026-01-01",
        metricType: "CycleTime",
        p50: 4,
        p70: 7,
        p85: 11,
        p95: 16,
      },
    ];
    const limits = [
      { recordedAt: "2026-01-01", unpl: 19, average: 12, lnpl: 5 },
    ];
    const calls: Array<{
      readonly scope: string;
      readonly id: number;
      readonly range: unknown;
      readonly metricType: unknown;
      readonly horizon?: unknown;
    }> = [];
    const runtime = createMcpCoreRuntime({
      createClient: () =>
        ({
          checkConnectivity: async () => ({ category: "success" }),
          getVersion: async () => ({ ok: true, value: "v1.0.0" }),
          getTeamPercentilesOverTime: async (
            id: number,
            range: unknown,
            metricType: unknown,
            horizon: unknown,
          ) => {
            calls.push({ scope: "team-p", id, range, metricType, horizon });
            return { ok: true as const, value: percentiles };
          },
          getPortfolioPercentilesOverTime: async (
            id: number,
            range: unknown,
            metricType: unknown,
            horizon: unknown,
          ) => {
            calls.push({
              scope: "portfolio-p",
              id,
              range,
              metricType,
              horizon,
            });
            return { ok: true as const, value: percentiles };
          },
          getTeamProcessBehaviorOverTime: async (
            id: number,
            range: unknown,
            metricType: unknown,
          ) => {
            calls.push({ scope: "team-pbc", id, range, metricType });
            return { ok: true as const, value: limits };
          },
          getPortfolioProcessBehaviorOverTime: async (
            id: number,
            range: unknown,
            metricType: unknown,
          ) => {
            calls.push({ scope: "portfolio-pbc", id, range, metricType });
            return { ok: true as const, value: limits };
          },
        }) as never,
    });

    const range = { startDate: "2026-01-01", endDate: "2026-03-31" };

    const teamPercentiles = await runtime.callTool(
      "lighthouse_team_metrics_percentilesOverTime",
      { id: 5, ...range, metricType: "WorkItemAge" },
    );
    expect(teamPercentiles.isError).toBe(false);
    expect(teamPercentiles.content[0]?.text).toContain(
      "team percentilesOverTime",
    );

    await runtime.callTool("lighthouse_portfolio_metrics_percentilesOverTime", {
      id: 9,
      ...range,
      metricType: "CycleTime",
      horizon: 60,
    });

    const teamLimits = await runtime.callTool(
      "lighthouse_team_metrics_processBehaviorOverTime",
      { id: 5, ...range, metricType: "Arrivals" },
    );
    expect(teamLimits.isError).toBe(false);
    expect(teamLimits.content[0]?.text).toContain(
      "team processBehaviorOverTime",
    );

    await runtime.callTool(
      "lighthouse_portfolio_metrics_processBehaviorOverTime",
      { id: 9, ...range, metricType: "FeatureSize" },
    );

    expect(calls).toEqual([
      {
        scope: "team-p",
        id: 5,
        range,
        metricType: "WorkItemAge",
        horizon: undefined,
      },
      {
        scope: "portfolio-p",
        id: 9,
        range,
        metricType: "CycleTime",
        horizon: 60,
      },
      { scope: "team-pbc", id: 5, range, metricType: "Arrivals" },
      { scope: "portfolio-pbc", id: 9, range, metricType: "FeatureSize" },
    ]);
  });

  it("drops an unrecognised over-time family instead of forwarding it", async () => {
    const calls: Array<{ readonly metricType: unknown }> = [];
    const runtime = createMcpCoreRuntime({
      createClient: () =>
        ({
          checkConnectivity: async () => ({ category: "success" }),
          getVersion: async () => ({ ok: true, value: "v1.0.0" }),
          getTeamProcessBehaviorOverTime: async (
            _id: number,
            _range: unknown,
            metricType: unknown,
          ) => {
            calls.push({ metricType });
            return { ok: true as const, value: [] };
          },
        }) as never,
    });

    // An unknown family must not reach the server as-is: it would come back a
    // 400 that reads like a Lighthouse fault rather than a bad tool argument.
    await runtime.callTool("lighthouse_team_metrics_processBehaviorOverTime", {
      id: 5,
      metricType: "NotAFamily",
    });

    expect(calls).toEqual([{ metricType: undefined }]);
  });

  it("calls team and portfolio blockedCountHistory metrics tools and passes the date range", async () => {
    const history = [{ recordedAt: "2026-01-01", blockedCount: 3 }];
    const calls: Array<{
      readonly scope: string;
      readonly id: number;
      readonly range: unknown;
    }> = [];
    const runtime = createMcpCoreRuntime({
      createClient: () =>
        ({
          checkConnectivity: async () => ({ category: "success" }),
          getVersion: async () => ({ ok: true, value: "v1.0.0" }),
          getTeamBlockedCountHistory: async (id: number, range: unknown) => {
            calls.push({ scope: "team", id, range });
            return { ok: true as const, value: history };
          },
          getPortfolioBlockedCountHistory: async (
            id: number,
            range: unknown,
          ) => {
            calls.push({ scope: "portfolio", id, range });
            return { ok: true as const, value: history };
          },
        }) as never,
    });

    const teamResult = await runtime.callTool(
      "lighthouse_team_metrics_blockedCountHistory",
      { id: 5, startDate: "2026-01-01", endDate: "2026-03-31" },
    );
    expect(teamResult.isError).toBe(false);
    expect(teamResult.content[0]?.text).toContain("team blockedCountHistory");

    const portfolioResult = await runtime.callTool(
      "lighthouse_portfolio_metrics_blockedCountHistory",
      { id: 9, startDate: "2026-01-01", endDate: "2026-03-31" },
    );
    expect(portfolioResult.isError).toBe(false);
    expect(portfolioResult.content[0]?.text).toContain(
      "portfolio blockedCountHistory",
    );

    expect(calls).toEqual([
      {
        scope: "team",
        id: 5,
        range: { startDate: "2026-01-01", endDate: "2026-03-31" },
      },
      {
        scope: "portfolio",
        id: 9,
        range: { startDate: "2026-01-01", endDate: "2026-03-31" },
      },
    ]);
  });

  it("calls portfolio totalWorkItemAge metrics tool", async () => {
    const totalAgeData = {
      startDate: "2026-01-01",
      endDate: "2026-01-03",
      daily: [{ date: "2026-01-01", totalAge: 25, itemCount: 7 }],
    };
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.0.0" }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
        getTeamThroughput: async () => ({ ok: true, value: {} }),
        getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
        getPortfolioThroughput: async () => ({ ok: true, value: {} }),
        getTeamWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getTeamTotalWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioWorkItemAgeOverTime: async () => ({ ok: true, value: {} }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: totalAgeData,
        }),
        getFeaturesByIds: async () => ({ ok: true, value: [] }),
        getFeaturesByReferences: async () => ({ ok: true, value: [] }),
        getFeatureWorkItems: async () => ({ ok: true, value: [] }),
        listDeliveries: async () => ({ ok: true, value: [] }),
        getDeliveryMetricsHistory: async () => ({
          ok: true,
          value: emptyDeliveryHistory,
        }),
        createDelivery: async () => ({ ok: true, value: {} }),
        updateDelivery: async () => ({ ok: true, value: {} }),
        deleteDelivery: async () => ({ ok: true, value: undefined }),
        runManualForecast: async () => ({ ok: true, value: {} }),
        runBacktest: async () => ({ ok: true, value: {} }),
      }),
    });

    const result = await runtime.callTool(
      "lighthouse_portfolio_metrics_totalWorkItemAge",
      { id: 9 },
    );

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("totalAge");
  });

  it("forwards view=filtered to the underlying client for team throughput", async () => {
    const calls: {
      view: "raw" | "filtered" | undefined;
    }[] = [];
    const runtime = createMcpCoreRuntime({
      createClient: () =>
        ({
          checkConnectivity: async () => ({ category: "success" as const }),
          getVersion: async () => ({ ok: true as const, value: "v1.0.0" }),
          listWorkTrackingConnections: async () => ({
            ok: true as const,
            value: [],
          }),
          getWorkTrackingConnection: async () => ({
            ok: true as const,
            value: {},
          }),
          listTeams: async () => ({ ok: true as const, value: [] }),
          getTeam: async () => ({ ok: true as const, value: {} }),
          refreshTeam: async () => ({ ok: true as const, value: undefined }),
          listPortfolios: async () => ({ ok: true as const, value: [] }),
          getPortfolio: async () => ({ ok: true as const, value: {} }),
          refreshPortfolio: async () => ({
            ok: true as const,
            value: undefined,
          }),
          getTeamThroughput: async (
            _id: number,
            _range?: { readonly startDate: string; readonly endDate: string },
            view?: "raw" | "filtered",
          ) => {
            calls.push({ view });
            return { ok: true as const, value: {} };
          },
          getTeamCycleTimePercentiles: async () => ({
            ok: true as const,
            value: [],
          }),
          getPortfolioThroughput: async () => ({
            ok: true as const,
            value: {},
          }),
          getTeamWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getTeamTotalWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getPortfolioWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getPortfolioTotalWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getFeaturesByIds: async () => ({ ok: true as const, value: [] }),
          getFeaturesByReferences: async () => ({
            ok: true as const,
            value: [],
          }),
          getFeatureWorkItems: async () => ({ ok: true as const, value: [] }),
          listDeliveries: async () => ({ ok: true as const, value: [] }),
          getDeliveryMetricsHistory: async () => ({
            ok: true as const,
            value: emptyDeliveryHistory,
          }),
          createDelivery: async () => ({ ok: true as const, value: {} }),
          updateDelivery: async () => ({ ok: true as const, value: {} }),
          deleteDelivery: async () => ({
            ok: true as const,
            value: undefined,
          }),
          runManualForecast: async () => ({ ok: true as const, value: {} }),
          runBacktest: async () => ({ ok: true as const, value: {} }),
        }) as never,
    });

    await runtime.callTool("lighthouse_team_metrics_throughput", {
      id: 5,
      view: "filtered",
    });
    await runtime.callTool("lighthouse_team_metrics_throughput", { id: 5 });

    expect(calls).toEqual([{ view: "filtered" }, { view: undefined }]);
  });

  it("forwards applyFilterOverride to manual forecast and backtest payloads", async () => {
    const manualCalls: { applyFilterOverride: boolean | undefined }[] = [];
    const backtestCalls: { applyFilterOverride: boolean | undefined }[] = [];
    const runtime = createMcpCoreRuntime({
      createClient: () =>
        ({
          checkConnectivity: async () => ({ category: "success" as const }),
          getVersion: async () => ({ ok: true as const, value: "v1.0.0" }),
          listWorkTrackingConnections: async () => ({
            ok: true as const,
            value: [],
          }),
          getWorkTrackingConnection: async () => ({
            ok: true as const,
            value: {},
          }),
          listTeams: async () => ({ ok: true as const, value: [] }),
          getTeam: async () => ({ ok: true as const, value: {} }),
          refreshTeam: async () => ({ ok: true as const, value: undefined }),
          listPortfolios: async () => ({ ok: true as const, value: [] }),
          getPortfolio: async () => ({ ok: true as const, value: {} }),
          refreshPortfolio: async () => ({
            ok: true as const,
            value: undefined,
          }),
          getTeamThroughput: async () => ({ ok: true as const, value: {} }),
          getTeamCycleTimePercentiles: async () => ({
            ok: true as const,
            value: [],
          }),
          getPortfolioThroughput: async () => ({
            ok: true as const,
            value: {},
          }),
          getTeamWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getTeamTotalWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getPortfolioWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getPortfolioTotalWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getFeaturesByIds: async () => ({ ok: true as const, value: [] }),
          getFeaturesByReferences: async () => ({
            ok: true as const,
            value: [],
          }),
          getFeatureWorkItems: async () => ({ ok: true as const, value: [] }),
          listDeliveries: async () => ({ ok: true as const, value: [] }),
          getDeliveryMetricsHistory: async () => ({
            ok: true as const,
            value: emptyDeliveryHistory,
          }),
          createDelivery: async () => ({ ok: true as const, value: {} }),
          updateDelivery: async () => ({ ok: true as const, value: {} }),
          deleteDelivery: async () => ({
            ok: true as const,
            value: undefined,
          }),
          runManualForecast: async (
            _id: number,
            payload: { applyFilterOverride?: boolean },
          ) => {
            manualCalls.push({
              applyFilterOverride: payload.applyFilterOverride,
            });
            return { ok: true as const, value: {} };
          },
          runBacktest: async (
            _id: number,
            payload: { applyFilterOverride?: boolean },
          ) => {
            backtestCalls.push({
              applyFilterOverride: payload.applyFilterOverride,
            });
            return { ok: true as const, value: {} };
          },
        }) as never,
    });

    await runtime.callTool("lighthouse_forecast_manual", {
      id: 2,
      remainingItems: 5,
      applyFilterOverride: true,
    });
    await runtime.callTool("lighthouse_forecast_manual", {
      id: 2,
      remainingItems: 5,
    });
    await runtime.callTool("lighthouse_forecast_backtest", {
      id: 2,
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      historicalStartDate: "2025-10-01",
      historicalEndDate: "2025-12-31",
      applyFilterOverride: false,
    });

    expect(manualCalls).toEqual([
      { applyFilterOverride: true },
      { applyFilterOverride: undefined },
    ]);
    expect(backtestCalls).toEqual([{ applyFilterOverride: false }]);
  });
});

describe("registerMcpTools", () => {
  it("registers all tools and delegates tool calls to the runtime", async () => {
    const registered: {
      readonly name: string;
      readonly handler: (argumentsPayload: unknown) => Promise<unknown>;
    }[] = [];

    const server = {
      registerTool: (
        name: string,
        _configuration: unknown,
        handler: (argumentsPayload: unknown) => Promise<unknown>,
      ) => {
        registered.push({ name, handler });
      },
    };

    registerMcpTools(server as never, {
      createClient: () =>
        ({
          checkConnectivity: async () => ({ category: "success" as const }),
          getVersion: async () => ({ ok: true as const, value: "v1.0.0" }),
          listWorkTrackingConnections: async () => ({
            ok: true as const,
            value: [],
          }),
          getWorkTrackingConnection: async () => ({
            ok: true as const,
            value: {},
          }),
          listTeams: async () => ({ ok: true as const, value: [] }),
          getTeam: async () => ({ ok: true as const, value: {} }),
          refreshTeam: async () => ({ ok: true as const, value: {} }),
          listPortfolios: async () => ({ ok: true as const, value: [] }),
          getPortfolio: async () => ({ ok: true as const, value: {} }),
          refreshPortfolio: async () => ({ ok: true as const, value: {} }),
          getTeamThroughput: async () => ({ ok: true as const, value: {} }),
          getTeamCycleTimePercentiles: async () => ({
            ok: true as const,
            value: [],
          }),
          getPortfolioThroughput: async () => ({
            ok: true as const,
            value: {},
          }),
          getTeamWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getTeamTotalWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getPortfolioWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getPortfolioTotalWorkItemAgeOverTime: async () => ({
            ok: true as const,
            value: {},
          }),
          getFeaturesByIds: async () => ({ ok: true as const, value: [] }),
          getFeaturesByReferences: async () => ({
            ok: true as const,
            value: [],
          }),
          getFeatureWorkItems: async () => ({ ok: true as const, value: [] }),
          listDeliveries: async () => ({ ok: true as const, value: [] }),
          getDeliveryMetricsHistory: async () => ({
            ok: true as const,
            value: emptyDeliveryHistory,
          }),
          createDelivery: async () => ({ ok: true as const, value: {} }),
          updateDelivery: async () => ({ ok: true as const, value: {} }),
          deleteDelivery: async () => ({
            ok: true as const,
            value: undefined,
          }),
          runManualForecast: async () => ({ ok: true as const, value: {} }),
          runBacktest: async () => ({ ok: true as const, value: {} }),
        }) as never,
    });

    expect(registered).toHaveLength(41);

    const healthTool = registered.find(
      (tool) => tool.name === "lighthouse_health_check",
    );
    expect(healthTool).toBeDefined();
    if (healthTool === undefined) {
      throw new Error("Expected lighthouse.health.check tool to be registered");
    }

    const result = await healthTool.handler({});
    expect(result).toEqual({
      isError: false,
      content: [
        {
          type: "text",
          text: "connectivity: success",
        },
      ],
    });
  });
});
