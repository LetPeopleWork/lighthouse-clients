import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  EVERY_TERM_RENAMED,
  gravity,
  ok,
  seededWordsIn,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import {
  GRAVITYS_RANGE,
  gravitysMetrics,
  gravitysTimeInState,
} from "../../../test-support/metricsAnswers";
import {
  aLighthouse,
  looksLikeTheGenericView,
  shownLines,
} from "../test-support/cliHarness";

// Time in State reads as a table in workflow order, with its drill-down.

const timeInStateOfGravity = (...flags: string[]) => [
  "metrics",
  "team",
  "--id",
  "3",
  ...GRAVITYS_RANGE,
  "--metrics",
  "cumulativeStateTime",
  ...flags,
];

const gravitysLighthouse = (reads = {}) =>
  aLighthouse({ getTeam: ok(gravity()), ...gravitysMetrics(), ...reads });

const STATES_IN_WORKFLOW_ORDER = [
  "State Total days Work Items Completed Ongoing Mean Median",
  "To Do 96 18 12 6 5.3 days 4 days",
  "In Progress 241 31 22 9 7.8 days 6 days",
  "Review 88 27 21 6 3.3 days 2 days",
  "Test 61 23 20 3 2.7 days —",
];

describe("lh metrics team --metrics cumulativeStateTime --pretty", () => {
  it("shows Priya where Gravity's time goes, one state per row in workflow order", async () => {
    const lighthouse = gravitysLighthouse();

    const result = await lighthouse.run(timeInStateOfGravity());

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines.slice(0, 2)).toEqual([
      "Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)",
      "Time in State across 42 Work Items",
    ]);
    const header = lines.indexOf(STATES_IN_WORKFLOW_ORDER[0]);
    expect(lines.slice(header, header + 5)).toEqual(STATES_IN_WORKFLOW_ORDER);
  });

  it("says '—' for a state without a median", async () => {
    const result = await gravitysLighthouse().run(timeInStateOfGravity());

    expect(shownLines(result.stdout)).toContain("Test 61 23 20 3 2.7 days —");
    expect(result.stdout).not.toContain("null");
  });

  // The picker's list is the web's control, not an answer
  it("does not print the list of Work Items the web offers to pick from", async () => {
    const result = await gravitysLighthouse().run(timeInStateOfGravity());

    expect(shownLines(result.stdout)[1]).toBe(
      "Time in State across 42 Work Items",
    );
    expect(result.stdout).not.toContain("GR-041");
  });

  // The drill-down dialog, verbatim
  it("lists the Work Items contributing to Review with their days", async () => {
    const lighthouse = gravitysLighthouse();

    const result = await lighthouse.run(
      timeInStateOfGravity("--state", "Review"),
    );

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines).toContain(STATES_IN_WORKFLOW_ORDER[1]);
    const title = lines.indexOf("Work Items contributing to Review");
    expect(title).toBeGreaterThan(lines.indexOf(STATES_IN_WORKFLOW_ORDER[4]));
    expect(lines.slice(title + 1, title + 4)).toEqual([
      "ID Name Type State Days Contributed",
      "GR-064 Retry failed Jira sync User Story Review 6",
      "GR-058 Burn-up chart legend wraps Bug Done 4",
    ]);
  });

  // The picked subset narrows the count, as the web narrows it
  it("counts only the Work Items Priya picked", async () => {
    const result = await gravitysLighthouse().run(
      timeInStateOfGravity("--item-ids", "61,64"),
    );

    expect(shownLines(result.stdout)[1]).toBe(
      "Time in State across 2 Work Items",
    );
  });

  it("says it in the words an instance has renamed every term to", async () => {
    const lighthouse = gravitysLighthouse({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const result = await lighthouse.run(
      timeInStateOfGravity("--state", "Review"),
    );

    const lines = shownLines(result.stdout);
    expect(lines).toContain("Time in State across 42 Tickets");
    expect(lines).toContain(
      "State Total days Tickets Completed Ongoing Mean Median",
    );
    expect(lines).toContain("Tickets contributing to Review");
    expect(seededWordsIn(result.stdout)).toEqual([]);
  });

  it("shows the facts as they came when the states arrive without their workflow order", async () => {
    const recognised = await gravitysLighthouse().run(timeInStateOfGravity());
    expect(shownLines(recognised.stdout)).toContain(
      STATES_IN_WORKFLOW_ORDER[0],
    );
    const unordered = {
      states: gravitysTimeInState().states.map(
        ({ workflowOrder: _notSent, ...state }) => state,
      ),
    };
    const lighthouse = gravitysLighthouse({
      getTeamCumulativeStateTime: ok(unordered),
    });

    const result = await lighthouse.run(timeInStateOfGravity());

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(looksLikeTheGenericView(result.stdout)).toBe(true);
  });
});

describe("lh metrics --metrics cumulativeStateTime keeps the facts formats as they are", () => {
  it("hands scripts the bar, the candidates and the drill-down unchanged with --json", async () => {
    const lighthouse = gravitysLighthouse();

    const result = await lighthouse.run(
      timeInStateOfGravity("--state", "Review", "--json"),
    );

    expect(result.exitCode).toBe(0);
    expect(
      createHash("sha256").update(result.stdout).digest("hex"),
    ).toMatchInlineSnapshot(
      `"c656f664b6d043639436c78c61939c05d66508e5d565d4c36b741ad6eb3c239e"`,
    );
    expect(lighthouse.asked().sort()).toEqual([
      "getTeamCumulativeStateTime",
      "getTeamCumulativeStateTimeCandidates",
      "getTeamCumulativeStateTimeItems",
    ]);
  });
});
