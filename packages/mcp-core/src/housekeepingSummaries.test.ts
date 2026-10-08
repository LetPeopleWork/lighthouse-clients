import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aBlackoutRule,
  aConnection,
  EVERY_TERM_RENAMED,
  ok,
  refused,
  terminology,
  threeConnections,
} from "../../../test-support/lighthouseAnswers";
import {
  anAssistantOn,
  answerOf,
  factsBlockOf,
  summaryBlockOf,
} from "../test-support/mcpHarness";

// Story 6218, slice 09: the housekeeping tools. Health, version and the two lists keep their facts block byte
// for byte and gain a second block; a single connection gains a `summary` field that names it and its type
// and never carries an option's value.

const twoRules = () => [
  aBlackoutRule(),
  aBlackoutRule({
    id: 6,
    weekdays: ["Monday", "Tuesday"],
    intervalWeeks: 1,
    start: "2026-12-01",
    end: "2026-12-22",
    description: "Hackathon",
    summary:
      "Every Monday, Tuesday — weekly — from 2026-12-01 — until 2026-12-22",
  }),
];

const sofiasAssistant = (reads = {}, options = {}) =>
  anAssistantOn(
    {
      getVersion: ok("v26.10.3.6"),
      listWorkTrackingConnections: ok(threeConnections()),
      getWorkTrackingConnection: ok(aConnection()),
      getRecurringBlackoutRules: ok(twoRules()),
      ...reads,
    },
    options,
  );

describe("the housekeeping tools' summary", () => {
  // @driving_port @US-09 @contract-shape:bounded-change
  it("keeps the health answer as it is and adds that Lighthouse is reachable", async () => {
    const result = await sofiasAssistant().call("lighthouse_health_check", {});

    expect(result.isError).toBe(false);
    expect(factsBlockOf(result)).toBe("connectivity: success");
    expect(summaryBlockOf(result)).toBe("summary: Lighthouse is reachable.");
  });

  // @driving_port @US-09 @contract-shape:bounded-change
  it("keeps the version as it is and adds the footer's words", async () => {
    const result = await sofiasAssistant().call("lighthouse_version_get", {});

    expect(factsBlockOf(result)).toBe("version: v26.10.3.6");
    expect(summaryBlockOf(result)).toBe("summary: Lighthouse v26.10.3.6");
  });

  // @driving_port @US-09 @contract-shape:bounded-change
  it.each([
    {
      tool: "lighthouse_worktracking_list",
      facts: () => `worktracking: ${encode(threeConnections() as never)}`,
      says: "summary: 3 Work Tracking Systems",
    },
    {
      tool: "lighthouse_blackout_list",
      facts: () => `recurringBlackoutRules: ${encode(twoRules() as never)}`,
      says: "summary: 2 recurring blackout rules",
    },
  ])(
    "keeps $tool's answer as it is and adds '$says'",
    async ({ tool, facts, says }) => {
      const result = await sofiasAssistant().call(tool, {});

      expect(result.isError).toBe(false);
      expect(factsBlockOf(result)).toBe(facts());
      expect(summaryBlockOf(result)).toBe(says);
    },
  );

  // @boundary @US-09 — one of each
  it.each([
    {
      tool: "lighthouse_worktracking_list",
      reads: { listWorkTrackingConnections: ok([aConnection()]) },
      says: "summary: 1 Work Tracking System",
    },
    {
      tool: "lighthouse_blackout_list",
      reads: { getRecurringBlackoutRules: ok([aBlackoutRule()]) },
      says: "summary: 1 recurring blackout rule",
    },
  ])(
    "counts a single entry in the singular: '$says'",
    async ({ tool, reads, says }) => {
      const result = await sofiasAssistant(reads).call(tool, {});

      expect(summaryBlockOf(result)).toBe(says);
    },
  );

  // @US-09 @kpi
  it("counts the Work Tracking Systems in the words an instance has renamed them to", async () => {
    const assistant = sofiasAssistant({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const result = await assistant.call("lighthouse_worktracking_list", {});

    expect(summaryBlockOf(result)).toBe("summary: 3 Trackers");
  });

  // @driving_port @US-09 @contract-shape:bounded-change — the summary names, never reveals
  it("names a connection and its type, and leaves every option value out of the summary", async () => {
    const leaky = aConnection({
      options: aConnection().options.map((option) =>
        option.isSecret ? { ...option, value: "ATATT-leaked-token" } : option,
      ),
    });
    const assistant = sofiasAssistant({ getWorkTrackingConnection: ok(leaky) });

    const result = await assistant.call("lighthouse_worktracking_get", {
      id: 1,
    });

    expect(result.isError).toBe(false);
    const { summary, ...facts } = answerOf(result, "worktracking: ");
    expect(facts).toEqual(leaky);
    expect(summary).toBe("Letpeoplework Jira [id: 1]\nType: Jira");
  });
});

describe("the housekeeping tools keep their errors as they are", () => {
  // @error @infrastructure-failure @US-09 — guard, green today
  it("passes an unreachable Lighthouse straight through, without a summary", async () => {
    const assistant = sofiasAssistant(
      {},
      { reachable: { category: "unreachable", reason: "connection refused" } },
    );

    const result = await assistant.call("lighthouse_health_check", {});

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "connectivity: unreachable (connection refused)" },
    ]);
  });

  // @error @US-09 — guard, green today
  it("passes a refused connection read straight through, without a summary", async () => {
    const assistant = sofiasAssistant({
      getWorkTrackingConnection: refused("not-found", "Connection 9 not found"),
    });

    const result = await assistant.call("lighthouse_worktracking_get", {
      id: 9,
    });

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.text).toContain("not-found");
  });
});
