import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { aFakeLighthouse } from "../../../test-support/fakeLighthouse";
import { gravitysForecast } from "../../../test-support/lighthouseAnswers";
import {
  aMachine,
  anEarlierAnswer,
  connectedTo,
  type Machine,
} from "../test-support/lhSession";
import { runCli } from "./bin";

// Story 6193, slices 02–03: what usage data must never change, held ACTIVE from DISTILL on. Each passes on
// today's lh, which sends nothing, and must keep passing once it can. They run the production entry point
// (`runCli`, and the built `bin` in a child process) against a Lighthouse on a socket, with the process
// environment set explicitly for the run and put back afterwards: CI, DO_NOT_TRACK and HOME are never
// inherited from whoever runs the suite.

const LENAS_FORECAST = [
  "forecast",
  "manual",
  "--team-id",
  "3",
  "--remaining",
  "25",
];

const LENAS_TOKEN = "lenas-usage-data-token-0b8e4d17c2a9";

const THE_QUESTION_OPENS = "May Lighthouse send usage data?";

const VARIABLES_A_RUN_DEPENDS_ON = [
  "HOME",
  "LIGHTHOUSE_CLI_CONFIG_PATH",
  "LIGHTHOUSE_API_KEY",
  "CI",
  "DO_NOT_TRACK",
] as const;

/** Runs `lh` through `runCli` with exactly these variables set (the others unset), then restores them. */
const lhInThisProcess = async (
  machine: Machine,
  args: readonly string[],
  env: Readonly<Record<string, string>> = {},
) => {
  const before = new Map(
    VARIABLES_A_RUN_DEPENDS_ON.map((name) => [name, process.env[name]]),
  );
  for (const name of VARIABLES_A_RUN_DEPENDS_ON) {
    delete process.env[name];
  }
  Object.assign(process.env, {
    HOME: machine.home,
    LIGHTHOUSE_CLI_CONFIG_PATH: machine.configPath,
    ...env,
  });
  const stdout: string[] = [];
  const stderr: string[] = [];
  try {
    const exitCode = await runCli(args, {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message),
    });
    return { exitCode, stdout: stdout.join("\n"), stderr: stderr.join("\n") };
  } finally {
    for (const [name, value] of before) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
};

/** A yes kept an hour ago, in the format `lh` and the local MCP server read. */
const lenaSaidYesAnHourAgo = (machine: Machine, lighthouseUrl: string) =>
  anEarlierAnswer(machine, lighthouseUrl, {
    answer: "yes",
    token: LENAS_TOKEN,
    confirmedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  });

describe("a script is never asked and pays nothing", () => {
  // @US-02 @driving_port @real-io @guard @kpi @contract-shape:unbounded-preservation
  // KPI-5 and the zero-request rule: without a stored yes, a run that cannot ask makes no usage data request.
  it("makes no usage data request and asks nothing in a CI run that never said yes", async () => {
    const lighthouse = await aFakeLighthouse();
    const buildAgent = await connectedTo(aMachine(), lighthouse.url);

    const run = await lhInThisProcess(
      buildAgent,
      [...LENAS_FORECAST, "--json"],
      { CI: "true" },
    );

    expect(run.exitCode).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual(gravitysForecast());
    expect(run.stderr).not.toContain(THE_QUESTION_OPENS);
    expect(lighthouse.usageDataRequests()).toEqual([]);
  });

  // @US-02 @driving_port @real-io @guard @kpi @contract-shape:unbounded-preservation
  // The same through the built binary in its own process, as a pipeline runs it.
  const builtBin = join(fileURLToPath(import.meta.url), "../../dist/bin.js");
  it.skipIf(!existsSync(builtBin))(
    "makes no usage data request and asks nothing when the built lh runs in CI",
    async () => {
      const lighthouse = await aFakeLighthouse();
      const buildAgent = await connectedTo(aMachine(), lighthouse.url);

      const { stdout, stderr } = await promisify(execFile)(
        process.execPath,
        [builtBin, ...LENAS_FORECAST, "--json"],
        {
          env: {
            PATH: process.env.PATH,
            HOME: buildAgent.home,
            LIGHTHOUSE_CLI_CONFIG_PATH: buildAgent.configPath,
            CI: "true",
          },
        },
      );

      expect(JSON.parse(stdout)).toEqual(gravitysForecast());
      expect(stderr).not.toContain(THE_QUESTION_OPENS);
      expect(lighthouse.usageDataRequests()).toEqual([]);
    },
  );
});

describe("a yes never changes what lh prints", () => {
  // @US-02 @US-04 @driving_port @real-io @guard @kpi @contract-shape:unbounded-preservation
  // --json and --toon are lh's contract with scripts: byte for byte the same with usage data on and off.
  it.each(["--json", "--toon"])(
    "prints the forecast %s byte for byte as without a yes, with the same exit code",
    async (format) => {
      const lighthouse = await aFakeLighthouse();
      const withoutAYes = await connectedTo(aMachine(), lighthouse.url);
      const withAYes = await connectedTo(aMachine(), lighthouse.url);
      await lenaSaidYesAnHourAgo(withAYes, lighthouse.url);

      const off = await lhInThisProcess(withoutAYes, [
        ...LENAS_FORECAST,
        format,
      ]);
      const on = await lhInThisProcess(withAYes, [...LENAS_FORECAST, format]);

      expect(off.stdout.length).toBeGreaterThan(0);
      expect(on.stdout).toBe(off.stdout);
      expect(on.stderr).toBe(off.stderr);
      expect(on.exitCode).toBe(off.exitCode);
    },
  );
});

describe("the consent token stays a secret", () => {
  // @US-02 @US-03 @driving_port @real-io @guard @security @contract-shape:unbounded-preservation
  it.each<readonly string[]>([
    [...LENAS_FORECAST, "--json"],
    [...LENAS_FORECAST, "--pretty"],
    ["config", "usage-data"],
    ["connection", "status"],
  ])("is never printed by lh %s", async (...args) => {
    const lighthouse = await aFakeLighthouse();
    const lena = await connectedTo(aMachine(), lighthouse.url);
    await lenaSaidYesAnHourAgo(lena, lighthouse.url);

    const run = await lhInThisProcess(lena, args);

    expect(`${run.stdout}\n${run.stderr}`).not.toContain(LENAS_TOKEN);
  });
});
