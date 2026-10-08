// Team Gravity on the morning of Thursday 8 October 2026, just before its daily: what Lighthouse answers for
// the Work Items in progress, their SLE Risk and the Process Behaviour Charts, in the shapes the server
// sends. Gravity's SLE is 7 days at 85% and its System WIP Limit is 6. Team Voyager has neither, no
// Refinement cadence and no chart baseline.

import { aTeam, aWorkItem } from "./lighthouseAnswers";

export const linkOf = (referenceId: string): string =>
  `https://northwind.atlassian.net/browse/${referenceId}`;

export const gravityBeforeTheDaily = (facts: Record<string, unknown> = {}) =>
  aTeam({
    serviceLevelExpectationRange: 7,
    serviceLevelExpectationProbability: 85,
    systemWIPLimit: 6,
    ...facts,
  });

export const voyager = (facts: Record<string, unknown> = {}) =>
  aTeam({
    name: "Voyager",
    id: 6,
    serviceLevelExpectationRange: 0,
    serviceLevelExpectationProbability: 0,
    systemWIPLimit: 0,
    ...facts,
  });

const inProgress = (
  referenceId: string,
  name: string,
  workItemAge: number,
  facts: Record<string, unknown> = {},
) =>
  aWorkItem({
    id: Number(referenceId.slice(3)),
    referenceId,
    name,
    url: linkOf(referenceId),
    workItemAge,
    ...facts,
  });

/** Eight in progress against a limit of six; GR-061 has been Blocked since Monday. */
export const gravitysWorkInProgressToday = () => [
  inProgress("GR-058", "Fleet map tiles", 9),
  inProgress("GR-061", "Sensor calibration import", 6, {
    isBlocked: true,
    blockedSince: "2026-10-05T08:00:00Z",
  }),
  inProgress("GR-063", "Alert digest email", 5, { state: "Review" }),
  inProgress("GR-064", "Retry failed Jira sync", 4),
  inProgress("GR-065", "Dive log filters", 3),
  inProgress("GR-066", "Crew roster import", 2),
  inProgress("GR-067", "Hull telemetry labels", 2),
  inProgress("GR-068", "Pressure alarm sound", 1),
];

/** The same Work Items from a Lighthouse that does not yet say whether a Work Item is Blocked. */
export const workInProgressWithoutBlockedFacts = () =>
  gravitysWorkInProgressToday().map(
    ({ isBlocked: _isBlocked, blockedSince: _blockedSince, ...item }) => item,
  );

const risk = (
  referenceId: string,
  percent: number,
  finishedItemsStillOpenAtThisAge: number,
  finishedItemsThatWentOnToMiss: number | null,
) => ({
  referenceId,
  risk: percent,
  finishedItemsStillOpenAtThisAge,
  finishedItemsThatWentOnToMiss,
});

/** GR-058 is past the SLE, GR-061 is at 78%, GR-063 just under the line at 55%. Listed as the server lists them. */
export const gravitysSleRisk = () => [
  risk("GR-063", 55, 11, 6),
  risk("GR-058", 100, 11, null),
  risk("GR-061", 78, 9, 7),
  risk("GR-064", 30, 20, 6),
  risk("GR-065", 12, 25, 3),
  risk("GR-066", 8, 25, 2),
  risk("GR-067", 8, 25, 2),
  risk("GR-068", 3, 40, 1),
];

/** Three Work Items on either side of the 70% line, for where "at risk" starts. */
export const sleRiskAroundTheLine = () => [
  risk("GR-058", 70, 10, 7),
  risk("GR-061", 70, 10, 7),
  risk("GR-063", 69, 13, 9),
];

export type ChartDay = {
  readonly day: string;
  readonly value: number;
  readonly causes?: readonly string[];
  readonly blackout?: boolean;
};

const WEEK_BEFORE_THE_DAILY = [
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
];

/** A chart over Fri 2 Oct – Thu 8 Oct as the server sends it: limits from a baseline, every day inside them. */
export const aChart = (
  facts: Record<string, unknown> = {},
  days: readonly ChartDay[] = WEEK_BEFORE_THE_DAILY.map((day) => ({
    day,
    value: 3,
  })),
) => ({
  status: "Ready",
  statusReason: "",
  xAxisKind: "Date",
  average: 3,
  upperNaturalProcessLimit: 6,
  lowerNaturalProcessLimit: 0,
  baselineConfigured: true,
  dataPoints: days.map((entry) => ({
    xValue: entry.day,
    yValue: entry.value,
    specialCauses: entry.causes ?? ["None"],
    workItemIds: [],
    isBlackout: entry.blackout ?? false,
  })),
  ...facts,
});

const week = (
  overrides: Readonly<Record<string, Partial<Omit<ChartDay, "day">>>>,
  usualValue = 3,
): ChartDay[] =>
  WEEK_BEFORE_THE_DAILY.map((day) => ({
    day,
    value: overrides[day]?.value ?? usualValue,
    causes: overrides[day]?.causes,
    blackout: overrides[day]?.blackout,
  }));

/** Total Work Item Age above the upper limit on Wed 7 and Thu 8 October. */
export const totalAgeWithALargeChange = () =>
  aChart(
    { average: 30, upperNaturalProcessLimit: 45, lowerNaturalProcessLimit: 15 },
    week(
      {
        "2026-10-07": { value: 52, causes: ["LargeChange"] },
        "2026-10-08": { value: 55, causes: ["LargeChange"] },
      },
      30,
    ),
  );

/** Throughput with Sat 3 October a blackout day; the server still flagged a cause on it. */
export const throughputWithABlackoutDay = () =>
  aChart(
    {},
    week({
      "2026-10-03": { value: 0, causes: ["LargeChange"], blackout: true },
    }),
  );

/** A chart whose limits come from the range shown, because no baseline is set. */
export const chartWithoutABaseline = () =>
  aChart(
    { baselineConfigured: false },
    week({ "2026-10-08": { value: 9, causes: ["LargeChange"] } }),
  );

/** A chart Lighthouse could not compute: too few days to set limits from. */
export const chartNotReady = () => ({
  status: "InsufficientData",
  statusReason: "At least 15 days of data are needed to compute the limits.",
  xAxisKind: "Date",
  average: 0,
  upperNaturalProcessLimit: 0,
  lowerNaturalProcessLimit: 0,
  baselineConfigured: true,
  dataPoints: [],
});

/** A chart from a Lighthouse that predates blackout flags and the baseline field. */
export const chartFromAnOlderLighthouse = () => {
  const {
    baselineConfigured: _baselineConfigured,
    dataPoints,
    ...chart
  } = totalAgeWithALargeChange();
  return {
    ...chart,
    dataPoints: dataPoints.map(
      ({ isBlackout: _isBlackout, ...point }) => point,
    ),
  };
};

/** A chart whose causes arrive as numbers, as a server without string enums would send them. */
export const chartWithCausesAsNumbers = () => {
  const chart = totalAgeWithALargeChange();
  return {
    ...chart,
    dataPoints: chart.dataPoints.map((point) => ({
      ...point,
      specialCauses: point.specialCauses.map((cause) =>
        cause === "LargeChange" ? 1 : 0,
      ),
    })),
  };
};

/** The server route each chart type is read from, for a Team and for a Portfolio. */
export const TEAM_CHART_ROUTES = [
  "throughput/pbc",
  "arrivals/pbc",
  "wipOverTime/pbc",
  "totalWorkItemAge/pbc",
  "cycleTime/pbc",
] as const;

export const PORTFOLIO_CHART_ROUTES = [
  ...TEAM_CHART_ROUTES,
  "featureSize/pbc",
] as const;
