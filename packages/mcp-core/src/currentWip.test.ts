import { decode } from "@toon-format/toon";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  gravityBeforeTheDaily,
  gravitysWorkInProgressToday,
  voyager,
  workInProgressWithoutBlockedFacts,
} from "../../../test-support/dailyFlowAnswers";
import {
  EVERY_TERM_RENAMED,
  ok,
  refused,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import {
  anAssistantOn,
  factsBlockOf,
  summaryBlockOf,
  type ToolResult,
} from "../test-support/mcpHarness";

// What is in progress right now, what is Blocked and since when, read by an assistant over MCP: the server's
// Work Items unchanged, and the summary `lh metrics team --metrics wip` prints for the same Team and day.

const TOOL = "lighthouse_team_metrics_wip";
const LABEL = "team wip: ";

const NO_WIP_LIMIT = "No System WIP Limit is set.";
const BLOCKED_NOT_KNOWN =
  "Lighthouse does not say which Work Items are Blocked.";
const NOTHING_IN_PROGRESS = "No Work Items are in progress.";

// GR-061 Blocked since Monday, GR-064 since Wednesday.
const twoBlocked = () =>
  gravitysWorkInProgressToday().map((item) =>
    item.referenceId === "GR-064"
      ? { ...item, isBlocked: true, blockedSince: "2026-10-07T08:00:00Z" }
      : item,
  );

const factsOf = (result: ToolResult): unknown =>
  decode(factsBlockOf(result).slice(LABEL.length));

const summaryOf = (result: ToolResult): string =>
  (summaryBlockOf(result) ?? "").replace(/^summary: /u, "");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-08T09:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("an assistant reads what is in progress right now through MCP", () => {
  // @walking_skeleton @driving_port @contract-shape:bounded-change
  it("receives each Work Item with its age, state, whether it is Blocked and since when, and its link", async () => {
    const assistant = anAssistantOn({
      getTeam: ok(gravityBeforeTheDaily()),
      getTeamWip: ok(twoBlocked()),
    });

    const result = await assistant.call(TOOL, { id: 3 });

    expect(result.isError).toBe(false);
    expect(factsBlockOf(result).startsWith(LABEL)).toBe(true);
    expect(factsOf(result)).toEqual(twoBlocked());
    const summary = summaryOf(result);
    expect(summary.split("\n")[0]).toBe("Gravity · as of Thu 8 Oct 2026");
    expect(summary).toMatch(/^Work Items in Progress:? 8\b/mu);
    expect(summary).toContain("System WIP Limit: 6 Work Items");
    expect(summary).toMatch(/^Blocked Work Items:? 2$/mu);
  });

  // @driving_port @contract-shape:bounded-change
  it("reads the Team's Work Items in progress as of today", async () => {
    const assistant = anAssistantOn({
      getTeam: ok(gravityBeforeTheDaily()),
      getTeamWip: (...args) =>
        args[1] === "2026-10-08"
          ? ok(twoBlocked())
          : refused("unexpected", `asked as of ${String(args[1])}`),
    });

    const result = await assistant.call(TOOL, { id: 3 });

    expect(result.isError).toBe(false);
    expect(assistant.asked()).toContain("getTeamWip");
  });
});

describe("what the summary says when there is less to say", () => {
  // @error @contract-shape:bounded-change
  it("tells a Team without a System WIP Limit that none is set", async () => {
    const result = await anAssistantOn({
      getTeam: ok(voyager()),
      getTeamWip: ok(twoBlocked()),
    }).call(TOOL, { id: 6 });

    expect(summaryOf(result)).toContain(NO_WIP_LIMIT);
    expect(summaryOf(result)).not.toContain("System WIP Limit:");
  });

  // @error @contract-shape:bounded-change
  // An older Lighthouse lists the Work Items without saying which are Blocked; that is not "none Blocked".
  it("does not read a Lighthouse that says nothing about Blocked as nothing Blocked", async () => {
    const result = await anAssistantOn({
      getTeam: ok(gravityBeforeTheDaily()),
      getTeamWip: ok(workInProgressWithoutBlockedFacts()),
    }).call(TOOL, { id: 3 });

    expect(result.isError).toBe(false);
    expect(factsOf(result)).toEqual(workInProgressWithoutBlockedFacts());
    expect(summaryOf(result)).toContain(BLOCKED_NOT_KNOWN);
    expect(summaryOf(result)).not.toMatch(/Blocked Work Items:? 0/u);
  });

  // @error @contract-shape:bounded-change
  it("says nothing is in progress when nothing is", async () => {
    const result = await anAssistantOn({
      getTeam: ok(gravityBeforeTheDaily()),
      getTeamWip: ok([]),
    }).call(TOOL, { id: 3 });

    expect(result.isError).toBe(false);
    expect(summaryOf(result)).toContain(NOTHING_IN_PROGRESS);
  });

  // @error @contract-shape:bounded-change
  it("says it in the instance's own words", async () => {
    const result = await anAssistantOn({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
      getTeam: ok(voyager()),
      getTeamWip: ok(workInProgressWithoutBlockedFacts()),
    }).call(TOOL, { id: 6 });

    expect(summaryOf(result)).toContain("No System Load Limit is set.");
    expect(summaryOf(result)).toContain(
      "Lighthouse does not say which Tickets are Stuck.",
    );
  });
});

describe("when Lighthouse cannot answer", () => {
  // @error @contract-shape:bounded-change
  it("passes a refused read on as the error it is, with no summary", async () => {
    const result = await anAssistantOn({
      getTeam: ok(gravityBeforeTheDaily()),
      getTeamWip: refused("forbidden", "No access"),
    }).call(TOOL, { id: 3 });

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      { type: "text", text: "team metrics: forbidden (No access)" },
    ]);
  });

  // @error @contract-shape:bounded-change
  // The summary's own reads only word the answer; they never cost the assistant the facts.
  it("still returns the Work Items when the Team or the Terminology cannot be read", async () => {
    const result = await anAssistantOn({
      getTerminology: refused("dependency-failure", "Terminology timed out"),
      getTeam: refused("dependency-failure", "Team timed out"),
      getTeamWip: ok(twoBlocked()),
    }).call(TOOL, { id: 3 });

    expect(result.isError).toBe(false);
    expect(factsOf(result)).toEqual(twoBlocked());
  });

  // @error @contract-shape:bounded-change
  // A Team that could not be read may well have a limit, so its absence is not claimed.
  it("says nothing about the System WIP Limit when the Team cannot be read", async () => {
    const result = await anAssistantOn({
      getTeam: refused("dependency-failure", "Team timed out"),
      getTeamWip: ok(twoBlocked()),
    }).call(TOOL, { id: 3 });

    expect(summaryOf(result)).toContain("Work Items in Progress: 8");
    expect(summaryOf(result)).not.toContain(NO_WIP_LIMIT);
  });
});

describe("the tools that count Blocked Work Items per day point to this read", () => {
  // @contract-shape:pure-function
  it("names the Team read and, for a Portfolio, the lh command", () => {
    const tools = anAssistantOn({}).runtime.listTools();
    const description = (name: string) =>
      tools.find((tool) => tool.name === name)?.description ?? "";

    expect(
      description("lighthouse_team_metrics_blockedCountHistory"),
    ).toContain("lighthouse_team_metrics_wip");
    expect(
      description("lighthouse_portfolio_metrics_blockedCountHistory"),
    ).toContain("lh metrics portfolio --metrics wip");
  });
});
