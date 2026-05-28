import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { createMcpCoreRuntime, registerMcpTools } from "./index";

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
      "lighthouse_portfolio_metrics_throughput",
      "lighthouse_team_metrics_workItemAge",
      "lighthouse_team_metrics_totalWorkItemAge",
      "lighthouse_portfolio_metrics_workItemAge",
      "lighthouse_portfolio_metrics_totalWorkItemAge",
      "lighthouse_feature_get",
      "lighthouse_feature_workitems",
      "lighthouse_delivery_list",
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

    expect(registered).toHaveLength(28);

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
