import { describe, expect, it } from "vitest";
import {
  type StandaloneDiscoveryContract,
  parseStandaloneDiscoveryContract,
  validateLighthouseConnectivity,
} from "./index";

type MockResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly text: () => Promise<string>;
};

type FetchCall = {
  readonly url: string;
};

type FetchMock = {
  readonly calls: readonly FetchCall[];
  readonly fetch: (url: string) => Promise<MockResponse>;
};

const getFetchMock = (response: MockResponse): FetchMock => {
  const mutableCalls: FetchCall[] = [];

  return {
    calls: mutableCalls,
    fetch: async (url: string): Promise<MockResponse> => {
      mutableCalls.push({ url });
      return response;
    },
  };
};

const getStandaloneContract = (
  overrides?: Partial<StandaloneDiscoveryContract>,
): StandaloneDiscoveryContract => ({
  contractVersion: 1,
  lighthouseUrl: "http://127.0.0.1:61234",
  detectedAtUtc: "2026-04-25T10:00:00.000Z",
  ...overrides,
});

describe("parseStandaloneDiscoveryContract", () => {
  it("parses a valid standalone discovery contract payload", () => {
    const parsed = parseStandaloneDiscoveryContract(
      JSON.stringify(getStandaloneContract()),
    );

    expect(parsed.isValid).toBe(true);
    if (!parsed.isValid) {
      throw new Error("Expected contract to be valid");
    }

    expect(parsed.contract.lighthouseUrl).toBe("http://127.0.0.1:61234");
    expect(parsed.contract.contractVersion).toBe(1);
  });

  it("rejects payloads with unsupported contract version", () => {
    const parsed = parseStandaloneDiscoveryContract(
      JSON.stringify(getStandaloneContract({ contractVersion: 2 })),
    );

    expect(parsed.isValid).toBe(false);
    if (parsed.isValid) {
      throw new Error("Expected contract to be invalid");
    }

    expect(parsed.reason).toContain("contractVersion");
  });
});

describe("validateLighthouseConnectivity", () => {
  it("validates connectivity through explicit host configuration", async () => {
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => "v1.2.3",
    });

    const result = await validateLighthouseConnectivity(
      {
        kind: "explicit",
        lighthouseUrl: "http://localhost:5000/",
      },
      {
        fetch: fetchMock.fetch,
      },
    );

    expect(result.category).toBe("success");
    if (result.category !== "success") {
      throw new Error("Expected success result");
    }

    expect(result.endpoint.mode).toBe("explicit");
    expect(result.endpoint.apiBaseUrl).toBe("http://localhost:5000/api");
    expect(result.endpoint.healthCheckUrl).toBe(
      "http://localhost:5000/api/v1/version/current",
    );
    expect(result.serverVersion).toBe("v1.2.3");
    expect(fetchMock.calls).toEqual([
      {
        url: "http://localhost:5000/api/v1/version/current",
      },
    ]);
  });

  it("normalizes connectivity checks to the current version route", async () => {
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => "v1.2.3",
    });

    const result = await validateLighthouseConnectivity(
      {
        kind: "explicit",
        lighthouseUrl: "http://localhost:5000/",
      },
      {
        fetch: fetchMock.fetch,
      },
    );

    expect(result.category).toBe("success");
    expect(fetchMock.calls).toEqual([
      {
        url: "http://localhost:5000/api/v1/version/current",
      },
    ]);
  });

  it("validates connectivity through standalone discovery", async () => {
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => "v1.0.0",
    });

    const result = await validateLighthouseConnectivity(
      {
        kind: "standalone",
        getDiscoveryContract: async () => getStandaloneContract(),
      },
      {
        fetch: fetchMock.fetch,
      },
    );

    expect(result.category).toBe("success");
    if (result.category !== "success") {
      throw new Error("Expected success result");
    }

    expect(result.endpoint.mode).toBe("standalone");
    expect(result.endpoint.lighthouseUrl).toBe("http://127.0.0.1:61234");
    expect(fetchMock.calls).toHaveLength(1);
    expect(fetchMock.calls[0]?.url).toBe(
      "http://127.0.0.1:61234/api/v1/version/current",
    );
  });

  it("returns misconfigured when explicit URL is invalid", async () => {
    const result = await validateLighthouseConnectivity(
      {
        kind: "explicit",
        lighthouseUrl: "",
      },
      {
        fetch: async () => {
          throw new Error("fetch should not be called");
        },
      },
    );

    expect(result.category).toBe("misconfigured");
  });

  it("returns misconfigured when standalone discovery has no contract", async () => {
    const result = await validateLighthouseConnectivity(
      {
        kind: "standalone",
        getDiscoveryContract: async () => null,
      },
      {
        fetch: async () => {
          throw new Error("fetch should not be called");
        },
      },
    );

    expect(result.category).toBe("misconfigured");
  });

  it("returns unauthorized when Lighthouse rejects credentials", async () => {
    const fetchMock = getFetchMock({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const result = await validateLighthouseConnectivity(
      {
        kind: "explicit",
        lighthouseUrl: "http://localhost:5000",
      },
      {
        fetch: fetchMock.fetch,
      },
    );

    expect(result.category).toBe("unauthorized");
    if (result.category !== "unauthorized") {
      throw new Error("Expected unauthorized result");
    }

    expect(result.statusCode).toBe(401);
  });

  it("returns dependency-failure when Lighthouse reports server errors", async () => {
    const fetchMock = getFetchMock({
      ok: false,
      status: 503,
      text: async () => "Service unavailable",
    });

    const result = await validateLighthouseConnectivity(
      {
        kind: "explicit",
        lighthouseUrl: "http://localhost:5000",
      },
      {
        fetch: fetchMock.fetch,
      },
    );

    expect(result.category).toBe("dependency-failure");
    if (result.category !== "dependency-failure") {
      throw new Error("Expected dependency-failure result");
    }

    expect(result.statusCode).toBe(503);
  });

  it("returns misconfigured when endpoint path is wrong", async () => {
    const fetchMock = getFetchMock({
      ok: false,
      status: 404,
      text: async () => "Not found",
    });

    const result = await validateLighthouseConnectivity(
      {
        kind: "explicit",
        lighthouseUrl: "http://localhost:5000",
      },
      {
        fetch: fetchMock.fetch,
      },
    );

    expect(result.category).toBe("misconfigured");
    if (result.category !== "misconfigured") {
      throw new Error("Expected misconfigured result");
    }

    expect(result.statusCode).toBe(404);
  });

  it("returns unreachable when network call fails", async () => {
    const result = await validateLighthouseConnectivity(
      {
        kind: "explicit",
        lighthouseUrl: "http://localhost:5000",
      },
      {
        fetch: async () => {
          throw new TypeError("Network request failed");
        },
      },
    );

    expect(result.category).toBe("unreachable");
  });

  it("returns unexpected for unclassified http failures", async () => {
    const fetchMock = getFetchMock({
      ok: false,
      status: 418,
      text: async () => "I'm a teapot",
    });

    const result = await validateLighthouseConnectivity(
      {
        kind: "explicit",
        lighthouseUrl: "http://localhost:5000",
      },
      {
        fetch: fetchMock.fetch,
      },
    );

    expect(result.category).toBe("unexpected");
    if (result.category !== "unexpected") {
      throw new Error("Expected unexpected result");
    }

    expect(result.statusCode).toBe(418);
  });
});
