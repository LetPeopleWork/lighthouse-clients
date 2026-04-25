import { describe, expect, it } from "vitest";
import {
  type ConnectivityValidationResult,
  type StandaloneDiscoveryContract,
  createLighthouseClient,
} from "./index";

type MockResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly text: () => Promise<string>;
  readonly json: () => Promise<unknown>;
};

type FetchCall = {
  readonly url: string;
  readonly init: RequestInit | undefined;
};

type FetchMock = {
  readonly calls: readonly FetchCall[];
  readonly fetch: (url: string, init?: RequestInit) => Promise<MockResponse>;
};

const getFetchSequenceMock = (
  responses: readonly MockResponse[],
): FetchMock => {
  const mutableCalls: FetchCall[] = [];
  let responseIndex = 0;

  return {
    calls: mutableCalls,
    fetch: async (url: string, init?: RequestInit): Promise<MockResponse> => {
      mutableCalls.push({ url, init });
      const response =
        responses[responseIndex] ?? responses[responses.length - 1];
      responseIndex += 1;
      return response;
    },
  };
};

const getFetchMock = (response: MockResponse): FetchMock => {
  const mutableCalls: FetchCall[] = [];

  return {
    calls: mutableCalls,
    fetch: async (url: string, init?: RequestInit): Promise<MockResponse> => {
      mutableCalls.push({ url, init });
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

describe("createLighthouseClient", () => {
  it("checks connectivity using explicit mode", async () => {
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => "v2.0.0",
      json: async () => "v2.0.0",
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
      },
      { fetch: fetchMock.fetch },
    );

    const result = await client.checkConnectivity();

    expect(result.category).toBe("success");
    expect(fetchMock.calls[0]?.url).toBe(
      "http://localhost:5000/api/v1/version",
    );
  });

  it("checks connectivity using standalone discovery mode", async () => {
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => "v2.1.0",
      json: async () => "v2.1.0",
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "standalone",
          getDiscoveryContract: async () => getStandaloneContract(),
        },
      },
      { fetch: fetchMock.fetch },
    );

    const result = await client.checkConnectivity();

    expect(result.category).toBe("success");
    expect(fetchMock.calls[0]?.url).toBe(
      "http://127.0.0.1:61234/api/v1/version",
    );
  });

  it("gets version from Lighthouse", async () => {
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => "v3.0.0",
      json: async () => "v3.0.0",
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
      },
      { fetch: fetchMock.fetch },
    );

    const version = await client.getVersion();

    expect(version).toEqual({ ok: true, value: "v3.0.0" });
  });

  it("lists teams through the versioned API contract", async () => {
    const teams = [{ id: 10, name: "Team A" }];
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(teams),
      json: async () => teams,
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
      },
      { fetch: fetchMock.fetch },
    );

    const result = await client.listTeams();

    expect(result).toEqual({ ok: true, value: teams });
    expect(fetchMock.calls).toHaveLength(2);
    expect(fetchMock.calls[1]?.url).toBe("http://localhost:5000/api/v1/teams");
  });

  it("lists work-tracking connections through the versioned API contract", async () => {
    const connections = [{ id: 8, name: "Jira Prod" }];
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(connections),
      json: async () => connections,
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
      },
      { fetch: fetchMock.fetch },
    );

    const result = await client.listWorkTrackingConnections();

    expect(result).toEqual({ ok: true, value: connections });
    expect(fetchMock.calls).toHaveLength(2);
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/worktrackingsystemconnections",
    );
  });

  it("gets one work-tracking connection by id", async () => {
    const connection = { id: 11, name: "Azure Boards" };
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(connection),
      json: async () => connection,
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
      },
      { fetch: fetchMock.fetch },
    );

    const result = await client.getWorkTrackingConnection(11);

    expect(result).toEqual({ ok: true, value: connection });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/worktrackingsystemconnections/11",
    );
  });

  it("supports work-tracking create, update, and delete operations", async () => {
    const created = { id: 21, name: "Created" };
    const updated = { id: 21, name: "Updated" };
    const fetchMock = getFetchSequenceMock([
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(created),
        json: async () => created,
      },
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(updated),
        json: async () => updated,
      },
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 204,
        text: async () => "",
        json: async () => ({}),
      },
    ]);

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
      },
      { fetch: fetchMock.fetch },
    );

    const createPayload = { name: "Created" };
    const createResult =
      await client.createWorkTrackingConnection(createPayload);
    expect(createResult).toEqual({ ok: true, value: created });

    const updatePayload = { name: "Updated" };
    const updateResult = await client.updateWorkTrackingConnection(
      21,
      updatePayload,
    );
    expect(updateResult).toEqual({ ok: true, value: updated });

    const deleteResult = await client.deleteWorkTrackingConnection(21);
    expect(deleteResult).toEqual({ ok: true, value: undefined });

    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/worktrackingsystemconnections",
    );
    expect(fetchMock.calls[1]?.init?.method).toBe("POST");

    expect(fetchMock.calls[3]?.url).toBe(
      "http://localhost:5000/api/v1/worktrackingsystemconnections/21",
    );
    expect(fetchMock.calls[3]?.init?.method).toBe("PUT");

    expect(fetchMock.calls[5]?.url).toBe(
      "http://localhost:5000/api/v1/worktrackingsystemconnections/21",
    );
    expect(fetchMock.calls[5]?.init?.method).toBe("DELETE");
  });

  it("supports team and portfolio list/get/refresh operations", async () => {
    const teams = [{ id: 1, name: "Team A" }];
    const team = { id: 1, name: "Team A" };
    const portfolios = [{ id: 4, name: "Portfolio A" }];
    const portfolio = { id: 4, name: "Portfolio A" };
    const fetchMock = getFetchSequenceMock([
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(teams),
        json: async () => teams,
      },
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(team),
        json: async () => team,
      },
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({}),
      },
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(portfolios),
        json: async () => portfolios,
      },
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(portfolio),
        json: async () => portfolio,
      },
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({}),
      },
    ]);

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
      },
      { fetch: fetchMock.fetch },
    );

    const teamsResult = await client.listTeams();
    expect(teamsResult).toEqual({ ok: true, value: teams });

    const teamResult = await client.getTeam(1);
    expect(teamResult).toEqual({ ok: true, value: team });

    const teamRefreshResult = await client.refreshTeam(1);
    expect(teamRefreshResult).toEqual({ ok: true, value: undefined });

    const portfolioListResult = await client.listPortfolios();
    expect(portfolioListResult).toEqual({ ok: true, value: portfolios });

    const portfolioResult = await client.getPortfolio(4);
    expect(portfolioResult).toEqual({ ok: true, value: portfolio });

    const portfolioRefreshResult = await client.refreshPortfolio(4);
    expect(portfolioRefreshResult).toEqual({ ok: true, value: undefined });

    expect(fetchMock.calls[1]?.url).toBe("http://localhost:5000/api/v1/teams");
    expect(fetchMock.calls[3]?.url).toBe(
      "http://localhost:5000/api/v1/teams/1",
    );
    expect(fetchMock.calls[5]?.url).toBe(
      "http://localhost:5000/api/v1/teams/1",
    );
    expect(fetchMock.calls[5]?.init?.method).toBe("POST");

    expect(fetchMock.calls[7]?.url).toBe(
      "http://localhost:5000/api/v1/portfolios",
    );
    expect(fetchMock.calls[9]?.url).toBe(
      "http://localhost:5000/api/v1/portfolios/4",
    );
    expect(fetchMock.calls[11]?.url).toBe(
      "http://localhost:5000/api/v1/portfolios/4/refresh",
    );
    expect(fetchMock.calls[11]?.init?.method).toBe("POST");
  });

  it("sends API key auth header when configured", async () => {
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => "v4.0.0",
      json: async () => "v4.0.0",
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
        auth: {
          kind: "api-key",
          value: "secret-key",
        },
      },
      { fetch: fetchMock.fetch },
    );

    await client.getVersion();

    const headers = fetchMock.calls[0]?.init?.headers as Record<string, string>;
    expect(headers["X-Api-Key"]).toBe("secret-key");
  });

  it("sends bearer token auth header when configured", async () => {
    const fetchMock = getFetchMock({
      ok: true,
      status: 200,
      text: async () => "v4.1.0",
      json: async () => "v4.1.0",
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
        auth: {
          kind: "bearer-token",
          token: "bearer-secret",
        },
      },
      { fetch: fetchMock.fetch },
    );

    await client.getVersion();

    const headers = fetchMock.calls[0]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer bearer-secret");
  });

  it("returns categorized API failure for version request", async () => {
    const fetchMock = getFetchMock({
      ok: false,
      status: 503,
      text: async () => "Service unavailable",
      json: async () => ({ message: "Service unavailable" }),
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
      },
      { fetch: fetchMock.fetch },
    );

    const version = await client.getVersion();

    expect(version.ok).toBe(false);
    if (version.ok) {
      throw new Error("Expected error result");
    }

    expect(version.error.category).toBe("dependency-failure");
    expect(version.error.statusCode).toBe(503);
  });

  it("exposes connectivity result categories from shared validator", async () => {
    const fetchMock = getFetchMock({
      ok: false,
      status: 404,
      text: async () => "Not found",
      json: async () => ({ message: "Not found" }),
    });

    const client = createLighthouseClient(
      {
        connection: {
          kind: "explicit",
          lighthouseUrl: "http://localhost:5000",
        },
      },
      { fetch: fetchMock.fetch },
    );

    const result =
      (await client.checkConnectivity()) as ConnectivityValidationResult;
    expect(result.category).toBe("misconfigured");
  });
});
