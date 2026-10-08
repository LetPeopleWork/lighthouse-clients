import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aFakeLighthouse,
  type FakeLighthouse,
} from "../../../test-support/fakeLighthouse";
import { aTempDirectory } from "../../../test-support/tempDirectories";
import {
  aMachine,
  anEarlierAnswer,
  aYesGiven,
  connectedTo,
  HOURS,
  type Machine,
} from "../../cli/test-support/lhSession";
import { createLocalLighthouseMcpServer } from "./localServer";

// Which Lighthouse the local MCP server talks to, under which name, with which credential, and when a tool
// call waits for its usage data. Driving port: `createLocalLighthouseMcpServer`.

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0)) {
    await close();
  }
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const anAssistantOf = async (
  machine: Machine,
  env: Readonly<Record<string, string | undefined>>,
  options: { readonly canBeAsked?: boolean } = {},
) => {
  const server = await createLocalLighthouseMcpServer({
    HOME: machine.home,
    LIGHTHOUSE_CLI_CONFIG_PATH: machine.configPath,
    ...env,
  });
  if (server === null) {
    throw new Error("the local server resolved no Lighthouse");
  }
  const client = new Client(
    { name: "claude-desktop", version: "0.0.0" },
    { capabilities: options.canBeAsked === true ? { elicitation: {} } : {} },
  );
  const questions: unknown[] = [];
  if (options.canBeAsked === true) {
    const { ElicitRequestSchema } = await import(
      "@modelcontextprotocol/sdk/types.js"
    );
    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      questions.push(request.params);
      return { action: "accept", content: {} };
    });
  }
  const [clientEnd, serverEnd] = InMemoryTransport.createLinkedPair();
  await server.connect(serverEnd);
  await client.connect(clientEnd);
  closers.push(async () => {
    await client.close();
    await server.close();
  });
  return {
    client,
    questions,
    listTeams: () =>
      client.callTool({ name: "lighthouse_team_list", arguments: {} }),
  };
};

const routesAskedOf = (lighthouse: FakeLighthouse) =>
  lighthouse.requests().map((request) => request.route);

const writtenToStderr = () =>
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);

describe("the local MCP server", () => {
  it("introduces itself as lighthouse", async () => {
    const lighthouse = await aFakeLighthouse();
    const { client } = await anAssistantOf(aMachine(), {
      LIGHTHOUSE_URL: lighthouse.url,
    });

    expect(client.getServerVersion()?.name).toBe("lighthouse");
  });

  it("talks to a LIGHTHOUSE_URL below a path, its trailing slashes dropped", async () => {
    const lighthouse = await aFakeLighthouse();
    const { listTeams } = await anAssistantOf(aMachine(), {
      LIGHTHOUSE_URL: `${lighthouse.url}/gravity//`,
    });

    await listTeams();

    expect(routesAskedOf(lighthouse).length).toBeGreaterThan(0);
    expect(
      routesAskedOf(lighthouse).every((route) =>
        route.startsWith("/gravity/api/"),
      ),
    ).toBe(true);
  });

  it("talks to a LIGHTHOUSE_URL given with a slash at its root", async () => {
    const lighthouse = await aFakeLighthouse();
    const { listTeams } = await anAssistantOf(aMachine(), {
      LIGHTHOUSE_URL: `${lighthouse.url}/`,
    });

    const teams = await listTeams();

    expect(teams.isError).toBeFalsy();
    expect(routesAskedOf(lighthouse)).toContain("/teams");
  });

  it.each([
    ["not a URL", "lighthouse at the office"],
    ["not http(s)", "ftp://lighthouse.example"],
  ])("refuses a LIGHTHOUSE_URL that is %s, and says why", async (_why, url) => {
    const stderr = writtenToStderr();

    const server = await createLocalLighthouseMcpServer({
      LIGHTHOUSE_URL: url,
    });

    expect(server).toBeNull();
    expect(stderr).toHaveBeenCalledWith(
      "Invalid LIGHTHOUSE_URL environment variable. Use a valid http(s) URL.\n",
    );
  });

  describe("without LIGHTHOUSE_URL", () => {
    // The standalone app is found through a lock file whose path only the process environment can move; it
    // is set for these runs and put back afterwards.
    it("talks to the standalone app its lock file names", async () => {
      const lighthouse = await aFakeLighthouse();
      const lockfile = join(
        aTempDirectory("lighthouse-standalone-"),
        "lock.json",
      );
      await writeFile(
        lockfile,
        JSON.stringify({
          contractVersion: 1,
          lighthouseUrl: lighthouse.url,
          detectedAtUtc: "2026-10-08T08:00:00Z",
        }),
        "utf8",
      );
      vi.stubEnv("LIGHTHOUSE_STANDALONE_LOCKFILE_PATH", lockfile);
      const { listTeams } = await anAssistantOf(aMachine(), {});

      const teams = await listTeams();

      expect(teams.isError).toBeFalsy();
      expect(routesAskedOf(lighthouse)).toContain("/teams");
    });

    it("resolves no Lighthouse when there is no lock file either, and says what to set", async () => {
      vi.stubEnv(
        "LIGHTHOUSE_STANDALONE_LOCKFILE_PATH",
        join(aTempDirectory("lighthouse-standalone-"), "absent.json"),
      );
      const stderr = writtenToStderr();

      const server = await createLocalLighthouseMcpServer({});

      expect(server).toBeNull();
      expect(stderr).toHaveBeenCalledWith(
        "Failed to resolve Lighthouse URL. Set LIGHTHOUSE_URL or ensure the standalone lock file exists and is valid.\n",
      );
    });
  });

  it.each<[string, string | undefined, string | undefined]>([
    ["sends LIGHTHOUSE_API_KEY as its key", "sesame", "sesame"],
    ["sends no key without LIGHTHOUSE_API_KEY", undefined, undefined],
  ])("%s", async (_what, apiKey, sent) => {
    const lighthouse = await aFakeLighthouse();
    const { listTeams } = await anAssistantOf(aMachine(), {
      LIGHTHOUSE_URL: lighthouse.url,
      LIGHTHOUSE_API_KEY: apiKey,
    });

    await listTeams();

    const keys = lighthouse
      .requests()
      .map((request) => request.headers["x-api-key"]);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((key) => key === sent)).toBe(true);
    expect(
      lighthouse.requests().map((request) => request.headers.authorization),
    ).toEqual(lighthouse.requests().map(() => undefined));
  });

  // With a yes kept, the call's events go after its result, even to an assistant that could be asked.
  it("returns at once to an assistant that could be asked, once a yes is kept, though Lighthouse never takes the events", async () => {
    const lighthouse = await aFakeLighthouse();
    const laptop = await connectedTo(aMachine(), lighthouse.url);
    await anEarlierAnswer(
      laptop,
      lighthouse.url,
      aYesGiven("priyas-token", HOURS),
    );
    const assistant = await anAssistantOf(
      laptop,
      { LIGHTHOUSE_URL: lighthouse.url },
      { canBeAsked: true },
    );
    lighthouse.changeUsageData({ answers: "never" });

    const startedAt = performance.now();
    const result = await assistant.client.callTool({
      name: "lighthouse_team_refresh",
      arguments: { id: 3 },
    });

    expect(result.isError).toBeFalsy();
    expect(performance.now() - startedAt).toBeLessThan(900);
    expect(assistant.questions).toEqual([]);
  });
});
