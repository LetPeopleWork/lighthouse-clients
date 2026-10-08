import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  aBlackoutRule,
  aPortfolio,
  aTeam,
  EVERY_TERM_RENAMED,
  ok,
  refused,
  seededWordsIn,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import { aLighthouse } from "../test-support/cliHarness";

// Under --pretty every write confirms in one line, in the instance's words, and a refresh says it was
// queued. The blackout line carries the schedule exactly as Lighthouse words it in `summary`. A missing
// name, a missing description or unreadable terms never fail the confirmation.

const PAYLOAD_FILES = {
  "lightspeed.json": JSON.stringify({ name: "Lightspeed" }),
  "gravity.json": JSON.stringify({ name: "Gravity" }),
  "apollo.json": JSON.stringify({ name: "Apollo II" }),
  "oe.json": JSON.stringify({ name: "Ocean Explorer" }),
  "focus-friday.json": JSON.stringify({
    weekdays: ["Friday"],
    intervalWeeks: 2,
    start: "2026-10-09",
    description: "Focus Friday",
  }),
};

const WEEKLY_FOCUS_FRIDAY = aBlackoutRule({
  intervalWeeks: 1,
  summary: "Every Friday — weekly — from 2026-10-09 — no end",
});

const sofiasLighthouse = (reads = {}) =>
  aLighthouse(
    {
      createTeam: ok(aTeam({ name: "Lightspeed", id: 9 })),
      updateTeam: ok(aTeam()),
      deleteTeam: ok(undefined),
      refreshTeam: ok(undefined),
      createPortfolio: ok(aPortfolio({ name: "Apollo II", id: 6 })),
      updatePortfolio: ok(aPortfolio()),
      deletePortfolio: ok(undefined),
      refreshPortfolio: ok(undefined),
      createRecurringBlackoutRule: ok(aBlackoutRule()),
      updateRecurringBlackoutRule: ok(WEEKLY_FOCUS_FRIDAY),
      deleteRecurringBlackoutRule: ok(undefined),
      ...reads,
    },
    { payloadFiles: PAYLOAD_FILES },
  );

const WRITES = [
  {
    args: ["team", "create", "--payload-file", "lightspeed.json"],
    reads: "Created: Team Lightspeed [id: 9].",
  },
  {
    args: ["team", "update", "--id", "3", "--payload-file", "gravity.json"],
    reads: "Updated: Team Gravity [id: 3].",
  },
  { args: ["team", "delete", "--id", "9"], reads: "Deleted: Team [id: 9]." },
  {
    args: ["team", "refresh", "--id", "3"],
    reads:
      "Refresh queued: Team [id: 3]. Lighthouse updates it in the background.",
  },
  {
    args: ["portfolio", "create", "--payload-file", "apollo.json"],
    reads: "Created: Portfolio Apollo II [id: 6].",
  },
  {
    args: ["portfolio", "update", "--id", "2", "--payload-file", "oe.json"],
    reads: "Updated: Portfolio Ocean Explorer [id: 2].",
  },
  {
    args: ["portfolio", "delete", "--id", "6"],
    reads: "Deleted: Portfolio [id: 6].",
  },
  {
    args: ["portfolio", "refresh", "--id", "2"],
    reads:
      "Refresh queued: Portfolio [id: 2]. Lighthouse updates it in the background.",
  },
  {
    args: ["blackout", "create", "--payload-file", "focus-friday.json"],
    reads:
      "Created: recurring blackout rule [id: 5] — Every Friday — every 2 weeks — from 2026-10-09 — no end (Focus Friday).",
  },
  {
    args: [
      "blackout",
      "update",
      "--id",
      "5",
      "--payload-file",
      "focus-friday.json",
    ],
    reads:
      "Updated: recurring blackout rule [id: 5] — Every Friday — weekly — from 2026-10-09 — no end (Focus Friday).",
  },
  {
    args: ["blackout", "delete", "--id", "5"],
    reads: "Deleted: recurring blackout rule [id: 5].",
  },
];

describe("lh writes --pretty", () => {
  // @driving_port @US-08 @contract-shape:bounded-change — AC-08.1: all 11 write forms
  it.each(WRITES)(
    "confirms `lh $args` in one line: '$reads'",
    async ({ args, reads }) => {
      const result = await sofiasLighthouse().run(args);

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toBe(reads);
    },
  );

  // @error @version-skew @US-08 — AC-08.2: a write answer without a name
  it("names the new Team by its id when Lighthouse's answer carries no name", async () => {
    const lighthouse = sofiasLighthouse({ createTeam: ok({ id: 9 }) });

    const result = await lighthouse.run([
      "team",
      "create",
      "--payload-file",
      "lightspeed.json",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Created: Team [id: 9].");
  });

  // @error @US-08 — a rule without a description says only the schedule
  it("confirms a blackout rule without a description by its schedule alone", async () => {
    const lighthouse = sofiasLighthouse({
      createRecurringBlackoutRule: ok(aBlackoutRule({ description: "" })),
    });

    const result = await lighthouse.run([
      "blackout",
      "create",
      "--payload-file",
      "focus-friday.json",
    ]);

    expect(result.stdout).toBe(
      "Created: recurring blackout rule [id: 5] — Every Friday — every 2 weeks — from 2026-10-09 — no end.",
    );
  });

  // @US-08 @kpi — KPI-5: the entity word is the instance's
  it("names the Team and Portfolio in the words an instance has renamed them to", async () => {
    const lighthouse = sofiasLighthouse({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const refresh = await lighthouse.run(["team", "refresh", "--id", "3"]);
    const update = await lighthouse.run([
      "portfolio",
      "update",
      "--id",
      "2",
      "--payload-file",
      "oe.json",
    ]);

    expect(refresh.stdout).toBe(
      "Refresh queued: Squad [id: 3]. Lighthouse updates it in the background.",
    );
    expect(update.stdout).toBe("Updated: Programme Ocean Explorer [id: 2].");
    expect(seededWordsIn(`${refresh.stdout}\n${update.stdout}`)).toEqual([]);
  });

  // @error @infrastructure-failure @US-08 — D4
  it("confirms in the seeded words when the instance's terms cannot be read", async () => {
    const lighthouse = sofiasLighthouse({
      getTerminology: refused("unexpected", "Terminology is unavailable"),
    });

    const result = await lighthouse.run(["team", "delete", "--id", "9"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("Deleted: Team [id: 9].");
  });
});

// Guards, green today and on every slice after (D4, DSN-12, KPI-2).
describe("lh writes keep the facts formats, today's lines and errors as they are", () => {
  // @driving_port @US-08 @contract-shape:unbounded-preservation — DSN-12
  it.each([
    { args: ["team", "delete", "--id", "9"], line: "Team deleted: 9" },
    { args: ["team", "refresh", "--id", "3"], line: "Team refreshed: 3" },
    {
      args: ["portfolio", "delete", "--id", "6"],
      line: "Portfolio deleted: 6",
    },
    {
      args: ["portfolio", "refresh", "--id", "2"],
      line: "Portfolio refreshed: 2",
    },
    {
      args: ["blackout", "delete", "--id", "5"],
      line: "Recurring blackout rule deleted: 5",
    },
  ])(
    "keeps today's line '$line' for `lh $args` under --json and --toon",
    async ({ args, line }) => {
      const lighthouse = sofiasLighthouse();

      const json = await lighthouse.run([...args, "--json"]);
      const toon = await lighthouse.run([...args, "--toon"]);

      expect([json.exitCode, json.stdout]).toEqual([0, line]);
      expect([toon.exitCode, toon.stdout]).toEqual([0, line]);
      expect(lighthouse.asked()).not.toContain("getTerminology");
    },
  );

  // @driving_port @US-08 @contract-shape:unbounded-preservation — AC-08.3
  it.each([
    {
      args: ["team", "create", "--payload-file", "lightspeed.json"],
      answer: () => aTeam({ name: "Lightspeed", id: 9 }),
    },
    {
      args: ["portfolio", "update", "--id", "2", "--payload-file", "oe.json"],
      answer: () => aPortfolio(),
    },
    {
      args: ["blackout", "create", "--payload-file", "focus-friday.json"],
      answer: () => aBlackoutRule(),
    },
  ])(
    "hands scripts the written record unchanged for `lh $args` with --json and --toon",
    async ({ args, answer }) => {
      const lighthouse = sofiasLighthouse();

      const json = await lighthouse.run([...args, "--json"]);
      const toon = await lighthouse.run([...args, "--toon"]);

      expect(json.stdout).toBe(JSON.stringify(answer()));
      expect(toon.stdout).toBe(encode(answer() as never));
      expect(lighthouse.asked()).not.toContain("getTerminology");
    },
  );

  // @error @US-08 — errors keep today's form
  it("passes a refused delete straight through", async () => {
    const lighthouse = sofiasLighthouse({
      deleteTeam: refused("not-found", "Team 9 not found"),
    });

    const result = await lighthouse.run(["team", "delete", "--id", "9"]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("not-found: Team 9 not found");
  });
});
