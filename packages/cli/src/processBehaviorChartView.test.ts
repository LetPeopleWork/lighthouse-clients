import { describe, expect, it } from "vitest";
import {
  aChart,
  chartNotReady,
  chartWithoutABaseline,
  gravityBeforeTheDaily,
  PORTFOLIO_CHART_ROUTES,
  TEAM_CHART_ROUTES,
  throughputWithABlackoutDay,
  totalAgeWithALargeChange,
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

// `lh metrics team|portfolio --metrics processBehaviorChart`: every Process Behaviour Chart of the Team or
// Portfolio, one line each under the range's heading, titled as the web titles the chart, saying whether
// Lighthouse found a signal on it and on which days. Read only when named.

const RANGE = ["--start-date", "2026-09-09", "--end-date", "2026-10-08"];
const SIGNAL_NAMES = [
  "Large Change",
  "Moderate Change",
  "Moderate Shift",
  "Small Shift",
];

type Reply = { readonly status: number; readonly body?: unknown };

const chartsOf = (
  owner: "teams/3" | "portfolios/2",
  routes: readonly string[],
  charts: Readonly<Record<string, unknown>> = {},
): Record<string, Reply> =>
  Object.fromEntries(
    routes.map((route) => [
      `GET /${owner}/metrics/${route}`,
      { status: 200, body: charts[route] ?? aChart() },
    ]),
  );

const gravitysLighthouse = (
  charts: Readonly<Record<string, unknown>> = {},
  replies: Record<string, Reply> = {},
) =>
  aFakeLighthouse({
    replies: {
      "GET /teams/3": { status: 200, body: gravityBeforeTheDaily() },
      ...chartsOf("teams/3", TEAM_CHART_ROUTES, charts),
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

const chartLine = (stdout: string, title: string): string =>
  lines(stdout).find((line) => line.startsWith(title)) ?? "";

const signalsIn = (line: string): string[] =>
  SIGNAL_NAMES.filter((name) => line.includes(name));

const chartsOfGravity = (
  selection = "processBehaviorChart",
  format = "--pretty",
) => ["metrics", "team", "--id", "3", ...RANGE, "--metrics", selection, format];

const chartRoutesAsked = (lighthouse: FakeLighthouse): string[] =>
  lighthouse
    .operations()
    .filter((operation) => operation.endsWith("/pbc"))
    .map((operation) =>
      operation.replace(/^GET \/(teams|portfolios)\/\d+\/metrics\//u, ""),
    )
    .sort();

describe("Priya sees every chart of Gravity's and whether Lighthouse found a signal on it", () => {
  // @driving_port @real-io @contract-shape:bounded-change
  // Pending until lh reads Process Behaviour Charts.
  it.skip("prints one line per chart under the range, each titled as the web titles it", async () => {
    const lighthouse = await gravitysLighthouse({
      "totalWorkItemAge/pbc": totalAgeWithALargeChange(),
      "cycleTime/pbc": chartNotReady(),
    });

    const run = await priyaRuns(lighthouse, chartsOfGravity());

    expect(run.exitCode).toBe(0);
    expect(lines(run.stdout)).toContain(
      "Gravity · Wed 9 Sep 2026 – Thu 8 Oct 2026 (30 days)",
    );
    const totalAge = chartLine(
      run.stdout,
      "Total Work Item Age Process Behaviour Chart",
    );
    expect(signalsIn(totalAge)).toEqual(["Large Change"]);
    expect(totalAge).toContain("7 Oct");
    expect(totalAge).toContain("8 Oct");
    for (const quiet of [
      "Throughput Process Behaviour Chart",
      "Arrivals Process Behaviour Chart",
      "Work In Progress Process Behaviour Chart",
    ]) {
      expect(chartLine(run.stdout, quiet)).toContain("No signals");
    }
    expect(
      chartLine(run.stdout, "Cycle Time Process Behaviour Chart"),
    ).toContain("At least 15 days of data are needed to compute the limits.");
  });

  // @driving_port @real-io @contract-shape:bounded-change
  // Pending until lh reads Process Behaviour Charts.
  it.skip("reads each of the Team's five charts once", async () => {
    const lighthouse = await gravitysLighthouse();

    await priyaRuns(lighthouse, chartsOfGravity());

    expect(chartRoutesAsked(lighthouse)).toEqual([...TEAM_CHART_ROUTES].sort());
  });

  // @driving_port @real-io @contract-shape:bounded-change
  // Pending until lh reads Process Behaviour Charts.
  it.skip("hands over every chart unchanged with --json, by chart type", async () => {
    const lighthouse = await gravitysLighthouse({
      "totalWorkItemAge/pbc": totalAgeWithALargeChange(),
    });

    const run = await priyaRuns(
      lighthouse,
      chartsOfGravity("processBehaviorChart", "--json"),
    );

    expect(run.exitCode).toBe(0);
    expect(JSON.parse(run.stdout).processBehaviorChart).toEqual({
      startDate: "2026-09-09",
      endDate: "2026-10-08",
      charts: {
        Throughput: aChart(),
        Arrivals: aChart(),
        Wip: aChart(),
        WorkItemAge: totalAgeWithALargeChange(),
        CycleTime: aChart(),
      },
    });
  });

  // @driving_port @real-io @contract-shape:bounded-change
  // Pending until lh reads Process Behaviour Charts.
  it.skip("reads a Portfolio's six charts, Feature Size among them", async () => {
    const lighthouse = await aFakeLighthouse({
      replies: chartsOf("portfolios/2", PORTFOLIO_CHART_ROUTES),
    });

    const run = await priyaRuns(lighthouse, [
      "metrics",
      "portfolio",
      "--id",
      "2",
      ...RANGE,
      "--metrics",
      "processBehaviorChart",
      "--pretty",
    ]);

    expect(chartRoutesAsked(lighthouse)).toEqual(
      [...PORTFOLIO_CHART_ROUTES].sort(),
    );
    expect(
      chartLine(run.stdout, "Feature Size Process Behaviour Chart"),
    ).toContain("No signals");
  });

  // @real-io @contract-shape:bounded-change
  // Pending until lh reads Process Behaviour Charts.
  it.skip.each(["pbc", "processbehaviorchart", "processbehaviourchart"])(
    "takes %s for the charts too",
    async (alias) => {
      const lighthouse = await gravitysLighthouse();

      const run = await priyaRuns(lighthouse, chartsOfGravity(alias));

      expect(run.exitCode).toBe(0);
      expect(chartRoutesAsked(lighthouse)).toEqual(
        [...TEAM_CHART_ROUTES].sort(),
      );
    },
  );
});

describe("a chart whose limits mean little claims no signal", () => {
  // @error @real-io @contract-shape:pure-function
  // Pending until lh reads Process Behaviour Charts.
  it.skip("says no baseline is set and names no signal", async () => {
    const lighthouse = await gravitysLighthouse({
      "wipOverTime/pbc": chartWithoutABaseline(),
    });

    const run = await priyaRuns(lighthouse, chartsOfGravity());

    const wip = chartLine(
      run.stdout,
      "Work In Progress Process Behaviour Chart",
    );
    expect(wip.toLowerCase()).toContain("no baseline");
    expect(signalsIn(wip)).toEqual([]);
  });

  // @error @real-io @contract-shape:pure-function
  // A blackout day is a day the Team did not work; whatever the chart flagged on it is not a signal.
  // Pending until lh reads Process Behaviour Charts.
  it.skip("lists a blackout day as one and never as a signal", async () => {
    const lighthouse = await gravitysLighthouse({
      "throughput/pbc": throughputWithABlackoutDay(),
    });

    const run = await priyaRuns(lighthouse, chartsOfGravity());

    const throughput = chartLine(
      run.stdout,
      "Throughput Process Behaviour Chart",
    );
    expect(throughput.toLowerCase()).toContain("blackout");
    expect(throughput).toContain("3 Oct");
    expect(signalsIn(throughput)).toEqual([]);
  });

  // @error @real-io @contract-shape:bounded-change
  // Pending until lh reads Process Behaviour Charts.
  it.skip("titles the charts in the instance's own words", async () => {
    const lighthouse = await gravitysLighthouse(
      {},
      {
        "GET /terminology/all": {
          status: 200,
          body: terminology(EVERY_TERM_RENAMED),
        },
      },
    );

    const run = await priyaRuns(lighthouse, chartsOfGravity());

    for (const title of [
      "Flow Rate Process Behaviour Chart",
      "Ongoing Work Process Behaviour Chart",
      "Total Ticket Age Process Behaviour Chart",
      "Flow Time Process Behaviour Chart",
      "Arrivals Process Behaviour Chart",
    ]) {
      expect(chartLine(run.stdout, title)).toContain("No signals");
    }
  });

  // @error @real-io @contract-shape:bounded-change
  // Pending until lh reads Process Behaviour Charts.
  it.skip("shows the other charts when one cannot be read", async () => {
    const lighthouse = await gravitysLighthouse(
      {},
      { "GET /teams/3/metrics/cycleTime/pbc": { status: 500 } },
    );

    const run = await priyaRuns(lighthouse, chartsOfGravity());

    expect(
      chartLine(run.stdout, "Throughput Process Behaviour Chart"),
    ).toContain("No signals");
    expect(
      chartLine(run.stdout, "Cycle Time Process Behaviour Chart"),
    ).not.toContain("No signals");
  });
});
