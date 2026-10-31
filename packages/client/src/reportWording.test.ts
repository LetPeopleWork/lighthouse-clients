import { describe, expect, it } from "vitest";
import type { LighthouseApiError } from "./index";
import {
  describeEveryReportRefusal,
  describeReportOwner,
  describeReportRefusal,
  readEveryReport,
  readReport,
  readReportList,
  readReportRefusal,
  summariseEveryReport,
  summariseReport,
  summariseReportList,
} from "./reportWording";
import { SEEDED_TERMS, type Terms } from "./terminology";

// Team Lightspeed's engagement-start report, as Lighthouse sends its name and its two windows.
const ENGAGEMENT_START = {
  id: 1,
  name: "Then & Now — engagement start",
  templateKey: "then-and-now",
  thenAndNow: {
    thenWindow: { start: "2026-05-03", end: "2026-07-31" },
    nowWindow: { start: "2026-07-05", end: "2026-10-02" },
  },
};

const RENAMED: Terms = { ...SEEDED_TERMS, team: "Squad", portfolio: "Program" };

const withThenAndNow = (thenAndNow: unknown) => ({
  ...ENGAGEMENT_START,
  thenAndNow,
});

const withWindows = (thenWindow: unknown, nowWindow: unknown) =>
  withThenAndNow({ thenWindow, nowWindow });

const A_WINDOW = { start: "2026-05-03", end: "2026-07-31" };

describe("the summary of one report", () => {
  it("names the report, its owner and its two windows, one to a line", () => {
    expect(summariseReport(ENGAGEMENT_START, "Team Lightspeed")).toBe(
      [
        "Then & Now — engagement start",
        "Team Lightspeed",
        "Then Sun 3 May 2026 – Fri 31 Jul 2026 · Now Sun 5 Jul 2026 – Fri 2 Oct 2026",
      ].join("\n"),
    );
  });

  it("reads the name and the windows exactly as sent", () => {
    expect(readReport(ENGAGEMENT_START)).toEqual({
      name: "Then & Now — engagement start",
      thenWindow: { start: "2026-05-03", end: "2026-07-31" },
      nowWindow: { start: "2026-07-05", end: "2026-10-02" },
    });
  });

  it.each<[string, unknown]>([
    ["no answer", null],
    ["a bare text", "a report"],
    ["no Then & Now part", { name: ENGAGEMENT_START.name }],
    ["a Then & Now part that is not one", withThenAndNow("then-and-now")],
    ["no name", { ...ENGAGEMENT_START, name: undefined }],
    ["an empty name", { ...ENGAGEMENT_START, name: "" }],
    ["a name that is not text", { ...ENGAGEMENT_START, name: 7 }],
    ["no Then window", withWindows(undefined, A_WINDOW)],
    ["no Now window", withWindows(A_WINDOW, undefined)],
    ["a Then window that is not one", withWindows(null, A_WINDOW)],
    ["a Now window that is not one", withWindows(A_WINDOW, null)],
    [
      "a Then window without its first day",
      withWindows({ end: "2026-07-31" }, A_WINDOW),
    ],
    [
      "a Then window without its last day",
      withWindows({ start: "2026-05-03" }, A_WINDOW),
    ],
    [
      "a Now window whose first day is no day",
      withWindows(A_WINDOW, { start: "soon", end: "2026-10-02" }),
    ],
    [
      "a Now window whose last day is no day",
      withWindows(A_WINDOW, { start: "2026-07-05", end: 20261002 }),
    ],
  ])("says nothing of an answer with %s", (_what, answer) => {
    expect(readReport(answer)).toBeNull();
    expect(summariseReport(answer, "Team Lightspeed")).toBeNull();
  });
});

describe("the summary of a report list", () => {
  it("counts the reports, then names each with its type and the day it was created", () => {
    const list = {
      reports: [
        {
          id: 1,
          name: "Then & Now — engagement start",
          templateKey: "then-and-now",
          createdOn: "2026-10-02",
        },
        { id: 2, name: "Signals — flow alerts", templateKey: "signals" },
        { id: 3, name: "Untitled", templateKey: "", createdOn: "" },
      ],
    };

    expect(summariseReportList(list, "Team Lightspeed")).toBe(
      [
        "Team Lightspeed · 3 reports",
        "Then & Now — engagement start [id: 1] · then-and-now · created Fri 2 Oct 2026",
        "Signals — flow alerts [id: 2] · signals",
        "Untitled [id: 3]",
      ].join("\n"),
    );
    expect(readReportList(list)).toEqual([
      {
        id: 1,
        name: "Then & Now — engagement start",
        templateKey: "then-and-now",
        createdOn: "2026-10-02",
      },
      {
        id: 2,
        name: "Signals — flow alerts",
        templateKey: "signals",
        createdOn: undefined,
      },
      { id: 3, name: "Untitled", templateKey: undefined, createdOn: undefined },
    ]);
  });

  it("writes a created day it cannot read exactly as sent", () => {
    const list = {
      reports: [{ id: 4, name: "Review", createdOn: "last Tuesday" }],
    };

    expect(summariseReportList(list, "Portfolio Apollo II")).toBe(
      [
        "Portfolio Apollo II · 1 report",
        "Review [id: 4] · created last Tuesday",
      ].join("\n"),
    );
  });

  it("says an owner without reports has none", () => {
    expect(readReportList({ reports: [] })).toEqual([]);
    expect(summariseReportList({ reports: [] }, "Team Lightspeed")).toBe(
      "Team Lightspeed · No reports",
    );
  });

  it.each<[string, unknown]>([
    ["no answer", null],
    ["a bare list", [{ id: 1, name: "A" }]],
    ["no reports in it", { communityCap: 1 }],
    ["reports that are not a list", { reports: { id: 1, name: "A" } }],
    ["a row that is not a report", { reports: [{ id: 1, name: "A" }, null] }],
    [
      "a row without its id",
      { reports: [{ id: 1, name: "A" }, { name: "B" }] },
    ],
    ["a row whose id is not a number", { reports: [{ id: "2", name: "B" }] }],
    ["a row without its name", { reports: [{ id: 1, name: "A" }, { id: 2 }] }],
    ["a row with an empty name", { reports: [{ id: 2, name: "" }] }],
  ])("says nothing of an answer with %s", (_what, answer) => {
    expect(readReportList(answer)).toBeNull();
    expect(summariseReportList(answer, "Team Lightspeed")).toBeNull();
  });
});

const A_TEAM_REPORT = {
  id: 1,
  name: "Then & Now — engagement start",
  templateKey: "then-and-now",
  createdOn: "2026-10-02",
  ownerKind: "Team",
  ownerName: "Lightspeed",
};

const A_PORTFOLIO_REPORT = {
  id: 2,
  name: "Quarter review",
  ownerKind: "Portfolio",
  ownerName: "Apollo II",
};

describe("the summary of every report", () => {
  it("counts the reports, then names each with its id, type, owner and created day", () => {
    const list = { reports: [A_TEAM_REPORT, A_PORTFOLIO_REPORT] };

    expect(summariseEveryReport(list, SEEDED_TERMS)).toBe(
      [
        "2 reports",
        "ID 1 · Then & Now — engagement start · then-and-now · Team Lightspeed · Fri 2 Oct 2026",
        "ID 2 · Quarter review · Portfolio Apollo II",
      ].join("\n"),
    );
  });

  it("counts a single report in the singular", () => {
    expect(
      summariseEveryReport({ reports: [A_PORTFOLIO_REPORT] }, SEEDED_TERMS),
    ).toMatch(/^1 report\n/u);
  });

  it("counts none when the list is empty", () => {
    expect(summariseEveryReport({ reports: [] }, SEEDED_TERMS)).toBe(
      "0 reports",
    );
  });

  it("names an owner's kind in the instance's words", () => {
    const said = summariseEveryReport(
      { reports: [A_TEAM_REPORT, A_PORTFOLIO_REPORT] },
      RENAMED,
    );

    expect(said).toContain("Squad Lightspeed");
    expect(said).toContain("Program Apollo II");
  });

  it("reads the owner's kind whatever its case", () => {
    expect(
      readEveryReport({
        reports: [{ ...A_TEAM_REPORT, ownerKind: "PORTFOLIO" }],
      })?.[0]?.ownerKind,
    ).toBe("portfolio");
  });

  it.each<[string, unknown]>([
    ["no answer", null],
    ["a bare list", [A_TEAM_REPORT]],
    ["no reports in it", { communityCap: 1 }],
    [
      "a row without its owner's kind",
      { reports: [{ ...A_TEAM_REPORT, ownerKind: undefined }] },
    ],
    [
      "a row without its owner's name",
      { reports: [A_PORTFOLIO_REPORT, { ...A_TEAM_REPORT, ownerName: "" }] },
    ],
    [
      "a row whose owner kind is unknown",
      { reports: [{ ...A_TEAM_REPORT, ownerKind: "Department" }] },
    ],
    ["a row that is not a report", { reports: [A_TEAM_REPORT, null] }],
  ])("says nothing of an answer with %s", (_what, answer) => {
    expect(readEveryReport(answer)).toBeNull();
    expect(summariseEveryReport(answer, SEEDED_TERMS)).toBeNull();
  });
});

describe("why the list of every report cannot be read", () => {
  it.each<[string, Partial<LighthouseApiError>, RegExp]>([
    [
      "an unauthorized reader",
      { statusCode: 401 },
      /not signed in.*LIGHTHOUSE_API_KEY.*lh connection connect --api-key/su,
    ],
    [
      "a forbidden reader",
      { statusCode: 403 },
      /^Lighthouse refused to list reports for you\.$/u,
    ],
    [
      "a Lighthouse without the list",
      { statusCode: 404 },
      /Upgrade Lighthouse/u,
    ],
    [
      "any other refusal",
      {
        category: "dependency-failure",
        reason: "Lighthouse is down",
        statusCode: 500,
      },
      /^dependency-failure: Lighthouse is down$/u,
    ],
  ])("says it for %s", (_what, facts, said) => {
    expect(describeEveryReportRefusal(aRefusal(facts))).toMatch(said);
  });
});

describe("the owner a summary names", () => {
  it.each<[string, Parameters<typeof describeReportOwner>, string]>([
    [
      "a Team by its name",
      ["team", 2, { name: "Lightspeed" }, SEEDED_TERMS],
      "Team Lightspeed",
    ],
    [
      "a Portfolio by its name",
      ["portfolio", 1, { name: "Apollo II" }, SEEDED_TERMS],
      "Portfolio Apollo II",
    ],
    [
      "a Team in the instance's word",
      ["team", 2, { name: "Lightspeed" }, RENAMED],
      "Squad Lightspeed",
    ],
    [
      "a Portfolio in the instance's word",
      ["portfolio", 1, { name: "Apollo II" }, RENAMED],
      "Program Apollo II",
    ],
    [
      "a Team whose name could not be read",
      ["team", 2, undefined, SEEDED_TERMS],
      "Team [id: 2]",
    ],
    ["a Team without a name", ["team", 2, { id: 2 }, RENAMED], "Squad [id: 2]"],
    [
      "a Portfolio whose name is empty",
      ["portfolio", 1, { name: "" }, SEEDED_TERMS],
      "Portfolio [id: 1]",
    ],
  ])("names %s", (_what, args, named) => {
    expect(describeReportOwner(...args)).toBe(named);
  });
});

const aRefusal = (facts: Partial<LighthouseApiError>): LighthouseApiError => ({
  category: "unexpected",
  reason: "Lighthouse said no",
  ...facts,
});

describe("why a report or a list cannot be read", () => {
  it.each<[string, Parameters<typeof describeReportRefusal>, string]>([
    [
      "no access to a Team",
      [aRefusal({ statusCode: 403 }), "team", "report", SEEDED_TERMS],
      "You have no access to that Team's reports.",
    ],
    [
      "no access to a renamed Portfolio",
      [aRefusal({ statusCode: 403 }), "portfolio", "list", RENAMED],
      "You have no access to that Program's reports.",
    ],
    [
      "a report a newer Lighthouse made",
      [
        aRefusal({ statusCode: 422, problemCode: "template-not-supported" }),
        "team",
        "report",
        SEEDED_TERMS,
      ],
      "This report was made by a newer version of Lighthouse and can't be shown here.",
    ],
    [
      "no such report",
      [aRefusal({ statusCode: 404 }), "team", "report", RENAMED],
      "There is no such report for that Squad.",
    ],
    [
      "no such Portfolio for a list",
      [aRefusal({ statusCode: 404 }), "portfolio", "list", SEEDED_TERMS],
      "There is no such Portfolio.",
    ],
    [
      "any other refusal",
      [
        aRefusal({
          category: "dependency-failure",
          reason: "Lighthouse is down",
          statusCode: 500,
        }),
        "team",
        "list",
        SEEDED_TERMS,
      ],
      "dependency-failure: Lighthouse is down",
    ],
  ])("says %s", (_what, args, said) => {
    expect(describeReportRefusal(...args)).toBe(said);
  });

  it("says it in the instance's words when Lighthouse refused", async () => {
    const said = await readReportRefusal(
      {
        getTerminology: async () => ({
          ok: true,
          value: [
            {
              id: 1,
              key: "team",
              description: "a Team",
              defaultValue: "Team",
              value: "Squad",
            },
          ],
        }),
      },
      aRefusal({ statusCode: 403 }),
      "team",
      "list",
    );

    expect(said).toBe("You have no access to that Squad's reports.");
  });

  it("asks Lighthouse nothing more when the client refused before asking", async () => {
    let asked = 0;
    const said = await readReportRefusal(
      {
        getTerminology: async () => {
          asked += 1;
          return { ok: true, value: [] };
        },
      },
      aRefusal({ category: "misconfigured", reason: "Upgrade Lighthouse" }),
      "team",
      "report",
    );

    expect(said).toBe("misconfigured: Upgrade Lighthouse");
    expect(asked).toBe(0);
  });
});
