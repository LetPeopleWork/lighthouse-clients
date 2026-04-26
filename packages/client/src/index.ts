export type ClientCapability =
  | "versioned-api-contracts"
  | "shared-domain-operations"
  | "connectivity-and-discovery-contracts"
  | "automation-auth-contracts";

export type ClientPackageContract = {
  readonly name: "@letpeoplework/lighthouse-client";
  readonly capabilities: readonly ClientCapability[];
};

export const getClientPackageContract = (): ClientPackageContract => ({
  name: "@letpeoplework/lighthouse-client",
  capabilities: [
    "versioned-api-contracts",
    "shared-domain-operations",
    "connectivity-and-discovery-contracts",
    "automation-auth-contracts",
  ],
});

export type ConnectivityCategory =
  | "success"
  | "unreachable"
  | "misconfigured"
  | "unauthorized"
  | "dependency-failure"
  | "unexpected";

export type StandaloneDiscoveryContract = {
  readonly contractVersion: 1;
  readonly lighthouseUrl: string;
  readonly detectedAtUtc: string;
};

export type StandaloneDiscoveryContractParseResult =
  | {
      readonly isValid: true;
      readonly contract: StandaloneDiscoveryContract;
    }
  | {
      readonly isValid: false;
      readonly reason: string;
    };

export type LighthouseConnectionConfiguration =
  | {
      readonly kind: "explicit";
      readonly lighthouseUrl: string;
    }
  | {
      readonly kind: "standalone";
      readonly getDiscoveryContract: () => Promise<StandaloneDiscoveryContract | null>;
    };

export type ConnectivityFetchResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly text: () => Promise<string>;
  readonly json?: () => Promise<unknown>;
};

export type ConnectivityDependencies = {
  readonly fetch: (
    url: string,
    init?: RequestInit,
  ) => Promise<ConnectivityFetchResponse>;
};

export type ResolvedLighthouseEndpoint = {
  readonly mode: "explicit" | "standalone";
  readonly lighthouseUrl: string;
  readonly apiBaseUrl: string;
  readonly healthCheckUrl: string;
};

export type ConnectivityValidationResult =
  | {
      readonly category: "success";
      readonly endpoint: ResolvedLighthouseEndpoint;
      readonly serverVersion: string;
    }
  | {
      readonly category: Exclude<ConnectivityCategory, "success">;
      readonly reason: string;
      readonly statusCode?: number;
      readonly endpoint?: ResolvedLighthouseEndpoint;
    };

const SUPPORTED_DISCOVERY_CONTRACT_VERSION = 1;

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getErrorMessageWithCause = (error: unknown, fallback: string): string => {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const cause = error.cause;
  if (cause instanceof Error && cause.message.trim().length > 0) {
    if (cause.message === error.message) {
      return error.message;
    }

    return `${error.message} (${cause.message})`;
  }

  if (typeof cause === "string" && cause.trim().length > 0) {
    if (cause === error.message) {
      return error.message;
    }

    return `${error.message} (${cause})`;
  }

  return error.message;
};

const getNormalizedLighthouseUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const pathname = parsed.pathname.replace(/\/+$/u, "");
    if (pathname.length === 0 || pathname === "/") {
      return parsed.origin;
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    return null;
  }
};

const getApiBaseUrl = (lighthouseUrl: string): string => {
  if (lighthouseUrl.endsWith("/api")) {
    return lighthouseUrl;
  }

  return `${lighthouseUrl}/api`;
};

const validateDiscoveryTimestamp = (detectedAtUtc: string): boolean => {
  return !Number.isNaN(Date.parse(detectedAtUtc));
};

const getInvalidContractResult = (
  reason: string,
): StandaloneDiscoveryContractParseResult => ({
  isValid: false,
  reason,
});

const validateStandaloneDiscoveryContract = (
  contract: StandaloneDiscoveryContract,
): StandaloneDiscoveryContractParseResult => {
  if (contract.contractVersion !== SUPPORTED_DISCOVERY_CONTRACT_VERSION) {
    return getInvalidContractResult(
      "Discovery contractVersion is not supported.",
    );
  }

  const normalizedUrl = getNormalizedLighthouseUrl(contract.lighthouseUrl);
  if (normalizedUrl === null) {
    return getInvalidContractResult("Discovery lighthouseUrl is invalid.");
  }

  if (!validateDiscoveryTimestamp(contract.detectedAtUtc)) {
    return getInvalidContractResult("Discovery detectedAtUtc is invalid.");
  }

  return {
    isValid: true,
    contract: {
      contractVersion: SUPPORTED_DISCOVERY_CONTRACT_VERSION,
      lighthouseUrl: normalizedUrl,
      detectedAtUtc: contract.detectedAtUtc,
    },
  };
};

export const parseStandaloneDiscoveryContract = (
  serializedContract: string,
): StandaloneDiscoveryContractParseResult => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serializedContract);
  } catch {
    return getInvalidContractResult(
      "Discovery contract payload is not valid JSON.",
    );
  }

  if (!isObjectRecord(parsed)) {
    return getInvalidContractResult(
      "Discovery contract payload must be an object.",
    );
  }

  const contractVersion = parsed.contractVersion;
  if (typeof contractVersion !== "number") {
    return getInvalidContractResult(
      "Discovery contractVersion must be a number.",
    );
  }

  const lighthouseUrl = parsed.lighthouseUrl;
  if (typeof lighthouseUrl !== "string") {
    return getInvalidContractResult(
      "Discovery lighthouseUrl must be a string.",
    );
  }

  const detectedAtUtc = parsed.detectedAtUtc;
  if (typeof detectedAtUtc !== "string") {
    return getInvalidContractResult(
      "Discovery detectedAtUtc must be a string.",
    );
  }

  return validateStandaloneDiscoveryContract({
    contractVersion: contractVersion as 1,
    lighthouseUrl,
    detectedAtUtc,
  });
};

const getResolvedEndpoint = (
  mode: "explicit" | "standalone",
  lighthouseUrl: string,
): ResolvedLighthouseEndpoint => {
  const apiBaseUrl = getApiBaseUrl(lighthouseUrl);

  return {
    mode,
    lighthouseUrl,
    apiBaseUrl,
    healthCheckUrl: `${apiBaseUrl}/v1/version`,
  };
};

const getMisconfiguredResult = (
  reason: string,
): ConnectivityValidationResult => ({
  category: "misconfigured",
  reason,
});

const resolveConnectionEndpoint = async (
  configuration: LighthouseConnectionConfiguration,
): Promise<
  | {
      readonly isValid: true;
      readonly endpoint: ResolvedLighthouseEndpoint;
    }
  | {
      readonly isValid: false;
      readonly result: ConnectivityValidationResult;
    }
> => {
  if (configuration.kind === "explicit") {
    const normalizedUrl = getNormalizedLighthouseUrl(
      configuration.lighthouseUrl,
    );
    if (normalizedUrl === null) {
      return {
        isValid: false,
        result: getMisconfiguredResult("Explicit Lighthouse URL is invalid."),
      };
    }

    return {
      isValid: true,
      endpoint: getResolvedEndpoint("explicit", normalizedUrl),
    };
  }

  const discoveryContract = await configuration.getDiscoveryContract();
  if (discoveryContract === null) {
    return {
      isValid: false,
      result: getMisconfiguredResult(
        "Standalone discovery contract is not available.",
      ),
    };
  }

  const parsedContract = validateStandaloneDiscoveryContract(discoveryContract);
  if (!parsedContract.isValid) {
    return {
      isValid: false,
      result: getMisconfiguredResult(parsedContract.reason),
    };
  }

  return {
    isValid: true,
    endpoint: getResolvedEndpoint(
      "standalone",
      parsedContract.contract.lighthouseUrl,
    ),
  };
};

const getFailureCategoryForStatus = (
  statusCode: number,
): Exclude<ConnectivityCategory, "success" | "unreachable"> => {
  if (statusCode === 401 || statusCode === 403) {
    return "unauthorized";
  }

  if (statusCode === 404) {
    return "misconfigured";
  }

  if (statusCode >= 500 && statusCode <= 599) {
    return "dependency-failure";
  }

  return "unexpected";
};

export const validateLighthouseConnectivity = async (
  configuration: LighthouseConnectionConfiguration,
  dependencies: ConnectivityDependencies,
  requestInit?: RequestInit,
): Promise<ConnectivityValidationResult> => {
  const resolvedEndpoint = await resolveConnectionEndpoint(configuration);
  if (!resolvedEndpoint.isValid) {
    return resolvedEndpoint.result;
  }

  const endpoint = resolvedEndpoint.endpoint;

  try {
    const response = await dependencies.fetch(
      endpoint.healthCheckUrl,
      requestInit,
    );
    if (response.ok) {
      const serverVersion = (await response.text()).trim();

      return {
        category: "success",
        endpoint,
        serverVersion,
      };
    }

    return {
      category: getFailureCategoryForStatus(response.status),
      reason: `Connectivity check failed with status ${response.status}.`,
      statusCode: response.status,
      endpoint,
    };
  } catch (error: unknown) {
    const message = getErrorMessageWithCause(
      error,
      "Connectivity request failed.",
    );

    return {
      category: "unreachable",
      reason: message,
      endpoint,
    };
  }
};

export type LighthouseClientAuth =
  | {
      readonly kind: "none";
    }
  | {
      readonly kind: "api-key";
      readonly value: string;
      readonly headerName?: string;
    }
  | {
      readonly kind: "bearer-token";
      readonly token: string;
    };

export type StoredLighthouseAuth = Exclude<
  LighthouseClientAuth,
  { kind: "none" }
>;

export type LighthouseAuthOverrides = {
  readonly apiKey?: string;
  readonly bearerToken?: string;
  readonly apiKeyHeaderName?: string;
};

export type LighthouseAuthStatus = {
  readonly isAuthenticated: boolean;
  readonly kind: LighthouseClientAuth["kind"];
  readonly source: "none" | "stored" | "override";
};

export type LighthouseAuthStore = {
  readonly load: () => Promise<StoredLighthouseAuth | null>;
  readonly save: (auth: StoredLighthouseAuth) => Promise<void>;
  readonly clear: () => Promise<void>;
};

export type LighthouseAuthContext = {
  readonly resolveAuth: (
    overrides?: LighthouseAuthOverrides,
  ) => Promise<LighthouseClientAuth>;
  readonly login: (overrides: LighthouseAuthOverrides) => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly getStatus: (
    overrides?: LighthouseAuthOverrides,
  ) => Promise<LighthouseAuthStatus>;
};

const getTrimmedValue = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed;
};

const getAuthFromOverrides = (
  overrides: LighthouseAuthOverrides | undefined,
): StoredLighthouseAuth | null => {
  const apiKey = getTrimmedValue(overrides?.apiKey);
  const bearerToken = getTrimmedValue(overrides?.bearerToken);
  if (apiKey !== undefined && bearerToken !== undefined) {
    throw new Error("Specify either --api-key or --bearer-token, not both.");
  }

  if (apiKey !== undefined) {
    return {
      kind: "api-key",
      value: apiKey,
      headerName: getTrimmedValue(overrides?.apiKeyHeaderName),
    };
  }

  if (bearerToken !== undefined) {
    return {
      kind: "bearer-token",
      token: bearerToken,
    };
  }

  return null;
};

const getStatusFromAuth = (
  auth: LighthouseClientAuth,
  source: LighthouseAuthStatus["source"],
): LighthouseAuthStatus => {
  if (auth.kind === "none") {
    return {
      isAuthenticated: false,
      kind: "none",
      source: "none",
    };
  }

  return {
    isAuthenticated: true,
    kind: auth.kind,
    source,
  };
};

export const createLighthouseAuthContext = (
  store: LighthouseAuthStore,
): LighthouseAuthContext => ({
  resolveAuth: async (overrides?: LighthouseAuthOverrides) => {
    const overrideAuth = getAuthFromOverrides(overrides);
    if (overrideAuth !== null) {
      return overrideAuth;
    }

    const storedAuth = await store.load();
    if (storedAuth !== null) {
      return storedAuth;
    }

    return {
      kind: "none",
    };
  },
  login: async (overrides: LighthouseAuthOverrides) => {
    const auth = getAuthFromOverrides(overrides);
    if (auth === null) {
      throw new Error("Provide --api-key or --bearer-token for auth login.");
    }

    await store.save(auth);
  },
  logout: async () => {
    await store.clear();
  },
  getStatus: async (overrides?: LighthouseAuthOverrides) => {
    const overrideAuth = getAuthFromOverrides(overrides);
    if (overrideAuth !== null) {
      return getStatusFromAuth(overrideAuth, "override");
    }

    const storedAuth = await store.load();
    if (storedAuth !== null) {
      return getStatusFromAuth(storedAuth, "stored");
    }

    return getStatusFromAuth({ kind: "none" }, "none");
  },
});

// ── CLI connection types ──────────────────────────────────────────────────────

export type CliServerAuthMode =
  | "disabled"
  | "required"
  | "blocked"
  | "misconfigured";

export type ServerAuthModeResult = {
  readonly mode: CliServerAuthMode;
  readonly misconfigurationMessage?: string;
};

export type CliAuthSessionStartResult = {
  readonly status: "started";
  readonly sessionId: string;
  readonly verificationUrl: string;
  readonly expiresAt: string;
};

export type CliAuthSessionStartError = {
  readonly status: "error";
  readonly category: Exclude<ConnectivityCategory, "success">;
  readonly reason: string;
  readonly statusCode?: number;
};

export type CliAuthSessionStartOutcome =
  | CliAuthSessionStartResult
  | CliAuthSessionStartError;

export type CliAuthSessionPollResult =
  | { readonly status: "pending" }
  | {
      readonly status: "approved";
      readonly token: string;
      readonly userName: string;
    }
  | { readonly status: "expired" }
  | { readonly status: "denied" }
  | { readonly status: "not-found" };

export type CliServerConnection = {
  readonly mode: "server";
  readonly endpointUrl: string;
  readonly authMode: "disabled" | "required";
  readonly insecure?: boolean;
  readonly auth?: StoredLighthouseAuth;
};

export type CliConnection = CliServerConnection;

type AuthModeApiResponse = {
  readonly mode: string;
  readonly misconfigurationMessage?: string;
};

type CliSessionApiResponse = {
  readonly sessionId: string;
  readonly verificationUrl: string;
  readonly expiresAt: string;
};

type CliPollApiResponse = {
  readonly status: string;
  readonly token?: string;
  readonly userName?: string;
};

type CliAuthDependencies = {
  readonly fetch: typeof globalThis.fetch;
};

const mapAuthMode = (serverMode: string): CliServerAuthMode => {
  switch (serverMode.toLowerCase()) {
    case "enabled":
      return "required";
    case "disabled":
      return "disabled";
    case "blocked":
      return "blocked";
    default:
      return "misconfigured";
  }
};

const getAuthStartFailureCategory = (
  statusCode: number,
): Exclude<ConnectivityCategory, "success" | "unreachable"> => {
  if (statusCode === 401 || statusCode === 403) {
    return "unauthorized";
  }

  if (statusCode === 404) {
    return "misconfigured";
  }

  if (statusCode >= 500 && statusCode <= 599) {
    return "dependency-failure";
  }

  return "unexpected";
};

const getErrorReasonFromResponse = async (
  response: ConnectivityFetchResponse,
  fallback: string,
): Promise<string> => {
  try {
    const body = (await response.text()).trim();
    if (body.length > 0) {
      return body;
    }
  } catch {
    // Ignore body parsing failures and return the fallback message.
  }

  return fallback;
};

export const queryServerAuthMode = async (
  endpointUrl: string,
  dependencies: CliAuthDependencies,
): Promise<ServerAuthModeResult> => {
  const normalizedEndpointUrl = getNormalizedLighthouseUrl(endpointUrl);
  if (normalizedEndpointUrl === null) {
    return {
      mode: "misconfigured",
      misconfigurationMessage: "Server URL is invalid.",
    };
  }

  const apiBase = getApiBaseUrl(normalizedEndpointUrl);
  try {
    const response = await dependencies.fetch(`${apiBase}/v1/auth/mode`);
    if (!response.ok) {
      return {
        mode: "misconfigured",
        misconfigurationMessage: await getErrorReasonFromResponse(
          response,
          `HTTP ${response.status}`,
        ),
      };
    }
    const json = (await response.json()) as AuthModeApiResponse;
    return {
      mode: mapAuthMode(json.mode),
      misconfigurationMessage: json.misconfigurationMessage,
    };
  } catch (error: unknown) {
    return {
      mode: "misconfigured",
      misconfigurationMessage: getErrorMessageWithCause(
        error,
        "Could not reach auth mode endpoint.",
      ),
    };
  }
};

export const startCliAuthSession = async (
  endpointUrl: string,
  dependencies: CliAuthDependencies,
): Promise<CliAuthSessionStartOutcome> => {
  const normalizedEndpointUrl = getNormalizedLighthouseUrl(endpointUrl);
  if (normalizedEndpointUrl === null) {
    return {
      status: "error",
      category: "misconfigured",
      reason: "Server URL is invalid.",
    };
  }

  const apiBase = getApiBaseUrl(normalizedEndpointUrl);
  try {
    const response = await dependencies.fetch(
      `${apiBase}/v1/auth/cli/session`,
      {
        method: "POST",
      },
    );
    if (!response.ok) {
      return {
        status: "error",
        category: getAuthStartFailureCategory(response.status),
        reason: await getErrorReasonFromResponse(
          response,
          `HTTP ${response.status}`,
        ),
        statusCode: response.status,
      };
    }
    const json = (await response.json()) as CliSessionApiResponse;
    return {
      status: "started",
      sessionId: json.sessionId,
      verificationUrl: json.verificationUrl,
      expiresAt: json.expiresAt,
    };
  } catch (error: unknown) {
    return {
      status: "error",
      category: "unreachable",
      reason: getErrorMessageWithCause(
        error,
        "Could not reach auth session endpoint.",
      ),
    };
  }
};

export const pollCliAuthSession = async (
  endpointUrl: string,
  sessionId: string,
  dependencies: CliAuthDependencies,
): Promise<CliAuthSessionPollResult> => {
  const normalizedEndpointUrl = getNormalizedLighthouseUrl(endpointUrl);
  if (normalizedEndpointUrl === null) {
    return { status: "expired" };
  }

  const apiBase = getApiBaseUrl(normalizedEndpointUrl);
  try {
    const response = await dependencies.fetch(
      `${apiBase}/v1/auth/cli/poll/${encodeURIComponent(sessionId)}`,
    );
    if (response.status === 404) {
      return { status: "not-found" };
    }
    if (!response.ok) {
      return { status: "expired" };
    }
    const json = (await response.json()) as CliPollApiResponse;
    if (json.status === "approved" && json.token && json.userName) {
      return { status: "approved", token: json.token, userName: json.userName };
    }
    if (json.status === "expired") {
      return { status: "expired" };
    }
    if (json.status === "denied") {
      return { status: "denied" };
    }
    return { status: "pending" };
  } catch {
    return { status: "expired" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────

export type LighthouseClientConfiguration = {
  readonly connection: LighthouseConnectionConfiguration;
  readonly auth?: LighthouseClientAuth;
};

export type LighthouseApiError = {
  readonly category: ConnectivityCategory;
  readonly reason: string;
  readonly statusCode?: number;
};

export type LighthouseApiResult<TValue> =
  | {
      readonly ok: true;
      readonly value: TValue;
    }
  | {
      readonly ok: false;
      readonly error: LighthouseApiError;
    };

export type LighthouseWritePayload = Readonly<Record<string, unknown>>;

export type MetricsDateRange = {
  readonly startDate: string;
  readonly endDate: string;
};

export const getDefaultMetricsDateRange = (): MetricsDateRange => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  const toIsoDate = (d: Date): string =>
    d.toISOString().split("T")[0] as string;
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
};

export type ManualForecastInput = {
  readonly remainingItems?: number;
  readonly targetDate?: string;
};

export type BacktestInput = {
  readonly startDate: string;
  readonly endDate: string;
  readonly historicalStartDate: string;
  readonly historicalEndDate: string;
};

export type LighthouseClient = {
  readonly checkConnectivity: () => Promise<ConnectivityValidationResult>;
  readonly getVersion: () => Promise<LighthouseApiResult<string>>;

  readonly listWorkTrackingConnections: () => Promise<
    LighthouseApiResult<readonly unknown[]>
  >;
  readonly getWorkTrackingConnection: (
    connectionId: number,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly createWorkTrackingConnection: (
    payload: LighthouseWritePayload,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly updateWorkTrackingConnection: (
    connectionId: number,
    payload: LighthouseWritePayload,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly deleteWorkTrackingConnection: (
    connectionId: number,
  ) => Promise<LighthouseApiResult<void>>;

  readonly listTeams: () => Promise<LighthouseApiResult<readonly unknown[]>>;
  readonly getTeam: (teamId: number) => Promise<LighthouseApiResult<unknown>>;
  readonly createTeam: (
    payload: LighthouseWritePayload,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly updateTeam: (
    teamId: number,
    payload: LighthouseWritePayload,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly deleteTeam: (teamId: number) => Promise<LighthouseApiResult<void>>;
  readonly refreshTeam: (teamId: number) => Promise<LighthouseApiResult<void>>;

  readonly listPortfolios: () => Promise<
    LighthouseApiResult<readonly unknown[]>
  >;
  readonly getPortfolio: (
    portfolioId: number,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly createPortfolio: (
    payload: LighthouseWritePayload,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly updatePortfolio: (
    portfolioId: number,
    payload: LighthouseWritePayload,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly deletePortfolio: (
    portfolioId: number,
  ) => Promise<LighthouseApiResult<void>>;
  readonly refreshPortfolio: (
    portfolioId: number,
  ) => Promise<LighthouseApiResult<void>>;

  // Metrics
  readonly getTeamThroughput: (
    teamId: number,
    range?: MetricsDateRange,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly getTeamCycleTimePercentiles: (
    teamId: number,
    range?: MetricsDateRange,
  ) => Promise<LighthouseApiResult<readonly unknown[]>>;
  readonly getPortfolioThroughput: (
    portfolioId: number,
    range?: MetricsDateRange,
  ) => Promise<LighthouseApiResult<unknown>>;

  // Features
  readonly getFeaturesByIds: (
    ids: readonly number[],
  ) => Promise<LighthouseApiResult<readonly unknown[]>>;
  readonly getFeaturesByReferences: (
    refs: readonly string[],
  ) => Promise<LighthouseApiResult<readonly unknown[]>>;
  readonly getFeatureWorkItems: (
    featureId: number,
  ) => Promise<LighthouseApiResult<readonly unknown[]>>;

  // Deliveries
  readonly listDeliveries: (
    portfolioId: number,
  ) => Promise<LighthouseApiResult<readonly unknown[]>>;
  readonly createDelivery: (
    portfolioId: number,
    payload: LighthouseWritePayload,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly updateDelivery: (
    deliveryId: number,
    payload: LighthouseWritePayload,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly deleteDelivery: (
    deliveryId: number,
  ) => Promise<LighthouseApiResult<undefined>>;

  // Forecasts
  readonly runManualForecast: (
    teamId: number,
    payload: ManualForecastInput,
  ) => Promise<LighthouseApiResult<unknown>>;
  readonly runBacktest: (
    teamId: number,
    payload: BacktestInput,
  ) => Promise<LighthouseApiResult<unknown>>;
};

export type LighthouseClientDependencies = {
  readonly fetch?: (
    url: string,
    init?: RequestInit,
  ) => Promise<ConnectivityFetchResponse>;
};

const getAuthHeaders = (
  auth: LighthouseClientAuth | undefined,
): Record<string, string> => {
  if (auth === undefined || auth.kind === "none") {
    return {};
  }

  if (auth.kind === "api-key") {
    return {
      [auth.headerName ?? "X-Api-Key"]: auth.value,
    };
  }

  return {
    Authorization: `Bearer ${auth.token}`,
  };
};

const getRequestInit = (
  auth: LighthouseClientAuth | undefined,
  requestOptions?: {
    readonly method?: "GET" | "POST" | "PUT" | "DELETE";
    readonly body?: unknown;
  },
): RequestInit => {
  const authHeaders = getAuthHeaders(auth);
  const hasBody = requestOptions?.body !== undefined;
  const headers = hasBody
    ? {
        ...authHeaders,
        "content-type": "application/json",
      }
    : authHeaders;

  return {
    method: requestOptions?.method,
    headers,
    body: hasBody ? JSON.stringify(requestOptions.body) : undefined,
  };
};

const getFetchDependency = (
  dependencies: LighthouseClientDependencies,
): ConnectivityDependencies["fetch"] => {
  if (dependencies.fetch !== undefined) {
    return dependencies.fetch;
  }

  return async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    return response;
  };
};

const getErrorResult = <TValue>(
  error: LighthouseApiError,
): LighthouseApiResult<TValue> => ({
  ok: false,
  error,
});

const getErrorFromConnectivityResult = (
  result: Exclude<
    ConnectivityValidationResult,
    { readonly category: "success" }
  >,
): LighthouseApiError => ({
  category: result.category,
  reason: result.reason,
  statusCode: result.statusCode,
});

const toApiError = (
  statusCode: number,
  reason: string,
): LighthouseApiError => ({
  category: getFailureCategoryForStatus(statusCode),
  reason,
  statusCode,
});

const requestText = async (
  configuration: LighthouseClientConfiguration,
  dependencies: LighthouseClientDependencies,
  route: string,
): Promise<LighthouseApiResult<string>> => {
  const fetchDependency = getFetchDependency(dependencies);
  const connectivityResult = await validateLighthouseConnectivity(
    configuration.connection,
    {
      fetch: fetchDependency,
    },
    getRequestInit(configuration.auth),
  );

  if (connectivityResult.category !== "success") {
    return getErrorResult(getErrorFromConnectivityResult(connectivityResult));
  }

  try {
    const response = await fetchDependency(
      `${connectivityResult.endpoint.apiBaseUrl}${route}`,
      getRequestInit(configuration.auth),
    );
    if (!response.ok) {
      return getErrorResult(
        toApiError(
          response.status,
          `Request failed with status ${response.status}.`,
        ),
      );
    }

    return {
      ok: true,
      value: (await response.text()).trim(),
    };
  } catch (error: unknown) {
    const reason =
      error instanceof Error ? error.message : "Request execution failed.";

    return getErrorResult({
      category: "unreachable",
      reason,
    });
  }
};

const requestJson = async <TValue>(
  configuration: LighthouseClientConfiguration,
  dependencies: LighthouseClientDependencies,
  route: string,
  requestOptions?: {
    readonly method?: "GET" | "POST" | "PUT" | "DELETE";
    readonly body?: unknown;
  },
): Promise<LighthouseApiResult<TValue>> => {
  const fetchDependency = getFetchDependency(dependencies);
  const connectivityResult = await validateLighthouseConnectivity(
    configuration.connection,
    {
      fetch: fetchDependency,
    },
    getRequestInit(configuration.auth, {
      method: "GET",
    }),
  );

  if (connectivityResult.category !== "success") {
    return getErrorResult(getErrorFromConnectivityResult(connectivityResult));
  }

  try {
    const response = await fetchDependency(
      `${connectivityResult.endpoint.apiBaseUrl}${route}`,
      getRequestInit(configuration.auth, requestOptions),
    );
    if (!response.ok) {
      return getErrorResult(
        toApiError(
          response.status,
          `Request failed with status ${response.status}.`,
        ),
      );
    }

    const value =
      response.json !== undefined
        ? ((await response.json()) as TValue)
        : (JSON.parse(await response.text()) as TValue);

    return {
      ok: true,
      value,
    };
  } catch (error: unknown) {
    const reason =
      error instanceof Error ? error.message : "Request execution failed.";

    return getErrorResult({
      category: "unreachable",
      reason,
    });
  }
};

const requestNoContent = async (
  configuration: LighthouseClientConfiguration,
  dependencies: LighthouseClientDependencies,
  route: string,
  requestOptions: {
    readonly method: "POST" | "DELETE";
  },
): Promise<LighthouseApiResult<undefined>> => {
  const fetchDependency = getFetchDependency(dependencies);
  const connectivityResult = await validateLighthouseConnectivity(
    configuration.connection,
    {
      fetch: fetchDependency,
    },
    getRequestInit(configuration.auth, {
      method: "GET",
    }),
  );

  if (connectivityResult.category !== "success") {
    return getErrorResult(getErrorFromConnectivityResult(connectivityResult));
  }

  try {
    const response = await fetchDependency(
      `${connectivityResult.endpoint.apiBaseUrl}${route}`,
      getRequestInit(configuration.auth, requestOptions),
    );
    if (!response.ok) {
      return getErrorResult(
        toApiError(
          response.status,
          `Request failed with status ${response.status}.`,
        ),
      );
    }

    return {
      ok: true,
      value: undefined,
    };
  } catch (error: unknown) {
    const reason =
      error instanceof Error ? error.message : "Request execution failed.";

    return getErrorResult({
      category: "unreachable",
      reason,
    });
  }
};

export const createLighthouseClient = (
  configuration: LighthouseClientConfiguration,
  dependencies: LighthouseClientDependencies = {},
): LighthouseClient => ({
  checkConnectivity: async () => {
    const fetchDependency = getFetchDependency(dependencies);

    return validateLighthouseConnectivity(
      configuration.connection,
      {
        fetch: fetchDependency,
      },
      getRequestInit(configuration.auth),
    );
  },
  getVersion: async () =>
    requestText(configuration, dependencies, "/v1/version"),
  listWorkTrackingConnections: async () =>
    requestJson<readonly unknown[]>(
      configuration,
      dependencies,
      "/v1/worktrackingsystemconnections",
      {
        method: "GET",
      },
    ),
  getWorkTrackingConnection: async (connectionId: number) =>
    requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/worktrackingsystemconnections/${connectionId}`,
      {
        method: "GET",
      },
    ),
  createWorkTrackingConnection: async (payload: LighthouseWritePayload) =>
    requestJson<unknown>(
      configuration,
      dependencies,
      "/v1/worktrackingsystemconnections",
      {
        method: "POST",
        body: payload,
      },
    ),
  updateWorkTrackingConnection: async (
    connectionId: number,
    payload: LighthouseWritePayload,
  ) =>
    requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/worktrackingsystemconnections/${connectionId}`,
      {
        method: "PUT",
        body: payload,
      },
    ),
  deleteWorkTrackingConnection: async (connectionId: number) =>
    requestNoContent(
      configuration,
      dependencies,
      `/v1/worktrackingsystemconnections/${connectionId}`,
      {
        method: "DELETE",
      },
    ),
  listTeams: async () =>
    requestJson<readonly unknown[]>(configuration, dependencies, "/v1/teams", {
      method: "GET",
    }),
  getTeam: async (teamId: number) =>
    requestJson<unknown>(configuration, dependencies, `/v1/teams/${teamId}`, {
      method: "GET",
    }),
  createTeam: async (payload: LighthouseWritePayload) =>
    requestJson<unknown>(configuration, dependencies, "/v1/teams", {
      method: "POST",
      body: payload,
    }),
  updateTeam: async (teamId: number, payload: LighthouseWritePayload) =>
    requestJson<unknown>(configuration, dependencies, `/v1/teams/${teamId}`, {
      method: "PUT",
      body: payload,
    }),
  deleteTeam: async (teamId: number) =>
    requestNoContent(configuration, dependencies, `/v1/teams/${teamId}`, {
      method: "DELETE",
    }),
  refreshTeam: async (teamId: number) =>
    requestNoContent(configuration, dependencies, `/v1/teams/${teamId}`, {
      method: "POST",
    }),
  listPortfolios: async () =>
    requestJson<readonly unknown[]>(
      configuration,
      dependencies,
      "/v1/portfolios",
      {
        method: "GET",
      },
    ),
  getPortfolio: async (portfolioId: number) =>
    requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/portfolios/${portfolioId}`,
      {
        method: "GET",
      },
    ),
  createPortfolio: async (payload: LighthouseWritePayload) =>
    requestJson<unknown>(configuration, dependencies, "/v1/portfolios", {
      method: "POST",
      body: payload,
    }),
  updatePortfolio: async (
    portfolioId: number,
    payload: LighthouseWritePayload,
  ) =>
    requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/portfolios/${portfolioId}`,
      {
        method: "PUT",
        body: payload,
      },
    ),
  deletePortfolio: async (portfolioId: number) =>
    requestNoContent(
      configuration,
      dependencies,
      `/v1/portfolios/${portfolioId}`,
      {
        method: "DELETE",
      },
    ),
  refreshPortfolio: async (portfolioId: number) =>
    requestNoContent(
      configuration,
      dependencies,
      `/v1/portfolios/${portfolioId}/refresh`,
      {
        method: "POST",
      },
    ),
  getTeamThroughput: async (teamId: number, range?: MetricsDateRange) => {
    const r = range ?? getDefaultMetricsDateRange();
    return requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/teams/${teamId}/metrics/throughput?startDate=${r.startDate}&endDate=${r.endDate}`,
      { method: "GET" },
    );
  },
  getTeamCycleTimePercentiles: async (
    teamId: number,
    range?: MetricsDateRange,
  ) => {
    const r = range ?? getDefaultMetricsDateRange();
    return requestJson<readonly unknown[]>(
      configuration,
      dependencies,
      `/v1/teams/${teamId}/metrics/cycleTimePercentiles?startDate=${r.startDate}&endDate=${r.endDate}`,
      { method: "GET" },
    );
  },
  getPortfolioThroughput: async (
    portfolioId: number,
    range?: MetricsDateRange,
  ) => {
    const r = range ?? getDefaultMetricsDateRange();
    return requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/portfolios/${portfolioId}/metrics/throughput?startDate=${r.startDate}&endDate=${r.endDate}`,
      { method: "GET" },
    );
  },
  getFeaturesByIds: async (ids: readonly number[]) => {
    const queryString = ids
      .map((id) => `ids=${encodeURIComponent(id)}`)
      .join("&");
    return requestJson<readonly unknown[]>(
      configuration,
      dependencies,
      `/v1/features?${queryString}`,
      { method: "GET" },
    );
  },
  getFeaturesByReferences: async (refs: readonly string[]) => {
    const queryString = refs
      .map((r) => `featureReferences=${encodeURIComponent(r)}`)
      .join("&");
    return requestJson<readonly unknown[]>(
      configuration,
      dependencies,
      `/v1/features/references?${queryString}`,
      { method: "GET" },
    );
  },
  getFeatureWorkItems: async (featureId: number) =>
    requestJson<readonly unknown[]>(
      configuration,
      dependencies,
      `/v1/features/${featureId}/workitems`,
      { method: "GET" },
    ),
  listDeliveries: async (portfolioId: number) =>
    requestJson<readonly unknown[]>(
      configuration,
      dependencies,
      `/v1/deliveries/portfolio/${portfolioId}`,
      { method: "GET" },
    ),
  createDelivery: async (
    portfolioId: number,
    payload: LighthouseWritePayload,
  ) =>
    requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/deliveries/portfolio/${portfolioId}`,
      { method: "POST", body: payload },
    ),
  updateDelivery: async (deliveryId: number, payload: LighthouseWritePayload) =>
    requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/deliveries/${deliveryId}`,
      { method: "PUT", body: payload },
    ),
  deleteDelivery: async (deliveryId: number) =>
    requestNoContent(
      configuration,
      dependencies,
      `/v1/deliveries/${deliveryId}`,
      { method: "DELETE" },
    ),
  runManualForecast: async (teamId: number, payload: ManualForecastInput) =>
    requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/forecast/manual/${teamId}`,
      { method: "POST", body: payload },
    ),
  runBacktest: async (teamId: number, payload: BacktestInput) =>
    requestJson<unknown>(
      configuration,
      dependencies,
      `/v1/forecast/backtest/${teamId}`,
      { method: "POST", body: payload },
    ),
});
