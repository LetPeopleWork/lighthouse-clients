import {
  type LighthouseClientAuth,
  type StoredLighthouseAuth,
  createLighthouseAuthContext,
} from "@letpeoplework/lighthouse-client";
import { describe, expect, it } from "vitest";
import {
  type CliRuntimeConfig,
  type RunCliCommandDependencies,
  runCliCommand,
} from "./index";

type MockClient = {
  readonly checkConnectivity: () => Promise<{
    readonly category:
      | "success"
      | "unreachable"
      | "misconfigured"
      | "unauthorized"
      | "dependency-failure"
      | "unexpected";
    readonly reason?: string;
  }>;
  readonly getVersion: () => Promise<
    | {
        readonly ok: true;
        readonly value: string;
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly listWorkTrackingConnections: () => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getWorkTrackingConnection: (id: number) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly listTeams: () => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getTeam: (id: number) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly refreshTeam: (id: number) => Promise<{
    readonly ok: true;
    readonly value: undefined;
  }>;
  readonly listPortfolios: () => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getPortfolio: (id: number) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly refreshPortfolio: (id: number) => Promise<{
    readonly ok: true;
    readonly value: undefined;
  }>;
  readonly getTeamThroughput: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getTeamCycleTimePercentiles: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getPortfolioThroughput: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getFeaturesByIds: (ids: readonly number[]) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getFeaturesByReferences: (refs: readonly string[]) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getFeatureWorkItems: (featureId: number) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly listDeliveries: (portfolioId: number) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly createDelivery: (
    portfolioId: number,
    payload: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly updateDelivery: (
    deliveryId: number,
    payload: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly deleteDelivery: (deliveryId: number) => Promise<{
    readonly ok: true;
    readonly value: undefined;
  }>;
  readonly runManualForecast: (
    teamId: number,
    payload: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly runBacktest: (
    teamId: number,
    payload: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
};

const getDefaultMockClient = (): MockClient => ({
  checkConnectivity: async () => ({ category: "success" }),
  getVersion: async () => ({ ok: true, value: "v1.2.3" }),
  listWorkTrackingConnections: async () => ({
    ok: true,
    value: [{ id: 100, name: "Jira" }],
  }),
  getWorkTrackingConnection: async (id: number) => ({
    ok: true,
    value: { id, name: "Jira" },
  }),
  listTeams: async () => ({ ok: true, value: [{ id: 1, name: "Team A" }] }),
  getTeam: async (id: number) => ({ ok: true, value: { id, name: "Team A" } }),
  refreshTeam: async () => ({ ok: true, value: undefined }),
  listPortfolios: async () => ({
    ok: true,
    value: [{ id: 7, name: "Portfolio A" }],
  }),
  getPortfolio: async (id: number) => ({
    ok: true,
    value: { id, name: "Portfolio A" },
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
});

const getDependencies = (overrides?: {
  readonly config?: CliRuntimeConfig | null;
  readonly client?: MockClient;
}): {
  readonly dependencies: RunCliCommandDependencies;
  readonly getSavedConfig: () => CliRuntimeConfig | null;
  readonly getLastAuth: () => LighthouseClientAuth | null;
} => {
  let savedConfig = overrides?.config ?? null;
  let savedAuth: StoredLighthouseAuth | null = null;
  let lastAuth: LighthouseClientAuth | null = null;

  const defaultClient: MockClient = getDefaultMockClient();

  const authContext = createLighthouseAuthContext({
    load: async () => savedAuth,
    save: async (auth: StoredLighthouseAuth) => {
      savedAuth = auth;
    },
    clear: async () => {
      savedAuth = null;
    },
  });

  return {
    dependencies: {
      loadConfig: async () => savedConfig,
      saveConfig: async (config: CliRuntimeConfig) => {
        savedConfig = config;
      },
      authContext,
      createClient: ({ auth }) => {
        lastAuth = auth;
        return overrides?.client ?? defaultClient;
      },
    },
    getSavedConfig: () => savedConfig,
    getLastAuth: () => lastAuth,
  };
};

describe("runCliCommand", () => {
  it("sets and persists endpoint config", async () => {
    const { dependencies, getSavedConfig } = getDependencies();

    const result = await runCliCommand(
      ["config", "endpoint", "set", "--url", "http://localhost:5000"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("http://localhost:5000");
    expect(getSavedConfig()).toEqual({ endpointUrl: "http://localhost:5000" });
  });

  it("shows endpoint config", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(
      ["config", "endpoint", "show"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("http://localhost:5000");
  });

  it("runs health check using explicit url argument", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(
      ["health", "check", "--url", "http://localhost:5000"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("success");
  });

  it("runs health check using configured endpoint when url is omitted", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(["health", "check"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("success");
  });

  it("returns usage error when health check has no endpoint", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(["health", "check"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("No endpoint configured");
  });

  it("reports auth status when no credentials are configured", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(["auth", "status"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("not configured");
  });

  it("logs in with api key through a non-interactive command", async () => {
    const { dependencies } = getDependencies();

    const loginResult = await runCliCommand(
      ["auth", "login", "--api-key", "secret-key"],
      dependencies,
    );

    expect(loginResult.exitCode).toBe(0);
    expect(loginResult.stdout).toContain("Authenticated");

    const statusResult = await runCliCommand(["auth", "status"], dependencies);
    expect(statusResult.exitCode).toBe(0);
    expect(statusResult.stdout).toContain("api-key");
  });

  it("reuses stored auth credentials on API commands", async () => {
    const { dependencies, getLastAuth } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    await runCliCommand(
      ["auth", "login", "--bearer-token", "stored-token"],
      dependencies,
    );

    const result = await runCliCommand(["version", "get"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(getLastAuth()).toEqual({
      kind: "bearer-token",
      token: "stored-token",
    });
  });

  it("gets version from Lighthouse", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(
      ["version", "get", "--url", "http://localhost:5000"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("v1.2.3");
  });

  it("returns client errors for version get", async () => {
    const { dependencies } = getDependencies({
      client: {
        ...getDefaultMockClient(),
        getVersion: async () => ({
          ok: false,
          error: {
            category: "unauthorized",
            reason: "Access denied",
          },
        }),
      },
    });

    const result = await runCliCommand(
      ["version", "get", "--url", "http://localhost:5000"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("unauthorized");
  });

  it("lists work-tracking connections", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(["worktracking", "list"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Jira");
  });

  it("gets one work-tracking connection by id", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(
      ["worktracking", "get", "--id", "100"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"id":100');
  });

  it("lists teams", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(["team", "list"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Team A");
  });

  it("gets one team by id", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(
      ["team", "get", "--id", "1"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"id":1');
  });

  it("refreshes one team by id", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(
      ["team", "refresh", "--id", "1"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Team refreshed");
  });

  it("lists portfolios", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(["portfolio", "list"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Portfolio A");
  });

  it("gets and refreshes one portfolio by id", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const getResult = await runCliCommand(
      ["portfolio", "get", "--id", "7"],
      dependencies,
    );

    expect(getResult.exitCode).toBe(0);
    expect(getResult.stdout).toContain('"id":7');

    const refreshResult = await runCliCommand(
      ["portfolio", "refresh", "--id", "7"],
      dependencies,
    );

    expect(refreshResult.exitCode).toBe(0);
    expect(refreshResult.stdout).toContain("Portfolio refreshed");
  });

  it("gets team throughput metrics with explicit dates", async () => {
    const throughputData = { labels: ["2026-01-01"], data: [3] };
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
      client: {
        ...getDefaultMockClient(),
        getTeamThroughput: async () => ({ ok: true, value: throughputData }),
      },
    });

    const result = await runCliCommand(
      [
        "team",
        "metrics",
        "throughput",
        "--id",
        "1",
        "--start-date",
        "2026-01-01",
        "--end-date",
        "2026-03-31",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(JSON.stringify(throughputData));
  });

  it("gets team cycle-time percentiles", async () => {
    const percentiles = [{ percentile: 50, value: 4 }];
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
      client: {
        ...getDefaultMockClient(),
        getTeamCycleTimePercentiles: async () => ({
          ok: true,
          value: percentiles,
        }),
      },
    });

    const result = await runCliCommand(
      [
        "team",
        "metrics",
        "cycleTimePercentiles",
        "--id",
        "1",
        "--start-date",
        "2026-01-01",
        "--end-date",
        "2026-03-31",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(JSON.stringify(percentiles));
  });

  it("gets portfolio throughput metrics", async () => {
    const throughputData = { labels: [], data: [] };
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
      client: {
        ...getDefaultMockClient(),
        getPortfolioThroughput: async () => ({
          ok: true,
          value: throughputData,
        }),
      },
    });

    const result = await runCliCommand(
      [
        "portfolio",
        "metrics",
        "throughput",
        "--id",
        "7",
        "--start-date",
        "2026-01-01",
        "--end-date",
        "2026-03-31",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(JSON.stringify(throughputData));
  });

  it("gets features by ids", async () => {
    const features = [{ id: 1, name: "Feature A" }];
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
      client: {
        ...getDefaultMockClient(),
        getFeaturesByIds: async () => ({ ok: true, value: features }),
      },
    });

    const result = await runCliCommand(
      ["feature", "get", "--ids", "1,2"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Feature A");
  });

  it("gets feature work items", async () => {
    const workItems = [{ id: 10, title: "Task A" }];
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
      client: {
        ...getDefaultMockClient(),
        getFeatureWorkItems: async () => ({ ok: true, value: workItems }),
      },
    });

    const result = await runCliCommand(
      ["feature", "workitems", "--id", "3"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Task A");
  });

  it("lists deliveries for a portfolio", async () => {
    const deliveries = [{ id: 1, name: "Release 1" }];
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
      client: {
        ...getDefaultMockClient(),
        listDeliveries: async () => ({ ok: true, value: deliveries }),
      },
    });

    const result = await runCliCommand(
      ["delivery", "list", "--portfolio-id", "4"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Release 1");
  });

  it("runs a manual forecast for a team", async () => {
    const forecastResult = {
      remainingItems: 5,
      whenForecasts: [],
      howManyForecasts: [],
    };
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
      client: {
        ...getDefaultMockClient(),
        runManualForecast: async () => ({ ok: true, value: forecastResult }),
      },
    });

    const result = await runCliCommand(
      ["forecast", "manual", "--team-id", "2", "--remaining", "5"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("whenForecasts");
  });

  it("runs a backtest for a team", async () => {
    const backtestResult = { actualThroughput: 10, percentiles: [] };
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
      client: {
        ...getDefaultMockClient(),
        runBacktest: async () => ({ ok: true, value: backtestResult }),
      },
    });

    const result = await runCliCommand(
      [
        "forecast",
        "backtest",
        "--team-id",
        "2",
        "--start-date",
        "2026-01-01",
        "--end-date",
        "2026-03-31",
        "--hist-start-date",
        "2025-10-01",
        "--hist-end-date",
        "2025-12-31",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("actualThroughput");
  });

  it("returns missing id error for team metrics commands", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(
      ["team", "metrics", "throughput"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--id");
  });

  it("returns missing portfolio-id error for delivery list", async () => {
    const { dependencies } = getDependencies({
      config: { endpointUrl: "http://localhost:5000" },
    });

    const result = await runCliCommand(["delivery", "list"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--portfolio-id");
  });
});
