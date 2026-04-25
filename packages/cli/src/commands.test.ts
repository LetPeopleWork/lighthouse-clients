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
};

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

  const defaultClient: MockClient = {
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
    listTeams: async () => ({
      ok: true,
      value: [{ id: 1, name: "Team A" }],
    }),
    getTeam: async (id: number) => ({
      ok: true,
      value: { id, name: "Team A" },
    }),
    refreshTeam: async () => ({
      ok: true,
      value: undefined,
    }),
    listPortfolios: async () => ({
      ok: true,
      value: [{ id: 7, name: "Portfolio A" }],
    }),
    getPortfolio: async (id: number) => ({
      ok: true,
      value: { id, name: "Portfolio A" },
    }),
    refreshPortfolio: async () => ({
      ok: true,
      value: undefined,
    }),
  };

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
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({
          ok: false,
          error: {
            category: "unauthorized",
            reason: "Access denied",
          },
        }),
        listWorkTrackingConnections: async () => ({ ok: true, value: [] }),
        getWorkTrackingConnection: async () => ({ ok: true, value: {} }),
        listTeams: async () => ({ ok: true, value: [] }),
        getTeam: async () => ({ ok: true, value: {} }),
        refreshTeam: async () => ({ ok: true, value: undefined }),
        listPortfolios: async () => ({ ok: true, value: [] }),
        getPortfolio: async () => ({ ok: true, value: {} }),
        refreshPortfolio: async () => ({ ok: true, value: undefined }),
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
});
