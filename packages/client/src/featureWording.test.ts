import { describe, expect, it } from "vitest";
import {
  describeFeatureCompletion,
  describeFeatureListCount,
  describeFeatureListHeadings,
  describeFeatureProgress,
  describeFeatureRow,
  describeFeatureStart,
  describeFeatureTitle,
  describeFeatureWorkItemsHeading,
  readFeatureList,
  readFeatureWorkItems,
} from "./featureWording";
import { SEEDED_TERMS, type Terms } from "./terminology";

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

describe("describeFeatureListCount", () => {
  const renamed: Terms = {
    ...SEEDED_TERMS,
    feature: "Outcome",
    features: "Outcomes",
  };

  it.each([
    { count: 0, terms: SEEDED_TERMS, says: "No Features" },
    { count: 1, terms: SEEDED_TERMS, says: "1 Feature" },
    { count: 3, terms: SEEDED_TERMS, says: "3 Features" },
    { count: 0, terms: renamed, says: "No Outcomes" },
    { count: 1, terms: renamed, says: "1 Outcome" },
  ])("counts $count Features as '$says'", ({ count, terms, says }) => {
    expect(describeFeatureListCount(count, terms)).toBe(says);
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
      describeFeatureListHeadings({ ...SEEDED_TERMS, feature: "Outcome" }),
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

describe("the heading of a Feature's Work Items", () => {
  it.each([
    {
      of: "a named Feature",
      answer: [cameraStream()],
      title: "OE-002 Deep-sea camera stream",
    },
    {
      of: "a Feature without a reference",
      answer: [cameraStream({ referenceId: "" })],
      title: "Deep-sea camera stream",
    },
    { of: "no Feature", answer: [], title: undefined },
    {
      of: "a Feature without a name",
      answer: [cameraStream({ name: "" })],
      title: undefined,
    },
    {
      of: "an answer that is not a list",
      answer: cameraStream(),
      title: undefined,
    },
  ])("names $of as $title", ({ answer, title }) => {
    expect(describeFeatureTitle(answer)).toBe(title);
  });

  it.each([
    { count: 3, heading: "Feature [id: 2] · 3 Work Items" },
    { count: 1, heading: "Feature [id: 2] · 1 Work Item" },
    { count: 0, heading: "Feature [id: 2] · 0 Work Items" },
  ])("counts $count as '$heading'", ({ count, heading }) => {
    expect(
      describeFeatureWorkItemsHeading("Feature [id: 2]", count, SEEDED_TERMS),
    ).toBe(heading);
  });
});

describe("readFeatureWorkItems", () => {
  const workItem = (facts: Record<string, unknown> = {}) => ({
    referenceId: "GR-061",
    name: "Export flow report as PDF",
    type: "User Story",
    state: "In Progress",
    ...facts,
  });

  it("keeps each Work Item's reference, name, type and state", () => {
    expect(readFeatureWorkItems([workItem()])).toEqual([workItem()]);
  });

  it.each(["referenceId", "name", "type", "state"])(
    "recognises no list when a Work Item comes without its %s",
    (fact) => {
      expect(
        readFeatureWorkItems([workItem(), workItem({ [fact]: null })]),
      ).toBeNull();
    },
  );

  it("recognises no list when the answer is not one", () => {
    expect(readFeatureWorkItems(workItem())).toBeNull();
  });
});

describe("what a Feature must look like to be stated", () => {
  it("reads no list when a Team's share of the work is not a number", () => {
    expect(
      readFeatureList([cameraStream({ totalWork: { "3": 8, "6": "5" } })]),
    ).toBeNull();
  });

  it("reads no list and no Work Items when an entry is not an object", () => {
    expect(readFeatureList([null])).toBeNull();
    expect(readFeatureWorkItems([null])).toBeNull();
  });
});
