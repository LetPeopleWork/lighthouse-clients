import { describe, expect, it } from "vitest";
import {
  gravity,
  oceanExplorer,
  ok,
} from "../../../test-support/lighthouseAnswers";
import {
  GRAVITYS_RANGE,
  gravitysMetrics,
  OCEAN_EXPLORERS_RANGE,
  oceanExplorersMetrics,
} from "../../../test-support/metricsAnswers";
import { aLighthouse } from "../test-support/cliHarness";

// SLE Risk and the Process Behaviour Charts are read only when `--metrics` names them. `lh metrics team` and
// `lh metrics portfolio` on their own keep making the same reads and printing the same view as before
// those two arrived; the view is held in a file beside this test, recorded from the release before them.

const GRAVITYS_DEFAULT_READS = [
  "getTeam",
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
  "getTerminology",
];

const distinct = (reads: readonly string[]): string[] =>
  [...new Set(reads)].sort();

describe("the metrics view without --metrics stays as it was", () => {
  // @in-memory @contract-shape:unbounded-preservation
  it("makes the same reads for a Team and prints the same view", async () => {
    const lh = aLighthouse({ getTeam: ok(gravity()), ...gravitysMetrics() });

    const run = await lh.run([
      "metrics",
      "team",
      "--id",
      "3",
      ...GRAVITYS_RANGE,
      "--pretty",
    ]);

    expect(run.exitCode).toBe(0);
    expect(distinct(lh.asked())).toEqual(GRAVITYS_DEFAULT_READS);
    await expect(run.stdout).toMatchFileSnapshot(
      "./__snapshots__/metricsDefaultView.team.txt",
    );
  });

  // @in-memory @contract-shape:unbounded-preservation
  it("makes the same reads for a Portfolio and prints the same view", async () => {
    const lh = aLighthouse({
      getPortfolio: ok(oceanExplorer()),
      ...oceanExplorersMetrics(),
    });

    const run = await lh.run([
      "metrics",
      "portfolio",
      "--id",
      "2",
      ...OCEAN_EXPLORERS_RANGE,
      "--pretty",
    ]);

    expect(run.exitCode).toBe(0);
    expect(
      lh.asked().filter((read) => /SleRisk|ProcessBehaviorChart/u.test(read)),
    ).toEqual([]);
    await expect(run.stdout).toMatchFileSnapshot(
      "./__snapshots__/metricsDefaultView.portfolio.txt",
    );
  });
});

describe("the two new selections are named in the help and taken by their names", () => {
  // @driving_port @contract-shape:bounded-change
  // Pending until lh offers the two selections.
  it.skip("lists them after the existing metrics", async () => {
    const run = await aLighthouse({}).run(["metrics"]);

    expect(run.stdout.split("\n")).toContain(
      "Allowed metrics: throughput, wip, cycleTime, workItemAge, totalWorkItemAge, arrivals, predictabilityScore, cumulativeStateTime, blocked, percentilesOverTime, processBehaviorOverTime, sleRisk, processBehaviorChart",
    );
  });

  // @driving_port @contract-shape:bounded-change
  it.each(["sleRisk", "slerisk"])(
    "reads SLE Risk, and nothing it was not asked for, for --metrics %s",
    async (selection) => {
      const lh = aLighthouse({
        getTeam: ok(gravity()),
        ...gravitysMetrics(),
        getTeamSleRisk: ok([]),
      });

      const run = await lh.run([
        "metrics",
        "team",
        "--id",
        "3",
        ...GRAVITYS_RANGE,
        "--metrics",
        selection,
        "--json",
      ]);

      expect(run.exitCode).toBe(0);
      expect(lh.asked()).toContain("getTeamSleRisk");
      expect(
        lh
          .asked()
          .filter((read) =>
            /Throughput|Arrivals|CycleTime|ProcessBehavior/u.test(read),
          ),
      ).toEqual([]);
    },
  );
});
