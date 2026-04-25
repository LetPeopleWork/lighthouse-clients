export type ClientCapability =
  | "versioned-api-contracts"
  | "shared-domain-operations"
  | "connectivity-and-discovery-contracts";

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
};

export type ConnectivityDependencies = {
  readonly fetch: (url: string) => Promise<ConnectivityFetchResponse>;
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
): Promise<ConnectivityValidationResult> => {
  const resolvedEndpoint = await resolveConnectionEndpoint(configuration);
  if (!resolvedEndpoint.isValid) {
    return resolvedEndpoint.result;
  }

  const endpoint = resolvedEndpoint.endpoint;

  try {
    const response = await dependencies.fetch(endpoint.healthCheckUrl);
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
