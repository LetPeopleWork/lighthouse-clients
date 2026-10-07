import { describe, expect, it } from "vitest";
import {
  describeManualForecastSummary,
  type ManualForecastView,
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
