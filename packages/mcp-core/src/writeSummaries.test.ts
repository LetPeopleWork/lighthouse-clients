import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aBlackoutRule,
  ok,
  refused,
} from "../../../test-support/lighthouseAnswers";
import { anAssistantOn } from "../test-support/mcpHarness";

// The write tools MCP has (refresh, blackout create/update/delete; MCP has no Team or
// Portfolio create, update or delete). Each keeps today's text block byte for byte and adds the CLI's
// one-line confirmation as a second block. A blackout rule already carries a `summary` field of its own (the
// server's schedule), so it takes the second block too: putting the confirmation in that field would
// overwrite a fact.

const sofiasAssistant = (reads = {}) =>
  anAssistantOn({
    refreshTeam: ok(undefined),
    refreshPortfolio: ok(undefined),
    createRecurringBlackoutRule: ok(aBlackoutRule()),
    updateRecurringBlackoutRule: ok(aBlackoutRule()),
    deleteRecurringBlackoutRule: ok(undefined),
    ...reads,
  });

const textBlocks = (...texts: string[]) =>
  texts.map((text) => ({ type: "text", text }));

describe("the write tools' summary", () => {
  it.each([
    {
      tool: "lighthouse_team_refresh",
      argumentsPayload: { id: 3 },
      facts: "team refreshed: 3",
      says: "summary: Refresh queued: Team [id: 3]. Lighthouse updates it in the background.",
    },
    {
      tool: "lighthouse_portfolio_refresh",
      argumentsPayload: { id: 2 },
      facts: "portfolio refreshed: 2",
      says: "summary: Refresh queued: Portfolio [id: 2]. Lighthouse updates it in the background.",
    },
    {
      tool: "lighthouse_blackout_create",
      argumentsPayload: {
        weekdays: ["Friday"],
        intervalWeeks: 2,
        start: "2026-10-09",
        description: "Focus Friday",
      },
      facts: `recurringBlackoutRule: ${encode(aBlackoutRule() as never)}`,
      says: "summary: Created: recurring blackout rule [id: 5] — Every Friday — every 2 weeks — from 2026-10-09 — no end (Focus Friday).",
    },
    {
      tool: "lighthouse_blackout_update",
      argumentsPayload: { id: 5, description: "Focus Friday" },
      facts: `recurringBlackoutRule: ${encode(aBlackoutRule() as never)}`,
      says: "summary: Updated: recurring blackout rule [id: 5] — Every Friday — every 2 weeks — from 2026-10-09 — no end (Focus Friday).",
    },
    {
      tool: "lighthouse_blackout_delete",
      argumentsPayload: { id: 5 },
      facts: "recurringBlackoutRule deleted: 5",
      says: "summary: Deleted: recurring blackout rule [id: 5].",
    },
  ])(
    "keeps $tool's answer as it is and adds '$says'",
    async ({ tool, argumentsPayload, facts, says }) => {
      const result = await sofiasAssistant().call(tool, argumentsPayload);

      expect(result.isError).toBe(false);
      expect(result.content).toEqual(textBlocks(facts, says));
    },
  );
});

describe("the write tools keep their errors as they are", () => {
  it("passes a refused refresh straight through, without a summary", async () => {
    const assistant = sofiasAssistant({
      refreshTeam: refused("not-found", "Team 3 not found"),
    });

    const result = await assistant.call("lighthouse_team_refresh", { id: 3 });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual(
      textBlocks("team refresh: not-found (Team 3 not found)"),
    );
  });
});
