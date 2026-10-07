import { describe, expect, it } from "vitest";
import {
  describeFeatureCount,
  describeLastUpdated,
  describeOwnerCount,
  describeOwnerListHeadings,
  describeOwnerListTitle,
  describeOwnerName,
  describePortfolioSummary,
  describeTags,
  describeTeamSummary,
  NOT_SENT,
  NOT_SET,
  readOwnerList,
  readPortfolio,
  readTeam,
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

  it.each([
    { kind: "team", count: 0, terms: SEEDED_TERMS, reads: "No Teams" },
    { kind: "team", count: 1, terms: SEEDED_TERMS, reads: "1 Team" },
    { kind: "team", count: 7, terms: SEEDED_TERMS, reads: "7 Teams" },
    { kind: "team", count: 7, terms: renamed, reads: "7 Squads" },
    {
      kind: "portfolio",
      count: 0,
      terms: SEEDED_TERMS,
      reads: "No Portfolios",
    },
    { kind: "portfolio", count: 1, terms: SEEDED_TERMS, reads: "1 Portfolio" },
    { kind: "portfolio", count: 5, terms: renamed, reads: "5 Programmes" },
  ] as const)(
    "counts $count of kind $kind as '$reads'",
    ({ kind, count, terms, reads }) => {
      expect(describeOwnerCount(kind, count, terms)).toBe(reads);
    },
  );

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

describe("describeTeamSummary", () => {
  const team = {
    id: 3,
    name: "Gravity",
    serviceLevelExpectationProbability: 85,
    serviceLevelExpectationRange: 12,
    systemWIPLimit: 10,
    featureWip: 2,
    useFixedDatesForThroughput: false,
    throughputStartDate: "2026-09-07T00:00:00Z",
    throughputEndDate: "2026-10-06T00:00:00Z",
    portfolios: [{ id: 1, name: "Apollo" }],
    features: [{ id: 1 }],
    workItemTypes: ["Bug"],
  };

  const linesFor = (facts: Record<string, unknown>): string[] => {
    const summary = readTeam({ ...team, ...facts });
    if (summary === null) {
      throw new Error("the Team should read");
    }
    return describeTeamSummary(summary, SEEDED_TERMS);
  };

  it.each([
    {
      setting: "no SLE probability",
      facts: { serviceLevelExpectationProbability: undefined },
      line: `Service Level Expectation: ${NOT_SET}`,
    },
    {
      setting: "no SLE range",
      facts: { serviceLevelExpectationRange: 0 },
      line: `Service Level Expectation: ${NOT_SET}`,
    },
    {
      setting: "no System WIP Limit",
      facts: { systemWIPLimit: undefined },
      line: `System WIP Limit: ${NOT_SET}`,
    },
    {
      setting: "a negative System WIP Limit",
      facts: { systemWIPLimit: -1 },
      line: `System WIP Limit: ${NOT_SET}`,
    },
    {
      setting: "no Feature WIP",
      facts: { featureWip: undefined },
      line: `Feature WIP: ${NOT_SET}`,
    },
    {
      setting: "no Throughput dates",
      facts: { throughputEndDate: undefined },
      line: `Throughput: ${NOT_SENT}`,
    },
    {
      setting: "no rolling or fixed flag",
      facts: { useFixedDatesForThroughput: undefined },
      line: "Throughput: Mon 7 Sep 2026 to Tue 6 Oct 2026",
    },
    {
      setting: "no Portfolios",
      facts: { portfolios: undefined },
      line: `Portfolios: ${NOT_SENT}`,
    },
    {
      setting: "no Features",
      facts: { features: undefined },
      line: `Features: ${NOT_SENT}`,
    },
    {
      setting: "no Work Item Types",
      facts: { workItemTypes: [] },
      line: `Work Item Types: ${NOT_SENT}`,
    },
    {
      setting: "no last update",
      facts: { lastUpdated: undefined },
      line: `Last Updated on ${NOT_SENT}`,
    },
  ])("says '$line' for a Team with $setting", ({ facts, line }) => {
    expect(linesFor(facts)).toContain(line);
  });

  it("counts a single System WIP Limit in the singular", () => {
    expect(linesFor({ systemWIPLimit: 1 })).toContain(
      "System WIP Limit: 1 Work Item",
    );
  });

  it("gives Tags a line only when the Team has some", () => {
    expect(linesFor({}).some((line) => line.startsWith("Tags"))).toBe(false);
    expect(linesFor({ tags: ["mobile", "payments"] })).toContain(
      "Tags: mobile, payments",
    );
  });

  it("skips a Portfolio it cannot name", () => {
    expect(
      linesFor({ portfolios: [{ id: 1, name: "Apollo" }, { id: 2 }] }),
    ).toContain("Portfolios: Apollo [id: 1]");
  });

  it.each([
    { case: "no id", value: { ...team, id: undefined } },
    { case: "no name", value: { ...team, name: "" } },
    { case: "not a Team", value: [team] },
  ])("reads null for $case", ({ value }) => {
    expect(readTeam(value)).toBeNull();
  });
});

describe("describePortfolioSummary", () => {
  const portfolio = {
    id: 2,
    name: "Ocean Explorer",
    lastUpdated: "2026-10-06T04:58:00Z",
    serviceLevelExpectationProbability: 85,
    serviceLevelExpectationRange: 45,
    systemWIPLimit: 5,
    involvedTeams: [
      { id: 3, name: "Gravity" },
      { id: 6, name: "Voyager" },
    ],
    features: [{ id: 1 }, { id: 2 }],
  };

  const linesFor = (
    facts: Record<string, unknown>,
    terms = SEEDED_TERMS,
  ): string[] => {
    const summary = readPortfolio({ ...portfolio, ...facts });
    if (summary === null) {
      throw new Error("the Portfolio should read");
    }
    return describePortfolioSummary(summary, terms);
  };

  it("states the SLE and System WIP Limit in Features and the Feature WIP in Teams", () => {
    expect(linesFor({}).slice(2)).toEqual([
      "Service Level Expectation: 85% of Features within 45 days or less",
      "System WIP Limit: 5 Features",
      "Feature WIP: 2 Teams",
      "Teams: Gravity [id: 3], Voyager [id: 6]",
      "Features: 2",
    ]);
  });

  it.each([
    {
      setting: "no Team working on it",
      facts: { involvedTeams: [] },
      lines: [`Feature WIP: ${NOT_SET}`, `Teams: ${NOT_SENT}`],
    },
    {
      setting: "one Team working on it",
      facts: { involvedTeams: [{ id: 3, name: "Gravity" }] },
      lines: ["Feature WIP: 1 Team", "Teams: Gravity [id: 3]"],
    },
    {
      setting: "no SLE range",
      facts: { serviceLevelExpectationRange: 0 },
      lines: [`Service Level Expectation: ${NOT_SET}`],
    },
    {
      setting: "no System WIP Limit",
      facts: { systemWIPLimit: 0 },
      lines: [`System WIP Limit: ${NOT_SET}`],
    },
    {
      setting: "a single System WIP Limit",
      facts: { systemWIPLimit: 1 },
      lines: ["System WIP Limit: 1 Feature"],
    },
    {
      setting: "no Features",
      facts: { features: undefined },
      lines: [`Features: ${NOT_SENT}`],
    },
    {
      setting: "no last update",
      facts: { lastUpdated: undefined },
      lines: [`Last Updated on ${NOT_SENT}`],
    },
  ])("says $lines for a Portfolio with $setting", ({ facts, lines }) => {
    expect(linesFor(facts)).toEqual(expect.arrayContaining(lines));
  });

  it("speaks the instance's words", () => {
    const terms = resolveTerms([
      { key: "feature", value: "Epic" },
      { key: "features", value: "Epics" },
      { key: "team", value: "Squad" },
      { key: "teams", value: "Squads" },
      { key: "wip", value: "Load" },
    ]);
    expect(linesFor({}, terms)).toEqual(
      expect.arrayContaining([
        "System Load Limit: 5 Epics",
        "Epic Load: 2 Squads",
        "Squads: Gravity [id: 3], Voyager [id: 6]",
        "Epics: 2",
      ]),
    );
  });

  it.each([
    { case: "no id", value: { ...portfolio, id: undefined } },
    { case: "no name", value: { ...portfolio, name: "" } },
    { case: "not a Portfolio", value: [portfolio] },
  ])("reads null for $case", ({ value }) => {
    expect(readPortfolio(value)).toBeNull();
  });
});
