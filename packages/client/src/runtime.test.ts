import { describe, expect, it } from "vitest";
import {
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
      const response = responses[responseIndex] ?? responses.at(-1);
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
      "http://localhost:5000/api/v1/version/current",
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
      "http://127.0.0.1:61234/api/v1/version/current",
    );
  });

  it("re-reads standalone discovery for each client request", async () => {
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
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => "v2.0.0",
        json: async () => "v2.0.0",
      },
      {
        ok: true,
        status: 200,
        text: async () => "v2.0.0",
        json: async () => "v2.0.0",
      },
    ]);
    const discoveryUrls = ["http://127.0.0.1:61234", "http://127.0.0.1:61235"];
    let discoveryIndex = 0;

    const client = createLighthouseClient(
      {
        connection: {
          kind: "standalone",
          getDiscoveryContract: async () => {
            const lighthouseUrl =
              discoveryUrls[discoveryIndex] ?? discoveryUrls.at(-1);
            discoveryIndex += 1;
            return getStandaloneContract({ lighthouseUrl });
          },
        },
      },
      { fetch: fetchMock.fetch },
    );

    const firstVersion = await client.getVersion();
    const secondVersion = await client.getVersion();

    expect(firstVersion).toEqual({ ok: true, value: "v1.0.0" });
    expect(secondVersion).toEqual({ ok: true, value: "v2.0.0" });
    expect(fetchMock.calls.map((call) => call.url)).toEqual([
      "http://127.0.0.1:61234/api/v1/version/current",
      "http://127.0.0.1:61234/api/v1/version/current",
      "http://127.0.0.1:61235/api/v1/version/current",
      "http://127.0.0.1:61235/api/v1/version/current",
    ]);
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

    const result = await client.checkConnectivity();
    expect(result.category).toBe("misconfigured");
  });

  it("gets team throughput metrics with an explicit date range", async () => {
    const throughputData = { labels: ["2026-01-01"], data: [3] };
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
        text: async () => JSON.stringify(throughputData),
        json: async () => throughputData,
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

    const result = await client.getTeamThroughput(5, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });

    expect(result).toEqual({ ok: true, value: throughputData });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/teams/5/metrics/throughput?startDate=2026-01-01&endDate=2026-03-31",
    );
  });

  it("gets team throughput with a default date range when none is supplied", async () => {
    const throughputData = { labels: [], data: [] };
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
        text: async () => JSON.stringify(throughputData),
        json: async () => throughputData,
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

    const result = await client.getTeamThroughput(5);

    expect(result.ok).toBe(true);
    expect(fetchMock.calls[1]?.url).toMatch(
      /api\/v1\/teams\/5\/metrics\/throughput\?startDate=\d{4}-\d{2}-\d{2}&endDate=\d{4}-\d{2}-\d{2}/,
    );
  });

  it("gets team cycle-time percentiles with a date range", async () => {
    const percentiles = [
      { percentile: 50, value: 4 },
      { percentile: 85, value: 8 },
    ];
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
        text: async () => JSON.stringify(percentiles),
        json: async () => percentiles,
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

    const result = await client.getTeamCycleTimePercentiles(3, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });

    expect(result).toEqual({ ok: true, value: percentiles });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/teams/3/metrics/cycleTimePercentiles?startDate=2026-01-01&endDate=2026-03-31",
    );
  });

  it("gets portfolio throughput metrics with a date range", async () => {
    const throughputData = { labels: ["2026-01-01"], data: [2] };
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
        text: async () => JSON.stringify(throughputData),
        json: async () => throughputData,
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

    const result = await client.getPortfolioThroughput(7, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });

    expect(result).toEqual({ ok: true, value: throughputData });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/portfolios/7/metrics/throughput?startDate=2026-01-01&endDate=2026-03-31",
    );
  });

  it("gets features by ids", async () => {
    const features = [
      { id: 1, name: "Feature A" },
      { id: 2, name: "Feature B" },
    ];
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
        text: async () => JSON.stringify(features),
        json: async () => features,
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

    const result = await client.getFeaturesByIds([1, 2]);

    expect(result).toEqual({ ok: true, value: features });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/features?ids=1&ids=2",
    );
  });

  it("gets features by reference ids", async () => {
    const features = [{ id: 3, name: "Feature C", referenceId: "FEAT-3" }];
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
        text: async () => JSON.stringify(features),
        json: async () => features,
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

    const result = await client.getFeaturesByReferences(["FEAT-3"]);

    expect(result).toEqual({ ok: true, value: features });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/features/references?featureReferences=FEAT-3",
    );
  });

  it("gets work items for a feature", async () => {
    const workItems = [{ id: 10, title: "Task A" }];
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
        text: async () => JSON.stringify(workItems),
        json: async () => workItems,
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

    const result = await client.getFeatureWorkItems(3);

    expect(result).toEqual({ ok: true, value: workItems });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/features/3/workitems",
    );
  });

  it("lists deliveries for a portfolio", async () => {
    const deliveries = [{ id: 1, name: "Release 1" }];
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
        text: async () => JSON.stringify(deliveries),
        json: async () => deliveries,
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

    const result = await client.listDeliveries(4);

    expect(result).toEqual({ ok: true, value: deliveries });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/deliveries/portfolio/4",
    );
  });

  it("creates a delivery for a portfolio", async () => {
    const delivery = { id: 2, name: "Release 2" };
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
        text: async () => JSON.stringify(delivery),
        json: async () => delivery,
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

    const result = await client.createDelivery(4, {
      name: "Release 2",
      date: "2026-12-01",
    });

    expect(result.ok).toBe(true);
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/deliveries/portfolio/4",
    );
    expect(fetchMock.calls[1]?.init?.method).toBe("POST");
  });

  it("deletes a delivery", async () => {
    const fetchMock = getFetchSequenceMock([
      {
        ok: true,
        status: 200,
        text: async () => "v1.0.0",
        json: async () => "v1.0.0",
      },
      { ok: true, status: 204, text: async () => "", json: async () => ({}) },
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

    const result = await client.deleteDelivery(2);

    expect(result).toEqual({ ok: true, value: undefined });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/deliveries/2",
    );
    expect(fetchMock.calls[1]?.init?.method).toBe("DELETE");
  });

  it("runs a manual forecast for a team", async () => {
    const forecastResult = {
      remainingItems: 5,
      whenForecasts: [],
      howManyForecasts: [],
      likelihood: 0.7,
    };
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
        text: async () => JSON.stringify(forecastResult),
        json: async () => forecastResult,
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

    const result = await client.runManualForecast(2, { remainingItems: 5 });

    expect(result).toEqual({ ok: true, value: forecastResult });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/forecast/manual/2",
    );
    expect(fetchMock.calls[1]?.init?.method).toBe("POST");
  });

  it("runs a backtest forecast for a team", async () => {
    const backtestResult = { actualThroughput: 10, percentiles: [] };
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
        text: async () => JSON.stringify(backtestResult),
        json: async () => backtestResult,
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

    const result = await client.runBacktest(2, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      historicalStartDate: "2025-10-01",
      historicalEndDate: "2025-12-31",
    });

    expect(result).toEqual({ ok: true, value: backtestResult });
    expect(fetchMock.calls[1]?.url).toBe(
      "http://localhost:5000/api/v1/forecast/backtest/2",
    );
    expect(fetchMock.calls[1]?.init?.method).toBe("POST");
  });
});
