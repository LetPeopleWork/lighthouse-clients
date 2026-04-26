import {
  type CliAuthSessionPollResult,
  type CliAuthSessionStartOutcome,
  type CliConnection,
  type CliServerConnection,
  type ConnectivityValidationResult,
  type LighthouseApiResult,
  type LighthouseClient,
  type ServerAuthModeResult,
  createLighthouseClient,
  getDefaultMetricsDateRange,
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
  | "getTeamThroughput"
  | "getTeamCycleTimePercentiles"
  | "getPortfolioThroughput"
  | "getFeaturesByIds"
  | "getFeaturesByReferences"
  | "getFeatureWorkItems"
  | "listDeliveries"
  | "createDelivery"
  | "updateDelivery"
  | "deleteDelivery"
  | "runManualForecast"
  | "runBacktest"
>;
type CliClientOperations = CliClientLike & CliDomainClientLike;

export type RunCliCommandDependencies = {
  readonly loadConnection: () => Promise<CliConnection | null>;
  readonly saveConnection: (connection: CliConnection | null) => Promise<void>;
  readonly prompt: (question: string) => Promise<string>;
  readonly openBrowser: (url: string) => Promise<void>;
  readonly validateConnectivity: (
    url: string,
    insecure?: boolean,
  ) => Promise<ConnectivityValidationResult>;
  readonly queryAuthMode: (
    url: string,
    insecure?: boolean,
  ) => Promise<ServerAuthModeResult>;
  readonly startAuthSession: (
    url: string,
    insecure?: boolean,
  ) => Promise<CliAuthSessionStartOutcome>;
  readonly pollCliAuthSession: (
    url: string,
    sessionId: string,
    insecure?: boolean,
  ) => Promise<CliAuthSessionPollResult>;
  readonly createClient: (
    connection: CliServerConnection,
  ) => CliClientOperations;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const getOptionValue = (
  args: readonly string[],
  optionName: string,
): string | undefined => {
  const index = args.indexOf(optionName);
  if (index < 0) {
    return undefined;
  }
  return args[index + 1];
};

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

// ── requireConnection ─────────────────────────────────────────────────────────

const requireConnection = async (
  dependencies: RunCliCommandDependencies,
): Promise<CliServerConnection | CliCommandResult> => {
  const connection = await dependencies.loadConnection();
  if (connection === null) {
    return getErrorResult(
      'Not connected. Run "lh connect" to connect to a Lighthouse server.',
    );
  }
  return connection;
};

const isCliCommandResult = (value: unknown): value is CliCommandResult =>
  typeof value === "object" &&
  value !== null &&
  "exitCode" in value &&
  "stdout" in value &&
  "stderr" in value;

const isServerReachable = (
  result: ConnectivityValidationResult,
): result is Extract<
  ConnectivityValidationResult,
  { readonly category: "success" | "unauthorized" }
> => result.category === "success" || result.category === "unauthorized";

const getConnectionStatusLines = (
  connection: CliServerConnection,
): string[] => {
  const lines: string[] = [
    `Connected to: ${connection.endpointUrl}`,
    `Auth: ${connection.authMode}`,
  ];

  if (connection.insecure) {
    lines.push("TLS: insecure certificate verification enabled");
  }

  if (connection.authMode === "required") {
    if (connection.auth === undefined) {
      lines.push("Token: none - re-run lh connect to authenticate");
    } else {
      lines.push("Token: token stored");
    }
  }

  return lines;
};

const getAuthSessionStartErrorMessage = (
  url: string,
  outcome: Exclude<CliAuthSessionStartOutcome, { status: "started" }>,
): string => {
  const defaultReason = `Failed to start authentication session (${outcome.category}).`;
  const reason =
    outcome.reason.trim().length > 0 ? outcome.reason : defaultReason;

  if (outcome.category === "unauthorized") {
    return `Authentication session request was rejected by ${url}: ${reason}`;
  }

  if (outcome.category === "misconfigured") {
    return `Authentication session endpoint is unavailable at ${url}: ${reason}`;
  }

  return `Failed to start an authentication session at ${url}: ${reason}`;
};

// ── connect wizard ─────────────────────────────────────────────────────────────

const runConnect = async (
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const modeInput = await dependencies.prompt(
    "Select connection mode:\n  1) Server (connect to a Lighthouse instance)\n  2) Standalone (local embedded mode)\n> ",
  );

  if (modeInput.trim() !== "1") {
    return getErrorResult(
      "Standalone mode is not yet supported. Please choose server mode (1).",
    );
  }

  const url = await dependencies.prompt("Lighthouse server URL: ");

  let insecure = false;

  const validationResult = await dependencies.validateConnectivity(url);
  if (!isServerReachable(validationResult)) {
    if (url.toLowerCase().startsWith("https://")) {
      const retry = await dependencies.prompt(
        `\nCannot reach server (${validationResult.reason}).\nThis may be a TLS certificate issue (e.g. self-signed cert).\nSkip TLS certificate verification? [y/N] `,
      );
      if (retry.trim().toLowerCase() !== "y") {
        return getErrorResult(
          `Cannot reach server at ${url}: ${validationResult.reason}`,
        );
      }
      const insecureResult = await dependencies.validateConnectivity(url, true);
      if (!isServerReachable(insecureResult)) {
        return getErrorResult(
          `Cannot reach server at ${url}: ${insecureResult.reason}`,
        );
      }
      insecure = true;
    } else {
      return getErrorResult(
        `Cannot reach server at ${url}: ${validationResult.reason}`,
      );
    }
  }

  const authModeResult = await dependencies.queryAuthMode(
    url,
    insecure || undefined,
  );

  if (authModeResult.mode === "blocked") {
    return getErrorResult(
      authModeResult.misconfigurationMessage ??
        "Authentication is blocked by server configuration.",
    );
  }

  if (authModeResult.mode === "misconfigured") {
    return getErrorResult(
      authModeResult.misconfigurationMessage ??
        "Authentication appears to be misconfigured on the server.",
    );
  }

  if (authModeResult.mode === "disabled") {
    const connection: CliServerConnection = {
      mode: "server",
      endpointUrl: url,
      authMode: "disabled",
      ...(insecure ? { insecure: true } : {}),
    };
    await dependencies.saveConnection(connection);
    return getSuccessResult(`Connected to ${url} (auth: disabled)`);
  }

  // Auth required — start device-authorization flow
  const session = await dependencies.startAuthSession(
    url,
    insecure || undefined,
  );
  if (session.status === "error") {
    return getErrorResult(getAuthSessionStartErrorMessage(url, session));
  }

  await dependencies.openBrowser(session.verificationUrl);

  const maxTries = 60; // 2 minutes at ~2s per poll
  for (let tries = 0; tries < maxTries; tries++) {
    const pollResult = await dependencies.pollCliAuthSession(
      url,
      session.sessionId,
      insecure || undefined,
    );

    if (pollResult.status === "approved") {
      const connection: CliServerConnection = {
        mode: "server",
        endpointUrl: url,
        authMode: "required",
        ...(insecure ? { insecure: true } : {}),
        auth: { kind: "bearer-token", token: pollResult.token },
      };
      await dependencies.saveConnection(connection);
      return getSuccessResult(`Connected to ${url} as ${pollResult.userName}`);
    }

    if (
      pollResult.status === "denied" ||
      pollResult.status === "expired" ||
      pollResult.status === "not-found"
    ) {
      return getErrorResult("Authorization timed out or was denied.");
    }

    // status === "pending" — wait before polling again
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    });
  }

  return getErrorResult("Authorization timed out or was denied.");
};

// ── connection status ──────────────────────────────────────────────────────────

const runConnectionStatus = async (
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const connection = await dependencies.loadConnection();
  if (connection === null) {
    return getErrorResult(
      'Not connected. Run "lh connect" to set up a connection.',
    );
  }

  return getSuccessResult(getConnectionStatusLines(connection).join("\n"));
};

const runDisconnect = async (
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const connection = await dependencies.loadConnection();
  if (connection === null) {
    return getErrorResult(
      "Not connected. There is no saved connection to disconnect.",
    );
  }

  await dependencies.saveConnection(null);
  return getSuccessResult(`Disconnected from ${connection.endpointUrl}.`);
};

// ── usage text ───────────────────────────────────────────────────────────────

const getUsageText = async (
  dependencies: RunCliCommandDependencies,
): Promise<string> => {
  const connection = await dependencies.loadConnection();
  const lines: string[] = [
    "Usage:",
    "  lh connect",
    "  lh connection",
    "  lh disconnect",
  ];
  if (connection === null) {
    lines.push(
      "",
      "You must be connected before running commands.",
      "",
      'Run "lh connect" to connect to a Lighthouse server.',
    );
  } else {
    lines.push("", "Connection:", ...getConnectionStatusLines(connection));
    lines.push("");
    lines.push(
      "  lh health check",
      "  lh version get",
      "",
      "  lh worktracking list",
      "  lh worktracking get --id <id>",
      "",
      "  lh team list",
      "  lh team get --id <id>",
      "  lh team refresh --id <id>",
      "",
      "  lh portfolio list",
      "  lh portfolio get --id <id>",
      "  lh portfolio refresh --id <id>",
      "",
      "  lh throughput team --id <id> [--start-date <date> --end-date <date>]",
      "  lh throughput portfolio --id <id> [--start-date <date> --end-date <date>]",
      "",
      "  lh cycletime team --id <id> [--start-date <date> --end-date <date>]",
      "",
      "  lh features get-by-ids --ids <id,...>",
      "  lh features get-by-refs --refs <ref,...>",
      "  lh features work-items --id <id>",
      "",
      "  lh delivery list",
      "  lh delivery create --name <name> --start <date> --end <date> --feature-ids <id,...>",
      "  lh delivery update --id <id> --name <name> --start <date> --end <date> --feature-ids <id,...>",
      "  lh delivery delete --id <id>",
      "",
      "  lh forecast manual --remaining <n> --trials <n> [--target-date <date>]",
      "  lh forecast backtest --team-id <id> --start-date <date> --end-date <date> --hist-start-date <date> --hist-end-date <date>",
    );
  }
  return lines.join("\n");
};

// ── main command router ───────────────────────────────────────────────────────

export const runCliCommand = async (
  args: readonly string[],
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (args.length === 0) {
    return getSuccessResult(await getUsageText(dependencies));
  }

  const [scope, action, subject] = args;

  // ── Connection management ─────────────────────────────────────────────────

  if (scope === "connect") {
    return runConnect(dependencies);
  }

  if (scope === "connection") {
    return runConnectionStatus(dependencies);
  }

  if (scope === "disconnect") {
    return runDisconnect(dependencies);
  }

  // ── Health & version ──────────────────────────────────────────────────────

  if (scope === "health" && action === "check") {
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const health = await client.checkConnectivity();
    if (health.category === "success") {
      return getSuccessResult("success");
    }
    return getErrorResult(`${health.category}: ${health.reason}`);
  }

  if (scope === "version" && action === "get") {
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const versionResult = await client.getVersion();
    return mapApiResultToCliResult(versionResult);
  }

  // ── Work tracking ─────────────────────────────────────────────────────────

  if (scope === "worktracking" && action === "list") {
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.listWorkTrackingConnections();
    return mapApiResultToCliResult(result);
  }

  if (scope === "worktracking" && action === "get") {
    const connectionId = getRequiredIdOption(args, "--id");
    if (connectionId === null) {
      return getErrorResult("Missing required --id for worktracking get.");
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.getWorkTrackingConnection(connectionId);
    return mapApiResultToCliResult(result);
  }

  // ── Teams ─────────────────────────────────────────────────────────────────

  if (scope === "team" && action === "list") {
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.listTeams();
    return mapApiResultToCliResult(result);
  }

  if (scope === "team" && action === "get") {
    const teamId = getRequiredIdOption(args, "--id");
    if (teamId === null) {
      return getErrorResult("Missing required --id for team get.");
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.getTeam(teamId);
    return mapApiResultToCliResult(result);
  }

  if (scope === "team" && action === "refresh") {
    const teamId = getRequiredIdOption(args, "--id");
    if (teamId === null) {
      return getErrorResult("Missing required --id for team refresh.");
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.refreshTeam(teamId);
    if (!result.ok) {
      return getErrorResult(`${result.error.category}: ${result.error.reason}`);
    }
    return getSuccessResult(`Team refreshed: ${teamId}`);
  }

  if (scope === "team" && action === "metrics") {
    const teamId = getRequiredIdOption(args, "--id");
    if (teamId === null) {
      return getErrorResult("Missing required --id for team metrics.");
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const startDate = getOptionValue(args, "--start-date");
    const endDate = getOptionValue(args, "--end-date");
    const range =
      startDate !== undefined && endDate !== undefined
        ? { startDate, endDate }
        : getDefaultMetricsDateRange();
    const client = dependencies.createClient(connectionOrError);
    if (subject === "throughput") {
      const result = await client.getTeamThroughput(teamId, range);
      return mapApiResultToCliResult(result);
    }
    if (subject === "cycleTimePercentiles") {
      const result = await client.getTeamCycleTimePercentiles(teamId, range);
      return mapApiResultToCliResult(result);
    }
    return getErrorResult(
      `Unknown team metrics subcommand: ${subject ?? "(none)"}`,
    );
  }

  // ── Portfolios ────────────────────────────────────────────────────────────

  if (scope === "portfolio" && action === "list") {
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.listPortfolios();
    return mapApiResultToCliResult(result);
  }

  if (scope === "portfolio" && action === "get") {
    const portfolioId = getRequiredIdOption(args, "--id");
    if (portfolioId === null) {
      return getErrorResult("Missing required --id for portfolio get.");
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.getPortfolio(portfolioId);
    return mapApiResultToCliResult(result);
  }

  if (scope === "portfolio" && action === "refresh") {
    const portfolioId = getRequiredIdOption(args, "--id");
    if (portfolioId === null) {
      return getErrorResult("Missing required --id for portfolio refresh.");
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.refreshPortfolio(portfolioId);
    if (!result.ok) {
      return getErrorResult(`${result.error.category}: ${result.error.reason}`);
    }
    return getSuccessResult(`Portfolio refreshed: ${portfolioId}`);
  }

  if (scope === "portfolio" && action === "metrics") {
    const portfolioId = getRequiredIdOption(args, "--id");
    if (portfolioId === null) {
      return getErrorResult("Missing required --id for portfolio metrics.");
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const startDate = getOptionValue(args, "--start-date");
    const endDate = getOptionValue(args, "--end-date");
    const range =
      startDate !== undefined && endDate !== undefined
        ? { startDate, endDate }
        : getDefaultMetricsDateRange();
    const client = dependencies.createClient(connectionOrError);
    if (subject === "throughput") {
      const result = await client.getPortfolioThroughput(portfolioId, range);
      return mapApiResultToCliResult(result);
    }
    return getErrorResult(
      `Unknown portfolio metrics subcommand: ${subject ?? "(none)"}`,
    );
  }

  // ── Features ──────────────────────────────────────────────────────────────

  if (scope === "feature" && action === "get") {
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const idsRaw = getOptionValue(args, "--ids");
    if (idsRaw !== undefined) {
      const ids = idsRaw
        .split(",")
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n));
      const result = await client.getFeaturesByIds(ids);
      return mapApiResultToCliResult(result);
    }
    const refsRaw = getOptionValue(args, "--refs");
    if (refsRaw !== undefined) {
      const refs = refsRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const result = await client.getFeaturesByReferences(refs);
      return mapApiResultToCliResult(result);
    }
    return getErrorResult("Missing required --ids or --refs for feature get.");
  }

  if (scope === "feature" && action === "workitems") {
    const featureId = getRequiredIdOption(args, "--id");
    if (featureId === null) {
      return getErrorResult("Missing required --id for feature workitems.");
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.getFeatureWorkItems(featureId);
    return mapApiResultToCliResult(result);
  }

  // ── Deliveries ────────────────────────────────────────────────────────────

  if (scope === "delivery" && action === "list") {
    const portfolioId = getRequiredIdOption(args, "--portfolio-id");
    if (portfolioId === null) {
      return getErrorResult(
        "Missing required --portfolio-id for delivery list.",
      );
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.listDeliveries(portfolioId);
    return mapApiResultToCliResult(result);
  }

  // ── Forecasts ─────────────────────────────────────────────────────────────

  if (scope === "forecast" && action === "manual") {
    const teamIdRaw = getOptionValue(args, "--team-id");
    if (teamIdRaw === undefined) {
      return getErrorResult("Missing required --team-id for forecast manual.");
    }
    const teamId = Number.parseInt(teamIdRaw, 10);
    if (Number.isNaN(teamId)) {
      return getErrorResult("Invalid --team-id for forecast manual.");
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const remainingRaw = getOptionValue(args, "--remaining");
    const targetDate = getOptionValue(args, "--target-date");
    const remaining =
      remainingRaw === undefined
        ? undefined
        : Number.parseInt(remainingRaw, 10);
    const client = dependencies.createClient(connectionOrError);
    const result = await client.runManualForecast(teamId, {
      remainingItems: remaining,
      targetDate,
    });
    return mapApiResultToCliResult(result);
  }

  if (scope === "forecast" && action === "backtest") {
    const teamIdRaw = getOptionValue(args, "--team-id");
    if (teamIdRaw === undefined) {
      return getErrorResult(
        "Missing required --team-id for forecast backtest.",
      );
    }
    const teamId = Number.parseInt(teamIdRaw, 10);
    if (Number.isNaN(teamId)) {
      return getErrorResult("Invalid --team-id for forecast backtest.");
    }
    const startDate = getOptionValue(args, "--start-date");
    const endDate = getOptionValue(args, "--end-date");
    const histStartDate = getOptionValue(args, "--hist-start-date");
    const histEndDate = getOptionValue(args, "--hist-end-date");
    if (!startDate || !endDate || !histStartDate || !histEndDate) {
      return getErrorResult(
        "Missing required --start-date, --end-date, --hist-start-date, or --hist-end-date for forecast backtest.",
      );
    }
    const connectionOrError = await requireConnection(dependencies);
    if (isCliCommandResult(connectionOrError)) {
      return connectionOrError;
    }
    const client = dependencies.createClient(connectionOrError);
    const result = await client.runBacktest(teamId, {
      startDate,
      endDate,
      historicalStartDate: histStartDate,
      historicalEndDate: histEndDate,
    });
    return mapApiResultToCliResult(result);
  }

  if (scope === "help") {
    return getSuccessResult(await getUsageText(dependencies));
  }

  return getErrorResult(await getUsageText(dependencies));
};

// Default dependencies for standalone binary use — exported for testing convenience
export const getDefaultDependencies = (): RunCliCommandDependencies => ({
  loadConnection: async () => null,
  saveConnection: async () => undefined,
  prompt: async () => "",
  openBrowser: async () => undefined,
  validateConnectivity: async () => ({
    category: "unreachable" as const,
    reason: "No connectivity validator configured.",
  }),
  queryAuthMode: async () => ({ mode: "disabled" }),
  startAuthSession: async () => ({
    status: "error" as const,
    category: "unreachable" as const,
    reason: "No auth session starter configured.",
  }),
  pollCliAuthSession: async () => ({ status: "pending" as const }),
  createClient: ({ endpointUrl, auth }) =>
    createLighthouseClient({
      connection: {
        kind: "explicit",
        lighthouseUrl: endpointUrl,
      },
      auth,
    }),
});
