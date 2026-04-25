export type ClientCapability =
  | "versioned-api-contracts"
  | "shared-domain-operations"
  | "connectivity-and-discovery-contracts"
  | "automation-auth-contracts";

export type ClientPackageContract = {
  readonly name: "@lighthouse/client";
  readonly capabilities: readonly ClientCapability[];
};

export const getClientPackageContract = (): ClientPackageContract => ({
  name: "@lighthouse/client",
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
    const message =
      error instanceof Error ? error.message : "Connectivity request failed.";

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

export type LighthouseClient = {
  readonly checkConnectivity: () => Promise<ConnectivityValidationResult>;
  readonly getVersion: () => Promise<LighthouseApiResult<string>>;
  readonly listTeams: () => Promise<LighthouseApiResult<readonly unknown[]>>;
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
): RequestInit => {
  const headers = getAuthHeaders(auth);

  return {
    headers,
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
): Promise<LighthouseApiResult<TValue>> => {
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
  listTeams: async () =>
    requestJson<readonly unknown[]>(configuration, dependencies, "/v1/teams"),
});
