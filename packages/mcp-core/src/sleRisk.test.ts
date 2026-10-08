import { decode } from "@toon-format/toon";
import { describe, expect, it, vi } from "vitest";
import {
  gravityBeforeTheDaily,
  gravitysSleRisk,
  gravitysWorkInProgressToday,
  sleRiskAroundTheLine,
  voyager,
} from "../../../test-support/dailyFlowAnswers";
import { ok, refused } from "../../../test-support/lighthouseAnswers";
import {
  anAssistantOn,
  factsBlockOf,
  summaryBlockOf,
  type ToolResult,
} from "../test-support/mcpHarness";

// How likely each Work Item in progress is to miss the Team's SLE, as Lighthouse's SLE Risk widget shows it,
// read by an assistant over MCP: the server's numbers unchanged, and the summary lh prints.

const TOOL = "lighthouse_team_metrics_sleRisk";
const LABEL = "team sleRisk: ";

const factsOf = (result: ToolResult): unknown =>
  decode(factsBlockOf(result).slice(LABEL.length));

const summaryOf = (result: ToolResult): string =>
  (summaryBlockOf(result) ?? "").replace(/^summary: /u, "");

const lineOf = (summary: string, referenceId: string): string =>
  summary
    .split("\n")
    .map((line) => line.replaceAll(/\s+/gu, " ").trim())
    .find((line) => line.startsWith(referenceId)) ?? "";

const gravitysDaily = (reads = {}) =>
  anAssistantOn({
    getTeam: ok(gravityBeforeTheDaily()),
    getTeamSleRisk: ok(gravitysSleRisk()),
    getTeamWip: ok(gravitysWorkInProgressToday()),
    ...reads,
  });

describe("an assistant reads which Work Items are at risk of missing the SLE", () => {
  // @driving_port @contract-shape:bounded-change
  it("receives Lighthouse's own risk for each Work Item and the summary lh prints", async () => {
    const result = await gravitysDaily().call(TOOL, { id: 3 });

    expect(result.isError).toBe(false);
    expect(factsOf(result)).toEqual(gravitysSleRisk());
    expect(summaryOf(result)).toContain(
      "2 of 8 Work Items in progress are at risk of missing the SLE (85% within 7 days).",
    );
  });

  // @driving_port @contract-shape:bounded-change
  it("lists every Work Item highest risk first, with the finished Work Items behind each number", async () => {
    const summary = summaryOf(await gravitysDaily().call(TOOL, { id: 3 }));
    const order = ["GR-058", "GR-061", "GR-063", "GR-064"].map((id) =>
      summary.indexOf(`\n${id}`),
    );

    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((left, right) => left - right)).toEqual(order);
    expect(lineOf(summary, "GR-058")).toMatch(/past the SLE\.?$/u);
    expect(lineOf(summary, "GR-063")).toContain("Alert digest email");
    expect(lineOf(summary, "GR-063")).toContain("55%");
    expect(lineOf(summary, "GR-063")).toContain(
      "6 of 11 finished Work Items that reached this age went past 7 days",
    );
  });

  // @error @contract-shape:pure-function
  // At risk starts at 70%, the line Lighthouse's own widget draws.
  it("counts a Work Item at 70% as at risk and one at 69% as not", async () => {
    const result = await gravitysDaily({
      getTeamSleRisk: ok(sleRiskAroundTheLine()),
    }).call(TOOL, { id: 3 });

    expect(summaryOf(result)).toContain(
      "2 of 3 Work Items in progress are at risk of missing the SLE (85% within 7 days).",
    );
  });
});

describe("when there is no risk to read", () => {
  // @error @contract-shape:bounded-change
  it("tells a Team without an SLE that it has no SLE Risk", async () => {
    const result = await anAssistantOn({
      getTeam: ok(voyager()),
      getTeamSleRisk: ok([]),
      getTeamWip: ok(gravitysWorkInProgressToday()),
    }).call(TOOL, { id: 6 });

    expect(result.isError).toBe(false);
    expect(summaryOf(result)).toContain(
      "Voyager has no SLE, so there is no SLE Risk.",
    );
    expect(summaryOf(result)).not.toContain("%");
  });

  // @error @contract-shape:bounded-change
  // A Team that could not be read may well have an SLE, so its absence is not claimed.
  it("says nothing about the SLE when the Team cannot be read", async () => {
    const result = await gravitysDaily({
      getTeam: refused("dependency-failure", "Team timed out"),
      getTeamSleRisk: ok([]),
    }).call(TOOL, { id: 3 });

    expect(result.isError).toBe(false);
    expect(summaryOf(result)).toContain("SLE Risk");
    expect(summaryOf(result)).not.toContain("has no SLE");
  });

  // @error @contract-shape:bounded-change
  it("names the Team by its id and says only the title when it cannot be read and nothing is at risk", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T12:00:00Z"));
    try {
      const result = await gravitysDaily({
        getTeam: refused("dependency-failure", "Team timed out"),
        getTeamSleRisk: ok([]),
      }).call(TOOL, { id: 3 });

      expect(summaryOf(result).split("\n")).toEqual([
        "Team [id: 3] · as of Thu 8 Oct 2026",
        "SLE Risk",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  // @error @contract-shape:bounded-change
  it("says nothing is in progress when a Team with an SLE has nothing in progress", async () => {
    const result = await gravitysDaily({
      getTeamSleRisk: ok([]),
      getTeamWip: ok([]),
    }).call(TOOL, { id: 3 });

    expect(summaryOf(result)).toContain("No Work Items are in progress.");
  });

  // @error @contract-shape:bounded-change
  it("passes on an older Lighthouse's refusal as the upgrade it asks for", async () => {
    const result = await gravitysDaily({
      getTeamSleRisk: refused(
        "misconfigured",
        'This Lighthouse server (v26.9.9.9) does not support "sleRisk" — it requires a version newer than v26.9.9.9. Upgrade Lighthouse to use this client feature.',
      ),
    }).call(TOOL, { id: 3 });

    expect(result.isError).toBe(true);
    expect(factsBlockOf(result)).toContain("Upgrade Lighthouse");
  });

  // @error @contract-shape:bounded-change
  // The names and ages come from a second read that only words the summary; without it the numbers stand.
  it("keeps every risk when the Work Items' names cannot be read", async () => {
    const result = await gravitysDaily({
      getTeamWip: refused("dependency-failure", "WIP timed out"),
    }).call(TOOL, { id: 3 });

    expect(result.isError).toBe(false);
    expect(factsOf(result)).toEqual(gravitysSleRisk());
    const line = lineOf(summaryOf(result), "GR-063");
    expect(line).toContain("55%");
    expect(line).not.toContain("Alert digest email");
  });
});
