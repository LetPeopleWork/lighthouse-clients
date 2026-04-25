import { describe, expect, it } from "vitest";
import { createMcpCoreRuntime } from "./index";

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
      "lighthouse.health.check",
      "lighthouse.version.get",
      "lighthouse.worktracking.list",
      "lighthouse.worktracking.get",
      "lighthouse.team.list",
      "lighthouse.team.get",
      "lighthouse.team.refresh",
      "lighthouse.portfolio.list",
      "lighthouse.portfolio.get",
      "lighthouse.portfolio.refresh",
      "lighthouse.team.metrics.throughput",
      "lighthouse.team.metrics.cycleTimePercentiles",
      "lighthouse.portfolio.metrics.throughput",
      "lighthouse.feature.get",
      "lighthouse.feature.workitems",
      "lighthouse.delivery.list",
      "lighthouse.forecast.manual",
      "lighthouse.forecast.backtest",
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

    const result = await runtime.callTool("lighthouse.health.check", {});

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

    const result = await runtime.callTool("lighthouse.version.get", {});

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

    const result = await runtime.callTool("lighthouse.unknown", {});

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

    const result = await runtime.callTool("lighthouse.health.check", {});

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
      "lighthouse.worktracking.list",
      {},
    );
    expect(worktrackingList.isError).toBe(false);
    expect(worktrackingList.content[0]?.text).toContain("Jira");

    const teamGet = await runtime.callTool("lighthouse.team.get", { id: 5 });
    expect(teamGet.isError).toBe(false);
    expect(teamGet.content[0]?.text).toContain("Team A");

    const portfolioRefresh = await runtime.callTool(
      "lighthouse.portfolio.refresh",
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

    expect(toolNames).toContain("lighthouse.team.metrics.throughput");
    expect(toolNames).toContain("lighthouse.portfolio.metrics.throughput");
    expect(toolNames).toContain("lighthouse.feature.get");
    expect(toolNames).toContain("lighthouse.delivery.list");
    expect(toolNames).toContain("lighthouse.forecast.manual");
    expect(toolNames).toContain("lighthouse.forecast.backtest");
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
      "lighthouse.team.metrics.throughput",
      { id: 5 },
    );

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain(JSON.stringify(throughputData));
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

    const result = await runtime.callTool("lighthouse.forecast.manual", {
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

    const result = await runtime.callTool("lighthouse.delivery.list", {
      id: 4,
    });

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("Release 1");
  });
});
