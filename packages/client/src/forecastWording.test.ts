import { describe, expect, it } from "vitest";
import {
  describeManualForecastSummary,
  type ManualForecastView,
  placeActualAmongPercentiles,
  readBacktest,
  readManualForecast,
} from "./forecastWording";
import { SEEDED_TERMS } from "./terminology";

const manualForecast = () => ({
  remainingItems: 25,
  targetDate: "2026-10-30T00:00:00Z",
  likelihood: 48.2,
  whenForecasts: [
    {
      probability: 85,
      expectedDate: "2026-11-09T00:00:00Z",
      filterApplied: false,
      excludedSummary: null,
    },
  ],
  howManyForecasts: [{ probability: 85, value: 19 }],
  filterApplied: false,
  excludedSummary: null,
  hasSufficientData: true,
});

const without = (field: string): Record<string, unknown> => {
  const { [field]: _removed, ...rest } = manualForecast() as Record<
    string,
    unknown
  >;
  return rest;
};

describe("readManualForecast", () => {
  it("picks the facts the Forecast tab states", () => {
    expect(readManualForecast(manualForecast())).toEqual({
      remainingItems: 25,
      targetDate: "2026-10-30T00:00:00Z",
      likelihood: 48.2,
      whenForecasts: [
        { probability: 85, expectedDate: "2026-11-09T00:00:00Z" },
      ],
      howManyForecasts: [{ probability: 85, value: 19 }],
      filterApplied: false,
      hasSufficientData: true,
    });
  });

  it.each([
    "remainingItems",
    "targetDate",
    "likelihood",
    "whenForecasts",
    "howManyForecasts",
  ])("does not recognise an answer without %s", (field) => {
    expect(readManualForecast(without(field))).toBeNull();
  });

  it.each([
    { field: "remainingItems", value: "25" },
    { field: "targetDate", value: "2026-02-30" },
    { field: "likelihood", value: "48%" },
    {
      field: "whenForecasts",
      value: [{ probability: 85, expectedDate: "soon" }],
    },
    { field: "howManyForecasts", value: [{ probability: 85 }] },
    { field: "filterApplied", value: "no" },
    { field: "hasSufficientData", value: 1 },
  ])(
    "does not recognise an answer whose $field is $value",
    ({ field, value }) => {
      expect(
        readManualForecast({ ...manualForecast(), [field]: value }),
      ).toBeNull();
    },
  );

  it.each(["filterApplied", "hasSufficientData"])(
    "leaves %s undefined when Lighthouse does not send it",
    (field) => {
      expect(
        readManualForecast(without(field))?.[
          field as "filterApplied" | "hasSufficientData"
        ],
      ).toBeUndefined();
    },
  );

  it("accepts a forecast asked for neither a date nor a likelihood", () => {
    const read = readManualForecast({
      ...manualForecast(),
      targetDate: null,
      likelihood: null,
    });

    expect(read?.targetDate).toBeNull();
    expect(read?.likelihood).toBeNull();
  });
});

describe("describeManualForecastSummary", () => {
  const asked = (facts: Partial<ManualForecastView>): ManualForecastView => ({
    remainingItems: 25,
    targetDate: "2026-10-30T00:00:00Z",
    likelihood: null,
    whenForecasts: [],
    howManyForecasts: [],
    filterApplied: false,
    hasSufficientData: true,
    ...facts,
  });
  const gravity = { terms: SEEDED_TERMS, name: "Gravity" };

  it.each([
    {
      given: "both inputs",
      facts: {},
      heading: "Gravity · 25 Work Items · target Fri 30 Oct 2026",
    },
    {
      given: "only the remaining Work Items",
      facts: { targetDate: null },
      heading: "Gravity · 25 Work Items",
    },
    {
      given: "only the target date",
      facts: { remainingItems: 0 },
      heading: "Gravity · target Fri 30 Oct 2026",
    },
    {
      given: "both inputs on filtered Throughput",
      facts: { filterApplied: true },
      heading:
        "Gravity · 25 Work Items · target Fri 30 Oct 2026 · Use filtered Throughput",
    },
    {
      given: "only the target date on filtered Throughput",
      facts: { remainingItems: 0, filterApplied: true },
      heading: "Gravity · target Fri 30 Oct 2026 · Use filtered Throughput",
    },
  ])("names only what was asked, given $given", ({ facts, heading }) => {
    expect(describeManualForecastSummary(asked(facts), gravity)).toBe(heading);
  });

  it("says nothing of filtering when an older Lighthouse does not send it", () => {
    expect(
      describeManualForecastSummary(
        asked({ filterApplied: undefined }),
        gravity,
      ),
    ).toBe("Gravity · 25 Work Items · target Fri 30 Oct 2026");
  });
});

describe("readBacktest", () => {
  const backtest = () => ({
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    historicalStartDate: "2026-07-01",
    historicalEndDate: "2026-08-31",
    percentiles: [{ probability: 85, value: 18 }],
    actualThroughput: 21,
    filterApplied: false,
    excludedSummary: null,
  });

  it("picks the facts Backtest Results states", () => {
    expect(readBacktest(backtest())).toEqual({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      historicalStartDate: "2026-07-01",
      historicalEndDate: "2026-08-31",
      percentiles: [{ probability: 85, value: 18 }],
      actualThroughput: 21,
    });
  });

  it.each([
    { field: "startDate", value: "September" },
    { field: "historicalEndDate", value: undefined },
    { field: "percentiles", value: [{ probability: 85 }] },
    { field: "actualThroughput", value: "21" },
  ])(
    "does not recognise an answer whose $field is $value",
    ({ field, value }) => {
      expect(readBacktest({ ...backtest(), [field]: value })).toBeNull();
    },
  );
});

describe("placeActualAmongPercentiles", () => {
  const percentiles = [
    { probability: 95, value: 15 },
    { probability: 50, value: 24 },
    { probability: 85, value: 18 },
    { probability: 70, value: 21 },
  ];
  const placed = (actualThroughput: number) => {
    const { above, below } = placeActualAmongPercentiles({
      percentiles,
      actualThroughput,
    });
    return [above, below].map((rows) => rows.map((row) => row.probability));
  };

  it.each([
    {
      given: "above every percentile",
      actual: 30,
      above: [],
      below: [50, 70, 85, 95],
    },
    {
      given: "between two percentiles",
      actual: 19,
      above: [50, 70],
      below: [85, 95],
    },
    {
      given: "below every percentile",
      actual: 10,
      above: [50, 70, 85, 95],
      below: [],
    },
    {
      given: "equal to a percentile",
      actual: 21,
      above: [50, 70],
      below: [85, 95],
    },
  ])(
    "orders the rows by chance and puts an actual $given after the rows it reaches",
    ({ actual, above, below }) => {
      expect(placed(actual)).toEqual([above, below]);
    },
  );
});
