import {
  type LighthouseApiResult,
  type LighthouseAuthContext,
  type LighthouseAuthOverrides,
  type LighthouseClient,
  type LighthouseClientAuth,
  type StoredLighthouseAuth,
  createLighthouseAuthContext,
  createLighthouseClient,
} from "@lighthouse/client";

export type CliPackageContract = {
  readonly name: "@lighthouse/cli";
  readonly dependsOn: "@lighthouse/client";
  readonly runtime: "command-line";
};

export const getCliPackageContract = (): CliPackageContract => ({
  name: "@lighthouse/cli",
  dependsOn: "@lighthouse/client",
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

export type RunCliCommandDependencies = {
  readonly loadConfig: () => Promise<CliRuntimeConfig | null>;
  readonly saveConfig: (config: CliRuntimeConfig) => Promise<void>;
  readonly authContext: LighthouseAuthContext;
  readonly createClient: (options: {
    readonly endpointUrl: string;
    readonly auth: LighthouseClientAuth;
  }) => CliClientLike;
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
