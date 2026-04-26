import type {
  CliAuthSessionPollResult,
  CliAuthSessionStartOutcome,
  CliConnection,
  CliServerConnection,
  ConnectivityValidationResult,
  ServerAuthModeResult,
} from "@letpeoplework/lighthouse-client";
import { describe, expect, it } from "vitest";
import { type RunCliCommandDependencies, runCliCommand } from "./index";
import type { OutputFormat } from "./output";

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
  readonly outputFormat?: OutputFormat | null;
  readonly client?: MockClient;
  readonly promptResponses?: readonly string[];
  readonly validateConnectivity?: (
    url: string,
    insecure?: boolean,
  ) => Promise<ConnectivityValidationResult>;
  readonly queryAuthMode?: (
    url: string,
    insecure?: boolean,
  ) => Promise<ServerAuthModeResult>;
  readonly startAuthSession?: (
    url: string,
    insecure?: boolean,
  ) => Promise<CliAuthSessionStartOutcome>;
  readonly pollCliAuthSession?: (
    url: string,
    sessionId: string,
    insecure?: boolean,
  ) => Promise<CliAuthSessionPollResult>;
}): {
  readonly dependencies: RunCliCommandDependencies;
  readonly getSavedConnection: () => CliConnection | null;
  readonly getSavedOutputFormat: () => OutputFormat | null;
} => {
  let savedConnection: CliConnection | null = overrides?.connection ?? null;
  let savedOutputFormat: OutputFormat | null = overrides?.outputFormat ?? null;
  const promptQueue = (overrides?.promptResponses ?? []).slice();

  const defaultClient = getDefaultMockClient();

  return {
    dependencies: {
      loadConnection: async () => savedConnection,
      saveConnection: async (conn: CliConnection | null) => {
        savedConnection = conn;
      },
      loadOutputFormat: async () => savedOutputFormat,
      saveOutputFormat: async (outputFormat: OutputFormat) => {
        savedOutputFormat = outputFormat;
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
      startAuthSession:
        overrides?.startAuthSession ??
        (async () => ({
          status: "error" as const,
          category: "unreachable" as const,
          reason: "Auth session starter not mocked.",
        })),
      pollCliAuthSession:
        overrides?.pollCliAuthSession ??
        (async () => ({ status: "pending" as const })),
      createClient: () => overrides?.client ?? defaultClient,
    },
    getSavedConnection: () => savedConnection,
    getSavedOutputFormat: () => savedOutputFormat,
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
        status: "started",
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

  it("connect treats 401 as reachable (auth-enabled server)", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      promptResponses: ["1", "http://localhost:5000"],
      validateConnectivity: async () => ({
        category: "unauthorized",
        reason: "Connectivity check failed with status 401.",
        statusCode: 401,
        endpoint: {
          lighthouseUrl: "http://localhost:5000",
          healthCheckUrl: "http://localhost:5000/api/v1/healthcheck",
        },
      }),
      queryAuthMode: async () => ({ mode: "required" }),
      startAuthSession: async (url) => ({
        status: "started",
        sessionId: "sess-401",
        verificationUrl: `${url}/verify/sess-401`,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      }),
      pollCliAuthSession: async () => ({
        status: "approved" as const,
        token: "tok-401",
        userName: "bob",
      }),
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("bob");
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.authMode).toBe("required");
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
      startAuthSession: async () => ({
        status: "error",
        category: "unreachable",
        reason: "socket hang up",
      }),
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "Failed to start an authentication session",
    );
  });

  it("connect retries https connectivity with insecure mode when accepted", async () => {
    const connectivityAttempts: Array<boolean | undefined> = [];
    const { dependencies, getSavedConnection } = getDependencies({
      promptResponses: ["1", "https://localhost:48332/", "y"],
      validateConnectivity: async (_url, insecure) => {
        connectivityAttempts.push(insecure);
        if (!insecure) {
          return {
            category: "unreachable",
            reason: "fetch failed",
            endpoint: {
              lighthouseUrl: "https://localhost:48332",
              healthCheckUrl: "https://localhost:48332/api/v1/version",
            },
          };
        }

        return {
          category: "success",
          endpoint: {
            lighthouseUrl: "https://localhost:48332",
            healthCheckUrl: "https://localhost:48332/api/v1/version",
            apiBaseUrl: "https://localhost:48332/api",
            mode: "explicit",
          },
          serverVersion: "1.0.0",
        };
      },
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(connectivityAttempts).toEqual([undefined, true]);
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.insecure).toBe(true);
  });

  it("connect fails fast when auth mode is blocked", async () => {
    const { dependencies } = getDependencies({
      promptResponses: ["1", "http://localhost:5000"],
      queryAuthMode: async () => ({
        mode: "blocked",
        misconfigurationMessage: "Premium license required.",
      }),
    });

    const result = await runCliCommand(["connect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Premium license required");
  });

  it("connect fails when authorization is denied", async () => {
    const { dependencies } = getDependencies({
      promptResponses: ["1", "http://localhost:5000"],
      queryAuthMode: async () => ({ mode: "required" }),
      startAuthSession: async (url) => ({
        status: "started",
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
    expect(result.stdout).toContain("Output: pretty");
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

  it("disconnect clears saved connection", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["disconnect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Disconnected");
    expect(getSavedConnection()).toBeNull();
  });

  it("disconnect returns not-connected error when no connection is saved", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(["disconnect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Not connected");
  });

  it("bare usage shows connect-first message when disconnected", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand([], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "You must be connected before running commands",
    );
    expect(result.stdout).toContain("Default output: pretty");
    expect(result.stdout).toContain("lh connect");
  });

  it("bare usage shows connection summary and commands when connected", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "https://localhost:48332",
        authMode: "required",
        insecure: true,
        auth: { kind: "bearer-token", token: "token" },
      },
    });

    const result = await runCliCommand([], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Connection:");
    expect(result.stdout).toContain("Connected to: https://localhost:48332");
    expect(result.stdout).toContain("Output: pretty");
    expect(result.stdout).toContain(
      "TLS: insecure certificate verification enabled",
    );
    expect(result.stdout).toContain("lh health check");
  });

  it("shows configured output format in bare usage when connected", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      outputFormat: "json",
    });

    const result = await runCliCommand([], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Output: json");
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
    expect(result.stdout).toContain("Jira [id: 100]");
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
    expect(result.stdout).toContain("Team A [id: 1]");
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
    expect(getResult.stdout).toContain("Portfolio A [id: 7]");

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
        "--json",
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
        "--json",
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
        "--json",
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

  it("uses pretty output by default for payloads", async () => {
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
    expect(result.stdout).toContain("Team A [id: 1]");
    expect(result.stdout).not.toContain('{"id":1');
  });

  it("returns raw endpoint json when --json is provided", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      ["team", "get", "--id", "1", "--json"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('{"id":1,"name":"Team A"}');
  });

  it("formats payloads as toon when --toon is provided", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      ["team", "list", "--toon"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Team A");
    expect(result.stdout).not.toContain('{"id":1');
  });

  it("uses the saved default output format when no explicit flag is provided", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      outputFormat: "json",
    });

    const result = await runCliCommand(
      ["team", "get", "--id", "1"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('{"id":1,"name":"Team A"}');
  });

  it("lets explicit format flags override the saved default", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      outputFormat: "json",
    });

    const result = await runCliCommand(
      ["team", "get", "--id", "1", "--pretty"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Team A [id: 1]");
  });

  it("rejects multiple output format flags in the same command", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      ["team", "get", "--id", "1", "--json", "--pretty"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Multiple output format flags");
  });

  it("shows the current default output format", async () => {
    const { dependencies } = getDependencies({
      outputFormat: "toon",
    });

    const result = await runCliCommand(["config", "output"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("toon");
  });

  it("saves the configured default output format", async () => {
    const { dependencies, getSavedOutputFormat } = getDependencies();

    const result = await runCliCommand(
      ["config", "output", "set", "--format", "json"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("json");
    expect(getSavedOutputFormat()).toBe("json");
  });

  it("keeps status output as plain text even when a format flag is provided", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["connection", "--json"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Connected to: http://localhost:5000");
    expect(result.stdout).not.toContain('{"');
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
