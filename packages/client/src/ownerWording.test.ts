import { describe, expect, it } from "vitest";
import {
  describeFeatureCount,
  describeLastUpdated,
  describeOwnerListHeadings,
  describeOwnerListTitle,
  describeOwnerName,
  describeTags,
  NOT_SENT,
  readOwnerList,
} from "./ownerWording";
import { resolveTerms, SEEDED_TERMS } from "./terminology";

const gravity = {
  id: 3,
  name: "Gravity",
  features: [{ id: 1 }, { id: 2 }],
  lastUpdated: "2026-10-06T05:14:00Z",
};

describe("readOwnerList", () => {
  it("reads each Team's id, name, Feature count, tags and last update", () => {
    expect(readOwnerList([{ ...gravity, tags: ["mobile", 7] }])).toEqual([
      {
        id: 3,
        name: "Gravity",
        featureCount: 2,
        tags: ["mobile"],
        lastUpdated: "2026-10-06T05:14:00Z",
      },
    ]);
  });

  it("leaves what Lighthouse did not send undefined, and the tags empty", () => {
    expect(readOwnerList([{ id: 3, name: "Gravity" }])).toEqual([
      {
        id: 3,
        name: "Gravity",
        featureCount: undefined,
        tags: [],
        lastUpdated: undefined,
      },
    ]);
  });

  it("reads an empty list as an empty list", () => {
    expect(readOwnerList([])).toEqual([]);
  });

  it.each([
    { case: "not a list", value: { teams: [gravity] } },
    { case: "an item without an id", value: [gravity, { name: "Pulsar" }] },
    {
      case: "an item with a text id",
      value: [gravity, { ...gravity, id: "3" }],
    },
    { case: "an item without a name", value: [gravity, { id: 5 }] },
    { case: "an item with an empty name", value: [{ ...gravity, name: "" }] },
    { case: "an item that is not a record", value: [gravity, null] },
  ])("gives null for $case", ({ value }) => {
    expect(readOwnerList(value)).toBeNull();
  });
});

describe("the list's words", () => {
  const renamed = resolveTerms([
    { key: "teams", value: "Squads" },
    { key: "portfolios", value: "Programmes" },
    { key: "feature", value: "Outcome" },
    { key: "features", value: "Outcomes" },
  ] as never);

  it("titles the list with the instance's word for Teams or Portfolios", () => {
    expect(describeOwnerListTitle("team", SEEDED_TERMS)).toBe(
      SEEDED_TERMS.teams,
    );
    expect(describeOwnerListTitle("team", renamed)).toBe("Squads");
    expect(describeOwnerListTitle("portfolio", renamed)).toBe("Programmes");
  });

  it("heads the Features column with the instance's word", () => {
    expect(describeOwnerListHeadings(renamed)).toEqual([
      "Name",
      "Outcomes",
      "Tags",
      "Last Updated",
    ]);
  });

  it("names a Team with its id beside it", () => {
    expect(describeOwnerName({ id: 3, name: "Gravity" })).toBe(
      "Gravity [id: 3]",
    );
  });

  it.each([
    { count: 0, reads: "0 Outcomes" },
    { count: 1, reads: "1 Outcome" },
    { count: 6, reads: "6 Outcomes" },
    { count: undefined, reads: NOT_SENT },
  ])("counts $count Features as '$reads'", ({ count, reads }) => {
    expect(describeFeatureCount(count, renamed)).toBe(reads);
  });

  it("joins the tags, and leaves the cell empty when there are none", () => {
    expect(describeTags(["mobile", "payments"])).toBe("mobile, payments");
    expect(describeTags([])).toBe("");
  });
});

describe("describeLastUpdated", () => {
  it("states the update in the reader's local time", () => {
    const zone = process.env.TZ;
    process.env.TZ = "Europe/Zurich";
    try {
      expect(describeLastUpdated("2026-10-06T05:14:00Z")).toBe(
        "Tue 6 Oct 2026, 07:14",
      );
    } finally {
      if (zone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = zone;
      }
    }
  });

  it("says '—' for a Team never updated", () => {
    expect(describeLastUpdated(undefined)).toBe("—");
  });

  it("shows a timestamp it cannot read as it came", () => {
    expect(describeLastUpdated("not a date")).toBe("not a date");
  });
});
