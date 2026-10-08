import { describe, expect, it } from "vitest";
import {
  createLighthouseClient,
  getClientPackageContract,
  isServerVersionNewerThan,
} from "./index";

describe("client package contract", () => {
  it("exposes shared client identity and capabilities", () => {
    const contract = getClientPackageContract();

    expect(contract.name).toBe("@letpeoplework/lighthouse-client");
    expect(contract.capabilities).toContain("versioned-api-contracts");
    expect(contract.capabilities).toContain("shared-domain-operations");
    expect(contract.capabilities).toContain(
      "connectivity-and-discovery-contracts",
    );
    expect(contract.capabilities).toContain("automation-auth-contracts");
  });
});

describe("isServerVersionNewerThan (server-version gating)", () => {
  it.each([
    { candidate: "v26.5.25.1", baseline: "v26.5.24.10", expected: true },
    { candidate: "v26.6.1.1", baseline: "v26.5.24.10", expected: true },
    { candidate: "v27.1.1.1", baseline: "v26.5.24.10", expected: true },
    { candidate: "v26.5.24.11", baseline: "v26.5.24.10", expected: true },
  ])(
    "returns true when $candidate is newer than $baseline",
    ({ candidate, baseline, expected }) => {
      expect(isServerVersionNewerThan(candidate, baseline)).toBe(expected);
    },
  );

  it.each([
    { candidate: "v26.5.24.10", baseline: "v26.5.24.10" },
    { candidate: "v26.5.24.9", baseline: "v26.5.24.10" },
    { candidate: "v26.5.19.1", baseline: "v26.5.24.10" },
    { candidate: "v25.12.31.99", baseline: "v26.5.24.10" },
  ])(
    "returns false when $candidate is equal-or-older than $baseline",
    ({ candidate, baseline }) => {
      expect(isServerVersionNewerThan(candidate, baseline)).toBe(false);
    },
  );

  it("tolerates a missing 'v' prefix and differing segment counts", () => {
    expect(isServerVersionNewerThan("26.5.25", "v26.5.24.10")).toBe(true);
    expect(isServerVersionNewerThan("v26.5.24", "26.5.24.10")).toBe(false);
  });

  it("returns null (do not block) for unparseable versions like DEV builds", () => {
    expect(isServerVersionNewerThan("DEV", "v26.5.24.10")).toBeNull();
    expect(isServerVersionNewerThan("", "v26.5.24.10")).toBeNull();
    expect(isServerVersionNewerThan("v26.5.24.10", "local")).toBeNull();
  });

  it("gates recurringBlackoutRules on its v26.5.29.5 baseline", () => {
    expect(isServerVersionNewerThan("v26.5.29.6", "v26.5.29.5")).toBe(true);
    expect(isServerVersionNewerThan("v26.5.29.5", "v26.5.29.5")).toBe(false);
    expect(isServerVersionNewerThan("v26.5.29.4", "v26.5.29.5")).toBe(false);
  });
});

// The usage data calls, and the lookups of Lighthouse's API every call starts with, against a fetch that
// answers as the scenario says and records what it was asked.
describe("the client's usage data calls", () => {
  type Asked = { readonly url: string; readonly init?: RequestInit };

  const aFetchAnswering = (answer: (url: string) => Response | Error) => {
    const asked: Asked[] = [];
    const fetch = async (url: string, init?: RequestInit) => {
      asked.push({ url, init });
      const answered = answer(url);
      if (answered instanceof Error) {
        throw answered;
      }
      return answered;
    };
    return { asked, fetch };
  };

  const LIGHTHOUSE = "http://lighthouse.example";

  const aClientAt = (fetch: ReturnType<typeof aFetchAnswering>["fetch"]) =>
    createLighthouseClient(
      {
        connection: { kind: "explicit", lighthouseUrl: LIGHTHOUSE },
        auth: { kind: "api-key", value: "never-sent-with-usage-data" },
      },
      { fetch },
    );

  const aStandaloneAppThatIsNotRunning = (
    fetch: ReturnType<typeof aFetchAnswering>["fetch"],
  ) =>
    createLighthouseClient(
      {
        connection: {
          kind: "standalone",
          getDiscoveryContract: async () => null,
        },
      },
      { fetch },
    );

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  const headerOf = (asked: Asked | undefined, name: string) =>
    new Headers(asked?.init?.headers).get(name);

  it("reads the state without a token, a credential or a version probe, when called without options", async () => {
    const { asked, fetch } = aFetchAnswering(() =>
      json({
        mayAsk: true,
        administratorDisabled: false,
        acceptedSources: ["Cli"],
        decision: null,
      }),
    );

    const state = await aClientAt(fetch).getUsageDataState();

    expect(state).toEqual({
      ok: true,
      value: {
        decision: null,
        mayAsk: true,
        administratorDisabled: false,
        acceptedSources: ["Cli"],
      },
    });
    expect(asked.map((request) => request.url)).toEqual([
      `${LIGHTHOUSE}/api/v1/usagedata/state`,
    ]);
    expect(headerOf(asked[0], "X-Lighthouse-UsageData-Token")).toBeNull();
    expect(headerOf(asked[0], "X-Api-Key")).toBeNull();
  });

  it("sends the token it is given", async () => {
    const { asked, fetch } = aFetchAnswering(() =>
      json({ mayAsk: true, administratorDisabled: false }),
    );

    await aClientAt(fetch).getUsageDataState({ token: "lenas-token" });

    expect(headerOf(asked[0], "X-Lighthouse-UsageData-Token")).toBe(
      "lenas-token",
    );
  });

  it("refuses a state it cannot read", async () => {
    const { fetch } = aFetchAnswering(() => json({ mayAsk: "perhaps" }));

    const state = await aClientAt(fetch).getUsageDataState();

    expect(state).toEqual({
      ok: false,
      error: {
        category: "unexpected",
        reason: "Lighthouse's usage data state is not readable.",
      },
    });
  });

  it("returns the token Lighthouse minted for a yes", async () => {
    const { fetch } = aFetchAnswering(() => json({ token: "minted" }));

    expect(await aClientAt(fetch).grantUsageData()).toEqual({
      ok: true,
      value: "minted",
    });
  });

  it.each<[string, unknown]>([
    ["an empty token", { token: "" }],
    ["a token that is not text", { token: 42 }],
    ["no token at all", {}],
    ["no object", ["minted"]],
  ])("refuses a grant answered with %s", async (_answered, body) => {
    const { fetch } = aFetchAnswering(() => json(body));

    expect(await aClientAt(fetch).grantUsageData()).toEqual({
      ok: false,
      error: {
        category: "unexpected",
        reason: "Lighthouse answered a grant without a token.",
      },
    });
  });

  it("passes a refused grant through as Lighthouse refused it", async () => {
    const { fetch } = aFetchAnswering(() =>
      json({ title: "Usage data is switched off" }, 403),
    );

    const granted = await aClientAt(fetch).grantUsageData();

    expect(granted.ok).toBe(false);
    expect(granted.ok ? undefined : granted.error.reason).not.toBe(
      "Lighthouse answered a grant without a token.",
    );
  });

  it("asks nothing of a standalone app it cannot find, and says so", async () => {
    const { asked, fetch } = aFetchAnswering(() => json({}));
    const client = aStandaloneAppThatIsNotRunning(fetch);

    const state = await client.getUsageDataState();
    const revoked = await client.revokeUsageData({ token: "lenas-token" });

    expect(state.ok).toBe(false);
    expect(revoked.ok).toBe(false);
    expect(state.ok ? undefined : state.error.category).toBe(
      revoked.ok ? undefined : revoked.error.category,
    );
    expect(asked).toEqual([]);
  });

  it("answers an unreachable Lighthouse with the probe's error, without asking it again", async () => {
    const { asked, fetch } = aFetchAnswering(
      () => new Error("connect ECONNREFUSED"),
    );

    const teams = await aClientAt(fetch).listTeams();

    expect(teams).toMatchObject({
      ok: false,
      error: { category: "unreachable" },
    });
    expect(asked).toHaveLength(1);
  });
});
