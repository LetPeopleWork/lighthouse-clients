import { describe, expect, it } from "vitest";
import {
  describeFeatureCompletion,
  describeFeatureListHeadings,
  describeFeatureProgress,
  describeFeatureRow,
  describeFeatureStart,
  readFeatureList,
} from "./featureWording";
import { resolveTerms, SEEDED_TERMS } from "./terminology";

const chances = (days: readonly string[]) =>
  [50, 70, 85, 95].map((probability, index) => ({
    probability,
    expectedDate: `${days[index]}T00:00:00Z`,
  }));

const cameraStream = (facts: Record<string, unknown> = {}) => ({
  id: 2,
  referenceId: "OE-002",
  name: "Deep-sea camera stream",
  state: "In Progress",
  totalWork: { "3": 8, "6": 5 },
  remainingWork: { "3": 3, "6": 2 },
  forecasts: chances(["2026-11-10", "2026-11-16", "2026-11-20", "2026-11-27"]),
  startForecast: {
    source: "Observed",
    observedDate: "2026-09-28T00:00:00Z",
    percentiles: [],
  },
  teamsWithoutForecast: [],
  ...facts,
});

const onlyFeature = (facts: Record<string, unknown> = {}) => {
  const features = readFeatureList([cameraStream(facts)]);
  if (features === null) {
    throw new Error("the Feature was not recognised");
  }
  return features[0];
};

describe("readFeatureList", () => {
  it("sums each Team's work into the Feature's own", () => {
    const feature = onlyFeature();

    expect(feature.totalWork).toBe(13);
    expect(feature.remainingWork).toBe(5);
  });

  it.each([
    ["not a list", { features: [] }],
    [
      "a Feature without its per-Team work",
      [cameraStream({ totalWork: undefined })],
    ],
    [
      "a Team's share that is not a number",
      [cameraStream({ remainingWork: { "3": "2" } })],
    ],
    ["a Feature without its reference", [cameraStream({ referenceId: "" })]],
    ["a Feature without its name", [cameraStream({ name: undefined })]],
    ["a Feature without its state", [cameraStream({ state: null })]],
    ["an entry that is not a Feature", [cameraStream(), 7]],
  ])("does not recognise %s", (_why, answer) => {
    expect(readFeatureList(answer)).toBeNull();
  });

  it("recognises no Features as an empty list", () => {
    expect(readFeatureList([])).toEqual([]);
  });
});

describe("describeFeatureProgress", () => {
  it.each([
    [13, 5, "8 of 13 Work Items"],
    [1, 0, "1 of 1 Work Item"],
    [0, 0, "0 of 0 Work Items"],
  ])("reads %i total with %i remaining as '%s'", (total, remaining, reads) => {
    expect(
      describeFeatureProgress(
        { totalWork: total, remainingWork: remaining },
        SEEDED_TERMS,
      ),
    ).toBe(reads);
  });
});

describe("describeFeatureStart", () => {
  it.each([
    [
      "an observed start, even with a Team without history",
      { teamsWithoutForecast: ["Zenith"] },
      "Mon 28 Sep 2026",
    ],
    [
      "a forecast start, read at its 85% chance",
      {
        startForecast: {
          source: "Forecast",
          observedDate: null,
          percentiles: chances([
            "2026-10-12",
            "2026-10-13",
            "2026-10-14",
            "2026-10-15",
          ]),
        },
      },
      "Wed 14 Oct 2026",
    ],
    [
      "an observed source without its date",
      {
        startForecast: {
          source: "Observed",
          observedDate: null,
          percentiles: [],
        },
      },
      "—",
    ],
    [
      "a date sent beside a source that is not Observed",
      {
        startForecast: {
          source: "Unknown",
          observedDate: "2026-09-28T00:00:00Z",
          percentiles: [],
        },
      },
      "—",
    ],
    ["no start forecast at all", { startForecast: undefined }, "—"],
    [
      "a Team without history and nothing observed",
      {
        startForecast: {
          source: "Unknown",
          observedDate: null,
          percentiles: [],
        },
        teamsWithoutForecast: ["Zenith"],
      },
      "Cannot forecast",
    ],
  ])("reads %s", (_why, facts, reads) => {
    expect(describeFeatureStart(onlyFeature(facts))).toBe(reads);
  });
});

describe("describeFeatureCompletion", () => {
  it.each([
    ["the 85% date", {}, "Fri 20 Nov 2026"],
    ["no forecasts", { forecasts: [] }, "—"],
    [
      "forecasts without an 85% chance",
      { forecasts: chances(["2026-11-10"]).slice(0, 1) },
      "—",
    ],
    [
      "a Team without history",
      { teamsWithoutForecast: ["Zenith"] },
      "Cannot forecast",
    ],
  ])("reads %s", (_why, facts, reads) => {
    expect(describeFeatureCompletion(onlyFeature(facts))).toBe(reads);
  });
});

describe("the Feature list's row", () => {
  it("names its columns in the instance's words", () => {
    expect(
      describeFeatureListHeadings(
        resolveTerms([{ key: "feature", value: "Outcome" }]),
      ),
    ).toEqual([
      "Outcome",
      "Name",
      "Progress",
      "Forecasted Start",
      "Forecasted Completion (85%)",
      "State",
    ]);
  });

  it("states the Feature in the order of its headings", () => {
    expect(describeFeatureRow(onlyFeature(), SEEDED_TERMS)).toEqual([
      "OE-002",
      "Deep-sea camera stream",
      "8 of 13 Work Items",
      "Mon 28 Sep 2026",
      "Fri 20 Nov 2026",
      "In Progress",
    ]);
  });
});
