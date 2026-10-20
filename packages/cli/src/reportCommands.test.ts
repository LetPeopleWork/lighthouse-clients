import { describe, expect, it } from "vitest";
import {
  APOLLO,
  aLighthouseWithReports,
  ENGAGEMENT_START,
  LIGHTSPEED,
  theReportReadsAmong,
} from "../../../test-support/reportAnswers";
import {
  aMachine,
  connectedTo,
  lhOn,
  NO_TERMINAL,
} from "../test-support/lhSession";

// The edges of `lh report`: its help, the subcommands and options it refuses before asking Lighthouse anything,
// and the reads a --json or --toon answer needs.

const lhAgainstReports = async () => {
  const lighthouse = await aLighthouseWithReports();
  const lh = lhOn(await connectedTo(aMachine(), lighthouse.url), {
    terminal: NO_TERMINAL,
    env: { DO_NOT_TRACK: "1" },
  });
  return { lighthouse, run: (...args: string[]) => lh.run(args) };
};

const REPORT_HELP = [
  "Usage:",
  "  lh report list (--team-id <id> | --portfolio-id <id>)",
  "  lh report get (--team-id <id> | --portfolio-id <id>) --id <report id>",
  "",
  "  list names a Team's or a Portfolio's reports; get reads one of them. The default",
  "  view names the report, its owner and its windows, or counts the list. --json and",
  "  --toon return Lighthouse's answer unchanged, every value as it was sent.",
  "  Requires Lighthouse newer than v26.10.10.1.",
];

const ofLightspeed = ["--team-id", String(LIGHTSPEED.id)];

describe("lh report explains itself", () => {
  it("explains the report group in its help", async () => {
    const { lighthouse, run } = await lhAgainstReports();

    const help = await run("report");

    expect(help.exitCode).toBe(0);
    expect(help.stdout.split("\n")).toEqual(REPORT_HELP);
    expect(theReportReadsAmong(lighthouse.operations())).toEqual([]);
  });

  it("refuses a report subcommand it does not know, without asking Lighthouse", async () => {
    const { lighthouse, run } = await lhAgainstReports();

    const read = await run("report", "show", ...ofLightspeed);

    expect(read.exitCode).toBe(1);
    expect(read.stderr.split("\n")).toEqual([
      "Unknown report subcommand: show",
      "",
      ...REPORT_HELP,
    ]);
    expect(theReportReadsAmong(lighthouse.operations())).toEqual([]);
  });

  it("asks to connect first when no Lighthouse is connected", async () => {
    const lh = lhOn(aMachine(), {
      terminal: NO_TERMINAL,
      env: { DO_NOT_TRACK: "1" },
    });

    const read = await lh.run(["report", "list", ...ofLightspeed]);

    expect(read.exitCode).toBe(1);
    expect(read.stderr).toContain("Not connected");
  });
});

describe("lh report refuses what it cannot read, without asking Lighthouse", () => {
  it.each<[string, readonly string[], string]>([
    [
      "a Team id with letters after it",
      ["list", "--team-id", "3abc"],
      'Invalid --team-id "3abc": expected a numeric Team id.',
    ],
    [
      "a Team id with letters before it",
      ["get", "--team-id", "abc3", "--id", "1"],
      'Invalid --team-id "abc3": expected a numeric Team id.',
    ],
    [
      "a Portfolio id that is no number",
      ["list", "--portfolio-id", "apollo"],
      'Invalid --portfolio-id "apollo": expected a numeric Portfolio id.',
    ],
    [
      "both a Team and a Portfolio",
      [
        "get",
        ...ofLightspeed,
        "--portfolio-id",
        String(APOLLO.id),
        "--id",
        "1",
      ],
      "Give either --team-id or --portfolio-id for report get, not both.",
    ],
    [
      "a list without an owner",
      ["list"],
      "Missing --team-id or --portfolio-id for report list.",
    ],
    [
      "a report without an owner",
      ["get", "--id", "1"],
      "Missing --team-id or --portfolio-id for report get.",
    ],
    [
      "a report without its id",
      ["get", ...ofLightspeed],
      "Missing required --id for report get.",
    ],
    [
      "a report id that is no number",
      ["get", ...ofLightspeed, "--id", "1x"],
      'Invalid --id "1x": expected a numeric report id.',
    ],
  ])("refuses %s", async (_what, args, said) => {
    const { lighthouse, run } = await lhAgainstReports();

    const read = await run("report", ...args);

    expect(read.exitCode).toBe(1);
    expect(read.stderr).toBe(said);
    expect(theReportReadsAmong(lighthouse.operations())).toEqual([]);
  });
});

describe("lh report reads only the report for an answer it passes on unchanged", () => {
  it.each(["--json", "--toon"])(
    "reads neither the owner nor the instance's words for %s",
    async (format) => {
      const { lighthouse, run } = await lhAgainstReports();

      const read = await run(
        "report",
        "get",
        ...ofLightspeed,
        "--id",
        String(ENGAGEMENT_START.id),
        format,
      );

      expect(read.exitCode).toBe(0);
      expect(lighthouse.operations()).not.toContain(
        `GET /teams/${LIGHTSPEED.id}`,
      );
      expect(
        lighthouse
          .operations()
          .filter((operation) => /terminology/iu.test(operation)),
      ).toEqual([]);
    },
  );

  it("names the owner for the pretty view", async () => {
    const { lighthouse, run } = await lhAgainstReports();

    const read = await run(
      "report",
      "get",
      ...ofLightspeed,
      "--id",
      String(ENGAGEMENT_START.id),
      "--pretty",
    );

    expect(read.exitCode).toBe(0);
    expect(read.stdout.split("\n").slice(0, 3)).toEqual([
      ENGAGEMENT_START.name,
      `Team ${LIGHTSPEED.name}`,
      "Then Sun 3 May 2026 – Fri 31 Jul 2026 · Now Sun 5 Jul 2026 – Fri 2 Oct 2026",
    ]);
    expect(lighthouse.operations()).toContain(`GET /teams/${LIGHTSPEED.id}`);
  });
});
