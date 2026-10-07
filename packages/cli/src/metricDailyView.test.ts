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
} from "../../../test-support/metricsAnswers";
import {
  aLighthouse,
  inTimeZone,
  looksLikeTheGenericView,
  prose,
  shownLines,
} from "../test-support/cliHarness";

// Story 6218, slice 03 (US-03): `--metrics <name>` prints that metric's sentence and its every-day table.
// Every scenario is pending until DELIVER slice 03 un-skips it.

const metricOfGravity = (metric: string, ...flags: string[]) => [
  "metrics",
  "team",
  "--id",
  "3",
  ...GRAVITYS_RANGE,
  "--metrics",
  metric,
  ...flags,
];

const gravitysLighthouse = (reads = {}) =>
  aLighthouse({ getTeam: ok(gravity()), ...gravitysMetrics(), ...reads });

const OVER_THE_RANGE = "Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)";
const AS_OF_TODAY = "Gravity · as of Tue 6 Oct 2026";
const NOTHING_RECORDED =
  "Nothing to show for the selected range. Days appear here as Lighthouse records them.";

describe("lh metrics team --metrics <name> --pretty", () => {
  // @driving_port @US-03 @contract-shape:pure-function
  it("shows Priya each day's throughput under the total", async () => {
    const result = await gravitysLighthouse().run(
      metricOfGravity("throughput"),
    );

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines.slice(0, 7)).toEqual([
      OVER_THE_RANGE,
      "Total Throughput: 31 Work Items, 1.0 / day",
      "Date Work Items closed",
      "Mon 7 Sep 2026 2",
      "Tue 8 Sep 2026 0",
      "Wed 9 Sep 2026 1",
      "Thu 10 Sep 2026 1",
    ]);
    expect(lines.at(-1)).toBe("Tue 6 Oct 2026 3");
    expect(lines.filter((line) => / 2026 \d+$/u.test(line))).toHaveLength(30);
  });

  // @driving_port @US-03 — AC-03.1: each of the ten names, a sentence then its table (KPI-1 component)
  it.skip.each([
    {
      metric: "throughput",
      heading: OVER_THE_RANGE,
      says: "Total Throughput: 31 Work Items, 1.0 / day",
      columns: "Date Work Items closed",
    },
    {
      metric: "arrivals",
      heading: OVER_THE_RANGE,
      says: "Total Arrivals: 28 Work Items, 0.9 / day",
      columns: "Date Work Items started",
    },
    {
      metric: "wip",
      heading: AS_OF_TODAY,
      says: "Work Items in Progress: 9 (System WIP Limit: 10 Work Items)",
      columns: "ID Name State Work Item Age Blocked",
    },
    {
      metric: "cycleTime",
      heading: OVER_THE_RANGE,
      says: "Cycle Time Percentiles: 50th 5 days · 70th 8 days · 85th 12 days · 95th 21 days",
      columns: "ID Name Closed Cycle Time",
    },
    {
      metric: "workItemAge",
      heading: AS_OF_TODAY,
      says: "Work Item Age Percentiles: 50th 3 days · 70th 6 days · 85th 11 days · 95th 18 days",
      columns: "Date Oldest Work Items",
    },
    {
      metric: "totalWorkItemAge",
      heading: OVER_THE_RANGE,
      says: "Total Work Item Age: 84 days across 9 Work Items on Tue 6 Oct 2026",
      columns: "Date Total Work Item Age Work Items",
    },
    {
      metric: "predictabilityScore",
      heading: OVER_THE_RANGE,
      says: "Predictability Score: 63.4%",
      columns: undefined,
    },
    {
      metric: "blocked",
      heading: OVER_THE_RANGE,
      says: "Blocked Work Items: 1 on Mon 7 Sep → 2 on Tue 6 Oct",
      columns: "Date Blocked Work Items",
    },
    {
      metric: "percentilesOverTime",
      heading: OVER_THE_RANGE,
      says: "Cycle Time over the last 30 days, per recorded day",
      columns: "Date 50th 70th 85th 95th",
    },
    {
      metric: "processBehaviorOverTime",
      heading: OVER_THE_RANGE,
      says: "Throughput natural process limits per recorded day",
      columns: "Date Lower limit Average Upper limit",
    },
  ])(
    "says '$says' for --metrics $metric",
    async ({ metric, heading, says, columns }) => {
      const result = await gravitysLighthouse().run(metricOfGravity(metric));

      expect(result.exitCode).toBe(0);
      const lines = shownLines(result.stdout);
      expect(lines[0]).toBe(heading);
      expect(lines[1]).toBe(says);
      if (columns !== undefined) {
        expect(lines).toContain(columns);
      }
      expect(looksLikeTheGenericView(result.stdout)).toBe(false);
    },
  );

  // @US-03 — WorkItemsDialog.tsx: ID, Name, State, the age and the blocked marker
  it.skip("lists the Work Items in progress with their age and since when they are blocked", async () => {
    const result = await gravitysLighthouse().run(metricOfGravity("wip"));

    const lines = shownLines(result.stdout);
    expect(lines).toContain(
      "GR-061 Export flow report as PDF In Progress 14 days since Thu 1 Oct 2026",
    );
    expect(lines).toContain("GR-064 Retry failed Jira sync Review 9 days");
    expect(lines).toContain("Date Work Items in Progress");
    expect(lines).toContain("Tue 6 Oct 2026 9");
  });

  // @US-03 — the Closed Work Items dialog
  it.skip("lists each closed Work Item with the day it closed and its Cycle Time", async () => {
    const result = await gravitysLighthouse().run(metricOfGravity("cycleTime"));

    expect(shownLines(result.stdout)).toContain(
      'GR-052 Rename "Sprint" to "Iteration" Mon 7 Sep 2026 3 days',
    );
  });

  // @US-03 — PredictabilityScore.tsx, its explanation verbatim
  it.skip("explains the predictability score in the dashboard's own words", async () => {
    const result = await gravitysLighthouse().run(
      metricOfGravity("predictabilityScore"),
    );

    expect(prose(result.stdout)).toContain(
      'The predictability score shows how "close" the 50% and 95% chance are. The closer they are, the more predictable you are. 100% means they are exactly the same value. The higher number, the better.',
    );
  });

  // @error @US-03 — AC-03.2: overTimeEmptyState.ts, verbatim
  it.each([
    { metric: "percentilesOverTime", read: "getTeamPercentilesOverTime" },
    {
      metric: "processBehaviorOverTime",
      read: "getTeamProcessBehaviorOverTime",
    },
  ])(
    "says why --metrics $metric has no rows when Lighthouse has recorded no day yet",
    async ({ metric, read }) => {
      const lighthouse = gravitysLighthouse({ [read]: ok([]) });

      const result = await lighthouse.run(metricOfGravity(metric));

      expect(result.exitCode).toBe(0);
      expect(shownLines(result.stdout)).toContain(NOTHING_RECORDED);
      expect(result.stdout).not.toContain("Date ");
    },
  );

  // @US-03 — AC-03.4: several names, each complete, in the order given
  it.skip.each([
    {
      asked: "throughput,blocked",
      first: "Total Throughput:",
      second: "Blocked Work Items:",
    },
    {
      asked: "blocked,throughput",
      first: "Blocked Work Items:",
      second: "Total Throughput:",
    },
  ])(
    "shows --metrics $asked in the order Priya named them",
    async ({ asked, first, second }) => {
      const result = await gravitysLighthouse().run(metricOfGravity(asked));

      const lines = shownLines(result.stdout);
      const firstAt = lines.findIndex((line) => line.startsWith(first));
      const secondAt = lines.findIndex((line) => line.startsWith(second));
      expect(firstAt).toBeGreaterThan(0);
      expect(secondAt).toBeGreaterThan(firstAt);
      expect(lines).toContain("Date Work Items closed");
      expect(lines).toContain("Date Blocked Work Items");
    },
  );

  // @US-03 — AC-03.3: a named cycle time definition names the sentence (the Team's settings carry the names)
  it.skip("names the cycle time definition Priya chose", async () => {
    const lighthouse = gravitysLighthouse({
      getTeamSettings: ok({
        ...gravity(),
        cycleTimeDefinitions: [
          {
            id: 4,
            name: "Lead Time",
            startState: "To Do",
            endState: "Done",
            isValid: true,
          },
        ],
      }),
    });

    const result = await lighthouse.run(
      metricOfGravity("cycleTime", "--definition-id", "4"),
    );

    expect(shownLines(result.stdout)[1]).toBe(
      "Lead Time Percentiles: 50th 5 days · 70th 8 days · 85th 12 days · 95th 21 days",
    );
  });

  // @US-03 @kpi — KPI-5
  it.skip("says it in the words an instance has renamed every term to", async () => {
    const lighthouse = gravitysLighthouse({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const result = await lighthouse.run(
      metricOfGravity("throughput,blocked,wip"),
    );

    const lines = shownLines(result.stdout);
    expect(lines).toContain("Total Flow Rate: 31 Tickets, 1.0 / day");
    expect(lines).toContain("Date Tickets closed");
    expect(lines).toContain("Stuck Tickets: 1 on Mon 7 Sep → 2 on Tue 6 Oct");
    expect(seededWordsIn(result.stdout)).toEqual([]);
  });

  // @error @version-skew @US-03 — D5 + M1: one metric lh cannot read prints the generic view, silently
  it("shows the facts as they came when the one metric asked for has a shape lh does not know", async () => {
    const recognised = await gravitysLighthouse().run(
      metricOfGravity("totalWorkItemAge"),
    );
    expect(shownLines(recognised.stdout)[1]).toContain("Total Work Item Age:");
    const lighthouse = gravitysLighthouse({
      getTeamTotalWorkItemAgeOverTime: ok({
        startDate: "2026-09-07",
        endDate: "2026-10-06",
        days: [{ on: "2026-10-06", age: 84 }],
      }),
    });

    const result = await lighthouse.run(metricOfGravity("totalWorkItemAge"));

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(looksLikeTheGenericView(result.stdout)).toBe(true);
    expect(result.stdout).not.toContain("undefined");
  });

  // @boundary @US-03 @reader-time-zone — D15
  it.each(["America/Adak", "Pacific/Kiritimati"])(
    "dates each day as Lighthouse recorded it for a reader in %s",
    async (zone) => {
      const result = await inTimeZone(zone, () =>
        gravitysLighthouse().run(metricOfGravity("throughput")),
      );

      const lines = shownLines(result.stdout);
      expect(lines).toContain("Mon 7 Sep 2026 2");
      expect(lines.at(-1)).toBe("Tue 6 Oct 2026 3");
    },
  );
});
