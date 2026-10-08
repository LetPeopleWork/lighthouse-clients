import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aFakeLighthouse,
  gravitysRefinement,
} from "../../../test-support/fakeLighthouse";
import { aTempDirectory } from "../../../test-support/tempDirectories";
import {
  aMachine,
  connectedTo,
  lhOn,
  type Machine,
  NO_TERMINAL,
  usageDataFileOf,
} from "../test-support/lhSession";

// `lh` as one process: where it finds its config file, what it makes of the file it finds there, which
// credential it sends, and when it settles usage data after a command.
// Driving port: `runCliSession`.

const STATUS = ["connection", "status"];
const LENAS_FORECAST = [
  "forecast",
  "manual",
  "--team-id",
  "3",
  "--remaining",
  "25",
];

const aConfigFile = async (machine: Machine, content: unknown) => {
  await mkdir(dirname(machine.configPath), { recursive: true });
  await writeFile(
    machine.configPath,
    typeof content === "string" ? content : JSON.stringify(content),
    { encoding: "utf8", mode: 0o600 },
  );
  return machine;
};

const apiKeysSent = (requests: readonly { headers: object }[]) =>
  requests.map(
    (request) =>
      (request.headers as Record<string, string | undefined>)["x-api-key"],
  );

describe("lh finds its config file", () => {
  it("under HOME when LIGHTHOUSE_CLI_CONFIG_PATH is not set", async () => {
    const lighthouse = await aFakeLighthouse();
    const machine = await connectedTo(aMachine(), lighthouse.url);

    const run = await lhOn(machine, {
      env: { LIGHTHOUSE_CLI_CONFIG_PATH: undefined },
    }).run(STATUS);

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain(`Connected to: ${lighthouse.url}`);
  });
});

describe("lh reads the config file an earlier lh left", () => {
  it.each<[string, Record<string, unknown>]>([
    [
      "an unversioned one, dropping its bearer token",
      { auth: { kind: "bearer", token: "expired" } },
    ],
    ["one marked version 1", { version: 1 }],
  ])("keeps the server of %s", async (_which, rest) => {
    const lighthouse = await aFakeLighthouse();
    const machine = await aConfigFile(aMachine(), {
      ...rest,
      endpointUrl: lighthouse.url,
    });

    const status = await lhOn(machine).run(STATUS);
    const usageData = await lhOn(machine).run(["config", "usage-data"]);

    expect(status.exitCode).toBe(0);
    expect(status.stdout.split("\n")).toEqual([
      `Connected to: ${lighthouse.url}`,
      "Auth: disabled",
      "Output: pretty",
    ]);
    expect(usageData.stdout).toContain(
      `Usage data from lh to ${lighthouse.url}`,
    );
  });

  it.each<[string, unknown]>([
    ["a blank server", { endpointUrl: "   " }],
    ["an empty server", { endpointUrl: "" }],
  ])(
    "is not connected by an unversioned file with %s",
    async (_which, file) => {
      const machine = await aConfigFile(aMachine(), file);

      const run = await lhOn(machine).run(STATUS);

      expect(run.exitCode).toBe(1);
      expect(run.stderr).toContain("Not connected.");
    },
  );

  it("keeps the output format it stored", async () => {
    const lighthouse = await aFakeLighthouse();
    const machine = await aConfigFile(aMachine(), {
      version: 2,
      connection: {
        mode: "server",
        endpointUrl: lighthouse.url,
        authMode: "disabled",
      },
      outputFormat: "json",
    });

    const run = await lhOn(machine).run(STATUS);

    expect(run.stdout).toContain("Output: json");
  });

  it("ignores a voter name that is not text", async () => {
    const machine = await aConfigFile(aMachine(), {
      version: 2,
      voterName: 42,
    });

    const run = await lhOn(machine).run(["config", "voter"]);

    expect(run.stdout).toBe(
      'No voter name stored. Store one with: lh config voter set --name "<name>"',
    );
  });

  it.each<[string, ((machine: Machine) => Promise<Machine>) | undefined]>([
    ["there is no config file yet", undefined],
    ["the config file is not JSON", (m) => aConfigFile(m, "not json")],
    ["the config file names no server", (m) => aConfigFile(m, {})],
  ])("still remembers what it saved when %s", async (_when, arrange) => {
    const machine =
      arrange === undefined ? aMachine() : await arrange(aMachine());

    await lhOn(machine).run(["config", "voter", "set", "--name", "Lena"]);
    const run = await lhOn(machine).run(["config", "voter"]);

    expect(run.stdout).toBe("Voter name: Lena");
  });
});

describe("lh connection connect --mode server", () => {
  it("checks the server is reachable, then saves it", async () => {
    const lighthouse = await aFakeLighthouse();
    const machine = aMachine();

    const connect = await lhOn(machine).run([
      "connection",
      "connect",
      "--mode",
      "server",
      "--url",
      lighthouse.url,
    ]);
    const status = await lhOn(machine).run(STATUS);

    expect(connect.stdout).toBe(
      `Connected to ${lighthouse.url} (auth: disabled)`,
    );
    expect(lighthouse.requests().map((request) => request.route)).toContain(
      "/version/current",
    );
    expect(status.stdout).toContain(`Connected to: ${lighthouse.url}`);
  });
});

describe("a standalone Lighthouse", () => {
  // The client finds the standalone app through a lock file whose path only the process environment can
  // move; it is set for these runs and put back afterwards.
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const theStandaloneAppAt = async (lighthouseUrl: string) => {
    const lockfile = join(
      aTempDirectory("lighthouse-standalone-"),
      "lock.json",
    );
    await writeFile(
      lockfile,
      JSON.stringify({
        contractVersion: 1,
        lighthouseUrl,
        detectedAtUtc: "2026-10-08T08:00:00Z",
      }),
      "utf8",
    );
    vi.stubEnv("LIGHTHOUSE_STANDALONE_LOCKFILE_PATH", lockfile);
  };

  it("is found through its lock file, asked, and named in what lh says about usage data", async () => {
    const lighthouse = await aFakeLighthouse();
    await theStandaloneAppAt(lighthouse.url);
    const machine = aMachine();
    const lh = lhOn(machine, { terminal: NO_TERMINAL });

    const connect = await lh.run([
      "connection",
      "connect",
      "--mode",
      "standalone",
    ]);
    const teams = await lh.run(["team", "list"]);
    const usageData = await lh.run(["config", "usage-data"]);

    expect(connect.stdout).toBe(
      `Connected to standalone Lighthouse at ${lighthouse.url}`,
    );
    expect(teams.exitCode).toBe(0);
    expect(lighthouse.requests().map((request) => request.route)).toContain(
      "/teams",
    );
    expect(usageData.stdout).toContain(
      "Usage data from lh to the standalone Lighthouse:",
    );
  });
});

describe("LIGHTHOUSE_API_KEY", () => {
  it("is sent trimmed in place of the stored credential", async () => {
    const lighthouse = await aFakeLighthouse();
    const machine = await connectedTo(aMachine(), lighthouse.url);

    await lhOn(machine, {
      terminal: NO_TERMINAL,
      env: { LIGHTHOUSE_API_KEY: "  sesame  " },
    }).run(["team", "list"]);

    expect(apiKeysSent(lighthouse.requests())).toContain("sesame");
  });

  it.each<[string, string | undefined]>([
    ["not set", undefined],
    ["blank", "   "],
  ])("sends no key when it is %s", async (_when, value) => {
    const lighthouse = await aFakeLighthouse();
    const machine = await connectedTo(aMachine(), lighthouse.url);

    await lhOn(machine, {
      terminal: NO_TERMINAL,
      env: { LIGHTHOUSE_API_KEY: value },
    }).run(["team", "list"]);

    expect(lighthouse.requests().length).toBeGreaterThan(0);
    expect(apiKeysSent(lighthouse.requests())).toEqual(
      lighthouse.requests().map(() => undefined),
    );
  });
});

describe("a voter without sign-in", () => {
  it("keeps one voter key across votes", async () => {
    const lighthouse = await aFakeLighthouse({
      replies: {
        "GET /teams/3/refinement": {
          status: 200,
          body: { ...gravitysRefinement(), voterIdentity: "SelfDeclared" },
        },
      },
    });
    const machine = await connectedTo(aMachine(), lighthouse.url);
    const vote = [
      "refinement",
      "vote",
      "--team-id",
      "3",
      "--work-item",
      "GR-061",
      "--answer",
      "yes",
      "--as",
      "Lena",
    ];

    await lhOn(machine, { terminal: NO_TERMINAL }).run(vote);
    await lhOn(machine, { terminal: NO_TERMINAL }).run(vote);

    const keys = lighthouse
      .requests()
      .filter((request) => request.method === "POST")
      .map((request) => request.headers["x-lighthouse-voter-key"]);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toEqual(expect.any(String));
    expect(keys[1]).toBe(keys[0]);
  });
});

describe("lh config usage-data on and off refuse an answers file they cannot read", () => {
  it.each([["on"], ["off"]])(
    "%s names the file, exit 1, and asks Lighthouse nothing",
    async (subject) => {
      const lighthouse = await aFakeLighthouse();
      const machine = await connectedTo(aMachine(), lighthouse.url);
      await mkdir(dirname(usageDataFileOf(machine)), { recursive: true });
      await writeFile(usageDataFileOf(machine), "not json", "utf8");

      const run = await lhOn(machine).run(["config", "usage-data", subject]);

      expect(run.exitCode).toBe(1);
      expect(run.stdout).toBe("");
      expect(run.stderr).toContain(
        `The usage data file ${usageDataFileOf(machine)} cannot be read; fix or remove it.`,
      );
      expect(lighthouse.usageDataRequests()).toEqual([]);
    },
  );
});

describe("after the command", () => {
  it("says nothing more when the question went unanswered", async () => {
    const lighthouse = await aFakeLighthouse();
    const machine = await connectedTo(aMachine(), lighthouse.url);

    const run = await lhOn(machine, { typing: [null] }).run(LENAS_FORECAST);

    expect(run.questions).toHaveLength(1);
    expect(run.stderr).not.toContain("Could not record your answer");
    expect(run.stderr).not.toContain("change any time");
  });

  it("asks nothing after a command that reached no Lighthouse", async () => {
    const lighthouse = await aFakeLighthouse();
    const machine = await connectedTo(aMachine(), lighthouse.url);

    const run = await lhOn(machine).run(STATUS);

    expect(run.questions).toEqual([]);
    expect(lighthouse.usageDataRequests()).toEqual([]);
  });
});
