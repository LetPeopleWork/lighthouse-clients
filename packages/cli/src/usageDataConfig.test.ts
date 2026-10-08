import { readFile, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  aBatchOf,
  aFakeLighthouse,
  type FakeLighthouse,
  type UsageDataSide,
} from "../../../test-support/fakeLighthouse";
import {
  aMachine,
  aNo,
  anEarlierAnswer,
  aYesGiven,
  connectedTo,
  DOCS_URL,
  HOURS,
  lhOn,
  type Machine,
  NO_TERMINAL,
  THURSDAY_MORNING,
  theStoredAnswerFor,
  usageDataFileOf,
} from "../test-support/lhSession";

// Story 6193, slice 02 (US-03). `lh config usage-data` says what Lena answered for the Lighthouse she is
// connected to and whether that Lighthouse takes usage data; `on` and `off` change the answer without a
// question, in or out of a terminal. The copy is the maintainer's approved set; two lines it did not cover
// are pinned from the nearest approved wording (AFK copy defaults, revisited at the hold).
// Driving port: `runCliSession`. Every scenario is pending until DELIVER slice 02.

const answerLine = (url: string, answer: string) =>
  `Usage data from lh to ${url}: ${answer}`;

const ALLOWS = "This Lighthouse allows usage data.";
const STOPPED =
  "This Lighthouse's administrator has stopped usage data, so nothing is sent.";
const PREDATES =
  "This Lighthouse does not take usage data from lh (it predates it).";
const COULD_NOT_ASK =
  "Could not ask this Lighthouse whether it allows usage data.";
const STOPPED_NOTHING_CHANGED =
  "This Lighthouse's administrator has stopped usage data; nothing was changed.";
const DO_NOT_TRACK_IS_SET =
  "DO_NOT_TRACK is set, so lh sends no usage data whatever is stored.";

// AFK copy default (not in the approved set): the withdrawal could not reach Lighthouse. The first line is
// the approved off line; the second follows the approved "Could not ask this Lighthouse…" line.
const COULD_NOT_TELL =
  "Could not tell this Lighthouse; the yes it holds lapses by itself within 30 days.";

// AFK copy default (not in the approved set): the voter key file's refusal, for the answers file.
const unreadableAnswersFile = (path: string) =>
  `The usage data file ${path} cannot be read; fix or remove it.`;

const STATUS = ["config", "usage-data"];
const ON = ["config", "usage-data", "on"];
const OFF = ["config", "usage-data", "off"];
const LENAS_FORECAST = [
  "forecast",
  "manual",
  "--team-id",
  "3",
  "--remaining",
  "25",
];

const lenaAt = async (lighthouse: FakeLighthouse): Promise<Machine> =>
  connectedTo(aMachine(), lighthouse.url);

const lenaWhoSaidYes = async (lighthouse: FakeLighthouse) => {
  const lena = await lenaAt(lighthouse);
  await lhOn(lena, { typing: ["y"] }).run(LENAS_FORECAST);
  return lena;
};

const stdoutLines = (stdout: string) =>
  stdout.split("\n").map((line) => line.trimEnd());

describe("lh config usage-data says what Lena answered and what her Lighthouse allows", () => {
  // @US-03 @driving_port @real-io @contract-shape:pure-function
  it.skip("shows Lena her yes and that her Lighthouse allows usage data", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaWhoSaidYes(lighthouse);

    const run = await lhOn(lena).run(STATUS);

    expect(run.exitCode).toBe(0);
    expect(stdoutLines(run.stdout)).toEqual([
      answerLine(lighthouse.url, "on"),
      ALLOWS,
    ]);
    expect(run.questions).toEqual([]);
  });

  // @US-03 @driving_port @real-io @contract-shape:pure-function
  it.skip.each<
    [string, (machine: Machine, url: string) => Promise<void>, string]
  >([
    ["never asked", async () => undefined, "not asked yet (off)"],
    ["said No", (machine, url) => anEarlierAnswer(machine, url, aNo()), "off"],
  ])("shows an answer that was %s as %j", async (_how, given, shown) => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaAt(lighthouse);
    await given(lena, lighthouse.url);

    const run = await lhOn(lena).run(STATUS);

    expect(stdoutLines(run.stdout)).toEqual([
      answerLine(lighthouse.url, shown),
      ALLOWS,
    ]);
  });

  // @US-03 @driving_port @real-io @error @version-skew @contract-shape:pure-function
  it.skip.each<[string, UsageDataSide, string]>([
    ["has stopped usage data", { administratorDisabled: true }, STOPPED],
    ["predates labelled sources", { acceptedSources: null }, PREDATES],
    [
      "labels no command line source",
      { acceptedSources: ["Browser"] },
      PREDATES,
    ],
    ["has no usage data at all", { answers: "not-at-all" }, PREDATES],
    ["never answers about usage data", { answers: "never" }, COULD_NOT_ASK],
    [
      "fails when asked about usage data",
      { answers: "by-failing" },
      COULD_NOT_ASK,
    ],
  ])("says so when the Lighthouse %s", async (_why, side, instanceLine) => {
    const lighthouse = await aFakeLighthouse({ usageData: side });
    const lena = await lenaAt(lighthouse);

    const run = await lhOn(lena).run(STATUS);

    expect(run.exitCode).toBe(0);
    expect(stdoutLines(run.stdout)).toEqual([
      answerLine(lighthouse.url, "not asked yet (off)"),
      instanceLine,
    ]);
  });

  // @US-03 @driving_port @real-io @boundary @contract-shape:pure-function
  it.skip("names DO_NOT_TRACK when it is in force, whatever is stored", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaAt(lighthouse);
    await anEarlierAnswer(
      lena,
      lighthouse.url,
      aYesGiven("lenas-token", 1 * HOURS),
    );

    const run = await lhOn(lena, { env: { DO_NOT_TRACK: "1" } }).run(STATUS);

    expect(run.exitCode).toBe(0);
    expect(stdoutLines(run.stdout)).toContain(DO_NOT_TRACK_IS_SET);
  });

  // @US-03 @driving_port @real-io @error @contract-shape:unbounded-preservation
  // The one place the answers file is the command's own answer, so an unreadable one is refused by name.
  it.skip("refuses, naming the file, when the answers file cannot be read, and leaves it as it was", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaAt(lighthouse);
    await writeFile(usageDataFileOf(lena), "not json", "utf8");

    const run = await lhOn(lena).run(STATUS);

    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(unreadableAnswersFile(usageDataFileOf(lena)));
    expect(await readFile(usageDataFileOf(lena), "utf8")).toBe("not json");
  });

  // @US-03 @driving_port @error @contract-shape:pure-function
  it.skip("needs a connection, as every other command that names a Lighthouse does", async () => {
    const nobodysMachine = aMachine();

    const run = await lhOn(nobodysMachine).run(STATUS);

    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(
      'Not connected. Run "lh connection connect" to connect to a Lighthouse server.',
    );
  });

  // @US-03 @driving_port @error @contract-shape:pure-function
  it.skip("answers anything but on or off with the group's help, exit 1", async () => {
    const lighthouse = await aFakeLighthouse();

    const run = await lhOn(await lenaAt(lighthouse)).run([
      "config",
      "usage-data",
      "maybe",
    ]);

    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain("Unknown config usage-data subcommand: maybe");
    expect(lighthouse.usageDataRequests()).toEqual([]);
  });

  // @US-03 @driving_port @contract-shape:pure-function
  it.skip("is listed in the config group's help", async () => {
    const run = await lhOn(aMachine()).run(["config"]);

    expect(run.stdout).toContain("lh config usage-data");
  });
});

describe("lh config usage-data off withdraws the yes and stops sending", () => {
  // @US-03 @driving_port @real-io @kpi @contract-shape:bounded-change
  // KPI-5: 0 sends after off.
  it.skip("withdraws Lena's grant at her Lighthouse, forgets the token, and sends nothing afterwards", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaWhoSaidYes(lighthouse);
    const token = lighthouse.mintedTokens()[0];

    const run = await lhOn(lena).run(OFF);
    const next = await lhOn(lena).run(LENAS_FORECAST);

    expect(run.exitCode).toBe(0);
    expect(stdoutLines(run.stdout)).toEqual([
      `${answerLine(lighthouse.url, "off")}. Nothing more is sent.`,
    ]);
    expect(lighthouse.withdrawals()).toEqual([token]);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toEqual({
      answer: "no",
      decidedAt: THURSDAY_MORNING.toISOString(),
    });
    expect(next.questions).toEqual([]);
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-03 @driving_port @real-io @error @infrastructure-failure @contract-shape:bounded-change
  // Offline: the answer is off all the same, and Lena is told her Lighthouse was not.
  it.skip.each<["by-failing" | "never"]>([["by-failing"], ["never"]])(
    "turns usage data off even when the withdrawal cannot reach Lighthouse (it answers %s), and says so",
    async (consentAnswers) => {
      const lighthouse = await aFakeLighthouse();
      const lena = await lenaWhoSaidYes(lighthouse);
      lighthouse.changeUsageData({ consentAnswers });

      const run = await lhOn(lena).run(OFF);

      expect(run.exitCode).toBe(0);
      expect(stdoutLines(run.stdout)).toEqual([
        `${answerLine(lighthouse.url, "off")}. Nothing more is sent.`,
        COULD_NOT_TELL,
      ]);
      expect(await theStoredAnswerFor(lena, lighthouse.url)).toMatchObject({
        answer: "no",
      });
    },
  );

  // @US-03 @driving_port @real-io @boundary @contract-shape:bounded-change
  // Off is always allowed: under the administrator's stop, under DO_NOT_TRACK, before anyone asked.
  it.skip.each<[string, UsageDataSide, Readonly<Record<string, string>>]>([
    ["before anyone asked", {}, {}],
    ["under the administrator's stop", { administratorDisabled: true }, {}],
    ["under DO_NOT_TRACK", {}, { DO_NOT_TRACK: "1" }],
  ])("records off %s, without posting anything", async (_when, side, env) => {
    const lighthouse = await aFakeLighthouse({ usageData: side });
    const lena = await lenaAt(lighthouse);

    const run = await lhOn(lena, { env }).run(OFF);

    expect(run.exitCode).toBe(0);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toMatchObject({
      answer: "no",
    });
    expect(lighthouse.decisionsPosted()).toEqual([]);
    expect(lighthouse.handedIn()).toEqual([]);
  });
});

describe("lh config usage-data on records a yes without a question", () => {
  // @US-03 @driving_port @real-io @contract-shape:bounded-change
  // Sofia's build agent: no terminal, so it is never asked, and she switches it on deliberately.
  it.skip("switches Sofia's build agent on, so its later forecasts are reported from the command line", async () => {
    const lighthouse = await aFakeLighthouse();
    const buildAgent = await lenaAt(lighthouse);

    const run = await lhOn(buildAgent, {
      terminal: NO_TERMINAL,
      env: { CI: "true" },
    }).run(ON);
    const nightly = await lhOn(buildAgent, {
      terminal: NO_TERMINAL,
      env: { CI: "true" },
    }).run(LENAS_FORECAST);

    const token = lighthouse.mintedTokens()[0];
    expect(run.exitCode).toBe(0);
    expect(stdoutLines(run.stdout)).toEqual([
      `${answerLine(lighthouse.url, "on")}.`,
      `Details: ${DOCS_URL}`,
    ]);
    expect(run.questions).toEqual([]);
    expect(nightly.questions).toEqual([]);
    expect(lighthouse.decisionsPosted()).toEqual(["granted"]);
    expect(
      lighthouse.handedIn().map(({ token, batch }) => ({ token, batch })),
    ).toEqual([
      { token, batch: aBatchOf("Cli", { name: "TeamManualForecastRun" }) },
    ]);
  });

  // @US-03 @driving_port @real-io @contract-shape:bounded-change
  // The command is the person's explicit, later decision: it replaces an earlier No.
  it.skip("replaces Marco's earlier No with a yes", async () => {
    const lighthouse = await aFakeLighthouse();
    const marco = await lenaAt(lighthouse);
    await anEarlierAnswer(marco, lighthouse.url, aNo());

    await lhOn(marco).run(ON);

    expect(await theStoredAnswerFor(marco, lighthouse.url)).toEqual({
      answer: "yes",
      token: lighthouse.mintedTokens()[0],
      confirmedAt: THURSDAY_MORNING.toISOString(),
    });
  });

  // @US-03 @driving_port @real-io @error @contract-shape:unbounded-preservation
  // Recording a yes against something already stopped writes down a decision that cannot take effect.
  it.skip("records nothing under the administrator's stop, says why, and exits 0", async () => {
    const lighthouse = await aFakeLighthouse({
      usageData: { administratorDisabled: true },
    });
    const lena = await lenaAt(lighthouse);

    const run = await lhOn(lena).run(ON);

    expect(run.exitCode).toBe(0);
    expect(stdoutLines(run.stdout)).toEqual([STOPPED_NOTHING_CHANGED]);
    expect(lighthouse.decisionsPosted()).toEqual([]);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toBe(undefined);
  });

  // @US-03 @driving_port @real-io @error @contract-shape:unbounded-preservation
  // No client records under DO_NOT_TRACK; the CI smoke step reads exactly this line.
  it.skip("records nothing under DO_NOT_TRACK, prints the DO_NOT_TRACK line and makes no request", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaAt(lighthouse);

    const run = await lhOn(lena, { env: { DO_NOT_TRACK: "1" } }).run(ON);

    expect(run.exitCode).toBe(0);
    expect(stdoutLines(run.stdout)).toContain(DO_NOT_TRACK_IS_SET);
    expect(lighthouse.usageDataRequests()).toEqual([]);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toBe(undefined);
  });

  // @US-03 @driving_port @real-io @error @version-skew @kpi @contract-shape:unbounded-preservation
  // KPI-4: switching on against a Lighthouse that cannot label lh would only mislabel lh as a browser.
  it.skip("records nothing against a Lighthouse that predates labelled sources, and says so", async () => {
    const lighthouse = await aFakeLighthouse({
      usageData: { acceptedSources: null },
    });
    const lena = await lenaAt(lighthouse);

    const run = await lhOn(lena).run(ON);

    expect(run.exitCode).toBe(0);
    expect(stdoutLines(run.stdout)).toEqual([PREDATES]);
    expect(lighthouse.decisionsPosted()).toEqual([]);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toBe(undefined);
  });

  // @US-03 @driving_port @real-io @error @infrastructure-failure @contract-shape:unbounded-preservation
  // AFK default: a Lighthouse that cannot be asked records nothing and fails the command, since what was
  // asked for did not happen.
  it.skip("records nothing when the Lighthouse cannot be asked, says so, and exits 1", async () => {
    const lighthouse = await aFakeLighthouse({
      usageData: { answers: "by-failing" },
    });
    const lena = await lenaAt(lighthouse);

    const run = await lhOn(lena).run(ON);

    expect(run.exitCode).toBe(1);
    expect(run.stderr).toContain(COULD_NOT_ASK);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toBe(undefined);
  });
});

describe("the consent token stays a secret", () => {
  // @US-03 @driving_port @real-io @security @contract-shape:unbounded-preservation
  it.skip("is never shown by status, on or off", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaAt(lighthouse);

    const runs = [
      await lhOn(lena).run(ON),
      await lhOn(lena).run(STATUS),
      await lhOn(lena).run(OFF),
    ];

    const token = lighthouse.mintedTokens()[0] ?? "no token was minted";
    expect(lighthouse.mintedTokens()).toHaveLength(1);
    for (const run of runs) {
      expect(`${run.stdout}\n${run.stderr}`).not.toContain(token);
    }
  });
});
