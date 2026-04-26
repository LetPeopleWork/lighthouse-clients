import {
  type CliAuthSessionPollResult,
  type CliAuthSessionStartOutcome,
  type CliConnection,
  type CliServerConnection,
  type CliStandaloneConnection,
  type ConnectivityValidationResult,
  type LighthouseApiResult,
  type LighthouseClient,
  type MetricsDateRange,
  type ServerAuthModeResult,
  createLighthouseClient,
} from "@letpeoplework/lighthouse-client";
import {
  DEFAULT_OUTPUT_FORMAT,
  OUTPUT_FORMAT_FLAGS,
  type OutputFormat,
  formatPayload,
  isOutputFormat,
  isOutputFormatFlag,
} from "./output";

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
  | "createTeam"
  | "updateTeam"
  | "deleteTeam"
  | "refreshTeam"
  | "listPortfolios"
  | "getPortfolio"
  | "createPortfolio"
  | "updatePortfolio"
  | "deletePortfolio"
  | "refreshPortfolio"
  | "getTeamThroughput"
  | "getTeamArrivals"
  | "getTeamWipOverTime"
  | "getTeamWip"
  | "getTeamCycleTimePercentiles"
  | "getTeamCycleTimeData"
  | "getTeamPredictabilityScore"
  | "getTeamTotalWorkItemAge"
  | "getTeamTotalWorkItemAgePbc"
  | "getPortfolioThroughput"
  | "getPortfolioCycleTimePercentiles"
  | "getPortfolioArrivals"
  | "getPortfolioWipOverTime"
  | "getPortfolioWip"
  | "getPortfolioCycleTimeData"
  | "getPortfolioPredictabilityScore"
  | "getPortfolioTotalWorkItemAge"
  | "getPortfolioTotalWorkItemAgePbc"
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
  readonly loadOutputFormat: () => Promise<OutputFormat | null>;
  readonly saveOutputFormat: (outputFormat: OutputFormat) => Promise<void>;
  readonly readTextFile: (filePath: string) => Promise<string>;
  readonly prompt: (question: string) => Promise<string>;
  readonly openBrowser: (url: string) => Promise<void>;
  readonly validateConnectivity: (
    url: string,
    insecure?: boolean,
  ) => Promise<ConnectivityValidationResult>;
  readonly validateStandaloneDiscovery: () => Promise<ConnectivityValidationResult>;
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
  readonly createClient: (connection: CliConnection) => CliClientOperations;
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

const getRequestedOutputFormat = (
  args: readonly string[],
): { readonly format: OutputFormat | null; readonly error: string | null } => {
  const requestedFlags = Array.from(
    new Set(args.filter((argument) => isOutputFormatFlag(argument))),
  );

  if (requestedFlags.length > 1) {
    return {
      format: null,
      error:
        "Multiple output format flags provided. Use only one of --pretty, --toon, or --json.",
    };
  }

  if (requestedFlags.length === 0) {
    return { format: null, error: null };
  }

  return {
    format: OUTPUT_FORMAT_FLAGS[requestedFlags[0]],
    error: null,
  };
};

const getResolvedOutputFormat = async (
  args: readonly string[],
  dependencies: RunCliCommandDependencies,
): Promise<OutputFormat | CliCommandResult> => {
  const requestedOutputFormat = getRequestedOutputFormat(args);
  if (requestedOutputFormat.error !== null) {
    return getErrorResult(requestedOutputFormat.error);
  }

  if (requestedOutputFormat.format !== null) {
    return requestedOutputFormat.format;
  }

  return (await dependencies.loadOutputFormat()) ?? DEFAULT_OUTPUT_FORMAT;
};

const stripOutputFormatFlags = (args: readonly string[]): string[] =>
  args.filter((argument) => !isOutputFormatFlag(argument));

const mapApiResultToCliResult = <TValue>(
  result: LighthouseApiResult<TValue>,
  outputFormat: OutputFormat,
): CliCommandResult => {
  if (result.ok) {
    if (result.value === undefined) {
      return getSuccessResult("ok");
    }

    const formattedPayload = formatPayload(result.value, outputFormat);
    if (!formattedPayload.ok) {
      return getErrorResult(formattedPayload.error);
    }

    return getSuccessResult(formattedPayload.value);
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

type CliPayload = Readonly<Record<string, unknown>>;

type MetricErrorValue = {
  readonly status: "error";
  readonly category: string;
  readonly reason: string;
};

type MetricUnavailableValue = {
  readonly status: "unavailable";
  readonly reason: string;
};

type DailyCountPoint = {
  readonly date: string;
  readonly count: number;
  readonly isBlackout: boolean;
};

type DailyValuePoint = {
  readonly date: string;
  readonly value: number;
  readonly isBlackout: boolean;
  readonly workItemIds: readonly number[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getRequiredTextOption = (
  args: readonly string[],
  optionName: string,
): string | null => {
  const value = getOptionValue(args, optionName);
  if (value === undefined || value.trim().length === 0) {
    return null;
  }

  return value;
};

const toIsoDate = (value: Date): string => value.toISOString().split("T")[0];

const addDaysToIsoDate = (isoDate: string, days: number): string => {
  const next = new Date(`${isoDate}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return toIsoDate(next);
};

const getLastDaysMetricsDateRange = (days: number): MetricsDateRange => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);

  return {
    startDate: toIsoDate(startDate),
    endDate: toIsoDate(endDate),
  };
};

const getResolvedMetricsDateRange = (
  args: readonly string[],
  fallbackDays: number,
): MetricsDateRange => {
  const startDate = getOptionValue(args, "--start-date");
  const endDate = getOptionValue(args, "--end-date");

  if (startDate !== undefined && endDate !== undefined) {
    return { startDate, endDate };
  }

  if (startDate !== undefined) {
    return { startDate, endDate: startDate };
  }

  if (endDate !== undefined) {
    return { startDate: endDate, endDate };
  }

  return getLastDaysMetricsDateRange(fallbackDays);
};

const getMetricErrorValue = (
  category: string,
  reason: string,
): MetricErrorValue => ({
  status: "error",
  category,
  reason,
});

const getMetricUnavailableValue = (reason: string): MetricUnavailableValue => ({
  status: "unavailable",
  reason,
});

const getMetricValueOrError = <TValue>(
  result: PromiseSettledResult<LighthouseApiResult<TValue>>,
): TValue | MetricErrorValue => {
  if (result.status === "rejected") {
    const reason =
      result.reason instanceof Error
        ? result.reason.message
        : "Metric request failed unexpectedly.";
    return getMetricErrorValue("unexpected", reason);
  }

  if (!result.value.ok) {
    return getMetricErrorValue(
      result.value.error.category,
      result.value.error.reason,
    );
  }

  return result.value.value;
};

const isMetricErrorValue = (
  value: unknown,
): value is MetricErrorValue | MetricUnavailableValue =>
  isRecord(value) && typeof value.status === "string";

const getJsonPayload = async (
  args: readonly string[],
  dependencies: RunCliCommandDependencies,
  commandName: string,
): Promise<CliPayload | CliCommandResult> => {
  const payloadJson = getOptionValue(args, "--payload-json");
  const payloadFile = getOptionValue(args, "--payload-file");

  if (payloadJson === undefined && payloadFile === undefined) {
    return getErrorResult(
      `Missing payload for ${commandName}. Use exactly one of --payload-json or --payload-file.`,
    );
  }

  if (payloadJson !== undefined && payloadFile !== undefined) {
    return getErrorResult(
      `Provide only one payload source for ${commandName}: --payload-json or --payload-file.`,
    );
  }

  const rawPayload =
    payloadJson ??
    (await dependencies
      .readTextFile(payloadFile as string)
      .catch((error: unknown) => {
        throw new Error(
          error instanceof Error
            ? error.message
            : "Could not read payload file.",
        );
      }));

  try {
    const parsed = JSON.parse(rawPayload) as unknown;
    if (!isRecord(parsed) || Array.isArray(parsed)) {
      return getErrorResult(
        `Invalid payload for ${commandName}. Expected a JSON object.`,
      );
    }

    return parsed;
  } catch (error: unknown) {
    const reason =
      error instanceof Error ? error.message : "Invalid JSON payload.";
    return getErrorResult(`${commandName}: ${reason}`);
  }
};

const getWorkItemList = (value: unknown): readonly Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];

const getDailyCountSeries = (
  value: unknown,
  startDate: string,
): readonly DailyCountPoint[] => {
  if (!isRecord(value) || !isRecord(value.workItemsPerUnitOfTime)) {
    return [];
  }

  const blackoutIndices = new Set(
    Array.isArray(value.blackoutDayIndices)
      ? value.blackoutDayIndices.filter(
          (entry): entry is number => typeof entry === "number",
        )
      : [],
  );

  return Object.entries(value.workItemsPerUnitOfTime)
    .map(([offset, items]) => {
      const dayOffset = Number.parseInt(offset, 10);
      if (Number.isNaN(dayOffset)) {
        return null;
      }

      return {
        date: addDaysToIsoDate(startDate, dayOffset),
        count: Array.isArray(items) ? items.length : 0,
        isBlackout: blackoutIndices.has(dayOffset),
      };
    })
    .filter((entry): entry is DailyCountPoint => entry !== null)
    .sort((left, right) => left.date.localeCompare(right.date));
};

const getDailyValueSeries = (value: unknown): readonly DailyValuePoint[] => {
  if (!isRecord(value) || !Array.isArray(value.dataPoints)) {
    return [];
  }

  return value.dataPoints
    .map((dataPoint) => {
      if (!isRecord(dataPoint) || typeof dataPoint.xValue !== "string") {
        return null;
      }

      const workItemIds: readonly number[] = Array.isArray(
        dataPoint.workItemIds,
      )
        ? dataPoint.workItemIds.filter(
            (entry): entry is number => typeof entry === "number",
          )
        : [];

      const point: DailyValuePoint = {
        date: dataPoint.xValue,
        value: typeof dataPoint.yValue === "number" ? dataPoint.yValue : 0,
        isBlackout: dataPoint.isBlackout === true,
        workItemIds,
      };

      return point;
    })
    .filter((entry): entry is DailyValuePoint => entry !== null);
};

const getChartTotal = (
  value: unknown,
  dailyCounts: readonly DailyCountPoint[],
): number => {
  if (isRecord(value) && typeof value.total === "number") {
    return value.total;
  }

  return dailyCounts.reduce((sum, entry) => sum + entry.count, 0);
};

const getPredictabilityScorePayload = (
  value: unknown,
): Record<string, unknown> => {
  if (!isRecord(value)) {
    return { score: null, percentiles: [], forecastResults: {} };
  }

  return {
    score:
      typeof value.predictabilityScore === "number"
        ? value.predictabilityScore
        : null,
    percentiles: Array.isArray(value.percentiles) ? value.percentiles : [],
    forecastResults: isRecord(value.forecastResults)
      ? value.forecastResults
      : {},
  };
};

// ── requireConnection ─────────────────────────────────────────────────────────

const requireConnection = async (
  dependencies: RunCliCommandDependencies,
): Promise<CliConnection | CliCommandResult> => {
  const connection = await dependencies.loadConnection();
  if (connection === null) {
    return getErrorResult(
      'Not connected. Run "lh connection connect" to connect to a Lighthouse server.',
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
  connection: CliConnection,
  outputFormat: OutputFormat,
): string[] => {
  if (connection.mode === "standalone") {
    return [
      "Connected to: standalone Lighthouse",
      "Discovery: lockfile in Lighthouse app data",
      `Auth: ${connection.authMode}`,
      `Output: ${outputFormat}`,
    ];
  }

  const lines: string[] = [
    `Connected to: ${connection.endpointUrl}`,
    `Auth: ${connection.authMode}`,
    `Output: ${outputFormat}`,
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

const getConnectionLabel = (connection: CliConnection): string => {
  if (connection.mode === "standalone") {
    return "standalone Lighthouse";
  }

  return connection.endpointUrl;
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

const runStandaloneConnect = async (
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const validationResult = await dependencies.validateStandaloneDiscovery();
  if (!isServerReachable(validationResult)) {
    return getErrorResult(
      `Cannot reach standalone Lighthouse: ${validationResult.reason}`,
    );
  }

  const connection: CliStandaloneConnection = {
    mode: "standalone",
    authMode: "disabled",
  };
  await dependencies.saveConnection(connection);

  return getSuccessResult(
    `Connected to standalone Lighthouse at ${validationResult.endpoint.lighthouseUrl}`,
  );
};

const getDisabledAuthConnection = (
  url: string,
  insecure: boolean,
): CliServerConnection => {
  if (insecure) {
    return {
      mode: "server",
      endpointUrl: url,
      authMode: "disabled",
      insecure: true,
    };
  }

  return {
    mode: "server",
    endpointUrl: url,
    authMode: "disabled",
  };
};

const getAuthenticatedConnection = (
  url: string,
  token: string,
  insecure: boolean,
): CliServerConnection => {
  if (insecure) {
    return {
      mode: "server",
      endpointUrl: url,
      authMode: "required",
      insecure: true,
      auth: { kind: "bearer-token", token },
    };
  }

  return {
    mode: "server",
    endpointUrl: url,
    authMode: "required",
    auth: { kind: "bearer-token", token },
  };
};

const getServerConnectivityError = (
  url: string,
  reason: string,
): CliCommandResult => {
  return getErrorResult(`Cannot reach server at ${url}: ${reason}`);
};

const resolveServerConnectionSecurity = async (
  dependencies: RunCliCommandDependencies,
  url: string,
  validationResult: Exclude<
    ConnectivityValidationResult,
    { readonly category: "success" | "unauthorized" }
  >,
): Promise<boolean | CliCommandResult> => {
  if (!url.toLowerCase().startsWith("https://")) {
    return getServerConnectivityError(url, validationResult.reason);
  }

  const retry = await dependencies.prompt(
    `\nCannot reach server (${validationResult.reason}).\nThis may be a TLS certificate issue (e.g. self-signed cert).\nSkip TLS certificate verification? [y/N] `,
  );
  if (retry.trim().toLowerCase() !== "y") {
    return getServerConnectivityError(url, validationResult.reason);
  }

  const insecureResult = await dependencies.validateConnectivity(url, true);
  if (!isServerReachable(insecureResult)) {
    return getServerConnectivityError(url, insecureResult.reason);
  }

  return true;
};

const runAuthenticatedServerConnect = async (
  dependencies: RunCliCommandDependencies,
  url: string,
  insecure: boolean,
): Promise<CliCommandResult> => {
  const session = await dependencies.startAuthSession(
    url,
    insecure || undefined,
  );
  if (session.status === "error") {
    return getErrorResult(getAuthSessionStartErrorMessage(url, session));
  }

  await dependencies.openBrowser(session.verificationUrl);

  const maxTries = 60;
  for (let tries = 0; tries < maxTries; tries++) {
    const pollResult = await dependencies.pollCliAuthSession(
      url,
      session.sessionId,
      insecure || undefined,
    );

    if (pollResult.status === "approved") {
      const connection = getAuthenticatedConnection(
        url,
        pollResult.token,
        insecure,
      );
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

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    });
  }

  return getErrorResult("Authorization timed out or was denied.");
};

const runServerConnect = async (
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const url = await dependencies.prompt("Lighthouse server URL: ");

  let insecure = false;

  const validationResult = await dependencies.validateConnectivity(url);
  if (!isServerReachable(validationResult)) {
    const insecureResult = await resolveServerConnectionSecurity(
      dependencies,
      url,
      validationResult,
    );
    if (isCliCommandResult(insecureResult)) {
      return insecureResult;
    }

    insecure = insecureResult;
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
    const connection = getDisabledAuthConnection(url, insecure);
    await dependencies.saveConnection(connection);
    return getSuccessResult(`Connected to ${url} (auth: disabled)`);
  }

  return runAuthenticatedServerConnect(dependencies, url, insecure);
};

const runConnect = async (
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const modeInput = await dependencies.prompt(
    "Select connection mode:\n  1) Server (connect to a Lighthouse instance)\n  2) Standalone (local embedded mode)\n> ",
  );

  if (modeInput.trim() === "2") {
    return runStandaloneConnect(dependencies);
  }

  if (modeInput.trim() !== "1") {
    return getErrorResult("Invalid connection mode. Choose 1 or 2.");
  }

  return runServerConnect(dependencies);
};

// ── connection status ──────────────────────────────────────────────────────────

const runConnectionStatus = async (
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const connection = await dependencies.loadConnection();
  if (connection === null) {
    return getErrorResult(
      'Not connected. Run "lh connection connect" to set up a connection.',
    );
  }

  const outputFormat =
    (await dependencies.loadOutputFormat()) ?? DEFAULT_OUTPUT_FORMAT;

  return getSuccessResult(
    getConnectionStatusLines(connection, outputFormat).join("\n"),
  );
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
  return getSuccessResult(
    `Disconnected from ${getConnectionLabel(connection)}.`,
  );
};

// ── usage text ───────────────────────────────────────────────────────────────

const getConnectionGroupHelpText = (): string =>
  [
    "Usage:",
    "  lh connection connect",
    "  lh connection disconnect",
    "  lh connection status",
  ].join("\n");

const getTeamGroupHelpText = (): string =>
  [
    "Usage:",
    "  lh team list",
    "  lh team get --id <id>",
    "  lh team create --payload-file <path> | --payload-json <json>",
    "  lh team update --id <id> --payload-file <path> | --payload-json <json>",
    "  lh team delete --id <id>",
    "  lh team refresh --id <id>",
  ].join("\n");

const getPortfolioGroupHelpText = (): string =>
  [
    "Usage:",
    "  lh portfolio list",
    "  lh portfolio get --id <id>",
    "  lh portfolio create --payload-file <path> | --payload-json <json>",
    "  lh portfolio update --id <id> --payload-file <path> | --payload-json <json>",
    "  lh portfolio delete --id <id>",
    "  lh portfolio refresh --id <id>",
  ].join("\n");

const getMetricsGroupHelpText = (): string =>
  [
    "Usage:",
    "  lh metrics team --id <id> [--start-date <date>] [--end-date <date>]",
    "  lh metrics portfolio --id <id> [--start-date <date>] [--end-date <date>]",
    "",
    "Defaults:",
    "  team: last 30 days",
    "  portfolio: last 90 days",
    "  if only one date is provided, it is reused for both start and end",
  ].join("\n");

const getDeliveryGroupHelpText = (): string =>
  ["Usage:", "  lh delivery list --portfolio-id <id>"].join("\n");

const getForecastGroupHelpText = (): string =>
  [
    "Usage:",
    "  lh forecast manual --team-id <id> [--remaining <n>] [--target-date <date>]",
    "  lh forecast backtest --team-id <id> --start-date <date> --end-date <date> --hist-start-date <date> --hist-end-date <date>",
  ].join("\n");

const getWorktrackingGroupHelpText = (): string =>
  ["Usage:", "  lh worktracking list", "  lh worktracking get --id <id>"].join(
    "\n",
  );

const getFeatureGroupHelpText = (): string =>
  [
    "Usage:",
    "  lh feature get --ids <id,...>",
    "  lh feature get --refs <ref,...>",
    "  lh feature workitems --id <id>",
  ].join("\n");

const getConfigGroupHelpText = (): string =>
  [
    "Usage:",
    "  lh config output",
    "  lh config output set --format <pretty|toon|json>",
  ].join("\n");

const getHealthGroupHelpText = (): string =>
  ["Usage:", "  lh health check"].join("\n");

const getVersionGroupHelpText = (): string =>
  ["Usage:", "  lh version get"].join("\n");

const getUsageText = async (
  dependencies: RunCliCommandDependencies,
): Promise<string> => {
  const connection = await dependencies.loadConnection();
  const outputFormat =
    (await dependencies.loadOutputFormat()) ?? DEFAULT_OUTPUT_FORMAT;

  const lines: string[] = [
    "Usage:",
    "  lh <group> <subcommand> [options]",
    "",
    "Top-level groups:",
    "  connection",
    "  team",
    "  portfolio",
    "  metrics",
    "  delivery",
    "  forecast",
    "  worktracking",
    "  feature",
    "  config",
    "  health",
    "  version",
    "  help",
    "",
    'Run "lh <group>" to see subcommands for that group.',
    "",
    "Global payload output flags: --pretty | --toon | --json",
    `Default output: ${outputFormat}`,
  ];

  if (connection === null) {
    return [
      ...lines,
      "",
      "Connection: not connected",
      'Run "lh connection connect" to connect to a Lighthouse server.',
    ].join("\n");
  }

  return [
    ...lines,
    "",
    "Connection:",
    ...getConnectionStatusLines(connection, outputFormat),
  ].join("\n");
};

const getUnknownSubcommandResult = (
  groupHelpText: string,
  groupName: string,
  subcommand: string | undefined,
): CliCommandResult =>
  getErrorResult(
    [
      `Unknown ${groupName} subcommand: ${subcommand ?? "(none)"}`,
      "",
      groupHelpText,
    ].join("\n"),
  );

const buildMetricsPayload = async (
  scope: "team" | "portfolio",
  entityId: number,
  range: MetricsDateRange,
  client: CliDomainClientLike,
): Promise<Record<string, unknown>> => {
  const unavailableReason =
    "No dedicated backend endpoint is available for this metric.";

  const requests =
    scope === "team"
      ? [
          client.getTeamThroughput(entityId, range),
          client.getTeamArrivals(entityId, range),
          client.getTeamWipOverTime(entityId, range),
          client.getTeamWip(entityId, range.endDate),
          client.getTeamCycleTimePercentiles(entityId, range),
          client.getTeamCycleTimeData(entityId, range),
          client.getTeamPredictabilityScore(entityId, range),
          client.getTeamTotalWorkItemAge(entityId, range.endDate),
          client.getTeamTotalWorkItemAgePbc(entityId, range),
        ]
      : [
          client.getPortfolioThroughput(entityId, range),
          client.getPortfolioArrivals(entityId, range),
          client.getPortfolioWipOverTime(entityId, range),
          client.getPortfolioWip(entityId, range.endDate),
          client.getPortfolioCycleTimePercentiles(entityId, range),
          client.getPortfolioCycleTimeData(entityId, range),
          client.getPortfolioPredictabilityScore(entityId, range),
          client.getPortfolioTotalWorkItemAge(entityId, range.endDate),
          client.getPortfolioTotalWorkItemAgePbc(entityId, range),
        ];

  const [
    throughputResult,
    arrivalsResult,
    wipOverTimeResult,
    currentWipResult,
    cycleTimePercentilesResult,
    cycleTimeDataResult,
    predictabilityScoreResult,
    totalWorkItemAgeResult,
    totalWorkItemAgePbcResult,
  ] = await Promise.allSettled(requests);

  const throughputValue = getMetricValueOrError(throughputResult);
  const arrivalsValue = getMetricValueOrError(arrivalsResult);
  const wipOverTimeValue = getMetricValueOrError(wipOverTimeResult);
  const currentWipValue = getMetricValueOrError(currentWipResult);
  const cycleTimePercentilesValue = getMetricValueOrError(
    cycleTimePercentilesResult,
  );
  const cycleTimeDataValue = getMetricValueOrError(cycleTimeDataResult);
  const predictabilityScoreValue = getMetricValueOrError(
    predictabilityScoreResult,
  );
  const totalWorkItemAgeValue = getMetricValueOrError(totalWorkItemAgeResult);
  const totalWorkItemAgePbcValue = getMetricValueOrError(
    totalWorkItemAgePbcResult,
  );

  const currentItems = isMetricErrorValue(currentWipValue)
    ? currentWipValue
    : getWorkItemList(currentWipValue);

  return {
    schemaVersion: 1,
    scope,
    id: entityId,
    dateRange: range,
    blocked: getMetricUnavailableValue(unavailableReason),
    wip: {
      current: isMetricErrorValue(currentItems)
        ? currentItems
        : {
            asOfDate: range.endDate,
            count: currentItems.length,
            items: currentItems,
          },
      overTime: isMetricErrorValue(wipOverTimeValue)
        ? wipOverTimeValue
        : {
            startDate: range.startDate,
            endDate: range.endDate,
            daily: getDailyCountSeries(wipOverTimeValue, range.startDate),
          },
    },
    throughput: isMetricErrorValue(throughputValue)
      ? throughputValue
      : {
          startDate: range.startDate,
          endDate: range.endDate,
          total: getChartTotal(
            throughputValue,
            getDailyCountSeries(throughputValue, range.startDate),
          ),
          daily: getDailyCountSeries(throughputValue, range.startDate),
        },
    cycleTime: {
      percentiles: isMetricErrorValue(cycleTimePercentilesValue)
        ? cycleTimePercentilesValue
        : { values: cycleTimePercentilesValue },
      closedItems: isMetricErrorValue(cycleTimeDataValue)
        ? cycleTimeDataValue
        : { items: getWorkItemList(cycleTimeDataValue) },
    },
    workItemAge: isMetricErrorValue(currentItems)
      ? currentItems
      : {
          asOfDate: range.endDate,
          itemsInProgress: currentItems,
        },
    totalWorkItemAge: {
      current: isMetricErrorValue(totalWorkItemAgeValue)
        ? totalWorkItemAgeValue
        : {
            asOfDate: range.endDate,
            value: totalWorkItemAgeValue,
          },
      daily: isMetricErrorValue(totalWorkItemAgePbcValue)
        ? totalWorkItemAgePbcValue
        : {
            startDate: range.startDate,
            endDate: range.endDate,
            points: getDailyValueSeries(totalWorkItemAgePbcValue),
          },
    },
    arrivals: isMetricErrorValue(arrivalsValue)
      ? arrivalsValue
      : {
          startDate: range.startDate,
          endDate: range.endDate,
          total: getChartTotal(
            arrivalsValue,
            getDailyCountSeries(arrivalsValue, range.startDate),
          ),
          daily: getDailyCountSeries(arrivalsValue, range.startDate),
        },
    workDistribution: getMetricUnavailableValue(unavailableReason),
    predictabilityScore: isMetricErrorValue(predictabilityScoreValue)
      ? predictabilityScoreValue
      : getPredictabilityScorePayload(predictabilityScoreValue),
  };
};

const runConnectionGroup = async (
  action: string | undefined,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getConnectionGroupHelpText());
  }

  if (action === "connect") {
    return runConnect(dependencies);
  }

  if (action === "disconnect") {
    return runDisconnect(dependencies);
  }

  if (action === "status") {
    return runConnectionStatus(dependencies);
  }

  return getUnknownSubcommandResult(
    getConnectionGroupHelpText(),
    "connection",
    action,
  );
};

const runTeamGroup = async (
  action: string | undefined,
  args: readonly string[],
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getTeamGroupHelpText());
  }

  const connectionOrError = await requireConnection(dependencies);
  if (isCliCommandResult(connectionOrError)) {
    return connectionOrError;
  }

  const client = dependencies.createClient(connectionOrError);

  const actionHandlers: Record<string, () => Promise<CliCommandResult>> = {
    list: async () =>
      mapApiResultToCliResult(await client.listTeams(), outputFormat),
    get: async () => {
      const teamId = getRequiredIdOption(args, "--id");
      if (teamId === null) {
        return getErrorResult("Missing required --id for team get.");
      }

      return mapApiResultToCliResult(
        await client.getTeam(teamId),
        outputFormat,
      );
    },
    create: async () => {
      const payloadOrError = await getJsonPayload(
        args,
        dependencies,
        "team create",
      );
      if (isCliCommandResult(payloadOrError)) {
        return payloadOrError;
      }

      return mapApiResultToCliResult(
        await client.createTeam(payloadOrError),
        outputFormat,
      );
    },
    update: async () => {
      const teamId = getRequiredIdOption(args, "--id");
      if (teamId === null) {
        return getErrorResult("Missing required --id for team update.");
      }

      const payloadOrError = await getJsonPayload(
        args,
        dependencies,
        "team update",
      );
      if (isCliCommandResult(payloadOrError)) {
        return payloadOrError;
      }

      return mapApiResultToCliResult(
        await client.updateTeam(teamId, payloadOrError),
        outputFormat,
      );
    },
    delete: async () => {
      const teamId = getRequiredIdOption(args, "--id");
      if (teamId === null) {
        return getErrorResult("Missing required --id for team delete.");
      }

      const result = await client.deleteTeam(teamId);
      if (!result.ok) {
        return getErrorResult(
          `${result.error.category}: ${result.error.reason}`,
        );
      }

      return getSuccessResult(`Team deleted: ${teamId}`);
    },
    refresh: async () => {
      const teamId = getRequiredIdOption(args, "--id");
      if (teamId === null) {
        return getErrorResult("Missing required --id for team refresh.");
      }

      const result = await client.refreshTeam(teamId);
      if (!result.ok) {
        return getErrorResult(
          `${result.error.category}: ${result.error.reason}`,
        );
      }

      return getSuccessResult(`Team refreshed: ${teamId}`);
    },
  };

  const selectedHandler = actionHandlers[action];
  if (selectedHandler === undefined) {
    return getUnknownSubcommandResult(getTeamGroupHelpText(), "team", action);
  }

  return selectedHandler();
};

const runPortfolioGroup = async (
  action: string | undefined,
  args: readonly string[],
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getPortfolioGroupHelpText());
  }

  const connectionOrError = await requireConnection(dependencies);
  if (isCliCommandResult(connectionOrError)) {
    return connectionOrError;
  }

  const client = dependencies.createClient(connectionOrError);

  const actionHandlers: Record<string, () => Promise<CliCommandResult>> = {
    list: async () =>
      mapApiResultToCliResult(await client.listPortfolios(), outputFormat),
    get: async () => {
      const portfolioId = getRequiredIdOption(args, "--id");
      if (portfolioId === null) {
        return getErrorResult("Missing required --id for portfolio get.");
      }

      return mapApiResultToCliResult(
        await client.getPortfolio(portfolioId),
        outputFormat,
      );
    },
    create: async () => {
      const payloadOrError = await getJsonPayload(
        args,
        dependencies,
        "portfolio create",
      );
      if (isCliCommandResult(payloadOrError)) {
        return payloadOrError;
      }

      return mapApiResultToCliResult(
        await client.createPortfolio(payloadOrError),
        outputFormat,
      );
    },
    update: async () => {
      const portfolioId = getRequiredIdOption(args, "--id");
      if (portfolioId === null) {
        return getErrorResult("Missing required --id for portfolio update.");
      }

      const payloadOrError = await getJsonPayload(
        args,
        dependencies,
        "portfolio update",
      );
      if (isCliCommandResult(payloadOrError)) {
        return payloadOrError;
      }

      return mapApiResultToCliResult(
        await client.updatePortfolio(portfolioId, payloadOrError),
        outputFormat,
      );
    },
    delete: async () => {
      const portfolioId = getRequiredIdOption(args, "--id");
      if (portfolioId === null) {
        return getErrorResult("Missing required --id for portfolio delete.");
      }

      const result = await client.deletePortfolio(portfolioId);
      if (!result.ok) {
        return getErrorResult(
          `${result.error.category}: ${result.error.reason}`,
        );
      }

      return getSuccessResult(`Portfolio deleted: ${portfolioId}`);
    },
    refresh: async () => {
      const portfolioId = getRequiredIdOption(args, "--id");
      if (portfolioId === null) {
        return getErrorResult("Missing required --id for portfolio refresh.");
      }

      const result = await client.refreshPortfolio(portfolioId);
      if (!result.ok) {
        return getErrorResult(
          `${result.error.category}: ${result.error.reason}`,
        );
      }

      return getSuccessResult(`Portfolio refreshed: ${portfolioId}`);
    },
  };

  const selectedHandler = actionHandlers[action];
  if (selectedHandler === undefined) {
    return getUnknownSubcommandResult(
      getPortfolioGroupHelpText(),
      "portfolio",
      action,
    );
  }

  return selectedHandler();
};

const runManualForecastCommand = async (
  args: readonly string[],
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const teamIdRaw = getRequiredTextOption(args, "--team-id");
  if (teamIdRaw === null) {
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
  const remaining =
    remainingRaw === undefined ? undefined : Number.parseInt(remainingRaw, 10);
  const client = dependencies.createClient(connectionOrError);
  return mapApiResultToCliResult(
    await client.runManualForecast(teamId, {
      remainingItems: remaining,
      targetDate: getOptionValue(args, "--target-date"),
    }),
    outputFormat,
  );
};

const runBacktestForecastCommand = async (
  args: readonly string[],
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const teamIdRaw = getRequiredTextOption(args, "--team-id");
  if (teamIdRaw === null) {
    return getErrorResult("Missing required --team-id for forecast backtest.");
  }

  const teamId = Number.parseInt(teamIdRaw, 10);
  if (Number.isNaN(teamId)) {
    return getErrorResult("Invalid --team-id for forecast backtest.");
  }

  const startDate = getRequiredTextOption(args, "--start-date");
  const endDate = getRequiredTextOption(args, "--end-date");
  const histStartDate = getRequiredTextOption(args, "--hist-start-date");
  const histEndDate = getRequiredTextOption(args, "--hist-end-date");
  if (
    startDate === null ||
    endDate === null ||
    histStartDate === null ||
    histEndDate === null
  ) {
    return getErrorResult(
      "Missing required --start-date, --end-date, --hist-start-date, or --hist-end-date for forecast backtest.",
    );
  }

  const connectionOrError = await requireConnection(dependencies);
  if (isCliCommandResult(connectionOrError)) {
    return connectionOrError;
  }

  const client = dependencies.createClient(connectionOrError);
  return mapApiResultToCliResult(
    await client.runBacktest(teamId, {
      startDate,
      endDate,
      historicalStartDate: histStartDate,
      historicalEndDate: histEndDate,
    }),
    outputFormat,
  );
};

const runMetricsGroup = async (
  action: string | undefined,
  args: readonly string[],
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getMetricsGroupHelpText());
  }

  if (action !== "team" && action !== "portfolio") {
    return getUnknownSubcommandResult(
      getMetricsGroupHelpText(),
      "metrics",
      action,
    );
  }

  const entityId = getRequiredIdOption(args, "--id");
  if (entityId === null) {
    return getErrorResult(`Missing required --id for metrics ${action}.`);
  }

  const connectionOrError = await requireConnection(dependencies);
  if (isCliCommandResult(connectionOrError)) {
    return connectionOrError;
  }

  const client = dependencies.createClient(connectionOrError);
  const range = getResolvedMetricsDateRange(args, action === "team" ? 30 : 90);
  const payload = await buildMetricsPayload(action, entityId, range, client);
  return mapApiResultToCliResult({ ok: true, value: payload }, outputFormat);
};

const runWorktrackingGroup = async (
  action: string | undefined,
  args: readonly string[],
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getWorktrackingGroupHelpText());
  }

  const connectionOrError = await requireConnection(dependencies);
  if (isCliCommandResult(connectionOrError)) {
    return connectionOrError;
  }

  const client = dependencies.createClient(connectionOrError);

  if (action === "list") {
    return mapApiResultToCliResult(
      await client.listWorkTrackingConnections(),
      outputFormat,
    );
  }

  if (action === "get") {
    const connectionId = getRequiredIdOption(args, "--id");
    if (connectionId === null) {
      return getErrorResult("Missing required --id for worktracking get.");
    }

    return mapApiResultToCliResult(
      await client.getWorkTrackingConnection(connectionId),
      outputFormat,
    );
  }

  return getUnknownSubcommandResult(
    getWorktrackingGroupHelpText(),
    "worktracking",
    action,
  );
};

const runFeatureGroup = async (
  action: string | undefined,
  args: readonly string[],
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getFeatureGroupHelpText());
  }

  const connectionOrError = await requireConnection(dependencies);
  if (isCliCommandResult(connectionOrError)) {
    return connectionOrError;
  }

  const client = dependencies.createClient(connectionOrError);

  if (action === "get") {
    const idsRaw = getOptionValue(args, "--ids");
    if (idsRaw !== undefined) {
      const ids = idsRaw
        .split(",")
        .map((entry) => Number.parseInt(entry.trim(), 10))
        .filter((entry) => !Number.isNaN(entry));
      return mapApiResultToCliResult(
        await client.getFeaturesByIds(ids),
        outputFormat,
      );
    }

    const refsRaw = getOptionValue(args, "--refs");
    if (refsRaw !== undefined) {
      const refs = refsRaw
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      return mapApiResultToCliResult(
        await client.getFeaturesByReferences(refs),
        outputFormat,
      );
    }

    return getErrorResult("Missing required --ids or --refs for feature get.");
  }

  if (action === "workitems") {
    const featureId = getRequiredIdOption(args, "--id");
    if (featureId === null) {
      return getErrorResult("Missing required --id for feature workitems.");
    }

    return mapApiResultToCliResult(
      await client.getFeatureWorkItems(featureId),
      outputFormat,
    );
  }

  return getUnknownSubcommandResult(
    getFeatureGroupHelpText(),
    "feature",
    action,
  );
};

const runDeliveryGroup = async (
  action: string | undefined,
  args: readonly string[],
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getDeliveryGroupHelpText());
  }

  if (action !== "list") {
    return getUnknownSubcommandResult(
      getDeliveryGroupHelpText(),
      "delivery",
      action,
    );
  }

  const portfolioId = getRequiredIdOption(args, "--portfolio-id");
  if (portfolioId === null) {
    return getErrorResult("Missing required --portfolio-id for delivery list.");
  }

  const connectionOrError = await requireConnection(dependencies);
  if (isCliCommandResult(connectionOrError)) {
    return connectionOrError;
  }

  const client = dependencies.createClient(connectionOrError);
  return mapApiResultToCliResult(
    await client.listDeliveries(portfolioId),
    outputFormat,
  );
};

const runForecastGroup = async (
  action: string | undefined,
  args: readonly string[],
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getForecastGroupHelpText());
  }

  switch (action) {
    case "manual":
      return runManualForecastCommand(args, outputFormat, dependencies);
    case "backtest":
      return runBacktestForecastCommand(args, outputFormat, dependencies);
    default:
      return getUnknownSubcommandResult(
        getForecastGroupHelpText(),
        "forecast",
        action,
      );
  }
};

const runConfigGroup = async (
  action: string | undefined,
  subject: string | undefined,
  args: readonly string[],
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getConfigGroupHelpText());
  }

  if (action !== "output") {
    return getUnknownSubcommandResult(
      getConfigGroupHelpText(),
      "config",
      action,
    );
  }

  if (subject === undefined || subject === "get") {
    const currentOutputFormat =
      (await dependencies.loadOutputFormat()) ?? DEFAULT_OUTPUT_FORMAT;
    return getSuccessResult(`Default output format: ${currentOutputFormat}`);
  }

  if (subject === "set") {
    const configuredFormat = getOptionValue(args, "--format");
    if (!isOutputFormat(configuredFormat)) {
      return getErrorResult(
        "Missing or invalid --format. Use one of: pretty, toon, json.",
      );
    }

    await dependencies.saveOutputFormat(configuredFormat);
    return getSuccessResult(
      `Default output format set to ${configuredFormat}.`,
    );
  }

  return getUnknownSubcommandResult(
    getConfigGroupHelpText(),
    "config output",
    subject,
  );
};

const runHealthGroup = async (
  action: string | undefined,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getHealthGroupHelpText());
  }

  if (action !== "check") {
    return getUnknownSubcommandResult(
      getHealthGroupHelpText(),
      "health",
      action,
    );
  }

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
};

const runVersionGroup = async (
  action: string | undefined,
  outputFormat: OutputFormat,
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getVersionGroupHelpText());
  }

  if (action !== "get") {
    return getUnknownSubcommandResult(
      getVersionGroupHelpText(),
      "version",
      action,
    );
  }

  const connectionOrError = await requireConnection(dependencies);
  if (isCliCommandResult(connectionOrError)) {
    return connectionOrError;
  }

  const client = dependencies.createClient(connectionOrError);
  return mapApiResultToCliResult(await client.getVersion(), outputFormat);
};

// ── main command router ───────────────────────────────────────────────────────

export const runCliCommand = async (
  args: readonly string[],
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (args.length === 0) {
    return getSuccessResult(await getUsageText(dependencies));
  }

  const outputFormatOrError = await getResolvedOutputFormat(args, dependencies);
  if (isCliCommandResult(outputFormatOrError)) {
    return outputFormatOrError;
  }

  const outputFormat = outputFormatOrError;
  const positionalArgs = stripOutputFormatFlags(args);
  const [scope, action, subject] = positionalArgs;

  if (scope === "connection") {
    return runConnectionGroup(action, dependencies);
  }

  if (scope === "team") {
    return runTeamGroup(action, args, outputFormat, dependencies);
  }

  if (scope === "portfolio") {
    return runPortfolioGroup(action, args, outputFormat, dependencies);
  }

  if (scope === "metrics") {
    return runMetricsGroup(action, args, outputFormat, dependencies);
  }

  if (scope === "delivery") {
    return runDeliveryGroup(action, args, outputFormat, dependencies);
  }

  if (scope === "forecast") {
    return runForecastGroup(action, args, outputFormat, dependencies);
  }

  if (scope === "worktracking") {
    return runWorktrackingGroup(action, args, outputFormat, dependencies);
  }

  if (scope === "feature") {
    return runFeatureGroup(action, args, outputFormat, dependencies);
  }

  if (scope === "config") {
    return runConfigGroup(action, subject, args, dependencies);
  }

  if (scope === "health") {
    return runHealthGroup(action, dependencies);
  }

  if (scope === "version") {
    return runVersionGroup(action, outputFormat, dependencies);
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
  loadOutputFormat: async () => null,
  saveOutputFormat: async () => undefined,
  readTextFile: async () => {
    throw new Error("No file reader configured.");
  },
  prompt: async () => "",
  openBrowser: async () => undefined,
  validateConnectivity: async () => ({
    category: "unreachable" as const,
    reason: "No connectivity validator configured.",
  }),
  validateStandaloneDiscovery: async () => ({
    category: "unreachable" as const,
    reason: "No standalone discovery validator configured.",
  }),
  queryAuthMode: async () => ({ mode: "disabled" }),
  startAuthSession: async () => ({
    status: "error" as const,
    category: "unreachable" as const,
    reason: "No auth session starter configured.",
  }),
  pollCliAuthSession: async () => ({ status: "pending" as const }),
  createClient: (connection) =>
    createLighthouseClient(
      connection.mode === "standalone"
        ? {
            connection: {
              kind: "standalone",
              getDiscoveryContract: async () => null,
            },
          }
        : {
            connection: {
              kind: "explicit",
              lighthouseUrl: connection.endpointUrl,
            },
            auth: connection.auth,
          },
    ),
});
