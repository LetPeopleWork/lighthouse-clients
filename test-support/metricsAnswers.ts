// What Lighthouse answers to each metrics read for Team Gravity between Mon 7 Sep and Tue 6 Oct 2026
// (30 days), in the shapes the server sends (cli-sketches §2–§4). Keyed by the client method that reads it.

import { type Answer, aWorkItem, ok } from "./lighthouseAnswers";

export const GRAVITYS_RANGE = [
  "--start-date",
  "2026-09-07",
  "--end-date",
  "2026-10-06",
];

const DAYS = 30;

const dayOf = (offset: number): string => {
  const day = new Date(Date.UTC(2026, 8, 7 + offset));
  return day.toISOString().slice(0, 10);
};

// A run chart: one entry per day offset, each a list of the Work Items counted that day.
const runChart = (counts: readonly number[]) => {
  const workItemsPerUnitOfTime = Object.fromEntries(
    counts.map((count, offset) => [
      String(offset),
      Array.from({ length: count }, (_, index) =>
        aWorkItem({ id: 1000 + offset * 10 + index }),
      ),
    ]),
  );
  return {
    workItemsPerUnitOfTime,
    history: counts.length,
    daysWithThroughput: counts.filter((count) => count > 0).length,
    total: counts.reduce((sum, count) => sum + count, 0),
  };
};

// 31 closed: 2, 0, 1 on the first three days, 3 on the last.
export const THROUGHPUT_PER_DAY = [
  2,
  0,
  1,
  ...Array.from({ length: 26 }, (_, index) => (index === 13 ? 0 : 1)),
  3,
];

// 28 started.
export const ARRIVALS_PER_DAY = [
  1,
  1,
  0,
  ...Array.from({ length: 26 }, (_, index) => (index < 24 ? 1 : 0)),
  2,
];

export const WIP_PER_DAY = Array.from({ length: DAYS }, (_, index) =>
  index === DAYS - 1 ? 9 : 7,
);

export const gravitysWorkInProgress = () => [
  aWorkItem({
    isBlocked: true,
    blockedSince: "2026-10-01T08:00:00Z",
  }),
  aWorkItem({
    name: "Retry failed Jira sync",
    id: 64,
    referenceId: "GR-064",
    state: "Review",
    workItemAge: 9,
  }),
  aWorkItem({
    name: "Show SLE on the refinement tab",
    id: 66,
    referenceId: "GR-066",
    workItemAge: 6,
    isBlocked: true,
    blockedSince: "2026-10-05T08:00:00Z",
  }),
  ...Array.from({ length: 6 }, (_, index) =>
    aWorkItem({
      name: `Polish item ${index + 1}`,
      id: 70 + index,
      referenceId: `GR-07${index}`,
      workItemAge: 2 + index,
    }),
  ),
];

const percentiles = (p50: number, p70: number, p85: number, p95: number) => [
  { percentile: 50, value: p50 },
  { percentile: 70, value: p70 },
  { percentile: 85, value: p85 },
  { percentile: 95, value: p95 },
];

const recordedDays = (count: number, firstOffset: number) =>
  Array.from({ length: count }, (_, index) => dayOf(firstOffset + index));

// 29 recorded days of Cycle Time percentiles: 14 days at the 85th on Mon 7 Sep, 12 on Tue 6 Oct.
export const percentilesHistory = () =>
  [dayOf(0), ...recordedDays(27, 2), dayOf(29)].map(
    (recordedAt, index, all) => ({
      recordedAt,
      metricType: "CycleTime",
      p50: index === all.length - 1 ? 5 : 6,
      p70: index === all.length - 1 ? 8 : 9,
      p85: index === 0 ? 14 : index === all.length - 1 ? 12 : 13,
      p95: index === all.length - 1 ? 21 : 23,
    }),
  );

export const processBehaviorHistory = () =>
  [dayOf(0), ...recordedDays(27, 2), dayOf(29)].map(
    (recordedAt, index, all) => ({
      recordedAt,
      lnpl: 0,
      average: index === all.length - 1 ? 1.0 : 1.1,
      unpl: index === all.length - 1 ? 3.1 : 3.4,
    }),
  );

export const blockedHistory = () =>
  recordedDays(DAYS, 0).map((recordedAt, index) => ({
    recordedAt,
    blockedCount: index === DAYS - 1 ? 2 : 1,
  }));

export const totalAgeHistory = () => ({
  startDate: "2026-09-07",
  endDate: "2026-10-06",
  daily: recordedDays(DAYS, 0).map((date, index) => ({
    date,
    totalAge: index === DAYS - 1 ? 84 : 61 + (index % 5),
    itemCount: index === DAYS - 1 ? 9 : 7,
  })),
});

export const workItemAgeHistory = () => ({
  startDate: "2026-09-07",
  endDate: "2026-10-06",
  daily: recordedDays(DAYS, 0).map((date, index) => ({
    date,
    items: [
      {
        id: 61,
        name: "Export flow report as PDF",
        referenceId: "GR-061",
        age: 6 + index,
      },
      { id: 64, name: "Retry failed Jira sync", referenceId: "GR-064", age: 2 },
    ],
  })),
});

// The Time in State bar, sent in an order that is not the workflow's.
export const gravitysTimeInState = () => ({
  states: [
    {
      state: "Review",
      workflowOrder: 3,
      totalDays: 88,
      completedContributionDays: 70,
      ongoingContributionDays: 18,
      itemCount: 27,
      completedItemCount: 21,
      ongoingItemCount: 6,
      meanDays: 3.26,
      medianDays: 2,
    },
    {
      state: "To Do",
      workflowOrder: 1,
      totalDays: 96,
      completedContributionDays: 60,
      ongoingContributionDays: 36,
      itemCount: 18,
      completedItemCount: 12,
      ongoingItemCount: 6,
      meanDays: 5.33,
      medianDays: 4,
    },
    {
      state: "Test",
      workflowOrder: 4,
      totalDays: 61,
      completedContributionDays: 55,
      ongoingContributionDays: 6,
      itemCount: 23,
      completedItemCount: 20,
      ongoingItemCount: 3,
      meanDays: 2.66,
      medianDays: null,
    },
    {
      state: "In Progress",
      workflowOrder: 2,
      totalDays: 241,
      completedContributionDays: 190,
      ongoingContributionDays: 51,
      itemCount: 31,
      completedItemCount: 22,
      ongoingItemCount: 9,
      meanDays: 7.77,
      medianDays: 6,
    },
  ],
});

// The picker's list: 42 Work Items in the range.
export const timeInStateCandidates = () => ({
  items: Array.from({ length: 42 }, (_, index) => ({
    workItemId: 40 + index,
    referenceId: `GR-0${40 + index}`,
    title: `Backlog item ${index + 1}`,
    workItemType: "User Story",
  })),
});

export const reviewsContributors = () => ({
  state: "Review",
  items: [
    {
      workItemId: 64,
      referenceId: "GR-064",
      title: "Retry failed Jira sync",
      type: "User Story",
      state: "Review",
      stateCategory: "Doing",
      url: null,
      daysContributed: 6,
    },
    {
      workItemId: 58,
      referenceId: "GR-058",
      title: "Burn-up chart legend wraps",
      type: "Bug",
      state: "Done",
      stateCategory: "Done",
      url: null,
      daysContributed: 4,
    },
  ],
});

export const closedWorkItems = () => [
  aWorkItem({
    name: 'Rename "Sprint" to "Iteration"',
    id: 52,
    referenceId: "GR-052",
    state: "Done",
    stateCategory: "Done",
    cycleTime: 3,
    closedDate: "2026-09-07T10:00:00Z",
  }),
  aWorkItem({
    name: "Fix forecast tooltip overflow",
    id: 55,
    referenceId: "GR-055",
    state: "Done",
    stateCategory: "Done",
    cycleTime: 11,
    closedDate: "2026-09-09T10:00:00Z",
  }),
];

// Every read the metrics command makes for a Team, answered as on the dashboard.
export const gravitysMetrics = (
  overrides: Readonly<Record<string, Answer>> = {},
): Readonly<Record<string, Answer>> => ({
  getTeamThroughput: ok(runChart(THROUGHPUT_PER_DAY)),
  getTeamArrivals: ok(runChart(ARRIVALS_PER_DAY)),
  getTeamWipOverTime: ok(runChart(WIP_PER_DAY)),
  getTeamWip: ok(gravitysWorkInProgress()),
  getTeamCycleTimePercentiles: ok(percentiles(5, 8, 12, 21)),
  getTeamCycleTimeData: ok(closedWorkItems()),
  getTeamPredictabilityScore: ok({
    predictabilityScore: 0.634,
    forecastResults: { "20": 1, "24": 2, "27": 3, "31": 4 },
    percentiles: percentiles(31, 27, 24, 20),
  }),
  getTeamWorkItemAgeOverTime: ok(workItemAgeHistory()),
  getTeamWorkItemAgePercentiles: ok(percentiles(3, 6, 11, 18)),
  getTeamTotalWorkItemAgeOverTime: ok(totalAgeHistory()),
  getTeamCumulativeStateTime: ok(gravitysTimeInState()),
  getTeamCumulativeStateTimeCandidates: ok(timeInStateCandidates()),
  getTeamCumulativeStateTimeItems: ok(reviewsContributors()),
  getTeamBlockedCountHistory: ok(blockedHistory()),
  getTeamPercentilesOverTime: ok(percentilesHistory()),
  getTeamProcessBehaviorOverTime: ok(processBehaviorHistory()),
  ...overrides,
});

// Ocean Explorer over Thu 9 Jul – Tue 6 Oct 2026 (90 days): the same reads, on the Portfolio side.
export const oceanExplorersMetrics = (
  overrides: Readonly<Record<string, Answer>> = {},
): Readonly<Record<string, Answer>> => {
  const asPortfolio = Object.entries(gravitysMetrics()).map(
    ([method, answer]) => [method.replace("getTeam", "getPortfolio"), answer],
  );
  return {
    ...Object.fromEntries(asPortfolio),
    getPortfolioThroughput: ok(
      runChart([
        ...Array.from({ length: 89 }, (_, index) => (index % 13 === 0 ? 1 : 0)),
        0,
      ]),
    ),
    getPortfolioWip: ok(
      gravitysWorkInProgress()
        .slice(0, 4)
        .map((item) => ({ ...item, type: "Feature", isBlocked: false })),
    ),
    ...overrides,
  };
};

export const OCEAN_EXPLORERS_RANGE = [
  "--start-date",
  "2026-07-09",
  "--end-date",
  "2026-10-06",
];
