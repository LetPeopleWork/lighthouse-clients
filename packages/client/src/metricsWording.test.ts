import { describe, expect, it } from "vitest";
import {
  daysInRange,
  describeArrivalsDays,
  describeAsOfHeading,
  describeBlockedDays,
  describeBlockedNow,
  describeBlockedOverTime,
  describeCycleTimeDays,
  describeInProgressNow,
  describeMetricSummary,
  describeMetricsHeading,
  describePercentileRows,
  describePercentilesOverTimeDays,
  describePredictabilityScore,
  describePredictabilityScoreDays,
  describeProcessBehaviorOverTime,
  describeProcessBehaviorOverTimeDays,
  describeThroughputDays,
  describeTimeInState,
  describeTimeInStateContributorDays,
  describeTimeInStateDays,
  describeTotalThroughput,
  describeTotalWorkItemAge,
  describeTotalWorkItemAgeDays,
  describeWhatWipLeavesUnsaid,
  describeWipDays,
  describeWorkItemAgeDays,
  describeWorkItemAgePercentiles,
  metricsHeadlineLabel,
  NO_DATA_YET,
  OVER_TIME_EMPTY_SENTENCE,
  ordinalOf,
  PREDICTABILITY_SCORE_EXPLANATION,
  readArrivals,
  readBlocked,
  readCumulativeStateTime,
  readCycleTime,
  readCycleTimeDefinitionName,
  readInProgressItems,
  readMetricAnswer,
  readMetricsSubject,
  readPercentilesOverTime,
  readPredictabilityScore,
  readProcessBehaviorOverTime,
  readRunChart,
  readSystemWipLimit,
  readThroughput,
  readTimeInStateBar,
  readTimeInStateContributors,
  readTotalWorkItemAge,
  readWip,
  readWorkItemAge,
  readWorkItemAgePercentiles,
  timeInStateItemCount,
} from "./metricsWording";
import { SEEDED_TERMS } from "./terminology";

const RANGE = { startDate: "2026-09-07", endDate: "2026-10-06" };

const TEAM_SETTINGS = {
  name: "Gravity",
  cycleTimeDefinitions: [
    { id: 3, name: "Dev Time", startState: "Doing", endState: "Review" },
    { id: 4, name: "Lead Time", startState: "To Do", endState: "Done" },
  ],
};

const chart = () => ({
  ...RANGE,
  total: 31,
  daily: [{ date: "2026-09-07", count: 2 }],
});

const states = () => ({
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
  ],
});

// Each section of the metrics composite, in the shape the CLI builds it, and a fact it cannot be stated without.
const SECTIONS: readonly {
  readonly name: string;
  readonly read: (value: unknown) => unknown;
  readonly sample: () => Record<string, unknown>;
  readonly required: readonly (string | number)[];
}[] = [
  {
    name: "throughput",
    read: readThroughput,
    sample: chart,
    required: ["total"],
  },
  {
    name: "arrivals",
    read: readArrivals,
    sample: chart,
    required: ["daily", 0, "count"],
  },
  {
    name: "wip",
    read: readWip,
    sample: () => ({
      current: {
        asOfDate: "2026-10-06",
        count: 1,
        items: [{ id: 61, isBlocked: true }],
      },
      overTime: { ...RANGE, daily: [] },
    }),
    required: ["current", "count"],
  },
  {
    name: "cycleTime",
    read: readCycleTime,
    sample: () => ({
      percentiles: { values: [{ percentile: 85, value: 12 }] },
      closedItems: { items: [{ id: 52, name: "Rename" }] },
    }),
    required: ["percentiles", "values", 0, "value"],
  },
  {
    name: "workItemAgePercentiles",
    read: readWorkItemAgePercentiles,
    sample: () => ({ values: [{ percentile: 85, value: 11 }] }),
    required: ["values", 0, "percentile"],
  },
  {
    name: "workItemAge",
    read: readWorkItemAge,
    sample: () => ({
      ...RANGE,
      daily: [
        {
          date: "2026-09-07",
          items: [{ id: 61, name: "Export", referenceId: "GR-061", age: 6 }],
        },
      ],
    }),
    required: ["daily", 0, "items", 0, "age"],
  },
  {
    name: "totalWorkItemAge",
    read: readTotalWorkItemAge,
    sample: () => ({
      ...RANGE,
      daily: [{ date: "2026-10-06", totalAge: 84, itemCount: 9 }],
    }),
    required: ["daily"],
  },
  {
    name: "predictabilityScore",
    read: readPredictabilityScore,
    sample: () => ({ score: 0.634 }),
    required: [],
  },
  {
    name: "blocked",
    read: readBlocked,
    sample: () => ({
      ...RANGE,
      history: [{ recordedAt: "2026-09-07", blockedCount: 1 }],
    }),
    required: ["history", 0, "blockedCount"],
  },
  {
    name: "percentilesOverTime",
    read: readPercentilesOverTime,
    sample: () => ({
      ...RANGE,
      history: [
        {
          recordedAt: "2026-09-07",
          metricType: "CycleTime",
          p50: 6,
          p70: 9,
          p85: 14,
          p95: 23,
        },
      ],
    }),
    required: ["history", 0, "p85"],
  },
  {
    name: "processBehaviorOverTime",
    read: readProcessBehaviorOverTime,
    sample: () => ({
      ...RANGE,
      history: [{ recordedAt: "2026-10-06", lnpl: 0, average: 1, unpl: 3.1 }],
    }),
    required: ["history", 0, "unpl"],
  },
  {
    name: "cumulativeStateTime",
    read: readCumulativeStateTime,
    sample: () => ({
      bar: states(),
      candidates: {
        items: [
          {
            workItemId: 40,
            referenceId: "GR-040",
            title: "Work Item 1",
            workItemType: "User Story",
          },
        ],
      },
    }),
    required: ["bar", "states", 0, "totalDays"],
  },
];

const withoutPath = (
  value: Record<string, unknown>,
  path: readonly (string | number)[],
): unknown => {
  const copy = structuredClone(value);
  const parent = path
    .slice(0, -1)
    .reduce<Record<string | number, unknown>>(
      (node, key) => node[key] as Record<string | number, unknown>,
      copy,
    );
  delete parent[path[path.length - 1]];
  return copy;
};

describe("the metrics section readers", () => {
  it.each(SECTIONS)(
    "$name reads the section the CLI builds",
    ({ read, sample }) => {
      expect(read(sample())).not.toBeNull();
    },
  );

  it.each(SECTIONS.filter((section) => section.required.length > 0))(
    "$name is unreadable without a fact it cannot be stated without",
    ({ read, sample, required }) => {
      expect(read(withoutPath(sample(), required))).toBeNull();
    },
  );

  it.each(SECTIONS)(
    "$name is unreadable when it is not facts at all",
    ({ read }) => {
      expect(read("not a section")).toBeNull();
    },
  );

  it("leaves a merely absent fact undefined", () => {
    expect(readPredictabilityScore({})).toEqual({ score: undefined });
    expect(readPredictabilityScore({ score: null })).toEqual({
      score: undefined,
    });
    expect(readPredictabilityScore({ score: "high" })).toBeNull();

    const wip = readWip({
      current: { asOfDate: "2026-10-06", count: 1, items: [{ id: 61 }] },
      overTime: { ...RANGE, daily: [] },
    });
    expect(wip).toMatchObject({
      current: { items: [{ isBlocked: undefined }] },
    });

    const timeInState = readCumulativeStateTime({
      bar: states(),
      candidates: { items: [] },
    });
    expect(timeInState).toMatchObject({ items: undefined });
  });

  it("states a part Lighthouse refused, inside a section or as the whole of it", () => {
    const refusal = {
      status: "error",
      category: "forbidden",
      reason: "No access",
    };
    expect(readMetricAnswer(refusal, readThroughput)).toEqual({
      refused: "forbidden: No access",
    });
    expect(
      readCycleTime({ percentiles: refusal, closedItems: { items: [] } }),
    ).toMatchObject({ percentiles: { refused: "forbidden: No access" } });
    expect(
      readMetricAnswer(
        { status: "unavailable", reason: "Not here" },
        readBlocked,
      ),
    ).toEqual({ refused: "Not here" });
  });

  it("reads whose metrics and which days the composite is about", () => {
    expect(
      readMetricsSubject({ scope: "portfolio", id: 2, dateRange: RANGE }),
    ).toMatchObject({ scope: "portfolio", id: 2, ...RANGE });
    expect(
      readMetricsSubject({ scope: "delivery", id: 2, dateRange: RANGE }),
    ).toBeNull();
    expect(readMetricsSubject({ scope: "team", id: 2 })).toBeNull();
  });

  it("knows a System WIP Limit only when one is set", () => {
    expect(readSystemWipLimit({ systemWIPLimit: 10 })).toBe(10);
    expect(readSystemWipLimit({ systemWIPLimit: 0 })).toBeUndefined();
    expect(readSystemWipLimit(null)).toBeUndefined();
  });

  it.each([
    {
      found: "the definition with that id",
      settings: TEAM_SETTINGS,
      id: 4,
      name: "Lead Time",
    },
    {
      found: "nothing for an id the Team does not have",
      settings: TEAM_SETTINGS,
      id: 9,
      name: undefined,
    },
    {
      found: "nothing when the settings were refused",
      settings: null,
      id: 4,
      name: undefined,
    },
    {
      found: "nothing for a definition without a name",
      settings: { cycleTimeDefinitions: [{ id: 4, name: " " }] },
      id: 4,
      name: undefined,
    },
  ])("names $found", ({ settings, id, name }) => {
    expect(readCycleTimeDefinitionName(settings, id)).toBe(name);
  });
});

describe("the metrics headline wording", () => {
  it("counts both ends of the range", () => {
    expect(daysInRange("2026-09-07", "2026-10-06")).toBe(30);
    expect(daysInRange("2026-10-06", "2026-10-06")).toBe(1);
    expect(
      describeMetricsHeading(
        { startDate: "2026-10-06", endDate: "2026-10-06" },
        { terms: SEEDED_TERMS, name: "Gravity" },
      ),
    ).toBe("Gravity · Tue 6 Oct 2026 – Tue 6 Oct 2026 (1 day)");
  });

  it("leaves out a System WIP Limit that is not set, and counts Features for a Portfolio", () => {
    const now = { asOfDate: "2026-10-06", count: 4, items: [] };

    expect(describeInProgressNow(now, "team", SEEDED_TERMS, undefined)).toEqual(
      { label: "Work Items in Progress", value: "4", detail: "" },
    );
    expect(describeInProgressNow(now, "portfolio", SEEDED_TERMS, 5)).toEqual({
      label: "Features in Progress",
      value: "4",
      detail: "System WIP Limit: 5 Features",
    });
  });

  it("shows '—' for a Predictability Score Lighthouse did not send", () => {
    expect(
      describePredictabilityScore({ score: undefined }, "team", SEEDED_TERMS)
        .value,
    ).toBe("—");
    expect(
      describePredictabilityScore({ score: 0.634 }, "team", SEEDED_TERMS).value,
    ).toBe("63.4%");
  });

  it("averages the total over every day of the range, to one decimal, as the dashboard does", () => {
    expect(
      describeTotalThroughput(
        { ...RANGE, total: 31, daily: [] },
        "team",
        SEEDED_TERMS,
      ).detail,
    ).toBe("1.0 / day");
    expect(
      describeTotalThroughput(
        { startDate: "2026-07-09", endDate: "2026-10-06", total: 7, daily: [] },
        "portfolio",
        SEEDED_TERMS,
      ).detail,
    ).toBe("0.1 / day");
  });

  it("names percentiles as ordinals", () => {
    expect([1, 2, 3, 11, 12, 13, 22, 50, 95].map(ordinalOf)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "11th",
      "12th",
      "13th",
      "22nd",
      "50th",
      "95th",
    ]);
  });

  it("puts the highest percentile first and '—' where one side has none", () => {
    expect(
      describePercentileRows(
        [
          { percentile: 50, value: 1 },
          { percentile: 95, value: 21 },
        ],
        undefined,
        SEEDED_TERMS,
      ),
    ).toEqual([
      ["Percentile", "Cycle Time", "Work Item Age"],
      ["95th", "21 days", "—"],
      ["50th", "1 day", "—"],
    ]);
    expect(describePercentileRows(undefined, undefined, SEEDED_TERMS)).toEqual(
      [],
    );
  });

  it("counts blocked items only when Lighthouse says which are blocked", () => {
    const now = (items: { isBlocked: boolean | undefined }[]) => ({
      asOfDate: "2026-10-06",
      count: items.length,
      items,
    });
    expect(
      describeBlockedNow(
        now([{ isBlocked: true }, { isBlocked: false }]),
        "portfolio",
        SEEDED_TERMS,
      ),
    ).toEqual({ label: "Blocked Features", value: "1", detail: "" });
    expect(
      describeBlockedNow(now([{ isBlocked: undefined }]), "team", SEEDED_TERMS),
    ).toBeNull();
  });

  it("says one Work Item and no number for an empty age series", () => {
    expect(
      describeTotalWorkItemAge(
        {
          ...RANGE,
          daily: [{ date: "2026-10-06", totalAge: 1, itemCount: 1 }],
        },
        "team",
        SEEDED_TERMS,
      ),
    ).toEqual({
      label: "Total Work Item Age",
      value: "1 day",
      detail: "across 1 Work Item",
    });
    expect(
      describeTotalWorkItemAge({ ...RANGE, daily: [] }, "team", SEEDED_TERMS)
        .value,
    ).toBe("—");
  });

  it("summarises a series from its earliest to its latest recorded day, whatever order it came in", () => {
    expect(
      describeBlockedOverTime(
        {
          ...RANGE,
          history: [
            { recordedAt: "2026-10-06", blockedCount: 2 },
            { recordedAt: "2026-09-07", blockedCount: 1 },
          ],
        },
        "team",
        SEEDED_TERMS,
      ),
    ).toEqual({
      label: "Blocked Work Items",
      value: "1 on Mon 7 Sep → 2 on Tue 6 Oct",
      detail: "2 days recorded",
    });
    expect(
      describeBlockedOverTime(
        { ...RANGE, history: [{ recordedAt: "2026-10-06", blockedCount: 2 }] },
        "team",
        SEEDED_TERMS,
      ),
    ).toMatchObject({ value: "2 on Tue 6 Oct", detail: "1 day recorded" });
    expect(
      describeProcessBehaviorOverTime(
        { ...RANGE, history: [] },
        "team",
        SEEDED_TERMS,
      ),
    ).toMatchObject({ value: OVER_TIME_EMPTY_SENTENCE, detail: "" });
  });
});

describe("one metric, every day", () => {
  it("states Throughput's total for a Portfolio in Features, then the count of each day as Lighthouse dated it", () => {
    expect(
      describeThroughputDays(
        {
          ...RANGE,
          total: 1,
          daily: [
            { date: "2026-09-07T00:00:00Z", count: 1 },
            { date: "2026-09-08", count: 0 },
          ],
        },
        "portfolio",
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Total Throughput: 1 Feature, 0.0 / day",
      rows: [
        ["Date", "Features closed"],
        ["Mon 7 Sep 2026", "1"],
        ["Tue 8 Sep 2026", "0"],
      ],
    });
  });

  it("states Total Work Item Age as on its latest day, and says why a series with no day has no rows", () => {
    expect(
      describeTotalWorkItemAgeDays(
        {
          ...RANGE,
          daily: [
            { date: "2026-10-06", totalAge: 1, itemCount: 1 },
            { date: "2026-09-07", totalAge: 61, itemCount: 7 },
          ],
        },
        "team",
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence:
        "Total Work Item Age: 1 day across 1 Work Item on Tue 6 Oct 2026",
      rows: [
        ["Date", "Total Work Item Age", "Work Items"],
        ["Tue 6 Oct 2026", "1 day", "1"],
        ["Mon 7 Sep 2026", "61 days", "7"],
      ],
    });
    expect(
      describeTotalWorkItemAgeDays(
        { ...RANGE, daily: [] },
        "team",
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Total Work Item Age",
      note: OVER_TIME_EMPTY_SENTENCE,
    });
  });

  it("names the percentiles' horizon only when Lighthouse states it", () => {
    const snapshot = {
      recordedAt: "2026-09-07",
      metricType: "CycleTime" as const,
      p50: 1,
      p70: 2,
      p85: 3,
      p95: 4,
    };
    expect(
      describePercentilesOverTimeDays(
        { ...RANGE, horizon: 30, history: [snapshot] },
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Cycle Time over the last 30 days, per recorded day",
      rows: [
        ["Date", "50th", "70th", "85th", "95th"],
        ["Mon 7 Sep 2026", "1 day", "2 days", "3 days", "4 days"],
      ],
    });
    expect(
      describePercentilesOverTimeDays(
        { ...RANGE, horizon: undefined, history: [] },
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Cycle Time per recorded day",
      note: OVER_TIME_EMPTY_SENTENCE,
    });
  });

  it("reads the percentiles' horizon when the history carries one", () => {
    const history = { ...RANGE, history: [] };
    expect(readPercentilesOverTime({ ...history, horizon: 30 })).toEqual({
      ...history,
      horizon: 30,
    });
    expect(readPercentilesOverTime(history)).toEqual({
      ...history,
      horizon: undefined,
    });
  });

  it("lists each recorded day's process limits, the limits to one decimal and the average always with one", () => {
    expect(
      describeProcessBehaviorOverTimeDays(
        {
          ...RANGE,
          history: [
            { recordedAt: "2026-09-07", lnpl: 0, average: 1, unpl: 3.44 },
          ],
        },
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Throughput natural process limits per recorded day",
      rows: [
        ["Date", "Lower limit", "Average", "Upper limit"],
        ["Mon 7 Sep 2026", "0", "1.0", "3.4"],
      ],
    });
    expect(
      describeProcessBehaviorOverTimeDays(
        { ...RANGE, history: [] },
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Throughput natural process limits per recorded day",
      note: OVER_TIME_EMPTY_SENTENCE,
    });
  });

  it("heads a metric about now with the range's last day", () => {
    expect(
      describeAsOfHeading(
        { endDate: "2026-10-06T00:00:00Z" },
        { name: "Gravity", terms: SEEDED_TERMS },
      ),
    ).toBe("Gravity · as of Tue 6 Oct 2026");
  });

  it("states Arrivals' total, then the count started on each day", () => {
    expect(describeArrivalsDays(chart(), "team", SEEDED_TERMS)).toEqual({
      sentence: "Total Arrivals: 31 Work Items, 1.0 / day",
      rows: [
        ["Date", "Work Items started"],
        ["Mon 7 Sep 2026", "2"],
      ],
    });
  });

  it("lists the Work Items in progress oldest first, since when each blocked one is blocked, then each day's count", () => {
    const now = {
      asOfDate: "2026-10-06",
      count: 3,
      items: [
        {
          isBlocked: false,
          referenceId: "GR-064",
          name: "Retry",
          state: "Review",
          workItemAge: 9,
        },
        {
          isBlocked: true,
          referenceId: "GR-061",
          name: "Export",
          state: "In Progress",
          workItemAge: 14,
          blockedSince: "2026-10-01T08:00:00Z",
        },
        { isBlocked: true },
      ],
    };
    const overTime = { ...RANGE, daily: [{ date: "2026-10-06", count: 3 }] };

    expect(describeWipDays(now, overTime, "team", SEEDED_TERMS, 10)).toEqual({
      sentence: "Work Items in Progress: 3 (System WIP Limit: 10 Work Items)",
      tables: [
        {
          rows: [
            ["ID", "Name", "State", "Work Item Age", "Blocked"],
            [
              "GR-061",
              "Export",
              "In Progress",
              "14 days",
              "since Thu 1 Oct 2026",
            ],
            ["GR-064", "Retry", "Review", "9 days", ""],
            ["—", "—", "—", "—", "Blocked"],
          ],
        },
        {
          rows: [
            ["Date", "Work Items in Progress"],
            ["Tue 6 Oct 2026", "3"],
          ],
        },
      ],
    });
    expect(
      describeWipDays(
        { ...now, count: 0, items: [] },
        { ...RANGE, daily: [] },
        "portfolio",
        SEEDED_TERMS,
        undefined,
      ),
    ).toEqual({
      sentence: "Features in Progress: 0",
      tables: [{ note: OVER_TIME_EMPTY_SENTENCE }],
    });
  });

  it("states the Cycle Time percentiles lowest first, then each closed Work Item", () => {
    expect(
      describeCycleTimeDays(
        [
          { percentile: 95, value: 21 },
          { percentile: 50, value: 1 },
        ],
        [
          {
            id: 52,
            name: "Rename",
            referenceId: "GR-052",
            closedDate: "2026-09-07T10:00:00Z",
            cycleTime: 3,
          },
          { id: 55, name: "Fix" },
        ],
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Cycle Time Percentiles: 50th 1 day · 95th 21 days",
      tables: [
        {
          rows: [
            ["ID", "Name", "Closed", "Cycle Time"],
            ["GR-052", "Rename", "Mon 7 Sep 2026", "3 days"],
            ["—", "Fix", "—", "—"],
          ],
        },
      ],
    });
    expect(describeCycleTimeDays([], [], SEEDED_TERMS)).toEqual({
      sentence: "Cycle Time Percentiles",
      tables: [],
    });
    expect(
      describeCycleTimeDays(
        [{ percentile: 50, value: 1 }],
        [],
        SEEDED_TERMS,
        "Lead Time",
      ).sentence,
    ).toBe("Lead Time Percentiles: 50th 1 day");
  });

  it("states the Work Item Age percentiles, then each day's oldest Work Item and how many there were", () => {
    expect(
      describeWorkItemAgeDays(
        [{ percentile: 50, value: 3 }],
        {
          ...RANGE,
          daily: [
            {
              date: "2026-09-07",
              items: [
                { id: 64, name: "Retry", referenceId: "GR-064", age: 2 },
                { id: 61, name: "Export", referenceId: "GR-061", age: 6 },
              ],
            },
            { date: "2026-09-08", items: [] },
          ],
        },
        "team",
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Work Item Age Percentiles: 50th 3 days",
      rows: [
        ["Date", "Oldest", "Work Items"],
        ["Mon 7 Sep 2026", "GR-061 6 days", "2"],
        ["Tue 8 Sep 2026", "—", "0"],
      ],
    });
  });

  it("states the Predictability Score to one decimal, then the dashboard's explanation of it", () => {
    expect(
      describePredictabilityScoreDays({ score: 0.634 }, "team", SEEDED_TERMS),
    ).toEqual({
      sentence: "Predictability Score: 63.4%",
      note: PREDICTABILITY_SCORE_EXPLANATION,
    });
    expect(
      describePredictabilityScoreDays(
        { score: undefined },
        "team",
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Predictability Score: —",
      note: PREDICTABILITY_SCORE_EXPLANATION,
    });
  });

  it("states the blocked count from the first recorded day to the last, then each recorded day's count", () => {
    expect(
      describeBlockedDays(
        {
          ...RANGE,
          history: [
            { recordedAt: "2026-10-06", blockedCount: 2 },
            { recordedAt: "2026-09-07", blockedCount: 1 },
          ],
        },
        "team",
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Blocked Work Items: 1 on Mon 7 Sep → 2 on Tue 6 Oct",
      rows: [
        ["Date", "Blocked Work Items"],
        ["Tue 6 Oct 2026", "2"],
        ["Mon 7 Sep 2026", "1"],
      ],
    });
    expect(
      describeBlockedDays({ ...RANGE, history: [] }, "team", SEEDED_TERMS),
    ).toEqual({
      sentence: "Blocked Work Items",
      note: OVER_TIME_EMPTY_SENTENCE,
    });
  });

  it("reads what the day views list of a Work Item in progress and of a closed one", () => {
    const wip = readWip({
      current: {
        asOfDate: "2026-10-06",
        count: 1,
        items: [
          {
            isBlocked: true,
            referenceId: "GR-061",
            name: "Export",
            state: "In Progress",
            workItemAge: 14,
            blockedSince: "2026-10-01T08:00:00Z",
          },
        ],
      },
      overTime: { ...RANGE, daily: [] },
    });
    expect(wip?.current).toMatchObject({
      items: [
        {
          referenceId: "GR-061",
          name: "Export",
          state: "In Progress",
          workItemAge: 14,
          blockedSince: "2026-10-01T08:00:00Z",
        },
      ],
    });
    const cycleTime = readCycleTime({
      percentiles: { values: [] },
      closedItems: {
        items: [
          {
            id: 52,
            name: "Rename",
            referenceId: "GR-052",
            closedDate: "2026-09-07T10:00:00Z",
            cycleTime: 3,
          },
        ],
      },
    });
    expect(cycleTime?.closedItems).toEqual([
      {
        id: 52,
        name: "Rename",
        referenceId: "GR-052",
        closedDate: "2026-09-07T10:00:00Z",
        cycleTime: 3,
      },
    ]);
  });
});

describe("one metric as an assistant is told it", () => {
  const gravity = { name: "Gravity", terms: SEEDED_TERMS };

  it("reads a run chart as the total and each day's count, dated from the range's first day", () => {
    expect(
      readRunChart(
        {
          workItemsPerUnitOfTime: { "1": [{}, {}], "0": [{}] },
          history: 2,
          total: 3,
        },
        RANGE,
      ),
    ).toEqual({
      ...RANGE,
      total: 3,
      daily: [
        { date: "2026-09-07", count: 1 },
        { date: "2026-09-08", count: 2 },
      ],
    });
  });

  it("sums a run chart's days when Lighthouse sends no total", () => {
    expect(
      readRunChart(
        { workItemsPerUnitOfTime: { "0": [{}], "2": [{}, {}] } },
        RANGE,
      )?.total,
    ).toBe(3);
  });

  it.each([
    { shape: "no days at all", value: { total: 3 } },
    {
      shape: "a day that is not an offset",
      value: { workItemsPerUnitOfTime: { first: [] } },
    },
    {
      shape: "a day that is not a list",
      value: { workItemsPerUnitOfTime: { "0": 2 } },
    },
    { shape: "a list", value: [] },
  ])("does not read a run chart with $shape", ({ value }) => {
    expect(readRunChart(value, RANGE)).toBeNull();
  });

  it("states the Work Item Age percentiles, lowest first", () => {
    expect(
      describeWorkItemAgePercentiles(
        [
          { percentile: 85, value: 11 },
          { percentile: 50, value: 3 },
        ],
        SEEDED_TERMS,
      ),
    ).toBe("Work Item Age Percentiles: 50th 3 days · 85th 11 days");
  });

  it("gives the heading and the sentence, never the table", () => {
    const view = describeWorkItemAgeDays(
      [{ percentile: 50, value: 3 }],
      {
        ...RANGE,
        daily: [
          {
            date: "2026-10-06",
            items: [{ id: 1, name: "Export", referenceId: "GR-1", age: 4 }],
          },
        ],
      },
      "team",
      SEEDED_TERMS,
    );

    expect(
      describeMetricSummary(describeAsOfHeading(RANGE, gravity), view),
    ).toBe(
      "Gravity · as of Tue 6 Oct 2026\nWork Item Age Percentiles: 50th 3 days",
    );
  });

  it("gives the web's words where a history has no recorded day", () => {
    const view = describeBlockedDays(
      { ...RANGE, history: [] },
      "portfolio",
      SEEDED_TERMS,
    );

    expect(
      describeMetricSummary(describeMetricsHeading(RANGE, gravity), view),
    ).toBe(
      `Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)\nBlocked Features\n${OVER_TIME_EMPTY_SENTENCE}`,
    );
  });

  it("gives each note of a metric drawn as more than one table", () => {
    const view = describeWipDays(
      { asOfDate: RANGE.endDate, count: 0, items: [] },
      { ...RANGE, daily: [] },
      "team",
      SEEDED_TERMS,
      undefined,
    );

    expect(describeMetricSummary("Gravity", view).split("\n")).toEqual([
      "Gravity",
      "Work Items in Progress: 0",
      OVER_TIME_EMPTY_SENTENCE,
    ]);
  });
});

describe("Time in State", () => {
  const candidates = (count: number) => ({
    items: Array.from({ length: count }, (_, index) => ({
      workItemId: 40 + index,
      referenceId: `GR-0${40 + index}`,
      title: `Backlog item ${index + 1}`,
      workItemType: "User Story",
    })),
  });

  it("cannot be read when a state comes without its place in the workflow", () => {
    const [review] = states().states;
    const { workflowOrder: _notSent, ...unordered } = review;

    expect(
      readCumulativeStateTime({
        bar: { states: [unordered] },
        candidates: candidates(1),
      }),
    ).toBeNull();
  });

  it("is across the Work Items picked, otherwise every one offered to pick from", () => {
    const view = readCumulativeStateTime({
      bar: states(),
      candidates: candidates(42),
    });
    if (view === null) {
      throw new Error("Time in State should read");
    }

    expect(timeInStateItemCount(view, undefined)).toBe(42);
    expect(timeInStateItemCount(view, 2)).toBe(2);
    expect(
      timeInStateItemCount(
        { ...view, candidates: { refused: "forbidden: No access" } },
        undefined,
      ),
    ).toBeUndefined();
  });

  it("says on the headline how many states and across how many Work Items", () => {
    expect(describeTimeInState(states(), 42, "team", SEEDED_TERMS)).toEqual({
      label: "Time in State",
      value: "1 state",
      detail: "across 42 Work Items",
    });
    expect(
      describeTimeInState(
        { states: [...states().states, ...states().states] },
        1,
        "portfolio",
        SEEDED_TERMS,
      ),
    ).toEqual({
      label: "Time in State",
      value: "2 states",
      detail: "across 1 Feature",
    });
    expect(
      describeTimeInState(states(), undefined, "team", SEEDED_TERMS).detail,
    ).toBe("");
  });

  it("says there is no data yet when Lighthouse sends no state", () => {
    expect(
      describeTimeInStateDays(
        { states: [] },
        42,
        undefined,
        "team",
        SEEDED_TERMS,
      ),
    ).toEqual({
      sentence: "Time in State across 42 Work Items",
      tables: [{ note: NO_DATA_YET }],
    });
    expect(NO_DATA_YET).toBe("No data yet.");
  });

  it("titles the Work Items contributing to a state, and says when none did", () => {
    const view = describeTimeInStateDays(
      states(),
      undefined,
      { state: "Review", items: [] },
      "team",
      SEEDED_TERMS,
    );

    expect(view).toMatchObject({
      sentence: "Time in State",
      tables: [
        { rows: [expect.any(Array), expect.any(Array)] },
        { title: "Work Items contributing to Review", note: NO_DATA_YET },
      ],
    });
  });

  it("tells an assistant the bar as its heading and one sentence, without a count it was not given", () => {
    expect(
      describeMetricSummary(
        "Gravity",
        describeTimeInStateDays(
          states(),
          undefined,
          undefined,
          "team",
          SEEDED_TERMS,
        ),
      ),
    ).toBe("Gravity\nTime in State");
  });

  it("tells an assistant one state's drill-down by the dialog's title, and when none contributed", () => {
    const contributors = (items: readonly unknown[]) =>
      readTimeInStateContributors({ state: "Review", items });
    const someone = contributors([
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
    ]);
    const nobody = contributors([]);
    if (someone === null || nobody === null) {
      throw new Error("the drill-down should read");
    }

    expect(
      describeMetricSummary(
        "Ocean Explorer",
        describeTimeInStateContributorDays(someone, "portfolio", SEEDED_TERMS),
      ),
    ).toBe("Ocean Explorer\nFeatures contributing to Review");
    expect(
      describeMetricSummary(
        "Gravity",
        describeTimeInStateContributorDays(nobody, "team", SEEDED_TERMS),
      ),
    ).toBe(`Gravity\nWork Items contributing to Review\n${NO_DATA_YET}`);
  });

  it("reads the bar on its own and refuses one whose state has no place in the workflow", () => {
    const [review] = states().states;
    const { workflowOrder: _notSent, ...unordered } = review;

    expect(readTimeInStateBar(states())).toEqual(states());
    expect(readTimeInStateBar({ states: [unordered] })).toBeNull();
  });
});

// Sets one fact deep inside a sample, so each case below breaks exactly one thing a reader checks.
const withAt = (
  value: Record<string, unknown>,
  path: readonly (string | number)[],
  replacement: unknown,
): unknown => {
  const copy = structuredClone(value);
  const parent = path
    .slice(0, -1)
    .reduce<Record<string | number, unknown>>(
      (node, key) => node[key] as Record<string | number, unknown>,
      copy,
    );
  parent[path[path.length - 1]] = replacement;
  return copy;
};

const sampleOf = (name: string): Record<string, unknown> => {
  const section = SECTIONS.find((candidate) => candidate.name === name);
  if (section === undefined) {
    throw new Error(`no sample for ${name}`);
  }
  return section.sample();
};

const contributors = () => ({
  state: "Review",
  items: [
    {
      workItemId: 40,
      referenceId: "GR-040",
      title: "Work Item 1",
      type: "User Story",
      state: "Review",
      stateCategory: "Doing",
      url: null,
      daysContributed: 4,
    },
  ],
});

describe("what each metrics section must look like to be read", () => {
  it.each(SECTIONS)(
    "$name is unreadable when it is nothing at all",
    ({ read }) => {
      expect(read(null)).toBeNull();
    },
  );

  it.each<[string, string, readonly (string | number)[], unknown]>([
    ["throughput", "a day that is not one", ["daily", 0], null],
    ["throughput", "no first day", ["startDate"], undefined],
    ["throughput", "no last day", ["endDate"], "someday"],
    ["wip", "no answer for today", ["current"], null],
    ["wip", "today without its day", ["current", "asOfDate"], undefined],
    ["wip", "today's Work Items not a list", ["current", "items"], "items"],
    [
      "wip",
      "a blocked flag that is not a yes or no",
      ["current", "items", 0, "isBlocked"],
      "yes",
    ],
    ["wip", "no readable days", ["overTime"], "days"],
    [
      "wip",
      "days without their first day",
      ["overTime", "startDate"],
      undefined,
    ],
    [
      "cycleTime",
      "a closed Work Item that is not one",
      ["closedItems", "items", 0],
      null,
    ],
    [
      "cycleTime",
      "a closed Work Item without a numeric id",
      ["closedItems", "items", 0, "id"],
      "52",
    ],
    [
      "cycleTime",
      "a closed Work Item without its name",
      ["closedItems", "items", 0, "name"],
      5,
    ],
    [
      "cycleTime",
      "closed Work Items in no known shape",
      ["closedItems"],
      "items",
    ],
    ["workItemAge", "a day that is not one", ["daily", 0], null],
    ["workItemAge", "a day without its date", ["daily", 0, "date"], undefined],
    [
      "workItemAge",
      "a Work Item that is not one",
      ["daily", 0, "items", 0],
      null,
    ],
    [
      "workItemAge",
      "a Work Item without a numeric id",
      ["daily", 0, "items", 0, "id"],
      "61",
    ],
    [
      "workItemAge",
      "a Work Item without its name",
      ["daily", 0, "items", 0, "name"],
      5,
    ],
    [
      "workItemAge",
      "a Work Item without its reference",
      ["daily", 0, "items", 0, "referenceId"],
      5,
    ],
    ["workItemAge", "no first day", ["startDate"], undefined],
    ["workItemAge", "no last day", ["endDate"], undefined],
    ["totalWorkItemAge", "a day that is not one", ["daily", 0], null],
    [
      "totalWorkItemAge",
      "a day without its date",
      ["daily", 0, "date"],
      undefined,
    ],
    [
      "totalWorkItemAge",
      "a day without its total age",
      ["daily", 0, "totalAge"],
      "84",
    ],
    [
      "totalWorkItemAge",
      "a day without its Work Item count",
      ["daily", 0, "itemCount"],
      undefined,
    ],
    ["blocked", "a recorded day that is not one", ["history", 0], null],
    [
      "blocked",
      "a recorded day without its date",
      ["history", 0, "recordedAt"],
      "today",
    ],
    ["blocked", "no first day", ["startDate"], undefined],
    ["blocked", "no last day", ["endDate"], undefined],
    [
      "percentilesOverTime",
      "a recorded day that is not one",
      ["history", 0],
      null,
    ],
    [
      "percentilesOverTime",
      "a recorded day without its date",
      ["history", 0, "recordedAt"],
      undefined,
    ],
    [
      "percentilesOverTime",
      "a family Lighthouse does not record",
      ["history", 0, "metricType"],
      "Throughput",
    ],
    [
      "percentilesOverTime",
      "no 50th percentile",
      ["history", 0, "p50"],
      undefined,
    ],
    ["percentilesOverTime", "no 70th percentile", ["history", 0, "p70"], "9"],
    ["percentilesOverTime", "no 95th percentile", ["history", 0, "p95"], null],
    [
      "processBehaviorOverTime",
      "a recorded day that is not one",
      ["history", 0],
      null,
    ],
    [
      "processBehaviorOverTime",
      "a recorded day without its date",
      ["history", 0, "recordedAt"],
      undefined,
    ],
    [
      "cumulativeStateTime",
      "a state that is not one",
      ["bar", "states", 0],
      null,
    ],
    [
      "cumulativeStateTime",
      "a state without its name",
      ["bar", "states", 0, "state"],
      3,
    ],
    [
      "cumulativeStateTime",
      "a median that is not a number",
      ["bar", "states", 0, "medianDays"],
      "2",
    ],
    [
      "cumulativeStateTime",
      "candidates in no known shape",
      ["candidates"],
      "items",
    ],
    [
      "cumulativeStateTime",
      "a candidate that is not one",
      ["candidates", "items", 0],
      null,
    ],
    [
      "cumulativeStateTime",
      "a candidate without a numeric id",
      ["candidates", "items", 0, "workItemId"],
      "40",
    ],
    [
      "cumulativeStateTime",
      "a candidate without its reference",
      ["candidates", "items", 0, "referenceId"],
      undefined,
    ],
    [
      "cumulativeStateTime",
      "a candidate without its title",
      ["candidates", "items", 0, "title"],
      undefined,
    ],
    [
      "cumulativeStateTime",
      "a candidate without its type",
      ["candidates", "items", 0, "workItemType"],
      undefined,
    ],
  ])("%s is unreadable with %s", (name, _case, path, replacement) => {
    const section = SECTIONS.find((candidate) => candidate.name === name);

    expect(section?.read(withAt(sampleOf(name), path, replacement))).toBeNull();
  });

  it("reads a Work Item Age percentile history as well as a Cycle Time one", () => {
    expect(
      readPercentilesOverTime(
        withAt(
          sampleOf("percentilesOverTime"),
          ["history", 0, "metricType"],
          "WorkItemAge",
        ),
      ),
    ).not.toBeNull();
  });

  it("reads the Work Items the bar can be narrowed to as they came", () => {
    const sample = sampleOf("cumulativeStateTime");

    expect(readCumulativeStateTime(sample)?.candidates).toEqual(
      sample.candidates,
    );
  });

  it("reads one state's contributors, and none with any fact of a contributor missing or mistyped", () => {
    expect(readTimeInStateContributors(contributors())).toEqual(contributors());
    expect(
      readTimeInStateContributors(
        withAt(contributors(), ["items", 0, "url"], "https://x"),
      ),
    ).not.toBeNull();
    expect(readTimeInStateContributors(null)).toBeNull();
    expect(
      readTimeInStateContributors(withAt(contributors(), ["state"], undefined)),
    ).toBeNull();
    expect(
      readTimeInStateContributors(withAt(contributors(), ["items"], "items")),
    ).toBeNull();
    for (const [field, replacement] of [
      [0, null],
      ["workItemId", "40"],
      ["referenceId", undefined],
      ["title", undefined],
      ["type", undefined],
      ["state", undefined],
      ["stateCategory", undefined],
      ["url", 5],
      ["daysContributed", "4"],
    ] as const) {
      const path = field === 0 ? ["items", 0] : ["items", 0, field];
      expect(
        readTimeInStateContributors(withAt(contributors(), path, replacement)),
      ).toBeNull();
    }
  });

  it("reads no Time in State when the drill-down asked for is unreadable", () => {
    expect(
      readCumulativeStateTime({
        ...sampleOf("cumulativeStateTime"),
        items: "items",
      }),
    ).toBeNull();
  });

  it("reads a run chart only when every day is keyed by a whole offset", () => {
    expect(
      readRunChart({ workItemsPerUnitOfTime: { x1: [] } }, RANGE),
    ).toBeNull();
    expect(
      readRunChart({ workItemsPerUnitOfTime: { "1x": [] } }, RANGE),
    ).toBeNull();
  });

  it("takes no refusal from a part that is not one", () => {
    const notRead = () => null;

    expect(readMetricAnswer(null, notRead)).toBeNull();
    expect(readMetricAnswer({ status: "error" }, notRead)).toBeNull();
    expect(readMetricAnswer({ reason: "Not here" }, notRead)).toBeNull();
  });

  it("knows a System WIP Limit of one", () => {
    expect(readSystemWipLimit({ systemWIPLimit: 1 })).toBe(1);
  });

  it("names no definition whose name is not text", () => {
    expect(
      readCycleTimeDefinitionName(
        { cycleTimeDefinitions: [{ id: 4, name: 5 }] },
        4,
      ),
    ).toBeUndefined();
  });
});

describe("the metrics wording at its edges", () => {
  it("labels the percentile and Work Item Age parts in the instance's words", () => {
    const terms = {
      ...SEEDED_TERMS,
      cycleTime: "Lead Time",
      workItemAge: "Ticket Age",
    };

    expect(metricsHeadlineLabel("cycleTimePercentiles", "team", terms)).toBe(
      "Lead Time percentiles",
    );
    expect(metricsHeadlineLabel("workItemAgePercentiles", "team", terms)).toBe(
      "Ticket Age percentiles",
    );
    expect(metricsHeadlineLabel("workItemAge", "team", terms)).toBe(
      "Ticket Age over time",
    );
  });

  it("counts the days of a range given as midnight timestamps", () => {
    expect(daysInRange("2026-09-07T00:00:00Z", "2026-10-06T00:00:00Z")).toBe(
      30,
    );
  });

  it("counts the blocked Work Items when only some say whether they are", () => {
    expect(
      describeBlockedNow(
        {
          asOfDate: "2026-10-06",
          count: 2,
          items: [{ isBlocked: true }, { isBlocked: undefined }],
        },
        "team",
        SEEDED_TERMS,
      ),
    ).toEqual({ label: "Blocked Work Items", value: "1", detail: "" });
  });

  it("leaves nothing beside a Total Work Item Age that has no recorded day", () => {
    expect(
      describeTotalWorkItemAge({ ...RANGE, daily: [] }, "team", SEEDED_TERMS),
    ).toEqual({ label: "Total Work Item Age", value: "—", detail: "" });
  });

  it("lists the Work Items in progress oldest first, the ones without an age last", () => {
    const item = (referenceId: string, workItemAge?: number) => ({
      isBlocked: false,
      referenceId,
      name: referenceId,
      state: "Doing",
      workItemAge,
    });
    const view = describeWipDays(
      {
        asOfDate: "2026-10-06",
        count: 5,
        items: [
          item("GR-1"),
          item("GR-2", 0),
          item("GR-3", 5),
          item("GR-4", 1),
          item("GR-5"),
        ],
      },
      { ...RANGE, daily: [] },
      "team",
      SEEDED_TERMS,
      undefined,
    );

    const [list] = "tables" in view ? view.tables : [];
    expect(
      list !== undefined && "rows" in list
        ? list.rows.slice(1).map((row) => row[0])
        : [],
    ).toEqual(["GR-3", "GR-4", "GR-2", "GR-1", "GR-5"]);
  });

  it("names a day's oldest Work Item wherever it is listed", () => {
    const view = describeWorkItemAgeDays(
      [{ percentile: 50, value: 3 }],
      {
        ...RANGE,
        daily: [
          {
            date: "2026-09-07",
            items: [
              { id: 61, name: "Export", referenceId: "GR-061", age: 6 },
              { id: 64, name: "Retry", referenceId: "GR-064", age: 2 },
            ],
          },
        ],
      },
      "team",
      SEEDED_TERMS,
    );

    expect("rows" in view ? view.rows[1] : []).toEqual([
      "Mon 7 Sep 2026",
      "GR-061 6 days",
      "2",
    ]);
  });
});

describe("what a WIP answer says when there is less to say", () => {
  const now = (items: readonly { isBlocked: boolean | undefined }[]) => ({
    asOfDate: "2026-10-06",
    count: items.length,
    items,
  });
  const known = [{ isBlocked: true }, { isBlocked: false }];
  const unknown = [{ isBlocked: undefined }, { isBlocked: undefined }];

  it("adds nothing when there is a limit, Blocked facts and Work Items in progress", () => {
    expect(
      describeWhatWipLeavesUnsaid(now(known), "team", SEEDED_TERMS, 6),
    ).toEqual([]);
  });

  it("says no System WIP Limit is set only when none is", () => {
    expect(
      describeWhatWipLeavesUnsaid(now(known), "team", SEEDED_TERMS, undefined),
    ).toEqual(["No System WIP Limit is set."]);
    expect(
      describeWhatWipLeavesUnsaid(now(known), "team", SEEDED_TERMS, 1),
    ).toEqual([]);
  });

  it("says Lighthouse does not say which are Blocked only when no Work Item says", () => {
    expect(
      describeWhatWipLeavesUnsaid(now(unknown), "team", SEEDED_TERMS, 6),
    ).toEqual(["Lighthouse does not say which Work Items are Blocked."]);
    expect(
      describeWhatWipLeavesUnsaid(
        now([{ isBlocked: undefined }, { isBlocked: false }]),
        "team",
        SEEDED_TERMS,
        6,
      ),
    ).toEqual([]);
  });

  it("says nothing is in progress for an empty list, and nothing about Blocked", () => {
    expect(
      describeWhatWipLeavesUnsaid(now([]), "team", SEEDED_TERMS, 6),
    ).toEqual(["No Work Items are in progress."]);
    expect(
      describeWhatWipLeavesUnsaid(
        now([]),
        "portfolio",
        SEEDED_TERMS,
        undefined,
      ),
    ).toEqual(["No System WIP Limit is set.", "No Features are in progress."]);
  });

  it("says it in the instance's own words", () => {
    const terms = {
      ...SEEDED_TERMS,
      wip: "Load",
      workItems: "Tickets",
      blocked: "Stuck",
    };
    expect(
      describeWhatWipLeavesUnsaid(now(unknown), "team", terms, undefined),
    ).toEqual([
      "No System Load Limit is set.",
      "Lighthouse does not say which Tickets are Stuck.",
    ]);
  });

  it("reads the bare list of Work Items in progress, counting them", () => {
    expect(
      readInProgressItems(
        [{ isBlocked: true, referenceId: "GR-1" }],
        "2026-10-06",
      ),
    ).toEqual({
      asOfDate: "2026-10-06",
      count: 1,
      items: [
        {
          isBlocked: true,
          referenceId: "GR-1",
          name: undefined,
          state: undefined,
          workItemAge: undefined,
          blockedSince: undefined,
        },
      ],
    });
    expect(readInProgressItems([], "2026-10-06")).toEqual({
      asOfDate: "2026-10-06",
      count: 0,
      items: [],
    });
    expect(readInProgressItems({ items: [] }, "2026-10-06")).toBeNull();
    expect(
      readInProgressItems([{ isBlocked: "yes" }], "2026-10-06"),
    ).toBeNull();
  });
});
