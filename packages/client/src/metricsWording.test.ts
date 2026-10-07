import { describe, expect, it } from "vitest";
import {
  daysInRange,
  describeBlockedNow,
  describeBlockedOverTime,
  describeMetricsHeading,
  describePercentileRows,
  describeProcessBehaviorOverTime,
  describeTotalThroughput,
  describeTotalWorkItemAge,
  OVER_TIME_EMPTY_SENTENCE,
  ordinalOf,
  readArrivals,
  readBlocked,
  readCumulativeStateTime,
  readCycleTime,
  readMetricAnswer,
  readMetricsSubject,
  readPercentilesOverTime,
  readPredictabilityScore,
  readProcessBehaviorOverTime,
  readSystemWipLimit,
  readThroughput,
  readTotalWorkItemAge,
  readWip,
  readWorkItemAge,
  readWorkItemAgePercentiles,
} from "./metricsWording";
import { SEEDED_TERMS } from "./terminology";

const RANGE = { startDate: "2026-09-07", endDate: "2026-10-06" };

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
