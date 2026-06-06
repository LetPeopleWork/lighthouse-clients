import type {
  CliConnection,
  CliServerConnection,
  ConnectivityValidationResult,
} from "@letpeoplework/lighthouse-client";
import { describe, expect, it, vi } from "vitest";
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
  readonly createTeam: (payload: unknown) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly updateTeam: (
    id: number,
    payload: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly deleteTeam: (id: number) => Promise<{
    readonly ok: true;
    readonly value: undefined;
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
  readonly createPortfolio: (payload: unknown) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly updatePortfolio: (
    id: number,
    payload: unknown,
  ) => Promise<
    | {
        readonly ok: true;
        readonly value: unknown;
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
          readonly statusCode?: number;
        };
      }
  >;
  readonly deletePortfolio: (id: number) => Promise<{
    readonly ok: true;
    readonly value: undefined;
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
  readonly getTeamArrivals: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getTeamWipOverTime: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getTeamWip: (
    id: number,
    asOfDate: string,
  ) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getTeamCycleTimePercentiles: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getTeamCycleTimeData: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getTeamPredictabilityScore: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getTeamWorkItemAgeOverTime: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getTeamTotalWorkItemAgeOverTime: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getPortfolioThroughput: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getPortfolioCycleTimePercentiles: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getPortfolioArrivals: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getPortfolioWipOverTime: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getPortfolioWip: (
    id: number,
    asOfDate: string,
  ) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getPortfolioCycleTimeData: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly getPortfolioPredictabilityScore: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getPortfolioWorkItemAgeOverTime: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getPortfolioTotalWorkItemAgeOverTime: (
    id: number,
    range?: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly getTeamCumulativeStateTime: (
    id: number,
    range?: unknown,
    itemIds?: readonly number[],
  ) => Promise<{ readonly ok: true; readonly value: unknown }>;
  readonly getTeamCumulativeStateTimeItems: (
    id: number,
    state: string,
    range?: unknown,
    itemIds?: readonly number[],
  ) => Promise<{ readonly ok: true; readonly value: unknown }>;
  readonly getTeamCumulativeStateTimeCandidates: (
    id: number,
    range?: unknown,
  ) => Promise<{ readonly ok: true; readonly value: unknown }>;
  readonly getPortfolioCumulativeStateTime: (
    id: number,
    range?: unknown,
    itemIds?: readonly number[],
  ) => Promise<{ readonly ok: true; readonly value: unknown }>;
  readonly getPortfolioCumulativeStateTimeItems: (
    id: number,
    state: string,
    range?: unknown,
    itemIds?: readonly number[],
  ) => Promise<{ readonly ok: true; readonly value: unknown }>;
  readonly getPortfolioCumulativeStateTimeCandidates: (
    id: number,
    range?: unknown,
  ) => Promise<{ readonly ok: true; readonly value: unknown }>;
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
  readonly getRecurringBlackoutRules: () => Promise<{
    readonly ok: true;
    readonly value: readonly unknown[];
  }>;
  readonly createRecurringBlackoutRule: (payload: unknown) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly updateRecurringBlackoutRule: (
    id: number,
    payload: unknown,
  ) => Promise<{
    readonly ok: true;
    readonly value: unknown;
  }>;
  readonly deleteRecurringBlackoutRule: (id: number) => Promise<{
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
  createTeam: async (payload: unknown) => ({ ok: true, value: payload }),
  updateTeam: async (id: number, payload: unknown) => ({
    ok: true,
    value: { id, ...((payload as Record<string, unknown>) ?? {}) },
  }),
  deleteTeam: async () => ({ ok: true, value: undefined }),
  refreshTeam: async () => ({ ok: true, value: undefined }),
  listPortfolios: async () => ({
    ok: true,
    value: [{ id: 7, name: "Portfolio A" }],
  }),
  getPortfolio: async (id: number) => ({
    ok: true,
    value: { id, name: "Portfolio A" },
  }),
  createPortfolio: async (payload: unknown) => ({ ok: true, value: payload }),
  updatePortfolio: async (id: number, payload: unknown) => ({
    ok: true,
    value: { id, ...((payload as Record<string, unknown>) ?? {}) },
  }),
  deletePortfolio: async () => ({ ok: true, value: undefined }),
  refreshPortfolio: async () => ({ ok: true, value: undefined }),
  getTeamThroughput: async () => ({
    ok: true,
    value: { total: 0, workItemsPerUnitOfTime: {} },
  }),
  getTeamArrivals: async () => ({
    ok: true,
    value: { total: 0, workItemsPerUnitOfTime: {} },
  }),
  getTeamWipOverTime: async () => ({
    ok: true,
    value: { total: 0, workItemsPerUnitOfTime: {} },
  }),
  getTeamWip: async () => ({ ok: true, value: [] }),
  getTeamCycleTimePercentiles: async () => ({ ok: true, value: [] }),
  getTeamCycleTimeData: async () => ({ ok: true, value: [] }),
  getTeamPredictabilityScore: async () => ({
    ok: true,
    value: { predictabilityScore: 1 },
  }),
  getTeamWorkItemAgeOverTime: async () => ({
    ok: true,
    value: { startDate: "2026-01-01", endDate: "2026-03-31", daily: [] },
  }),
  getTeamTotalWorkItemAgeOverTime: async () => ({
    ok: true,
    value: { startDate: "2026-01-01", endDate: "2026-03-31", daily: [] },
  }),
  getPortfolioThroughput: async () => ({
    ok: true,
    value: { total: 0, workItemsPerUnitOfTime: {} },
  }),
  getPortfolioCycleTimePercentiles: async () => ({ ok: true, value: [] }),
  getPortfolioArrivals: async () => ({
    ok: true,
    value: { total: 0, workItemsPerUnitOfTime: {} },
  }),
  getPortfolioWipOverTime: async () => ({
    ok: true,
    value: { total: 0, workItemsPerUnitOfTime: {} },
  }),
  getPortfolioWip: async () => ({ ok: true, value: [] }),
  getPortfolioCycleTimeData: async () => ({ ok: true, value: [] }),
  getPortfolioPredictabilityScore: async () => ({
    ok: true,
    value: { predictabilityScore: 1 },
  }),
  getPortfolioWorkItemAgeOverTime: async () => ({
    ok: true,
    value: { startDate: "2026-01-01", endDate: "2026-03-31", daily: [] },
  }),
  getPortfolioTotalWorkItemAgeOverTime: async () => ({
    ok: true,
    value: { startDate: "2026-01-01", endDate: "2026-03-31", daily: [] },
  }),
  getTeamCumulativeStateTime: async () => ({ ok: true, value: { states: [] } }),
  getTeamCumulativeStateTimeItems: async () => ({
    ok: true,
    value: { state: "", items: [] },
  }),
  getTeamCumulativeStateTimeCandidates: async () => ({
    ok: true,
    value: { items: [] },
  }),
  getPortfolioCumulativeStateTime: async () => ({
    ok: true,
    value: { states: [] },
  }),
  getPortfolioCumulativeStateTimeItems: async () => ({
    ok: true,
    value: { state: "", items: [] },
  }),
  getPortfolioCumulativeStateTimeCandidates: async () => ({
    ok: true,
    value: { items: [] },
  }),
  getFeaturesByIds: async () => ({ ok: true, value: [] }),
  getFeaturesByReferences: async () => ({ ok: true, value: [] }),
  getFeatureWorkItems: async () => ({ ok: true, value: [] }),
  listDeliveries: async () => ({ ok: true, value: [] }),
  createDelivery: async () => ({ ok: true, value: {} }),
  updateDelivery: async () => ({ ok: true, value: {} }),
  deleteDelivery: async () => ({ ok: true, value: undefined }),
  getRecurringBlackoutRules: async () => ({ ok: true, value: [] }),
  createRecurringBlackoutRule: async (payload: unknown) => ({
    ok: true,
    value: payload,
  }),
  updateRecurringBlackoutRule: async (id: number, payload: unknown) => ({
    ok: true,
    value: { id, ...((payload as Record<string, unknown>) ?? {}) },
  }),
  deleteRecurringBlackoutRule: async () => ({ ok: true, value: undefined }),
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
  readonly validateStandaloneDiscovery?: () => Promise<ConnectivityValidationResult>;
  readonly readTextFile?: (filePath: string) => Promise<string>;
  readonly getEnvApiKey?: () => string | undefined;
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
      readTextFile:
        overrides?.readTextFile ??
        (async (filePath: string) => {
          throw new Error(`File not mocked: ${filePath}`);
        }),
      prompt: async () => promptQueue.shift() ?? "",
      openBrowser: async () => undefined,
      validateConnectivity:
        overrides?.validateConnectivity ??
        (async (url) => ({
          category: "success",
          endpoint: {
            mode: "explicit",
            lighthouseUrl: url,
            apiBaseUrl: `${url}/api`,
            healthCheckUrl: `${url}/api/v1/healthcheck`,
          },
          serverVersion: "1.0.0",
        })),
      validateStandaloneDiscovery:
        overrides?.validateStandaloneDiscovery ??
        (async () => ({
          category: "success",
          endpoint: {
            mode: "standalone",
            lighthouseUrl: "http://127.0.0.1:61234",
            apiBaseUrl: "http://127.0.0.1:61234/api",
            healthCheckUrl: "http://127.0.0.1:61234/api/v1/version/current",
          },
          serverVersion: "1.0.0",
        })),
      createClient: () => overrides?.client ?? defaultClient,
      getEnvApiKey: overrides?.getEnvApiKey,
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

    const result = await runCliCommand(["connection", "connect"], dependencies);

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
      promptResponses: ["1", "http://localhost:5000", "y", "my-api-key"],
    });

    const result = await runCliCommand(["connection", "connect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("api-key");
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.authMode).toBe("required");
    expect(conn.auth).toEqual({ kind: "api-key", value: "my-api-key" });
  });

  it("connect treats 401 as reachable (auth-enabled server)", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      promptResponses: ["1", "http://localhost:5000", "y", "tok-401"],
      validateConnectivity: async () => ({
        category: "unauthorized",
        reason: "Connectivity check failed with status 401.",
        statusCode: 401,
        endpoint: {
          lighthouseUrl: "http://localhost:5000",
          healthCheckUrl: "http://localhost:5000/api/v1/healthcheck",
        },
      }),
    });

    const result = await runCliCommand(["connection", "connect"], dependencies);

    expect(result.exitCode).toBe(0);
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

    const result = await runCliCommand(["connection", "connect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot reach server");
  });

  it("connect saves standalone connection without prompting for a URL", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      promptResponses: ["2"],
    });

    const result = await runCliCommand(["connection", "connect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("standalone Lighthouse");
    expect(getSavedConnection()).toEqual({
      mode: "standalone",
      authMode: "disabled",
    });
  });

  it("connect fails when standalone discovery is unavailable", async () => {
    const { dependencies } = getDependencies({
      promptResponses: ["2"],
      validateStandaloneDiscovery: async () => ({
        category: "misconfigured",
        reason: "Standalone discovery contract is not available.",
      }),
    });

    const result = await runCliCommand(["connection", "connect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot reach standalone Lighthouse");
  });

  it("connect fails when api key is empty and LIGHTHOUSE_API_KEY env var is not set", async () => {
    const { dependencies } = getDependencies({
      promptResponses: ["1", "http://localhost:5000", "y", ""],
    });

    const result = await runCliCommand(["connection", "connect"], dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("API key cannot be empty");
  });

  it("connect succeeds when api key is blank but LIGHTHOUSE_API_KEY env var is set", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      promptResponses: ["1", "http://localhost:5000", "y", ""],
      getEnvApiKey: () => "env-api-key",
    });

    const result = await runCliCommand(["connection", "connect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("LIGHTHOUSE_API_KEY env var");
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.authMode).toBe("required");
    expect(conn.auth).toBeUndefined();
  });

  it("connect retries https connectivity with insecure mode when accepted", async () => {
    const connectivityAttempts: Array<boolean | undefined> = [];
    const { dependencies, getSavedConnection } = getDependencies({
      promptResponses: ["1", "https://localhost:48332/", "y", "N"],
      validateConnectivity: async (_url, insecure) => {
        connectivityAttempts.push(insecure);
        if (!insecure) {
          return {
            category: "unreachable",
            reason: "fetch failed",
            endpoint: {
              lighthouseUrl: "https://localhost:48332",
              healthCheckUrl: "https://localhost:48332/api/v1/version/current",
            },
          };
        }

        return {
          category: "success",
          endpoint: {
            lighthouseUrl: "https://localhost:48332",
            healthCheckUrl: "https://localhost:48332/api/v1/version/current",
            apiBaseUrl: "https://localhost:48332/api",
            mode: "explicit",
          },
          serverVersion: "1.0.0",
        };
      },
    });

    const result = await runCliCommand(["connection", "connect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(connectivityAttempts).toEqual([undefined, true]);
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.insecure).toBe(true);
  });

  // ── scripted connect ───────────────────────────────────────────────────────

  it("scripted connect saves standalone connection", async () => {
    const { dependencies, getSavedConnection } = getDependencies();

    const result = await runCliCommand(
      ["connection", "connect", "--mode", "standalone"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("standalone Lighthouse");
    expect(getSavedConnection()).toEqual({
      mode: "standalone",
      authMode: "disabled",
    });
  });

  it("scripted connect saves server connection with auth disabled", async () => {
    const { dependencies, getSavedConnection } = getDependencies();

    const result = await runCliCommand(
      [
        "connection",
        "connect",
        "--mode",
        "server",
        "--url",
        "http://localhost:5000",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("http://localhost:5000");
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.mode).toBe("server");
    expect(conn.endpointUrl).toBe("http://localhost:5000");
    expect(conn.authMode).toBe("disabled");
    expect(conn.auth).toBeUndefined();
  });

  it("scripted connect saves server connection with api key", async () => {
    const { dependencies, getSavedConnection } = getDependencies();

    const result = await runCliCommand(
      [
        "connection",
        "connect",
        "--mode",
        "server",
        "--url",
        "http://localhost:5000",
        "--api-key",
        "my-secret-key",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("http://localhost:5000");
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.authMode).toBe("required");
    expect(conn.auth).toEqual({
      kind: "api-key",
      value: "my-secret-key",
    });
  });

  it("scripted connect saves server connection without auth when no api key supplied", async () => {
    const { dependencies, getSavedConnection } = getDependencies();

    const result = await runCliCommand(
      [
        "connection",
        "connect",
        "--mode",
        "server",
        "--url",
        "http://localhost:5000",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.authMode).toBe("disabled");
    expect(conn.auth).toBeUndefined();
  });

  it("scripted connect saves insecure server connection", async () => {
    const connectivityAttempts: Array<boolean | undefined> = [];
    const { dependencies, getSavedConnection } = getDependencies({
      validateConnectivity: async (_url, insecure) => {
        connectivityAttempts.push(insecure);
        return {
          category: "success",
          endpoint: {
            lighthouseUrl: "https://localhost:48332",
            healthCheckUrl: "https://localhost:48332/api/v1/version/current",
            apiBaseUrl: "https://localhost:48332/api",
            mode: "explicit",
          },
          serverVersion: "1.0.0",
        };
      },
    });

    const result = await runCliCommand(
      [
        "connection",
        "connect",
        "--mode",
        "server",
        "--url",
        "https://localhost:48332",
        "--insecure",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(connectivityAttempts).toEqual([true]);
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.insecure).toBe(true);
  });

  it("scripted connect fails with TLS hint when https server unreachable and --insecure not supplied", async () => {
    const { dependencies } = getDependencies({
      validateConnectivity: async () => ({
        category: "unreachable",
        reason: "certificate verify failed",
        endpoint: {
          lighthouseUrl: "https://localhost:48332",
          healthCheckUrl: "https://localhost:48332/api/v1/version/current",
        },
      }),
    });

    const result = await runCliCommand(
      [
        "connection",
        "connect",
        "--mode",
        "server",
        "--url",
        "https://localhost:48332",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--insecure");
  });

  it("scripted connect fails with invalid --mode value", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(
      ["connection", "connect", "--mode", "invalid"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--mode");
  });

  it("scripted connect fails when --mode is server but --url is missing", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(
      ["connection", "connect", "--mode", "server"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--url");
  });

  it("scripted connect fails when --url is supplied for standalone mode", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(
      [
        "connection",
        "connect",
        "--mode",
        "standalone",
        "--url",
        "http://localhost:5000",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--url");
  });

  it("scripted connect fails when --api-key is supplied for standalone mode", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(
      ["connection", "connect", "--mode", "standalone", "--api-key", "tok"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--api-key");
  });

  it("scripted connect fails when --insecure is supplied for standalone mode", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(
      ["connection", "connect", "--mode", "standalone", "--insecure"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--insecure");
  });

  it("interactive wizard still works when no connect flags are supplied", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      promptResponses: ["1", "http://localhost:5000"],
    });

    const result = await runCliCommand(["connection", "connect"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("http://localhost:5000");
    const conn = getSavedConnection() as CliServerConnection;
    expect(conn.mode).toBe("server");
    expect(conn.authMode).toBe("disabled");
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

    const result = await runCliCommand(["connection", "status"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("http://localhost:5000");
    expect(result.stdout).toContain("disabled");
    expect(result.stdout).toContain("Output: pretty");
  });

  it("connection shows api key stored when auth is required", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "required",
        auth: { kind: "api-key", value: "my-key" },
      },
    });

    const result = await runCliCommand(["connection", "status"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("API Key: stored");
  });

  it("connection shows env var hint when auth is required but key is not stored", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "required",
      },
    });

    const result = await runCliCommand(["connection", "status"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("LIGHTHOUSE_API_KEY");
  });

  it("connection shows standalone connection status", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "standalone",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(["connection", "status"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Connected to: standalone Lighthouse");
    expect(result.stdout).toContain(
      "Discovery: lockfile in Lighthouse app data",
    );
  });

  it("disconnect reports standalone connection label", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      connection: {
        mode: "standalone",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      ["connection", "disconnect"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Disconnected from standalone Lighthouse.");
    expect(getSavedConnection()).toBeNull();
  });

  it("disconnect clears saved connection", async () => {
    const { dependencies, getSavedConnection } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      ["connection", "disconnect"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Disconnected");
    expect(getSavedConnection()).toBeNull();
  });

  it("disconnect returns not-connected error when no connection is saved", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand(
      ["connection", "disconnect"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Not connected");
  });

  it("bare usage shows connect-first message when disconnected", async () => {
    const { dependencies } = getDependencies();

    const result = await runCliCommand([], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Connection: not connected");
    expect(result.stdout).toContain("Default output: pretty");
    expect(result.stdout).toContain("lh connection connect");
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
    expect(result.stdout).toContain("Top-level groups:");
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

    const result = await runCliCommand(["connection", "status"], dependencies);

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

  it("creates a team from payload json", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      [
        "team",
        "create",
        "--json",
        "--payload-json",
        '{"name":"Team B","workTrackingSystemId":100}',
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"name":"Team B"');
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

  it("updates a portfolio from payload file", async () => {
    const updatePortfolio = vi.fn(async () => ({
      ok: true as const,
      value: { id: 7, name: "Portfolio B" },
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        updatePortfolio,
      },
      readTextFile: async () => '{"name":"Portfolio B"}',
    });

    const result = await runCliCommand(
      ["portfolio", "update", "--id", "7", "--payload-file", "payload.json"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(updatePortfolio).toHaveBeenCalledWith(7, { name: "Portfolio B" });
  });

  it("surfaces a concurrency conflict from a portfolio update with retry guidance", async () => {
    const updatePortfolio = vi.fn(async () => ({
      ok: false as const,
      error: {
        category: "concurrency-conflict",
        reason:
          "This portfolio was changed by someone else. Re-fetch the current settings to obtain the latest concurrency token, then re-apply your change.",
        statusCode: 409,
      },
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        updatePortfolio,
      },
      readTextFile: async () => '{"name":"Portfolio B"}',
    });

    const result = await runCliCommand(
      ["portfolio", "update", "--id", "7", "--payload-file", "payload.json"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("concurrency-conflict");
    expect(result.stderr).toContain("changed by someone else");
    expect(result.stderr.toLowerCase()).toContain("re-fetch");
  });

  it("gets bundled team metrics with explicit dates", async () => {
    const throughputData = {
      total: 3,
      workItemsPerUnitOfTime: {
        0: [{ id: 1 }],
        1: [{ id: 2 }, { id: 3 }],
      },
      blackoutDayIndices: [1],
    };
    const arrivalsData = {
      total: 2,
      workItemsPerUnitOfTime: {
        0: [{ id: 4 }],
        1: [{ id: 5 }],
      },
      blackoutDayIndices: [0],
    };
    const wipOverTime = {
      total: 3,
      workItemsPerUnitOfTime: {
        0: [{ id: 1 }],
        1: [{ id: 1 }, { id: 2 }],
      },
      blackoutDayIndices: [0, 1],
    };
    const currentItems = [{ id: 10, workItemAge: 4 }];
    const percentiles = [{ percentile: 50, value: 4 }];
    const closedItems = [{ id: 11, cycleTime: 7 }];
    const predictability = {
      predictabilityScore: 1.25,
      percentiles,
      forecastResults: { 5: 2 },
    };
    const teamWorkItemAge = {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      daily: [
        {
          date: "2026-01-01",
          items: [{ id: 10, name: "Work Item", referenceId: "WI-10", age: 4 }],
        },
      ],
    };
    const teamTotalWorkItemAge = {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      daily: [
        { date: "2026-01-01", totalAge: 4, itemCount: 1 },
        { date: "2026-03-31", totalAge: 4, itemCount: 1 },
      ],
    };
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getTeamThroughput: async () => ({ ok: true, value: throughputData }),
        getTeamArrivals: async () => ({ ok: true, value: arrivalsData }),
        getTeamWipOverTime: async () => ({ ok: true, value: wipOverTime }),
        getTeamWip: async () => ({ ok: true, value: currentItems }),
        getTeamCycleTimePercentiles: async () => ({
          ok: true,
          value: percentiles,
        }),
        getTeamCycleTimeData: async () => ({ ok: true, value: closedItems }),
        getTeamPredictabilityScore: async () => ({
          ok: true,
          value: predictability,
        }),
        getTeamWorkItemAgeOverTime: async () => ({
          ok: true,
          value: teamWorkItemAge,
        }),
        getTeamTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: teamTotalWorkItemAge,
        }),
      },
    });

    const result = await runCliCommand(
      [
        "metrics",
        "team",
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
    const payload = JSON.parse(result.stdout) as Record<string, unknown> & {
      readonly throughput: Record<string, unknown>;
      readonly wip: Record<string, unknown>;
      readonly cycleTime: Record<string, unknown>;
      readonly blocked: Record<string, unknown>;
    };
    expect(payload.scope).toBe("team");
    expect(payload.id).toBe(1);
    expect((payload.throughput.total as number) ?? 0).toBe(3);
    expect(payload.blocked.status).toBe("unavailable");
    expect((payload.wip.current as Record<string, unknown>).count).toBe(1);
    expect(payload.predictabilityScore).toEqual({ score: 1.25 });
    expect(
      (payload.throughput.daily as readonly Record<string, unknown>[])[0],
    ).toEqual({ date: "2026-01-01", count: 1 });
    expect(
      (payload.arrivals.daily as readonly Record<string, unknown>[])[0],
    ).toEqual({ date: "2026-01-01", count: 1 });
    expect(
      (
        (payload.wip.overTime as Record<string, unknown>)
          .daily as readonly Record<string, unknown>[]
      )[0],
    ).toEqual({ date: "2026-01-01", count: 1 });
    expect(payload.totalWorkItemAge).toMatchObject({
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      daily: [
        { date: "2026-01-01", totalAge: 4, itemCount: 1 },
        { date: "2026-03-31", totalAge: 4, itemCount: 1 },
      ],
    });
    expect(
      (
        (payload.cycleTime.percentiles as Record<string, unknown>)
          .values as unknown[]
      ).length,
    ).toBe(1);
  });

  it("strips blackout markers and predictability details from bundled portfolio metrics", async () => {
    const throughputData = {
      total: 4,
      workItemsPerUnitOfTime: {
        0: [{ id: 1 }],
        1: [{ id: 2 }, { id: 3 }, { id: 4 }],
      },
      blackoutDayIndices: [1],
    };
    const arrivalsData = {
      total: 1,
      workItemsPerUnitOfTime: {
        0: [{ id: 5 }],
      },
      blackoutDayIndices: [0],
    };
    const wipOverTime = {
      total: 2,
      workItemsPerUnitOfTime: {
        0: [{ id: 1 }],
        1: [{ id: 1 }, { id: 2 }],
      },
      blackoutDayIndices: [0],
    };
    const totalWorkItemAgeInfo = {
      startDate: "2026-02-01",
      endDate: "2026-04-30",
      daily: [
        { date: "2026-02-01", totalAge: 3, itemCount: 1 },
        { date: "2026-04-30", totalAge: 7, itemCount: 1 },
      ],
    };
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
        getPortfolioArrivals: async () => ({ ok: true, value: arrivalsData }),
        getPortfolioWipOverTime: async () => ({ ok: true, value: wipOverTime }),
        getPortfolioWip: async () => ({ ok: true, value: [{ id: 42 }] }),
        getPortfolioPredictabilityScore: async () => ({
          ok: true,
          value: {
            predictabilityScore: 0.9,
            percentiles: [{ percentile: 50, value: 2 }],
            forecastResults: { 3: 4 },
          },
        }),
        getPortfolioTotalWorkItemAgeOverTime: async () => ({
          ok: true,
          value: totalWorkItemAgeInfo,
        }),
      },
    });

    const result = await runCliCommand(
      [
        "metrics",
        "portfolio",
        "--id",
        "7",
        "--json",
        "--start-date",
        "2026-02-01",
        "--end-date",
        "2026-04-30",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as Record<string, unknown> & {
      readonly throughput: Record<string, unknown>;
      readonly arrivals: Record<string, unknown>;
      readonly wip: Record<string, unknown>;
      readonly totalWorkItemAge: Record<string, unknown>;
    };

    expect(payload.scope).toBe("portfolio");
    expect(payload.predictabilityScore).toEqual({ score: 0.9 });
    expect(
      payload.throughput.daily as readonly Record<string, unknown>[],
    ).toEqual([
      { date: "2026-02-01", count: 1 },
      { date: "2026-02-02", count: 3 },
    ]);
    expect(
      payload.arrivals.daily as readonly Record<string, unknown>[],
    ).toEqual([{ date: "2026-02-01", count: 1 }]);
    expect(
      (payload.wip.overTime as Record<string, unknown>)
        .daily as readonly Record<string, unknown>[],
    ).toEqual([
      { date: "2026-02-01", count: 1 },
      { date: "2026-02-02", count: 2 },
    ]);
    expect(payload.totalWorkItemAge).toMatchObject({
      startDate: "2026-02-01",
      endDate: "2026-04-30",
      daily: [
        { date: "2026-02-01", totalAge: 3, itemCount: 1 },
        { date: "2026-04-30", totalAge: 7, itemCount: 1 },
      ],
    });
  });

  it("reuses a single team metrics date for start and end", async () => {
    const getTeamThroughput = vi.fn(async () => ({
      ok: true as const,
      value: { total: 0, workItemsPerUnitOfTime: {} },
    }));
    const getTeamWip = vi.fn(async () => ({ ok: true as const, value: [] }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getTeamThroughput,
        getTeamWip,
      },
    });

    const result = await runCliCommand(
      ["metrics", "team", "--id", "1", "--json", "--start-date", "2026-01-01"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(getTeamThroughput).toHaveBeenCalledWith(1, {
      startDate: "2026-01-01",
      endDate: "2026-01-01",
    });
    expect(getTeamWip).toHaveBeenCalledWith(1, "2026-01-01");
  });

  it("uses a 90 day default range for bundled portfolio metrics", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-26T00:00:00.000Z"));
    const getPortfolioThroughput = vi.fn(async () => ({
      ok: true as const,
      value: { total: 0, workItemsPerUnitOfTime: {} },
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getPortfolioThroughput,
      },
    });

    try {
      const result = await runCliCommand(
        ["metrics", "portfolio", "--id", "7", "--json"],
        dependencies,
      );

      expect(result.exitCode).toBe(0);
      expect(getPortfolioThroughput).toHaveBeenCalledWith(7, {
        startDate: "2026-01-26",
        endDate: "2026-04-26",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns only the requested metric when --metrics has a single value", async () => {
    const throughputData = { total: 5, workItemsPerUnitOfTime: {} };
    const getTeamThroughput = vi.fn(async () => ({
      ok: true as const,
      value: throughputData,
    }));
    const getTeamWip = vi.fn(async () => ({ ok: true as const, value: [] }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getTeamThroughput,
        getTeamWip,
      },
    });

    const result = await runCliCommand(
      ["metrics", "team", "--id", "1", "--json", "--metrics", "throughput"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as Record<string, unknown>;
    // Only requested metric present
    expect(payload.throughput).toBeDefined();
    // Unrequested metrics absent
    expect(payload.wip).toBeUndefined();
    expect(payload.cycleTime).toBeUndefined();
    expect(payload.workItemAge).toBeUndefined();
    expect(payload.arrivals).toBeUndefined();
    expect(payload.totalWorkItemAge).toBeUndefined();
    expect(payload.predictabilityScore).toBeUndefined();
    // Metadata always present
    expect(payload.schemaVersion).toBe(1);
    expect(payload.id).toBe(1);
    // Only the throughput client method was called
    expect(getTeamThroughput).toHaveBeenCalledOnce();
    expect(getTeamWip).not.toHaveBeenCalled();
  });

  it("bundles bar, candidates and drill-down for --metrics cumulativeStateTime and passes state + item-ids", async () => {
    const bar = { states: [{ state: "Doing", totalDays: 12 }] };
    const candidates = { items: [{ workItemId: 3, referenceId: "A-3" }] };
    const items = {
      state: "Doing",
      items: [{ workItemId: 3, daysContributed: 12 }],
    };
    const getTeamCumulativeStateTime = vi.fn(async () => ({
      ok: true as const,
      value: bar,
    }));
    const getTeamCumulativeStateTimeCandidates = vi.fn(async () => ({
      ok: true as const,
      value: candidates,
    }));
    const getTeamCumulativeStateTimeItems = vi.fn(async () => ({
      ok: true as const,
      value: items,
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getTeamCumulativeStateTime,
        getTeamCumulativeStateTimeCandidates,
        getTeamCumulativeStateTimeItems,
      },
    });

    const result = await runCliCommand(
      [
        "metrics",
        "team",
        "--id",
        "1",
        "--json",
        "--metrics",
        "cumulativeStateTime",
        "--state",
        "Doing",
        "--item-ids",
        "3,5",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as {
      readonly cumulativeStateTime: {
        readonly bar: unknown;
        readonly candidates: unknown;
        readonly items: unknown;
      };
    };
    expect(payload.cumulativeStateTime.bar).toEqual(bar);
    expect(payload.cumulativeStateTime.candidates).toEqual(candidates);
    expect(payload.cumulativeStateTime.items).toEqual(items);
    expect(getTeamCumulativeStateTime).toHaveBeenCalledWith(
      1,
      expect.anything(),
      [3, 5],
    );
    expect(getTeamCumulativeStateTimeItems).toHaveBeenCalledWith(
      1,
      "Doing",
      expect.anything(),
      [3, 5],
    );
  });

  it("returns only the requested metrics when --metrics has multiple values", async () => {
    const getTeamThroughput = vi.fn(async () => ({
      ok: true as const,
      value: { total: 0, workItemsPerUnitOfTime: {} },
    }));
    const getTeamWip = vi.fn(async () => ({ ok: true as const, value: [] }));
    const getTeamWipOverTime = vi.fn(async () => ({
      ok: true as const,
      value: { total: 0, workItemsPerUnitOfTime: {} },
    }));
    const getTeamArrivals = vi.fn(async () => ({
      ok: true as const,
      value: { total: 0, workItemsPerUnitOfTime: {} },
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getTeamThroughput,
        getTeamWip,
        getTeamWipOverTime,
        getTeamArrivals,
      },
    });

    const result = await runCliCommand(
      [
        "metrics",
        "team",
        "--id",
        "1",
        "--json",
        "--metrics",
        "throughput,wip,arrivals",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(payload.throughput).toBeDefined();
    expect(payload.wip).toBeDefined();
    expect(payload.arrivals).toBeDefined();
    expect(payload.cycleTime).toBeUndefined();
    expect(payload.workItemAge).toBeUndefined();
    expect(payload.totalWorkItemAge).toBeUndefined();
    expect(payload.predictabilityScore).toBeUndefined();
    // Verify only relevant methods were called
    expect(getTeamThroughput).toHaveBeenCalledOnce();
    expect(getTeamWip).toHaveBeenCalledOnce();
    expect(getTeamWipOverTime).toHaveBeenCalledOnce();
    expect(getTeamArrivals).toHaveBeenCalledOnce();
  });

  it("accepts cycletime alias and maps it to cycleTime section", async () => {
    const getTeamCycleTimePercentiles = vi.fn(async () => ({
      ok: true as const,
      value: [],
    }));
    const getTeamCycleTimeData = vi.fn(async () => ({
      ok: true as const,
      value: [],
    }));
    const getTeamThroughput = vi.fn(async () => ({
      ok: true as const,
      value: { total: 0, workItemsPerUnitOfTime: {} },
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getTeamCycleTimePercentiles,
        getTeamCycleTimeData,
        getTeamThroughput,
      },
    });

    const result = await runCliCommand(
      ["metrics", "team", "--id", "1", "--json", "--metrics", "cycletime"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(payload.cycleTime).toBeDefined();
    expect(payload.throughput).toBeUndefined();
    expect(getTeamCycleTimePercentiles).toHaveBeenCalledOnce();
    expect(getTeamCycleTimeData).toHaveBeenCalledOnce();
    expect(getTeamThroughput).not.toHaveBeenCalled();
  });

  it("works with --metrics filter for portfolio metrics", async () => {
    const getPortfolioThroughput = vi.fn(async () => ({
      ok: true as const,
      value: { total: 0, workItemsPerUnitOfTime: {} },
    }));
    const getPortfolioWip = vi.fn(async () => ({
      ok: true as const,
      value: [],
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getPortfolioThroughput,
        getPortfolioWip,
      },
    });

    const result = await runCliCommand(
      [
        "metrics",
        "portfolio",
        "--id",
        "7",
        "--json",
        "--metrics",
        "throughput",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(payload.throughput).toBeDefined();
    expect(payload.wip).toBeUndefined();
    expect(getPortfolioThroughput).toHaveBeenCalledOnce();
    expect(getPortfolioWip).not.toHaveBeenCalled();
  });

  it("returns all metrics when --metrics is omitted (backward-compat regression guard)", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      ["metrics", "team", "--id", "1", "--json"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(payload.throughput).toBeDefined();
    expect(payload.wip).toBeDefined();
    expect(payload.cycleTime).toBeDefined();
    expect(payload.workItemAge).toBeDefined();
    expect(payload.totalWorkItemAge).toBeDefined();
    expect(payload.arrivals).toBeDefined();
    expect(payload.predictabilityScore).toBeDefined();
    expect(payload.blocked).toBeDefined();
    expect(payload.workDistribution).toBeDefined();
  });

  it("fails with a clear error for an unknown metric name", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      ["metrics", "team", "--id", "1", "--metrics", "notametric"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("notametric");
    expect(result.stderr).toContain("throughput");
  });

  it("normalizes whitespace and case in --metrics values", async () => {
    const getTeamThroughput = vi.fn(async () => ({
      ok: true as const,
      value: { total: 0, workItemsPerUnitOfTime: {} },
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getTeamThroughput,
      },
    });

    // Leading/trailing whitespace around the comma and mixed-case alias
    const result = await runCliCommand(
      ["metrics", "team", "--id", "1", "--json", "--metrics", " Throughput "],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(payload.throughput).toBeDefined();
    expect(getTeamThroughput).toHaveBeenCalledOnce();
  });

  it("forwards --filter filtered to team throughput as view=filtered", async () => {
    const getTeamThroughput = vi.fn(async () => ({
      ok: true as const,
      value: { total: 0, workItemsPerUnitOfTime: {} },
    }));
    const getTeamPredictabilityScore = vi.fn(async () => ({
      ok: true as const,
      value: {},
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getTeamThroughput,
        getTeamPredictabilityScore,
      },
    });

    const result = await runCliCommand(
      [
        "metrics",
        "team",
        "--id",
        "1",
        "--json",
        "--metrics",
        "throughput,predictabilityScore",
        "--filter",
        "filtered",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(getTeamThroughput).toHaveBeenCalledWith(
      1,
      expect.anything(),
      "filtered",
    );
    expect(getTeamPredictabilityScore).toHaveBeenCalledWith(
      1,
      expect.anything(),
      "filtered",
    );
  });

  it("rejects --filter on metrics portfolio (per-team feature only)", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: getDefaultMockClient(),
    });

    const result = await runCliCommand(
      ["metrics", "portfolio", "--id", "1", "--filter", "filtered"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "`--filter` is only supported on `metrics team`",
    );
  });

  it("rejects invalid --filter on metrics team", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: getDefaultMockClient(),
    });

    const result = await runCliCommand(
      ["metrics", "team", "--id", "1", "--filter", "weird"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid --filter value: weird");
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

  it("threads --filter filtered through manual forecast as applyFilterOverride=true", async () => {
    const runManualForecast = vi.fn(async () => ({
      ok: true as const,
      value: {},
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: { ...getDefaultMockClient(), runManualForecast },
    });

    const result = await runCliCommand(
      [
        "forecast",
        "manual",
        "--team-id",
        "2",
        "--remaining",
        "5",
        "--filter",
        "filtered",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const [, payload] = runManualForecast.mock.calls[0] ?? [];
    expect(
      (payload as { applyFilterOverride?: boolean }).applyFilterOverride,
    ).toBe(true);
  });

  it("threads --filter raw through backtest as applyFilterOverride=false", async () => {
    const runBacktest = vi.fn(async () => ({ ok: true as const, value: {} }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: { ...getDefaultMockClient(), runBacktest },
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
        "--filter",
        "raw",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const [, payload] = runBacktest.mock.calls[0] ?? [];
    expect(
      (payload as { applyFilterOverride?: boolean }).applyFilterOverride,
    ).toBe(false);
  });

  it("rejects invalid --filter on forecast manual", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: getDefaultMockClient(),
    });

    const result = await runCliCommand(
      [
        "forecast",
        "manual",
        "--team-id",
        "2",
        "--remaining",
        "5",
        "--filter",
        "weird",
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Invalid --filter value: weird");
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

    const result = await runCliCommand(
      ["connection", "status", "--json"],
      dependencies,
    );

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

    const result = await runCliCommand(["metrics", "team"], dependencies);

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

  it("lists recurring blackout rules", async () => {
    const rules = [{ id: 3, description: "Sprint review" }];
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: {
        ...getDefaultMockClient(),
        getRecurringBlackoutRules: async () => ({ ok: true, value: rules }),
      },
    });

    const result = await runCliCommand(["blackout", "list"], dependencies);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Sprint review");
  });

  it("creates a recurring blackout rule from a JSON payload", async () => {
    const createRecurringBlackoutRule = vi.fn(async () => ({
      ok: true as const,
      value: { id: 4 },
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: { ...getDefaultMockClient(), createRecurringBlackoutRule },
    });

    const result = await runCliCommand(
      [
        "blackout",
        "create",
        "--payload-json",
        JSON.stringify({
          weekdays: ["Monday"],
          intervalWeeks: 2,
          start: "2026-06-01",
          end: null,
          description: "Recurring",
        }),
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const [payload] = createRecurringBlackoutRule.mock.calls[0] ?? [];
    expect((payload as { description?: string }).description).toBe("Recurring");
  });

  it("updates a recurring blackout rule by id", async () => {
    const updateRecurringBlackoutRule = vi.fn(async () => ({
      ok: true as const,
      value: { id: 7 },
    }));
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
      client: { ...getDefaultMockClient(), updateRecurringBlackoutRule },
    });

    const result = await runCliCommand(
      [
        "blackout",
        "update",
        "--id",
        "7",
        "--payload-json",
        JSON.stringify({
          weekdays: ["Friday"],
          intervalWeeks: 1,
          start: "2026-06-01",
          end: null,
          description: "Updated",
        }),
      ],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    const [id] = updateRecurringBlackoutRule.mock.calls[0] ?? [];
    expect(id).toBe(7);
  });

  it("deletes a recurring blackout rule by id", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      ["blackout", "delete", "--id", "9"],
      dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("9");
  });

  it("reports a missing id for blackout update", async () => {
    const { dependencies } = getDependencies({
      connection: {
        mode: "server",
        endpointUrl: "http://localhost:5000",
        authMode: "disabled",
      },
    });

    const result = await runCliCommand(
      ["blackout", "update", "--payload-json", "{}"],
      dependencies,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("--id");
  });
});
