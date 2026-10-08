import { readdir } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aBatchOf,
  aFakeLighthouse,
  type FakeLighthouse,
  type UsageDataSide,
} from "../../../test-support/fakeLighthouse";
import { aTempDirectory } from "../../../test-support/tempDirectories";
import { type McpHttpServerHandle, runMcpHttpRuntime } from "./bin";

// Story 6193, slice 05 (US-06). Tomás Rivera runs Northwind's shared MCP server for forty people's
// assistants. Nobody is asked: his one variable, LIGHTHOUSE_USAGE_DATA=on, decides for the server's
// users, and without it nothing is sent. The grant lives in the process's memory, never on disk, and no
// caller's credential ever rides on a usage data call.
// Driving port: `runMcpHttpRuntime`, as the container starts it, with its environment given explicitly and
// a Lighthouse on a socket; assistants call it over real HTTP. One guard is active; the rest are pending
// until DELIVER slice 05.

const ON_LINE = "Usage data: on (LIGHTHOUSE_USAGE_DATA)";
const OFF_LINE = "Usage data: off";

const REFRESH_GRAVITY = { tool: "lighthouse_team_refresh", args: { id: 3 } };

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0)) {
    await close();
  }
  vi.useRealTimers();
});

const aMoment = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Longer than any send may take, so "nothing was sent" is not merely "not sent yet". */
const pastTheSendBudget = () => aMoment(1100);

/** The shared server as Tomás's container starts it, with exactly the environment given. */
const tomasStarts = async (
  lighthouse: FakeLighthouse,
  env: Readonly<Record<string, string>> = {},
) => {
  const logged: string[] = [];
  const warned: string[] = [];
  let server: McpHttpServerHandle | undefined;
  const exitCode = await runMcpHttpRuntime(
    {
      LIGHTHOUSE_URL: lighthouse.url,
      HOST: "127.0.0.1",
      PORT: "0",
      HOME: aTempDirectory("lighthouse-mcp-http-home-"),
      ...env,
    },
    (message) => logged.push(message),
    (message) => warned.push(message),
    (started) => {
      server = started;
    },
  );
  if (server === undefined) {
    throw new Error(`the shared server did not start: ${warned.join(" ")}`);
  }
  const running = server;
  closers.push(() => running.close());
  const questionsPut: unknown[] = [];

  /** One person's assistant calling one tool; it declares elicitation and answers yes if ever asked. */
  const call = async (
    tool: string,
    args: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) => {
    const client = new Client(
      { name: "a-colleagues-assistant", version: "0.0.0" },
      { capabilities: { elicitation: {} } },
    );
    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      questionsPut.push(request.params);
      return { action: "accept", content: {} };
    });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${running.url}/mcp`), {
        requestInit: { headers },
      }),
    );
    try {
      return await client.callTool({ name: tool, arguments: args });
    } finally {
      await client.close();
    }
  };

  return {
    exitCode,
    /** Every line the server wrote at start-up, to either stream. */
    startUpLines: () => [...logged, ...warned],
    warnings: () => [...warned],
    call,
    questionsPut: () => [...questionsPut],
  };
};

const reported = (lighthouse: FakeLighthouse) =>
  lighthouse.handedIn().map(({ batch }) => batch);

describe("off unless the operator says on", () => {
  // @US-06 @driving_port @real-io @guard @kpi @contract-shape:unbounded-preservation
  // Active now and after: a shared server nobody switched on makes no usage data request at all.
  it("makes no usage data request when LIGHTHOUSE_USAGE_DATA is not set", async () => {
    const lighthouse = await aFakeLighthouse();
    const shared = await tomasStarts(lighthouse);

    const result = await shared.call(
      REFRESH_GRAVITY.tool,
      REFRESH_GRAVITY.args,
    );
    await pastTheSendBudget();

    expect(result.isError).toBeFalsy();
    expect(lighthouse.usageDataRequests()).toEqual([]);
  });

  // @US-06 @driving_port @real-io @contract-shape:pure-function
  it("says usage data is off at start-up when LIGHTHOUSE_USAGE_DATA is not set", async () => {
    const shared = await tomasStarts(await aFakeLighthouse());

    expect(shared.startUpLines()).toContain(OFF_LINE);
    expect(shared.warnings()).toEqual([]);
  });

  // @US-06 @driving_port @real-io @boundary @contract-shape:pure-function
  it.each(["on", "ON", "On"])(
    "switches usage data on for LIGHTHOUSE_USAGE_DATA=%s and says so once at start-up",
    async (value) => {
      const shared = await tomasStarts(await aFakeLighthouse(), {
        LIGHTHOUSE_USAGE_DATA: value,
      });

      expect(
        shared.startUpLines().filter((line) => line === ON_LINE),
      ).toHaveLength(1);
      expect(shared.warnings()).toEqual([]);
    },
  );

  // @US-06 @driving_port @real-io @boundary @contract-shape:pure-function
  it.each(["off", "OFF", ""])(
    "keeps usage data off without a warning for LIGHTHOUSE_USAGE_DATA=%j",
    async (value) => {
      const lighthouse = await aFakeLighthouse();
      const shared = await tomasStarts(lighthouse, {
        LIGHTHOUSE_USAGE_DATA: value,
      });

      await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);
      await pastTheSendBudget();

      expect(shared.startUpLines()).toContain(OFF_LINE);
      expect(shared.warnings()).toEqual([]);
      expect(lighthouse.usageDataRequests()).toEqual([]);
    },
  );

  // @US-06 @driving_port @real-io @error @contract-shape:pure-function
  // A typo never breaks a deployment: the server starts, off, and says once which values it takes.
  it.each(["yes", "true", "1", "enabled"])(
    "starts with usage data off and one warning naming on and off for LIGHTHOUSE_USAGE_DATA=%s",
    async (value) => {
      const lighthouse = await aFakeLighthouse();
      const shared = await tomasStarts(lighthouse, {
        LIGHTHOUSE_USAGE_DATA: value,
      });

      await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);
      await pastTheSendBudget();

      expect(shared.exitCode).toBe(0);
      expect(shared.startUpLines()).toContain(OFF_LINE);
      expect(shared.warnings()).toHaveLength(1);
      expect(shared.warnings()[0]).toMatch(/LIGHTHOUSE_USAGE_DATA/u);
      expect(shared.warnings()[0]).toMatch(/\bon\b/u);
      expect(shared.warnings()[0]).toMatch(/\boff\b/u);
      expect(lighthouse.usageDataRequests()).toEqual([]);
    },
  );

  // @US-06 @driving_port @real-io @error @contract-shape:unbounded-preservation
  it.skip.each(["1", "true"])(
    "sends nothing under DO_NOT_TRACK=%s even with LIGHTHOUSE_USAGE_DATA=on",
    async (doNotTrack) => {
      const lighthouse = await aFakeLighthouse();
      const shared = await tomasStarts(lighthouse, {
        LIGHTHOUSE_USAGE_DATA: "on",
        DO_NOT_TRACK: doNotTrack,
      });

      await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);
      await pastTheSendBudget();

      expect(shared.startUpLines()).toContain(OFF_LINE);
      expect(lighthouse.usageDataRequests()).toEqual([]);
    },
  );
});

describe("switched on, the shared server reports for its callers without asking them", () => {
  // @US-06 @driving_port @real-io @kpi @contract-shape:bounded-change
  it.skip("reports Priya's refresh through the shared server with source Mcp, and never asks her", async () => {
    const lighthouse = await aFakeLighthouse();
    const shared = await tomasStarts(lighthouse, {
      LIGHTHOUSE_USAGE_DATA: "on",
    });

    const result = await shared.call(
      REFRESH_GRAVITY.tool,
      REFRESH_GRAVITY.args,
    );

    expect(result.isError).toBeFalsy();
    await vi.waitFor(
      () =>
        expect(lighthouse.handedIn()).toEqual([
          expect.objectContaining({
            token: lighthouse.mintedTokens()[0],
            batch: aBatchOf("Mcp", { name: "TeamRefreshTriggered" }),
          }),
        ]),
      { timeout: 3000 },
    );
    expect(lighthouse.decisionsPosted()).toEqual(["granted"]);
    expect(shared.questionsPut()).toEqual([]);
  });

  // @US-06 @driving_port @real-io @kpi @contract-shape:bounded-change
  it.skip.each<[string, Record<string, unknown>, string]>([
    [
      "lighthouse_forecast_manual",
      { id: 3, remainingItems: 25 },
      "TeamManualForecastRun",
    ],
    ["lighthouse_portfolio_refresh", { id: 2 }, "PortfolioRefreshTriggered"],
  ])("reports %s as %s", async (tool, args, name) => {
    const lighthouse = await aFakeLighthouse();
    const shared = await tomasStarts(lighthouse, {
      LIGHTHOUSE_USAGE_DATA: "on",
    });

    await shared.call(tool, args);

    await vi.waitFor(
      () => expect(reported(lighthouse)).toEqual([aBatchOf("Mcp", { name })]),
      { timeout: 3000 },
    );
  });

  // @US-06 @driving_port @real-io @contract-shape:unbounded-preservation
  it.skip("hands every caller the same result it gives with usage data off", async () => {
    const lighthouse = await aFakeLighthouse();
    const off = await tomasStarts(lighthouse);
    const on = await tomasStarts(lighthouse, { LIGHTHOUSE_USAGE_DATA: "on" });

    const fromOff = await off.call("lighthouse_forecast_manual", {
      id: 3,
      remainingItems: 25,
    });
    const fromOn = await on.call("lighthouse_forecast_manual", {
      id: 3,
      remainingItems: 25,
    });

    expect(fromOn).toEqual(fromOff);
    // The comparison only means something if the switched-on server did report the call.
    await vi.waitFor(() => expect(lighthouse.handedIn()).toHaveLength(1), {
      timeout: 3000,
    });
  });

  // @US-06 @driving_port @real-io @boundary @contract-shape:bounded-change
  // One process, one grant, requested once however many callers arrive together.
  it.skip("requests one grant for three callers arriving at once", async () => {
    const lighthouse = await aFakeLighthouse();
    const shared = await tomasStarts(lighthouse, {
      LIGHTHOUSE_USAGE_DATA: "on",
    });

    await Promise.all([
      shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args),
      shared.call("lighthouse_portfolio_refresh", { id: 2 }),
      shared.call("lighthouse_forecast_manual", { id: 3, remainingItems: 25 }),
    ]);

    await vi.waitFor(() => expect(lighthouse.handedIn()).toHaveLength(3), {
      timeout: 3000,
    });
    expect(lighthouse.decisionsPosted()).toEqual(["granted"]);
  });

  // @US-06 @driving_port @real-io @contract-shape:bounded-change
  // A restart is a new grant and a new pseudonym; the old one lapses by itself.
  it.skip("requests a fresh grant after a restart", async () => {
    const lighthouse = await aFakeLighthouse();
    const before = await tomasStarts(lighthouse, {
      LIGHTHOUSE_USAGE_DATA: "on",
    });
    await before.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);
    await vi.waitFor(() => expect(lighthouse.handedIn()).toHaveLength(1), {
      timeout: 3000,
    });

    const after = await tomasStarts(lighthouse, {
      LIGHTHOUSE_USAGE_DATA: "on",
    });
    await after.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);

    await vi.waitFor(() => expect(lighthouse.handedIn()).toHaveLength(2), {
      timeout: 3000,
    });
    const [first, second] = lighthouse.mintedTokens();
    expect(lighthouse.handedIn().map(({ token }) => token)).toEqual([
      first,
      second,
    ]);
    expect(second).not.toBe(first);
  });

  // @US-06 @driving_port @real-io @boundary @contract-shape:bounded-change
  // Nobody is asked, so the young-install rule that delays a question does not delay the operator's on.
  it.skip("reports on an instance installed less than three days ago", async () => {
    const lighthouse = await aFakeLighthouse({ usageData: { mayAsk: false } });
    const shared = await tomasStarts(lighthouse, {
      LIGHTHOUSE_USAGE_DATA: "on",
    });

    await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);

    await vi.waitFor(() => expect(lighthouse.handedIn()).toHaveLength(1), {
      timeout: 3000,
    });
  });
});

describe("what the shared server never does", () => {
  // @US-06 @driving_port @real-io @error @version-skew @kpi @contract-shape:unbounded-preservation
  it.skip.each<[string, UsageDataSide]>([
    [
      "Northwind's administrator has stopped usage data",
      { administratorDisabled: true },
    ],
    ["the Lighthouse predates labelled sources", { acceptedSources: null }],
    [
      "the Lighthouse labels no MCP source",
      { acceptedSources: ["Browser", "Cli"] },
    ],
    ["the Lighthouse has no usage data at all", { answers: "not-at-all" }],
  ])("requests no grant and sends nothing when %s", async (_why, side) => {
    const lighthouse = await aFakeLighthouse({ usageData: side });
    const shared = await tomasStarts(lighthouse, {
      LIGHTHOUSE_USAGE_DATA: "on",
    });

    await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);
    await pastTheSendBudget();

    // The silence is the server holding back, not a server that was never switched on.
    expect(shared.startUpLines()).toContain(ON_LINE);
    expect(lighthouse.decisionsPosted()).toEqual([]);
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-06 @driving_port @real-io @error @contract-shape:bounded-change
  // A veto lifted takes effect without a restart, and the server asks at most once an hour.
  it.skip("asks a vetoed Lighthouse again only after an hour, and reports once the veto is lifted", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T09:00:00Z"));
    const lighthouse = await aFakeLighthouse({
      usageData: { administratorDisabled: true },
    });
    const shared = await tomasStarts(lighthouse, {
      LIGHTHOUSE_USAGE_DATA: "on",
    });
    await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);
    const readsAfterTheFirstCall = lighthouse.stateReads().length;

    lighthouse.changeUsageData({ administratorDisabled: false });
    vi.setSystemTime(new Date("2026-10-08T09:30:00Z"));
    await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);
    await pastTheSendBudget();
    const readsWithinTheHour = lighthouse.stateReads().length;
    vi.setSystemTime(new Date("2026-10-08T10:01:00Z"));
    await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);

    expect(readsAfterTheFirstCall).toBe(1);
    expect(readsWithinTheHour).toBe(1);
    await vi.waitFor(
      () =>
        expect(reported(lighthouse)).toEqual([
          aBatchOf("Mcp", { name: "TeamRefreshTriggered" }),
        ]),
      { timeout: 3000 },
    );
  });

  // @US-06 @driving_port @real-io @security @contract-shape:unbounded-preservation
  // Usage data is never bound to an account: neither the operator's key nor a caller's credential travels.
  it.skip("sends no API key and no bearer token on any usage data call", async () => {
    const lighthouse = await aFakeLighthouse();
    const shared = await tomasStarts(lighthouse, {
      LIGHTHOUSE_USAGE_DATA: "on",
      LIGHTHOUSE_API_KEY: "the-operators-key",
    });

    await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args, {
      "X-Api-Key": "priyas-own-key",
    });
    await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args, {
      Authorization: "Bearer priyas-sign-in",
    });

    await vi.waitFor(() => expect(lighthouse.handedIn()).toHaveLength(2), {
      timeout: 3000,
    });
    for (const request of lighthouse.usageDataRequests()) {
      expect(request.headers["x-api-key"]).toBeUndefined();
      expect(request.headers.authorization).toBeUndefined();
    }
  });

  // @US-06 @driving_port @real-io @adapter-integration @security @contract-shape:unbounded-preservation
  // The grant lives in the process's memory; a container's home stays as it started.
  it.skip("writes nothing under its home directory", async () => {
    const lighthouse = await aFakeLighthouse();
    const home = aTempDirectory("lighthouse-mcp-http-home-");
    const homeBefore = process.env.HOME;
    process.env.HOME = home;
    try {
      const shared = await tomasStarts(lighthouse, {
        LIGHTHOUSE_USAGE_DATA: "on",
        HOME: home,
      });
      await shared.call(REFRESH_GRAVITY.tool, REFRESH_GRAVITY.args);
      await vi.waitFor(() => expect(lighthouse.handedIn()).toHaveLength(1), {
        timeout: 3000,
      });
    } finally {
      process.env.HOME = homeBefore;
    }

    expect(await readdir(home)).toEqual([]);
  });
});
