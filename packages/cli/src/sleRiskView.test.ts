import { describe, expect, it } from "vitest";
import {
  gravityBeforeTheDaily,
  gravitysSleRisk,
  gravitysWorkInProgressToday,
  sleRiskAroundTheLine,
  voyager,
} from "../../../test-support/dailyFlowAnswers";
import {
  aFakeLighthouse,
  type FakeLighthouse,
} from "../../../test-support/fakeLighthouse";
import {
  EVERY_TERM_RENAMED,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import {
  aMachine,
  connectedTo,
  lhOn,
  NO_TERMINAL,
} from "../test-support/lhSession";

// `lh metrics team --metrics sleRisk`: which Work Items in progress are likely to miss the Team's SLE, with
// Lighthouse's own numbers and the finished Work Items behind each, as its SLE Risk widget shows them. The
// selection is read only when named, so `lh metrics team` alone stays as it is.

const THE_DAY = ["--start-date", "2026-09-09", "--end-date", "2026-10-08"];
const SLE_RISK_ROUTE = "GET /teams/3/metrics/sleRisk";

const gravitysLighthouse = (
  replies: Record<string, { status: number; body?: unknown }> = {},
  version?: string,
) =>
  aFakeLighthouse({
    version,
    replies: {
      "GET /teams/3": { status: 200, body: gravityBeforeTheDaily() },
      "GET /teams/3/metrics/wip": {
        status: 200,
        body: gravitysWorkInProgressToday(),
      },
      "GET /teams/3/metrics/sleRisk": { status: 200, body: gravitysSleRisk() },
      ...replies,
    },
  });

const priyaRuns = async (lighthouse: FakeLighthouse, args: string[]) =>
  lhOn(await connectedTo(aMachine(), lighthouse.url), {
    terminal: NO_TERMINAL,
    env: { DO_NOT_TRACK: "1" },
  }).run(args);

const lines = (stdout: string): string[] =>
  stdout
    .split("\n")
    .map((line) => line.replaceAll(/\s+/gu, " ").trim())
    .filter((line) => line.length > 0);

const prose = (stdout: string): string => lines(stdout).join(" ");

const lineFor = (stdout: string, referenceId: string): string =>
  lines(stdout).find((line) => line.startsWith(referenceId)) ?? "";

const sleRiskOfGravity = (format = "--pretty") => [
  "metrics",
  "team",
  "--id",
  "3",
  ...THE_DAY,
  "--metrics",
  "sleRisk",
  format,
];

describe("Priya sees which Work Items are at risk of missing Gravity's SLE", () => {
  // @driving_port @real-io @contract-shape:bounded-change
  // Pending until lh reads SLE Risk.
  it.skip("names how many are at risk, then every Work Item highest risk first", async () => {
    const lighthouse = await gravitysLighthouse();

    const run = await priyaRuns(lighthouse, sleRiskOfGravity());

    expect(run.exitCode).toBe(0);
    expect(lines(run.stdout)).toContain("Gravity · as of Thu 8 Oct 2026");
    expect(lines(run.stdout)).toContain("SLE Risk");
    expect(prose(run.stdout)).toContain(
      "2 of 8 Work Items in progress are at risk of missing the SLE (85% within 7 days).",
    );
    const order = ["GR-058", "GR-061", "GR-063", "GR-064", "GR-068"].map(
      (referenceId) =>
        lines(run.stdout).findIndex((line) => line.startsWith(referenceId)),
    );
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((left, right) => left - right)).toEqual(order);
  });

  // @driving_port @real-io @contract-shape:bounded-change
  // Pending until lh reads SLE Risk.
  it.skip("shows each Work Item's age and risk with the finished Work Items behind it, or that it is past the SLE", async () => {
    const lighthouse = await gravitysLighthouse();

    const run = await priyaRuns(lighthouse, sleRiskOfGravity());

    const justUnderTheLine = lineFor(run.stdout, "GR-063");
    expect(justUnderTheLine).toContain("Alert digest email");
    expect(justUnderTheLine).toContain("5 days");
    expect(justUnderTheLine).toContain("55%");
    expect(justUnderTheLine).toContain(
      "6 of 11 finished Work Items that reached this age went past 7 days",
    );
    const pastIt = lineFor(run.stdout, "GR-058");
    expect(pastIt).toContain("Fleet map tiles");
    expect(pastIt).toContain("9 days");
    expect(pastIt).toMatch(/past the SLE\.?$/u);
  });

  // @driving_port @real-io @contract-shape:bounded-change
  // Pending until lh reads SLE Risk.
  it.skip("hands over Lighthouse's numbers unchanged with --json", async () => {
    const lighthouse = await gravitysLighthouse();

    const run = await priyaRuns(lighthouse, sleRiskOfGravity("--json"));

    expect(run.exitCode).toBe(0);
    expect(JSON.parse(run.stdout).sleRisk).toEqual(gravitysSleRisk());
  });

  // @error @real-io @contract-shape:pure-function
  // At risk starts at 70%, the line Lighthouse's own widget draws.
  // Pending until lh reads SLE Risk.
  it.skip("counts a Work Item at 70% as at risk and one at 69% as not", async () => {
    const lighthouse = await gravitysLighthouse({
      "GET /teams/3/metrics/sleRisk": {
        status: 200,
        body: sleRiskAroundTheLine(),
      },
    });

    const run = await priyaRuns(lighthouse, sleRiskOfGravity());

    expect(prose(run.stdout)).toContain(
      "2 of 3 Work Items in progress are at risk of missing the SLE (85% within 7 days).",
    );
  });

  // @error @real-io @contract-shape:bounded-change
  // Pending until lh reads SLE Risk.
  it.skip("says it in the instance's own words", async () => {
    const lighthouse = await gravitysLighthouse({
      "GET /terminology/all": {
        status: 200,
        body: terminology(EVERY_TERM_RENAMED),
      },
    });

    const run = await priyaRuns(lighthouse, sleRiskOfGravity());

    expect(lines(run.stdout)).toContain("PRM Risk");
    expect(prose(run.stdout)).toContain(
      "2 of 8 Tickets in progress are at risk of missing the PRM (85% within 7 days).",
    );
  });
});

describe("when there is no SLE Risk to show", () => {
  // @error @real-io @contract-shape:bounded-change
  // Pending until lh reads SLE Risk.
  it.skip("tells a Team without an SLE that it has no SLE Risk", async () => {
    const lighthouse = await aFakeLighthouse({
      replies: {
        "GET /teams/6": { status: 200, body: voyager() },
        "GET /teams/6/metrics/wip": {
          status: 200,
          body: gravitysWorkInProgressToday(),
        },
        "GET /teams/6/metrics/sleRisk": { status: 200, body: [] },
      },
    });

    const run = await priyaRuns(lighthouse, [
      "metrics",
      "team",
      "--id",
      "6",
      ...THE_DAY,
      "--metrics",
      "sleRisk",
      "--pretty",
    ]);

    expect(run.exitCode).toBe(0);
    expect(prose(run.stdout)).toContain(
      "Voyager has no SLE, so there is no SLE Risk.",
    );
    expect(run.stdout).not.toContain("%");
  });

  // @error @real-io @contract-shape:bounded-change
  // Pending until lh reads SLE Risk.
  it.skip("says SLE Risk is for Teams when asked for a Portfolio, without asking Lighthouse for it", async () => {
    const lighthouse = await aFakeLighthouse();

    const run = await priyaRuns(lighthouse, [
      "metrics",
      "portfolio",
      "--id",
      "2",
      "--metrics",
      "sleRisk",
      "--pretty",
    ]);

    expect(prose(run.stdout)).toContain("SLE Risk is for Teams.");
    expect(
      lighthouse
        .operations()
        .filter((operation) => operation.includes("sleRisk")),
    ).toEqual([]);
  });

  // @error @real-io @contract-shape:bounded-change
  // Pending until lh reads SLE Risk.
  it.skip("tells Priya to upgrade a Lighthouse that has no SLE Risk yet, and does not ask it", async () => {
    const lighthouse = await gravitysLighthouse({}, "v26.9.9.9");

    const run = await priyaRuns(lighthouse, sleRiskOfGravity());

    expect(prose(`${run.stdout}\n${run.stderr}`)).toContain(
      "Upgrade Lighthouse",
    );
    expect(lighthouse.operations()).not.toContain(SLE_RISK_ROUTE);
  });

  // @error @real-io @contract-shape:bounded-change
  // The names and ages come from a second read that only words the view; without it the numbers stand.
  // Pending until lh reads SLE Risk.
  it.skip("keeps every risk when the Work Items' names cannot be read", async () => {
    const lighthouse = await gravitysLighthouse({
      "GET /teams/3/metrics/wip": { status: 500 },
    });

    const run = await priyaRuns(lighthouse, sleRiskOfGravity());

    const justUnderTheLine = lineFor(run.stdout, "GR-063");
    expect(justUnderTheLine).toContain("55%");
    expect(justUnderTheLine).not.toContain("Alert digest email");
  });
});
