import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aTeam,
  EVERY_TERM_RENAMED,
  fivePortfolios,
  gravity,
  oceanExplorer,
  ok,
  refused,
  sevenTeams,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import {
  anAssistantOn,
  answerOf,
  factsBlockOf,
  summaryBlockOf,
} from "../test-support/mcpHarness";

// A list keeps its facts block byte for byte and gains a second block with a count in the instance's words;
// a single Team or Portfolio gains a `summary` field holding the page's heading and settings.

describe("the Team and Portfolio list tools' summary", () => {
  // @driving_port @US-05 @contract-shape:bounded-change
  it.each([
    {
      tool: "lighthouse_team_list",
      read: "listTeams",
      label: "teams: ",
      answer: sevenTeams(),
      renamed: {},
      says: "summary: 7 Teams",
    },
    {
      tool: "lighthouse_team_list",
      read: "listTeams",
      label: "teams: ",
      answer: [gravity()],
      renamed: {},
      says: "summary: 1 Team",
    },
    {
      tool: "lighthouse_team_list",
      read: "listTeams",
      label: "teams: ",
      answer: sevenTeams(),
      renamed: EVERY_TERM_RENAMED,
      says: "summary: 7 Squads",
    },
    {
      tool: "lighthouse_portfolio_list",
      read: "listPortfolios",
      label: "portfolios: ",
      answer: fivePortfolios(),
      renamed: {},
      says: "summary: 5 Portfolios",
    },
  ])(
    "keeps $tool's facts as they are and adds '$says'",
    async ({ tool, read, label, answer, renamed, says }) => {
      const assistant = anAssistantOn({
        [read]: ok(answer),
        getTerminology: ok(terminology(renamed)),
      });

      const result = await assistant.call(tool);

      expect(result.isError).toBe(false);
      expect(factsBlockOf(result)).toBe(`${label}${encode(answer as never)}`);
      expect(summaryBlockOf(result)).toBe(says);
    },
  );

  // @error @infrastructure-failure @US-05 — the summary's reads never fail the tool
  it("counts in the seeded words when the instance's terms cannot be read", async () => {
    const assistant = anAssistantOn({
      listTeams: ok(sevenTeams()),
      getTerminology: refused("unexpected", "Terminology is unavailable"),
    });

    const result = await assistant.call("lighthouse_team_list");

    expect(result.isError).toBe(false);
    expect(summaryBlockOf(result)).toBe("summary: 7 Teams");
  });

  // @error @version-skew @US-05 — a row without a name and id cannot be counted as a Team
  it("adds no count to a list whose Teams it does not recognise", async () => {
    const recognised = await anAssistantOn({
      listTeams: ok(sevenTeams()),
    }).call("lighthouse_team_list");
    expect(summaryBlockOf(recognised)).not.toBeNull();
    const { name: _no, id: _neither, ...anonymous } = aTeam();
    const assistant = anAssistantOn({ listTeams: ok([anonymous]) });

    const result = await assistant.call("lighthouse_team_list");

    expect(result.content).toEqual([
      { type: "text", text: `teams: ${encode([anonymous] as never)}` },
    ]);
  });
});

describe("the Team and Portfolio get tools' summary", () => {
  // @driving_port @US-05 @contract-shape:bounded-change
  it.each([
    {
      tool: "lighthouse_team_get",
      read: "getTeam",
      label: "team: ",
      answer: gravity(),
      says: [
        "Gravity [id: 3]",
        "Service Level Expectation: 85% of Work Items within 12 days or less",
      ],
    },
    {
      tool: "lighthouse_portfolio_get",
      read: "getPortfolio",
      label: "portfolio: ",
      answer: oceanExplorer(),
      says: ["Ocean Explorer [id: 2]", "Feature WIP: 3 Teams"],
    },
  ])(
    "hands $tool's facts over with the page's heading and settings as its summary",
    async ({ tool, read, label, answer, says }) => {
      const assistant = anAssistantOn({ [read]: ok(answer) });

      const result = await assistant.call(tool, { id: answer.id });

      expect(result.isError).toBe(false);
      const { summary, ...facts } = answerOf(result, label);
      expect(facts).toEqual(answer);
      for (const line of says) {
        expect(String(summary)).toContain(line);
      }
    },
  );

  // @driving_port @US-05
  it.each([
    "lighthouse_team_list",
    "lighthouse_team_get",
    "lighthouse_portfolio_list",
    "lighthouse_portfolio_get",
  ])("tells an assistant in %s's description what `summary` holds", (tool) => {
    const description =
      anAssistantOn({})
        .runtime.listTools()
        .find((listed) => listed.name === tool)?.description ?? "";

    expect(description).toContain("`summary`");
  });
});
