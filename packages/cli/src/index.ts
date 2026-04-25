import {
  type LighthouseApiResult,
  type LighthouseAuthContext,
  type LighthouseAuthOverrides,
  type LighthouseClient,
  type LighthouseClientAuth,
  type StoredLighthouseAuth,
  createLighthouseAuthContext,
  createLighthouseClient,
} from "@letpeoplework/lighthouse-client";

export type CliPackageContract = {
  readonly name: "@letpeoplework/lighthouse-cli";
  readonly dependsOn: "@letpeoplework/lighthouse-client";
  readonly runtime: "command-line";
};

export const getCliPackageContract = (): CliPackageContract => ({
  name: "@letpeoplework/lighthouse-cli",
  dependsOn: "@letpeoplework/lighthouse-client",
  runtime: "command-line",
});

export type CliRuntimeConfig = {
  readonly endpointUrl: string;
};

export type CliCommandResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

type CliClientLike = Pick<LighthouseClient, "checkConnectivity" | "getVersion">;
type CliDomainClientLike = Pick<
  LighthouseClient,
  | "listWorkTrackingConnections"
  | "getWorkTrackingConnection"
  | "listTeams"
  | "getTeam"
  | "refreshTeam"
  | "listPortfolios"
  | "getPortfolio"
  | "refreshPortfolio"
>;
type CliClientOperations = CliClientLike & CliDomainClientLike;

export type RunCliCommandDependencies = {
  readonly loadConfig: () => Promise<CliRuntimeConfig | null>;
  readonly saveConfig: (config: CliRuntimeConfig) => Promise<void>;
  readonly authContext: LighthouseAuthContext;
  readonly createClient: (options: {
    readonly endpointUrl: string;
    readonly auth: LighthouseClientAuth;
  }) => CliClientOperations;
};

const getOptionValue = (
  args: readonly string[],
  optionName: string,
): string | undefined => {
  const index = args.findIndex((arg) => arg === optionName);
  if (index < 0) {
    return undefined;
  }

  return args[index + 1];
};

const getUsageText = (): string =>
  [
    "Usage:",
    "  lighthouse config endpoint set --url <lighthouse-url>",
    "  lighthouse config endpoint show",
    "  lighthouse auth status [--api-key <key>] [--bearer-token <token>]",
    "  lighthouse auth login --api-key <key> [--api-key-header <header-name>]",
    "  lighthouse auth login --bearer-token <token>",
    "  lighthouse auth logout",
    "  lighthouse worktracking list [--url <lighthouse-url>]",
    "  lighthouse worktracking get --id <connection-id> [--url <lighthouse-url>]",
    "  lighthouse team list [--url <lighthouse-url>]",
    "  lighthouse team get --id <team-id> [--url <lighthouse-url>]",
    "  lighthouse team refresh --id <team-id> [--url <lighthouse-url>]",
    "  lighthouse portfolio list [--url <lighthouse-url>]",
    "  lighthouse portfolio get --id <portfolio-id> [--url <lighthouse-url>]",
    "  lighthouse portfolio refresh --id <portfolio-id> [--url <lighthouse-url>]",
    "  lighthouse health check [--url <lighthouse-url>] [--api-key <key>] [--bearer-token <token>]",
    "  lighthouse version get [--url <lighthouse-url>] [--api-key <key>] [--bearer-token <token>]",
  ].join("\n");

const getSuccessResult = (stdout: string): CliCommandResult => ({
  exitCode: 0,
  stdout,
  stderr: "",
});

const getErrorResult = (stderr: string): CliCommandResult => ({
  exitCode: 1,
  stdout: "",
  stderr,
});

const getEndpointUrl = (
  args: readonly string[],
  config: CliRuntimeConfig | null,
): string | null => {
  const explicitUrl = getOptionValue(args, "--url");
  if (explicitUrl !== undefined && explicitUrl.trim().length > 0) {
    return explicitUrl;
  }

  if (config === null) {
    return null;
  }

  return config.endpointUrl;
};

const mapApiResultToCliResult = <TValue>(
  result: LighthouseApiResult<TValue>,
): CliCommandResult => {
  if (result.ok) {
    if (result.value === undefined) {
      return getSuccessResult("ok");
    }

    return getSuccessResult(JSON.stringify(result.value));
  }

  return getErrorResult(`${result.error.category}: ${result.error.reason}`);
};

const getAuthOverrides = (
  args: readonly string[],
): LighthouseAuthOverrides => ({
  apiKey: getOptionValue(args, "--api-key"),
  bearerToken: getOptionValue(args, "--bearer-token"),
  apiKeyHeaderName: getOptionValue(args, "--api-key-header"),
});

const mapStatusToMessage = (
  status: Awaited<ReturnType<LighthouseAuthContext["getStatus"]>>,
): string => {
  if (!status.isAuthenticated) {
    return "Auth status: not configured";
  }

  return `Auth status: ${status.kind} (${status.source})`;
};

const getRequiredIdOption = (
  args: readonly string[],
  optionName: string,
): number | null => {
  const value = getOptionValue(args, optionName);
  if (value === undefined) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
};

const getDefaultDependencies = (): RunCliCommandDependencies => ({
  loadConfig: async () => null,
  saveConfig: async () => undefined,
  authContext: createLighthouseAuthContext({
    load: async () => null,
    save: async (_auth: StoredLighthouseAuth) => undefined,
    clear: async () => undefined,
  }),
  createClient: ({ endpointUrl, auth }) => {
    return createLighthouseClient({
      connection: {
        kind: "explicit",
        lighthouseUrl: endpointUrl,
      },
      auth,
    });
  },
});

export const runCliCommand = async (
  args: readonly string[],
  inputDependencies?: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const dependencies = inputDependencies ?? getDefaultDependencies();

  if (args.length < 2) {
    return getErrorResult(getUsageText());
  }

  const [scope, action, subject] = args;

  if (scope === "config" && action === "endpoint" && subject === "set") {
    const endpointUrl = getOptionValue(args, "--url");
    if (endpointUrl === undefined || endpointUrl.trim().length === 0) {
      return getErrorResult("Missing required --url for endpoint set.");
    }

    await dependencies.saveConfig({ endpointUrl });

    return getSuccessResult(`Endpoint saved: ${endpointUrl}`);
  }

  if (scope === "config" && action === "endpoint" && subject === "show") {
    const config = await dependencies.loadConfig();
    if (config === null) {
      return getErrorResult("No endpoint configured.");
    }

    return getSuccessResult(`Configured endpoint: ${config.endpointUrl}`);
  }

  if (scope === "auth" && action === "status") {
    try {
      const status = await dependencies.authContext.getStatus(
        getAuthOverrides(args),
      );
      return getSuccessResult(mapStatusToMessage(status));
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to resolve auth status.";
      return getErrorResult(message);
    }
  }

  if (scope === "auth" && action === "login") {
    try {
      const overrides = getAuthOverrides(args);
      await dependencies.authContext.login(overrides);
      const status = await dependencies.authContext.getStatus();
      if (!status.isAuthenticated) {
        return getErrorResult("Auth login failed.");
      }

      return getSuccessResult(`Authenticated with ${status.kind}.`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Auth login failed.";
      return getErrorResult(message);
    }
  }

  if (scope === "auth" && action === "logout") {
    await dependencies.authContext.logout();
    return getSuccessResult("Authentication cleared.");
  }

  if (scope === "worktracking" && action === "list") {
    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({ endpointUrl, auth });
    const result = await client.listWorkTrackingConnections();
    return mapApiResultToCliResult(result);
  }

  if (scope === "worktracking" && action === "get") {
    const connectionId = getRequiredIdOption(args, "--id");
    if (connectionId === null) {
      return getErrorResult("Missing required --id for worktracking get.");
    }

    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({ endpointUrl, auth });
    const result = await client.getWorkTrackingConnection(connectionId);
    return mapApiResultToCliResult(result);
  }

  if (scope === "team" && action === "list") {
    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({ endpointUrl, auth });
    const result = await client.listTeams();
    return mapApiResultToCliResult(result);
  }

  if (scope === "team" && action === "get") {
    const teamId = getRequiredIdOption(args, "--id");
    if (teamId === null) {
      return getErrorResult("Missing required --id for team get.");
    }

    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({ endpointUrl, auth });
    const result = await client.getTeam(teamId);
    return mapApiResultToCliResult(result);
  }

  if (scope === "team" && action === "refresh") {
    const teamId = getRequiredIdOption(args, "--id");
    if (teamId === null) {
      return getErrorResult("Missing required --id for team refresh.");
    }

    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({ endpointUrl, auth });
    const result = await client.refreshTeam(teamId);
    if (!result.ok) {
      return getErrorResult(`${result.error.category}: ${result.error.reason}`);
    }

    return getSuccessResult(`Team refreshed: ${teamId}`);
  }

  if (scope === "portfolio" && action === "list") {
    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({ endpointUrl, auth });
    const result = await client.listPortfolios();
    return mapApiResultToCliResult(result);
  }

  if (scope === "portfolio" && action === "get") {
    const portfolioId = getRequiredIdOption(args, "--id");
    if (portfolioId === null) {
      return getErrorResult("Missing required --id for portfolio get.");
    }

    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({ endpointUrl, auth });
    const result = await client.getPortfolio(portfolioId);
    return mapApiResultToCliResult(result);
  }

  if (scope === "portfolio" && action === "refresh") {
    const portfolioId = getRequiredIdOption(args, "--id");
    if (portfolioId === null) {
      return getErrorResult("Missing required --id for portfolio refresh.");
    }

    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({ endpointUrl, auth });
    const result = await client.refreshPortfolio(portfolioId);
    if (!result.ok) {
      return getErrorResult(`${result.error.category}: ${result.error.reason}`);
    }

    return getSuccessResult(`Portfolio refreshed: ${portfolioId}`);
  }

  if (scope === "health" && action === "check") {
    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({
      endpointUrl,
      auth,
    });
    const health = await client.checkConnectivity();
    if (health.category === "success") {
      return getSuccessResult("success");
    }

    return getErrorResult(`${health.category}: ${health.reason}`);
  }

  if (scope === "version" && action === "get") {
    const config = await dependencies.loadConfig();
    const endpointUrl = getEndpointUrl(args, config);
    if (endpointUrl === null) {
      return getErrorResult(
        "No endpoint configured. Set one with 'config endpoint set --url <lighthouse-url>' or pass --url.",
      );
    }

    let auth: LighthouseClientAuth;
    try {
      auth = await dependencies.authContext.resolveAuth(getAuthOverrides(args));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve auth.";
      return getErrorResult(message);
    }

    const client = dependencies.createClient({
      endpointUrl,
      auth,
    });
    const versionResult = await client.getVersion();

    return mapApiResultToCliResult(versionResult);
  }

  return getErrorResult(getUsageText());
};
