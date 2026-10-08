import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  EVERY_TERM_RENAMED,
  gravity,
  oceanExplorer,
  ok,
  refused,
  seededWordsIn,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import {
  GRAVITYS_RANGE,
  gravitysMetrics,
  OCEAN_EXPLORERS_RANGE,
  oceanExplorersMetrics,
  percentilesHistory,
} from "../../../test-support/metricsAnswers";
import { aLighthouse, prose, shownLines } from "../test-support/cliHarness";

// `lh metrics team|portfolio` without `--metrics` prints the dashboard's headline on one screen.

const metricsOfGravity = (...flags: string[]) => [
  "metrics",
  "team",
  "--id",
  "3",
  ...GRAVITYS_RANGE,
  ...flags,
];

const gravitysLighthouse = (reads = {}) =>
  aLighthouse({ getTeam: ok(gravity()), ...gravitysMetrics(), ...reads });

const HEADING = "Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)";

const HEADLINE = [
  "Work Items in Progress 9 System WIP Limit: 10 Work Items",
  "Total Throughput 31 1.0 / day",
  "Total Arrivals 28 0.9 / day",
  "Blocked Work Items 2",
  "Total Work Item Age 84 days across 9 Work Items",
  "Predictability Score 63.4%",
  "Time in State 4 states across 42 Work Items",
];

const PERCENTILES = [
  "Percentile Cycle Time Work Item Age",
  "95th 21 days 18 days",
  "85th 12 days 11 days",
  "70th 8 days 6 days",
  "50th 5 days 3 days",
];

const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

describe("lh metrics team --pretty, the headline", () => {
  // At most 30 lines
  it("shows Priya Gravity's headline numbers and percentiles on one screen", async () => {
    const lighthouse = gravitysLighthouse();

    const result = await lighthouse.run(metricsOfGravity());

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const lines = shownLines(result.stdout);
    expect(lines[0]).toBe(HEADING);
    const first = lines.indexOf(HEADLINE[0]);
    expect(lines.slice(first, first + HEADLINE.length)).toEqual(HEADLINE);
    const table = lines.indexOf(PERCENTILES[0]);
    expect(lines.slice(table, table + PERCENTILES.length)).toEqual(PERCENTILES);
    expect(result.stdout.split("\n").length).toBeLessThanOrEqual(30);
    expect(lighthouse.asked()).toContain("getTeam");
  });

  // One line per over-time metric, every day one flag away
  it("summarises each over-time metric in one line and says where every day is", async () => {
    const result = await gravitysLighthouse().run(metricsOfGravity());

    const lines = shownLines(result.stdout);
    expect(lines).toContain(
      "Over time (one row per recorded day: lh metrics team --id 3 --metrics <name>)",
    );
    expect(lines).toContain(
      "Cycle Time 85th percentile 14 days on Mon 7 Sep → 12 days on Tue 6 Oct 29 days recorded",
    );
    expect(lines).toContain(
      "Throughput process limits 0 – 3.1 / day, average 1.0, on Tue 6 Oct 29 days recorded",
    );
    expect(lines).toContain(
      "Blocked Work Items 1 on Mon 7 Sep → 2 on Tue 6 Oct 30 days recorded",
    );
  });

  // An empty series says the web's empty-state sentence (overTimeEmptyState.ts)
  it("says why an over-time metric with nothing recorded has no line of numbers", async () => {
    const lighthouse = gravitysLighthouse({
      getTeamPercentilesOverTime: ok([]),
    });

    const result = await lighthouse.run(metricsOfGravity());

    expect(result.exitCode).toBe(0);
    expect(prose(result.stdout)).toContain(
      "Cycle Time 85th percentile Nothing to show for the selected range. Days appear here as Lighthouse records them.",
    );
  });

  // A refused section prints its refusal in place
  it("shows a refused metric's reason in its own line and every other number around it", async () => {
    const lighthouse = gravitysLighthouse({
      getTeamPredictabilityScore: refused(
        "dependency-failure",
        "Not enough throughput to score",
      ),
    });

    const result = await lighthouse.run(metricsOfGravity());

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines).toContain(
      "Predictability Score dependency-failure: Not enough throughput to score",
    );
    for (const line of HEADLINE.slice(0, 5)) {
      expect(lines).toContain(line);
    }
  });

  // Render the rest, one line for the section lh does not recognise
  it("names a metric it cannot read as shown only with --json, and renders the rest", async () => {
    const lighthouse = gravitysLighthouse({
      getTeamTotalWorkItemAgeOverTime: ok({
        startDate: "2026-09-07",
        endDate: "2026-10-06",
        days: [{ on: "2026-10-06", age: 84 }],
      }),
    });

    const result = await lighthouse.run(metricsOfGravity());

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const lines = shownLines(result.stdout);
    expect(lines).toContain(
      "Total Work Item Age shown only with --json (unknown shape)",
    );
    expect(lines).toContain("Total Throughput 31 1.0 / day");
    expect(lines).toContain("Predictability Score 63.4%");
    expect(result.stdout).not.toContain("undefined");
  });

  // SystemWipQuickSetting.tsx omits the limit when none is set
  it("leaves out the WIP limit for a Team that has none", async () => {
    const lighthouse = gravitysLighthouse({
      getTeam: ok(gravity({ name: "Meridian", id: 4, systemWIPLimit: 0 })),
    });

    const result = await lighthouse.run([
      "metrics",
      "team",
      "--id",
      "4",
      ...GRAVITYS_RANGE,
    ]);

    expect(shownLines(result.stdout)).toContain("Work Items in Progress 9");
    expect(result.stdout).not.toContain("Limit");
  });

  // A server older than v26.7.3.1 flags no Work Item as blocked
  it("leaves out the blocked count when Lighthouse does not say which Work Items are blocked", async () => {
    const withoutFlags = (
      gravitysMetrics().getTeamWip as { value: unknown[] }
    ).value.map((item) => {
      const {
        isBlocked: _notSent,
        blockedSince: _neither,
        ...rest
      } = item as Record<string, unknown>;
      return rest;
    });
    const lighthouse = gravitysLighthouse({ getTeamWip: ok(withoutFlags) });

    const result = await lighthouse.run(metricsOfGravity());

    const lines = shownLines(result.stdout);
    expect(lines).toContain("Total Throughput 31 1.0 / day");
    expect(
      lines.filter((line) => /^Blocked Work Items \d+$/u.test(line)),
    ).toEqual([]);
  });

  // n days / 1 day, and — for a percentile one side lacks
  it("says '1 day' for a single day and '—' where a percentile is missing", async () => {
    const lighthouse = gravitysLighthouse({
      getTeamCycleTimePercentiles: ok([
        { percentile: 50, value: 1 },
        { percentile: 70, value: 8 },
        { percentile: 85, value: 12 },
        { percentile: 95, value: 21 },
      ]),
      getTeamWorkItemAgePercentiles: ok([
        { percentile: 50, value: 3 },
        { percentile: 70, value: 6 },
        { percentile: 85, value: 11 },
      ]),
    });

    const lines = shownLines((await lighthouse.run(metricsOfGravity())).stdout);

    expect(lines).toContain("95th 21 days —");
    expect(lines).toContain("50th 1 day 3 days");
  });

  // The CLI's own placeholder is not an answer
  it("does not print the work distribution placeholder", async () => {
    const result = await gravitysLighthouse().run(metricsOfGravity());

    expect(shownLines(result.stdout)[0]).toBe(HEADING);
    expect(result.stdout).not.toMatch(/work ?distribution/iu);
    expect(result.stdout).not.toContain("No dedicated backend endpoint");
  });

  it("says it in the words an instance has renamed every term to", async () => {
    const lighthouse = gravitysLighthouse({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const result = await lighthouse.run(metricsOfGravity());

    const lines = shownLines(result.stdout);
    expect(lines).toContain(
      "Tickets in Progress 9 System Load Limit: 10 Tickets",
    );
    expect(lines).toContain("Total Flow Rate 31 1.0 / day");
    expect(lines).toContain("Stuck Tickets 2");
    expect(lines).toContain("Total Ticket Age 84 days across 9 Tickets");
    expect(lines).toContain("Percentile Flow Time Ticket Age");
    expect(seededWordsIn(result.stdout)).toEqual([]);
  });

  it("heads the headline with the Team's id, in the seeded words, when neither name nor terms can be read", async () => {
    const lighthouse = gravitysLighthouse({
      getTeam: refused("forbidden", "You may not read this Team"),
      getTerminology: refused("unexpected", "Terminology is unavailable"),
    });

    const result = await lighthouse.run(metricsOfGravity());

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const lines = shownLines(result.stdout);
    expect(lines[0]).toBe(
      "Team [id: 3] · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)",
    );
    expect(lines).toContain("Work Items in Progress 9");
  });
});

describe("lh metrics portfolio --pretty, the headline", () => {
  // A Portfolio counts Features
  it("counts Features for Ocean Explorer over its 90 days", async () => {
    const lighthouse = aLighthouse({
      getPortfolio: ok(oceanExplorer()),
      ...oceanExplorersMetrics(),
    });

    const result = await lighthouse.run([
      "metrics",
      "portfolio",
      "--id",
      "2",
      ...OCEAN_EXPLORERS_RANGE,
    ]);

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines[0]).toBe(
      "Ocean Explorer · Thu 9 Jul 2026 – Tue 6 Oct 2026 (90 days)",
    );
    expect(lines).toContain(
      "Features in Progress 4 System WIP Limit: 5 Features",
    );
    expect(lines).toContain("Total Throughput 7 0.1 / day");
    expect(lighthouse.asked()).toContain("getPortfolio");
  });
});

// Scripts read --json and --toon, so the pretty views must never change them. The composite payload is
// long, so its bytes are pinned by their SHA-256, captured before the pretty views existed.
describe("lh metrics keeps the facts formats as they are", () => {
  const EVERY_METRICS_READ = [
    "getTeamArrivals",
    "getTeamBlockedCountHistory",
    "getTeamCumulativeStateTime",
    "getTeamCumulativeStateTimeCandidates",
    "getTeamCycleTimeData",
    "getTeamCycleTimePercentiles",
    "getTeamPercentilesOverTime",
    "getTeamPredictabilityScore",
    "getTeamProcessBehaviorOverTime",
    "getTeamThroughput",
    "getTeamTotalWorkItemAgeOverTime",
    "getTeamWip",
    "getTeamWipOverTime",
    "getTeamWorkItemAgeOverTime",
    "getTeamWorkItemAgePercentiles",
  ];

  it("hands scripts the whole metrics payload unchanged with --json, and asks Lighthouse nothing more", async () => {
    const lighthouse = gravitysLighthouse();

    const result = await lighthouse.run(metricsOfGravity("--json"));

    expect(result.exitCode).toBe(0);
    expect(sha256(result.stdout)).toMatchInlineSnapshot(
      `"d7e811c52e98ebce1dcf3abbeb0e072d21f4ed8fb66de7e97dfe1a70df5e24bd"`,
    );
    expect(JSON.parse(result.stdout)).toHaveProperty("workDistribution");
    expect([...lighthouse.asked()].sort()).toEqual(EVERY_METRICS_READ);
  });

  it("hands scripts the whole metrics payload unchanged with --toon, and asks Lighthouse nothing more", async () => {
    const lighthouse = gravitysLighthouse();

    const result = await lighthouse.run(metricsOfGravity("--toon"));

    expect(result.exitCode).toBe(0);
    expect(sha256(result.stdout)).toMatchInlineSnapshot(
      `"d2d25186962e02ab85363224a2c1bde5a88ab2e3911db5c6ebf6781eb40687a0"`,
    );
    expect([...lighthouse.asked()].sort()).toEqual(EVERY_METRICS_READ);
  });

  it("hands scripts one metric's payload unchanged with --json", async () => {
    const lighthouse = gravitysLighthouse({
      getTeamPercentilesOverTime: ok(percentilesHistory()),
    });

    const result = await lighthouse.run(
      metricsOfGravity("--metrics", "percentilesOverTime", "--json"),
    );

    expect(result.exitCode).toBe(0);
    expect(sha256(result.stdout)).toMatchInlineSnapshot(
      `"040cdaca6484985030c563dda5d01d03a3776a6aed018c537fc63a59d41e46d6"`,
    );
    expect(lighthouse.asked()).toEqual(["getTeamPercentilesOverTime"]);
  });
});
