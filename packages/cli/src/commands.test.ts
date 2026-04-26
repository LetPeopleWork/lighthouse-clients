import type {
  CliAuthSessionPollResult,
  CliAuthSessionStartResult,
  CliConnection,
  CliServerConnection,
  ConnectivityValidationResult,
  ServerAuthModeResult,
} from "@letpeoplework/lighthouse-client";
import { describe, expect, it } from "vitest";
import { type RunCliCommandDependencies, runCliCommand } from "./index";

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
  readonly connection?: CliConnection | null;
  readonly client?: MockClient;
  readonly promptResponses?: readonly string[];
  readonly validateConnectivity?: (
    url: string,
  ) => Promise<ConnectivityValidationResult>;
  readonly queryAuthMode?: (url: string) => Promise<ServerAuthModeResult>;
  readonly startAuthSession?: (
    url: string,
  ) => Promise<CliAuthSessionStartResult | null>;
  readonly pollCliAuthSession?: (
    url: string,
    sessionId: string,
  ) => Promise<CliAuthSessionPollResult>;
}): {
  readonly dependencies: RunCliCommandDependencies;
  readonly getSavedConnection: () => CliConnection | null;
} => {
  let savedConnection: CliConnection | null = overrides?.connection ?? null;
  const promptQueue = (overrides?.promptResponses ?? []).slice();

  const defaultClient = getDefaultMockClient();

  return {
    dependencies: {
      loadConnection: async () => savedConnection,
      saveConnection: async (conn: CliConnection) => {
        savedConnection = conn;
      },
      prompt: async () => promptQueue.shift() ?? "",
      openBrowser: async () => undefined,
      validateConnectivity:
        overrides?.validateConnectivity ??
        (async (url) => ({
          category: "success",
          endpoint: {
            lighthouseUrl: url,
            healthCheckUrl: `${url}/api/v1/healthcheck`,
          },
          serverVersion: "1.0.0",
        })),
      queryAuthMode:
        overrides?.queryAuthMode ?? (async () => ({ mode: "disabled" })),
      startAuthSession: overrides?.startAuthSession ?? (async () => null),
      pollCliAuthSession:
        overrides?.pollCliAuthSession ??
        (async () => ({ status: "pending" as const })),
      createClient: () => overrides?.client ?? defaultClient,
    },
    getSavedConnection: () => savedConnection,
  };
};

describe("runCliCommand", () => {
  // ── connect ────────────────────────────────────────────────────────────────

  it("connect saves connection without auth", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      promptResponses: ["1", "http://localhost:5000"],
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("http://localhost:5000");
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.mode).toBe("server");
    expect(conn.endpointUrl).toBe("http://localhost:5000");
    expect(conn.authMode).toBe("disabled");
    expect(conn.auth).toBeUndefined();
  });

  it("connect saves connection with auth flow", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      promptResponses: ["1", "http://localhost:5000"],
      queryAuthMode: async () => ({ mode: "required" }),
      startAuthSession: async (url) => ({
        sessionId: "sess-123",
        verificationUrl: `${url}/verify/sess-123`,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      }),
      pollCliAuthSession: async () => ({
        status: "approved" as const,
        token: "tok-abc",
        userName: "alice",
      }),
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("alice");
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.authMode).toBe("required");
    expect(conn.auth).toEqual({ kind: "bearer-token", token: "tok-abc" });
  });

  it("connect fails when server is unreachable", async () => {
    const { dependencies } = getDependencies({
      promptResponses: ["1", "http://bad-host"],
      validateConnectivity: async () => ({
        category: "unreachable",
        reason: "Connection refused",
        endpoint: {
          lighthouseUrl: "http://bad-host",
          healthCheckUrl: "http://bad-host/api/v1/healthcheck",
        },
      }),
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot reach server");
  });

  it("connect fails for standalone mode selection", async () => {
    const { dependencies } = getDependencies({
      promptResponses: ["2"],
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("not yet supported");
  });

  it("connect fails when auth session cannot be started", async () => {
    const { dependencies } = getDependencies({
      promptResponses: ["1", "http://localhost:5000"],
      queryAuthMode: async () => ({ mode: "required" }),
      startAuthSession: async () => null,
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "Failed to start an authentication session",
    );
  });

  it("connect fails when authorization is denied", async () => {
    const { dependencies } = getDependencies({
      promptResponses: ["1", "http://localhost:5000"],
      queryAuthMode: async () => ({ mode: "required" }),
      startAuthSession: async (url) => ({
        sessionId: "sess-xyz",
        verificationUrl: `${url}/verify/sess-xyz`,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      }),
      pollCliAuthSession: async () => ({ status: "denied" as const }),
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("timed out or was denied");
  });

  // ── connection ─────────────────────────────────────────────────────────────

  it("connection shows server connection status", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["connection"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("http://localhost:5000");
    expect(result.stdout).toContain("disabled");
  });

  it("connection shows auth token stored when auth is required", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "required",
        auth: { kind: "bearer-token", token: "tok" },
      },
    });

    const result = await runCliCommand(["connection"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("token stored");
  });

  it("connection shows not-connected when no connection is saved", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(["connection"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Not connected");
  });

  // ── operational commands fail when not connected ───────────────────────────

  it("returns not-connected error for all operational commands when no connection", async () => {
    const { dependencies } = getDependencies();
    const commands: readonly string[][] = [
      ["health", "check"],
      ["version", "get"],
      ["worktracking", "list"],
      ["team", "list"],
      ["portfolio", "list"],
    ];
    for (const cmd of commands) {
      const result = await runCliCommand(cmd, dependencies);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Not connected");
    }
  });

  it("runs health check when connected", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["health", "check"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("success");
  });

  it("gets version from Lighthouse", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["version", "get"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("v1.2.3");
  });

  it("returns client errors for version get", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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

    const result = await runCliCommand(["version", "get"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("unauthorized");
  });

  it("lists work-tracking connections", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["worktracking", "list"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Jira");
  });

  it("gets one work-tracking connection by id", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["team", "list"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Team A");
  });

  it("gets one team by id", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["portfolio", "list"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Portfolio A");
  });

  it("gets and refreshes one portfolio by id", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
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
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["delivery", "list"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--portfolio-id");
  });
});
