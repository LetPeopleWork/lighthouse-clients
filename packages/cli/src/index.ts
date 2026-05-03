import {
  type CliConnection,
  type CliServerConnection,
  type CliStandaloneConnection,
  type ConnectivityValidationResult,
  type LighthouseApiResult,
  type LighthouseClient,
  type MetricsDateRange,
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
  | "getTeamWorkItemAgeOverTime"
  | "getTeamTotalWorkItemAgeOverTime"
  | "getPortfolioThroughput"
  | "getPortfolioCycleTimePercentiles"
  | "getPortfolioArrivals"
  | "getPortfolioWipOverTime"
  | "getPortfolioWip"
  | "getPortfolioCycleTimeData"
  | "getPortfolioPredictabilityScore"
  | "getPortfolioWorkItemAgeOverTime"
  | "getPortfolioTotalWorkItemAgeOverTime"
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
  readonly createClient: (connection: CliConnection) => CliClientOperations;
  readonly getEnvApiKey?: () => string | undefined;
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
};

type DailyValuePoint = {
  readonly date: string;
  readonly value: number;
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

// ── Metrics filter ───────────────────────────────────────────────────────────

const METRIC_KEYS = [
  "throughput",
  "wip",
  "cycleTime",
  "workItemAge",
  "totalWorkItemAge",
  "arrivals",
  "predictabilityScore",
] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

/** Aliases that users may type (lower-cased). Maps to canonical MetricKey. */
const METRIC_ALIASES: Record<string, MetricKey> = {
  throughput: "throughput",
  wip: "wip",
  cycletime: "cycleTime",
  cycleTime: "cycleTime",
  workitemage: "workItemAge",
  workItemAge: "workItemAge",
  totalworkitemage: "totalWorkItemAge",
  totalWorkItemAge: "totalWorkItemAge",
  arrivals: "arrivals",
  predictabilityscore: "predictabilityScore",
  predictabilityScore: "predictabilityScore",
};

const ALLOWED_METRIC_DISPLAY = METRIC_KEYS.join(", ");

/**
 * Parses `--metrics <metric,...>` from args.
 * Returns:
 *   - `null` when the flag is absent (means "all metrics").
 *   - A non-empty `Set<MetricKey>` with selected metrics.
 *   - A `CliCommandResult` error for unknown or empty values.
 */
const getMetricsFilter = (
  args: readonly string[],
): Set<MetricKey> | null | CliCommandResult => {
  const raw = getOptionValue(args, "--metrics");
  if (raw === undefined) {
    return null; // no filter → all metrics
  }

  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (entries.length === 0) {
    return getErrorResult(
      `--metrics requires at least one metric name. Allowed: ${ALLOWED_METRIC_DISPLAY}`,
    );
  }

  const resolved = new Set<MetricKey>();
  for (const entry of entries) {
    const key = METRIC_ALIASES[entry] ?? METRIC_ALIASES[entry.toLowerCase()];
    if (key === undefined) {
      return getErrorResult(
        `Unknown metric: "${entry}". Allowed: ${ALLOWED_METRIC_DISPLAY}`,
      );
    }
    resolved.add(key);
  }

  return resolved;
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

/**
 * Unwraps a `PromiseSettledResult` like `getMetricValueOrError`, but also
 * accepts `null` (the "skipped" sentinel produced by `maybeFetch`) and returns
 * `null` in that case so the payload builder can omit the section.
 */
const resolveOrSkip = <T>(
  result: PromiseSettledResult<LighthouseApiResult<T>> | null,
): T | MetricErrorValue | null =>
  result === null ? null : getMetricValueOrError(result);

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

  return Object.entries(value.workItemsPerUnitOfTime)
    .map(([offset, items]) => {
      const dayOffset = Number.parseInt(offset, 10);
      if (Number.isNaN(dayOffset)) {
        return null;
      }

      return {
        date: addDaysToIsoDate(startDate, dayOffset),
        count: Array.isArray(items) ? items.length : 0,
      };
    })
    .filter((entry): entry is DailyCountPoint => entry !== null)
    .sort((left, right) => left.date.localeCompare(right.date));
};

const getDailyValueSeriesFromInfo = (
  value: unknown,
): readonly DailyValuePoint[] => {
  if (!isRecord(value) || !isRecord(value.comparison)) {
    return [];
  }
  const { comparison } = value;
  const points: DailyValuePoint[] = [];
  if (typeof comparison.previousLabel === "string") {
    const numVal = Number.parseFloat(String(comparison.previousValue ?? "0"));
    points.push({
      date: comparison.previousLabel,
      value: Number.isFinite(numVal) ? numVal : 0,
      workItemIds: [],
    });
  }
  if (typeof comparison.currentLabel === "string") {
    const numVal = Number.parseFloat(String(comparison.currentValue ?? "0"));
    points.push({
      date: comparison.currentLabel,
      value: Number.isFinite(numVal) ? numVal : 0,
      workItemIds: [],
    });
  }
  return points;
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
    return { score: null };
  }

  return {
    score:
      typeof value.predictabilityScore === "number"
        ? value.predictabilityScore
        : null,
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
      lines.push(
        "API Key: none (set LIGHTHOUSE_API_KEY env var, or re-run lh connection connect to store a key)",
      );
    } else {
      lines.push("API Key: stored");
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

// ── connect option parser ───────────────────────────────────────────────────────

type ScriptedConnectOptions =
  | { readonly mode: "standalone" }
  | {
      readonly mode: "server";
      readonly url: string;
      readonly apiKey: string | undefined;
      readonly insecure: boolean;
    };

const parseScriptedConnectOptions = (
  args: readonly string[],
): ScriptedConnectOptions | null | CliCommandResult => {
  const mode = getOptionValue(args, "--mode");

  // No scripted flags supplied → fall through to interactive wizard
  if (mode === undefined) {
    return null;
  }

  if (mode !== "server" && mode !== "standalone") {
    return getErrorResult(
      `Invalid --mode "${mode}". Use "server" or "standalone".`,
    );
  }

  const url = getOptionValue(args, "--url");
  const rawApiKey = getOptionValue(args, "--api-key");
  const apiKey =
    rawApiKey !== undefined && rawApiKey.trim().length > 0
      ? rawApiKey.trim()
      : undefined;
  const insecure = args.includes("--insecure");

  if (mode === "standalone") {
    if (url !== undefined) {
      return getErrorResult(
        "--url is not valid for standalone mode. Remove --url and retry.",
      );
    }
    if (apiKey !== undefined) {
      return getErrorResult(
        "--api-key is not valid for standalone mode. Remove --api-key and retry.",
      );
    }
    if (insecure) {
      return getErrorResult(
        "--insecure is not valid for standalone mode. Remove --insecure and retry.",
      );
    }
    return { mode: "standalone" };
  }

  // server mode
  if (url === undefined || url.trim().length === 0) {
    return getErrorResult(
      "--url is required for server mode. Example: lh connection connect --mode server --url https://lighthouse.example.com",
    );
  }

  return { mode: "server", url: url.trim(), apiKey, insecure };
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
  apiKey: string,
  insecure: boolean,
): CliServerConnection => {
  if (insecure) {
    return {
      mode: "server",
      endpointUrl: url,
      authMode: "required",
      insecure: true,
      auth: { kind: "api-key", value: apiKey },
    };
  }

  return {
    mode: "server",
    endpointUrl: url,
    authMode: "required",
    auth: { kind: "api-key", value: apiKey },
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
  const apiKey = await dependencies.prompt(
    "API Key (leave blank if using LIGHTHOUSE_API_KEY env var): ",
  );
  if (apiKey.trim().length === 0) {
    const envApiKey = dependencies.getEnvApiKey?.();
    if (envApiKey === undefined || envApiKey.length === 0) {
      return getErrorResult(
        "API key cannot be empty.\n" +
          "To skip storing the key, set LIGHTHOUSE_API_KEY before running this command:\n" +
          "  export LIGHTHOUSE_API_KEY=<your-api-key>",
      );
    }
    const connection: CliServerConnection = insecure
      ? {
          mode: "server",
          endpointUrl: url,
          authMode: "required",
          insecure: true,
        }
      : { mode: "server", endpointUrl: url, authMode: "required" };
    await dependencies.saveConnection(connection);
    return getSuccessResult(
      `Connected to ${url} (auth: api-key via LIGHTHOUSE_API_KEY env var)`,
    );
  }

  const connection = getAuthenticatedConnection(url, apiKey.trim(), insecure);
  await dependencies.saveConnection(connection);
  return getSuccessResult(`Connected to ${url} (auth: api-key)`);
};

const runScriptedServerConnect = async (
  dependencies: RunCliCommandDependencies,
  url: string,
  apiKey: string | undefined,
  insecure: boolean,
): Promise<CliCommandResult> => {
  const validationResult = await dependencies.validateConnectivity(
    url,
    insecure || undefined,
  );
  if (!isServerReachable(validationResult)) {
    if (!insecure && url.toLowerCase().startsWith("https://")) {
      return getErrorResult(
        `Cannot reach server at ${url}: ${validationResult.reason}\nThis may be a TLS certificate issue. Retry with --insecure to skip TLS verification.`,
      );
    }
    return getServerConnectivityError(url, validationResult.reason);
  }

  if (apiKey === undefined) {
    const connection = getDisabledAuthConnection(url, insecure);
    await dependencies.saveConnection(connection);
    return getSuccessResult(`Connected to ${url} (auth: disabled)`);
  }

  const connection = getAuthenticatedConnection(url, apiKey, insecure);
  await dependencies.saveConnection(connection);
  return getSuccessResult(`Connected to ${url} (auth: api-key)`);
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

  const needsAuth = await dependencies.prompt(
    "Does this server require authentication? [y/N] ",
  );

  if (needsAuth.trim().toLowerCase() !== "y") {
    const connection = getDisabledAuthConnection(url, insecure);
    await dependencies.saveConnection(connection);
    return getSuccessResult(`Connected to ${url} (auth: disabled)`);
  }

  return runAuthenticatedServerConnect(dependencies, url, insecure);
};

const runConnect = async (
  args: readonly string[],
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  const scriptedOptions = parseScriptedConnectOptions(args);

  if (isCliCommandResult(scriptedOptions)) {
    return scriptedOptions;
  }

  if (scriptedOptions !== null) {
    if (scriptedOptions.mode === "standalone") {
      return runStandaloneConnect(dependencies);
    }
    return runScriptedServerConnect(
      dependencies,
      scriptedOptions.url,
      scriptedOptions.apiKey,
      scriptedOptions.insecure,
    );
  }

  // Interactive wizard
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
    "  lh connection connect                                               (interactive wizard)",
    "  lh connection connect --mode standalone                             (non-interactive)",
    "  lh connection connect --mode server --url <url>                    (server, no auth)",
    "  lh connection connect --mode server --url <url> --api-key <key>   (server, with API key auth)",
    "  lh connection connect --mode server --url <url> --insecure         (skip TLS verification)",
    "  lh connection disconnect",
    "  lh connection status",
    "",
    "Auth env var:",
    "  LIGHTHOUSE_API_KEY=<key>  Set this env var to authenticate without storing the key.",
    "  When set, you can leave the API Key prompt blank during interactive connect,",
    "  and all commands will use it automatically at runtime.",
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
    "  lh metrics team --id <id> [--start-date <date>] [--end-date <date>] [--metrics <metric,...>]",
    "  lh metrics portfolio --id <id> [--start-date <date>] [--end-date <date>] [--metrics <metric,...>]",
    "",
    "Defaults:",
    "  team: last 30 days",
    "  portfolio: last 90 days",
    "  if only one date is provided, it is reused for both start and end",
    "  if --metrics is omitted, all metrics are returned",
    "",
    `Allowed metrics: ${ALLOWED_METRIC_DISPLAY}`,
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
  filter: Set<MetricKey> | null,
): Promise<Record<string, unknown>> => {
  const unavailableReason =
    "No dedicated backend endpoint is available for this metric.";

  const all = filter === null;
  const needs = (key: MetricKey): boolean => all || filter.has(key);
  // wip.current is shared between the "wip" sections only (workItemAge now uses WIP-over-time)
  const needsCurrentWip = needs("wip");
  const isTeam = scope === "team";

  // Execute a request only when condition is true; otherwise resolves to null
  // so the payload builder can omit the section without making the HTTP call.
  const maybeFetch = <T>(
    condition: boolean,
    requestFn: () => Promise<LighthouseApiResult<T>>,
  ): Promise<PromiseSettledResult<LighthouseApiResult<T>> | null> =>
    condition
      ? Promise.allSettled([requestFn()]).then((r) => r[0])
      : Promise.resolve(null);

  const [
    throughputResult,
    arrivalsResult,
    wipOverTimeResult,
    currentWipResult,
    cycleTimePercentilesResult,
    cycleTimeDataResult,
    predictabilityScoreResult,
    workItemAgeOverTimeResult,
    totalWorkItemAgeOverTimeResult,
  ] = await Promise.all([
    maybeFetch(needs("throughput"), () =>
      isTeam
        ? client.getTeamThroughput(entityId, range)
        : client.getPortfolioThroughput(entityId, range),
    ),
    maybeFetch(needs("arrivals"), () =>
      isTeam
        ? client.getTeamArrivals(entityId, range)
        : client.getPortfolioArrivals(entityId, range),
    ),
    maybeFetch(needs("wip"), () =>
      isTeam
        ? client.getTeamWipOverTime(entityId, range)
        : client.getPortfolioWipOverTime(entityId, range),
    ),
    maybeFetch(needsCurrentWip, () =>
      isTeam
        ? client.getTeamWip(entityId, range.endDate)
        : client.getPortfolioWip(entityId, range.endDate),
    ),
    maybeFetch(needs("cycleTime"), () =>
      isTeam
        ? client.getTeamCycleTimePercentiles(entityId, range)
        : client.getPortfolioCycleTimePercentiles(entityId, range),
    ),
    maybeFetch(needs("cycleTime"), () =>
      isTeam
        ? client.getTeamCycleTimeData(entityId, range)
        : client.getPortfolioCycleTimeData(entityId, range),
    ),
    maybeFetch(needs("predictabilityScore"), () =>
      isTeam
        ? client.getTeamPredictabilityScore(entityId, range)
        : client.getPortfolioPredictabilityScore(entityId, range),
    ),
    maybeFetch(needs("workItemAge"), () =>
      isTeam
        ? client.getTeamWorkItemAgeOverTime(entityId, range)
        : client.getPortfolioWorkItemAgeOverTime(entityId, range),
    ),
    maybeFetch(needs("totalWorkItemAge"), () =>
      isTeam
        ? client.getTeamTotalWorkItemAgeOverTime(entityId, range)
        : client.getPortfolioTotalWorkItemAgeOverTime(entityId, range),
    ),
  ]);

  const throughputValue = resolveOrSkip(throughputResult);
  const arrivalsValue = resolveOrSkip(arrivalsResult);
  const wipOverTimeValue = resolveOrSkip(wipOverTimeResult);
  const currentWipValue = resolveOrSkip(currentWipResult);
  const cycleTimePercentilesValue = resolveOrSkip(cycleTimePercentilesResult);
  const cycleTimeDataValue = resolveOrSkip(cycleTimeDataResult);
  const predictabilityScoreValue = resolveOrSkip(predictabilityScoreResult);
  const workItemAgeOverTimeValue = resolveOrSkip(workItemAgeOverTimeResult);
  const totalWorkItemAgeOverTimeValue = resolveOrSkip(
    totalWorkItemAgeOverTimeResult,
  );

  const currentItems =
    currentWipValue === null
      ? null
      : isMetricErrorValue(currentWipValue)
        ? currentWipValue
        : getWorkItemList(currentWipValue);

  const payload: Record<string, unknown> = {
    schemaVersion: 1,
    scope,
    id: entityId,
    dateRange: range,
  };

  // Static unavailable sections are only included in the full (unfiltered) payload
  // to avoid cluttering single-metric responses with unrelated keys.
  if (all) {
    payload.blocked = getMetricUnavailableValue(unavailableReason);
    payload.workDistribution = getMetricUnavailableValue(unavailableReason);
  }

  if (needs("wip")) {
    payload.wip = {
      current:
        currentItems === null || isMetricErrorValue(currentItems)
          ? (currentItems ?? getMetricUnavailableValue(unavailableReason))
          : {
              asOfDate: range.endDate,
              count: currentItems.length,
              items: currentItems,
            },
      overTime:
        wipOverTimeValue === null || isMetricErrorValue(wipOverTimeValue)
          ? (wipOverTimeValue ?? getMetricUnavailableValue(unavailableReason))
          : {
              startDate: range.startDate,
              endDate: range.endDate,
              daily: getDailyCountSeries(wipOverTimeValue, range.startDate),
            },
    };
  }

  if (needs("throughput")) {
    payload.throughput =
      throughputValue === null || isMetricErrorValue(throughputValue)
        ? (throughputValue ?? getMetricUnavailableValue(unavailableReason))
        : {
            startDate: range.startDate,
            endDate: range.endDate,
            total: getChartTotal(
              throughputValue,
              getDailyCountSeries(throughputValue, range.startDate),
            ),
            daily: getDailyCountSeries(throughputValue, range.startDate),
          };
  }

  if (needs("cycleTime")) {
    payload.cycleTime = {
      percentiles:
        cycleTimePercentilesValue === null ||
        isMetricErrorValue(cycleTimePercentilesValue)
          ? (cycleTimePercentilesValue ??
            getMetricUnavailableValue(unavailableReason))
          : { values: cycleTimePercentilesValue },
      closedItems:
        cycleTimeDataValue === null || isMetricErrorValue(cycleTimeDataValue)
          ? (cycleTimeDataValue ?? getMetricUnavailableValue(unavailableReason))
          : { items: getWorkItemList(cycleTimeDataValue) },
    };
  }

  if (needs("workItemAge")) {
    payload.workItemAge =
      workItemAgeOverTimeValue === null ||
      isMetricErrorValue(workItemAgeOverTimeValue)
        ? (workItemAgeOverTimeValue ??
          getMetricUnavailableValue(unavailableReason))
        : workItemAgeOverTimeValue;
  }

  if (needs("totalWorkItemAge")) {
    payload.totalWorkItemAge =
      totalWorkItemAgeOverTimeValue === null ||
      isMetricErrorValue(totalWorkItemAgeOverTimeValue)
        ? (totalWorkItemAgeOverTimeValue ??
          getMetricUnavailableValue(unavailableReason))
        : totalWorkItemAgeOverTimeValue;
  }

  if (needs("arrivals")) {
    payload.arrivals =
      arrivalsValue === null || isMetricErrorValue(arrivalsValue)
        ? (arrivalsValue ?? getMetricUnavailableValue(unavailableReason))
        : {
            startDate: range.startDate,
            endDate: range.endDate,
            total: getChartTotal(
              arrivalsValue,
              getDailyCountSeries(arrivalsValue, range.startDate),
            ),
            daily: getDailyCountSeries(arrivalsValue, range.startDate),
          };
  }

  if (needs("predictabilityScore")) {
    payload.predictabilityScore =
      predictabilityScoreValue === null ||
      isMetricErrorValue(predictabilityScoreValue)
        ? (predictabilityScoreValue ??
          getMetricUnavailableValue(unavailableReason))
        : getPredictabilityScorePayload(predictabilityScoreValue);
  }

  return payload;
};

const runConnectionGroup = async (
  action: string | undefined,
  args: readonly string[],
  dependencies: RunCliCommandDependencies,
): Promise<CliCommandResult> => {
  if (action === undefined) {
    return getSuccessResult(getConnectionGroupHelpText());
  }

  if (action === "connect") {
    return runConnect(args, dependencies);
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

  const metricsFilterOrError = getMetricsFilter(args);
  if (isCliCommandResult(metricsFilterOrError)) {
    return metricsFilterOrError;
  }

  const payload = await buildMetricsPayload(
    action,
    entityId,
    range,
    client,
    metricsFilterOrError,
  );
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
    return runConnectionGroup(action, args, dependencies);
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
