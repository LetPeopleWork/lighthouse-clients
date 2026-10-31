import { describe, expect, it } from "vitest";
import { ok } from "../../../test-support/lighthouseAnswers";
import {
  anAssistantOn,
  factsBlockOf,
  summaryBlockOf,
} from "../test-support/mcpHarness";

// The four report tools as an assistant finds and calls them: what each says it does and takes, the label its
// answer opens with, and the arguments it refuses before asking Lighthouse anything.

const AN_ENGAGEMENT_START = {
  id: 1,
  name: "Engagement start",
  templateKey: "then-and-now",
  thenAndNow: {
    thenWindow: { start: "2026-05-03", end: "2026-07-31" },
    nowWindow: { start: "2026-07-05", end: "2026-10-02" },
  },
};

const HOW_LIGHTHOUSE_SHOWS_IT =
  "Read the lighthouse-reports skill for how Lighthouse shows these values, and quote them as they come.";
const HOW_THE_ANSWER_READS =
  "The first block is Lighthouse's answer, unchanged; a second text block, `summary`,";
const NEEDS_A_SERVER = "Needs a Lighthouse newer than v26.10.10.1.";

const listTool = (kind: "team" | "portfolio") => ({
  name: `lighthouse_${kind}_report_list`,
  description: `List the reports a ${kind} holds by ${kind} ID: each report's id, name, type (templateKey) and when it was created. ${HOW_THE_ANSWER_READS} names the ${kind} and counts its reports in the instance's terminology. ${HOW_LIGHTHOUSE_SHOWS_IT} ${NEEDS_A_SERVER}`,
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "integer", description: `The ${kind}'s numeric id.` },
    },
    required: ["id"],
    additionalProperties: false,
  },
});

const getTool = (kind: "team" | "portfolio") => ({
  name: `lighthouse_${kind}_report_get`,
  description: `Get one of a ${kind}'s reports by ${kind} ID and reportId, exactly as Lighthouse answers it: its Then side as Lighthouse froze it, its Now side read afresh up to today, and every value, a missing value with its reason. ${HOW_LIGHTHOUSE_SHOWS_IT} ${HOW_THE_ANSWER_READS} names the report, its ${kind} and its Then and Now windows. ${NEEDS_A_SERVER}`,
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "integer", description: `The ${kind}'s numeric id.` },
      reportId: {
        type: "integer",
        description:
          "The report's id, as its owner's report list names it under reports[].id.",
      },
    },
    required: ["id", "reportId"],
    additionalProperties: false,
  },
});

describe("the report tools an assistant finds", () => {
  it("says what each tool reads and takes", () => {
    const { runtime } = anAssistantOn({});

    const reportTools = runtime
      .listTools()
      .filter((tool) => tool.name.includes("_report_"));

    expect(reportTools).toEqual([
      expect.objectContaining({
        name: "lighthouse_report_list",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      }),
      listTool("team"),
      getTool("team"),
      listTool("portfolio"),
      getTool("portfolio"),
    ]);
  });
});

describe("the label a report tool's answer opens with", () => {
  it("opens a list with reports and a report with report", async () => {
    const { call } = anAssistantOn({
      getTeamReports: ok({ reports: [] }),
      getPortfolioReport: ok(AN_ENGAGEMENT_START),
      getTeam: ok({ id: 2, name: "Lightspeed" }),
      getPortfolio: ok({ id: 1, name: "Apollo II" }),
    });

    const listed = await call("lighthouse_team_report_list", { id: 2 });
    const read = await call("lighthouse_portfolio_report_get", {
      id: 1,
      reportId: 1,
    });

    expect(factsBlockOf(listed)).toMatch(/^reports: /u);
    expect(summaryBlockOf(listed)).toBe(
      "summary: Team Lightspeed · No reports",
    );
    expect(factsBlockOf(read)).toMatch(/^report: /u);
    expect(summaryBlockOf(read)).toBe(
      [
        "summary: Engagement start",
        "Portfolio Apollo II",
        "Then Sun 3 May 2026 – Fri 31 Jul 2026 · Now Sun 5 Jul 2026 – Fri 2 Oct 2026",
      ].join("\n"),
    );
  });
});

describe("the arguments a report tool refuses before asking Lighthouse", () => {
  it.each<[string, string, unknown, string]>([
    [
      "a list without an owner",
      "lighthouse_team_report_list",
      {},
      "reports: invalid id",
    ],
    [
      "a list of a Portfolio with a text id",
      "lighthouse_portfolio_report_list",
      { id: "1" },
      "reports: invalid id",
    ],
    [
      "a report without an owner",
      "lighthouse_team_report_get",
      { reportId: 1 },
      "report: invalid id",
    ],
    [
      "a report without its id",
      "lighthouse_team_report_get",
      { id: 2 },
      "report: invalid reportId",
    ],
    [
      "a report whose id is text",
      "lighthouse_portfolio_report_get",
      { id: 1, reportId: "3" },
      "report: invalid reportId",
    ],
    [
      "a report whose id is not whole",
      "lighthouse_team_report_get",
      { id: 2, reportId: 1.5 },
      "report: invalid reportId",
    ],
  ])("refuses %s", async (_what, tool, argumentsPayload, said) => {
    const { call, asked } = anAssistantOn({});

    const result = await call(tool, argumentsPayload);

    expect(result.isError).toBe(true);
    expect(factsBlockOf(result)).toBe(said);
    expect(asked()).toEqual([]);
  });
});
