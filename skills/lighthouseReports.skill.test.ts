// The lighthouse-reports skill teaches an assistant to show a Lighthouse report as Lighthouse shows it: a dated
// header, the summary, each metric's Then, Now, change and percent at the web's own rounding, and nothing it
// has not been asked for. This holds the skill's folder to what packs and ships it, and its reference file to
// the web sources each of its rules is copied from, so a change on either side leads to the other.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPOSITORY = new URL("..", import.meta.url).pathname;
const SKILL = join(REPOSITORY, "skills/lighthouse-reports");
const PENDING_CASES = join(
  REPOSITORY,
  "test-support/pending-skill-evals/lighthouse-reports",
);

const pending = "Pending: the lighthouse-reports skill (epic 6298, slice 05)";

const read = (path: string): string =>
  existsSync(path) ? readFileSync(path, "utf8") : "";

/** The web sources the reference file's rules are copied from, each named in it so drift is found from either side. */
const THE_WEB_SOURCES = [
  "panels/reportPanelRegistry.ts",
  "panels/CycleTimePanel.tsx",
  "panels/ThroughputPanel.tsx",
  "panels/DailySpreadPanel.tsx",
  "panels/WipPanel.tsx",
  "panels/thenNowComparison.ts",
  "panels/changeSummary.ts",
  "ThenAndNowSummary.tsx",
];

const THE_FOUR_TOOLS = [
  "lighthouse_team_report_list",
  "lighthouse_team_report_get",
  "lighthouse_portfolio_report_list",
  "lighthouse_portfolio_report_get",
];

describe("the lighthouse-reports skill ships", () => {
  // @us-05 @slice-05 @driving_port @contract-shape:bounded-change
  it.skip(`has a SKILL.md named lighthouse-reports and the Then & Now reference file (${pending})`, () => {
    const skill = read(join(SKILL, "SKILL.md"));

    expect(skill).toMatch(/^---\nname: lighthouse-reports\n/u);
    expect(existsSync(join(SKILL, "references/then-and-now.md"))).toBe(true);
  });

  // @us-05 @slice-05 @contract-shape:bounded-change
  // Every rule in the reference file is a copy, and a copy that does not say what it copies cannot be kept in step.
  it.skip(`names every web source its presentation rules are copied from (${pending})`, () => {
    const reference = read(join(SKILL, "references/then-and-now.md"));

    expect(reference.length).toBeGreaterThan(0);
    for (const source of THE_WEB_SOURCES) {
      expect(reference, `the reference file does not name ${source}`).toContain(
        source,
      );
    }
  });

  // @us-05 @slice-05 @contract-shape:bounded-change
  // The order is the printed report's: dated header, the table, the assistant's own words set apart, then the credit.
  it.skip(`lays a report out in the printed one's order, ending with where the data came from (${pending})`, () => {
    const reference = read(join(SKILL, "references/then-and-now.md"));
    const inOrder = [
      "Read from Lighthouse on",
      "Then | Now | Change | %",
      "Assistant's view",
      "Data from Lighthouse by LetPeopleWork",
    ].map((words) => ({ words, at: reference.indexOf(words) }));

    for (const { words, at } of inOrder) {
      expect(
        at,
        `the reference file does not say "${words}"`,
      ).toBeGreaterThanOrEqual(0);
    }
    expect(inOrder.map(({ at }) => at)).toEqual(
      [...inOrder.map(({ at }) => at)].sort((a, b) => a - b),
    );
    expect(
      reference
        .split("\n")
        .filter((line) => line.trim() !== "")
        .at(-1)
        ?.trim(),
    ).toContain("Data from Lighthouse by LetPeopleWork");
  });

  // @us-05 @slice-05 @error @contract-shape:unbounded-preservation
  // Cases wait outside the skill until it exists; once it does, none may be left behind or lose its fixture.
  it.skip(`runs its eval cases from its own folder, each with its fixture (${pending})`, () => {
    const cases = JSON.parse(read(join(SKILL, "evals/cases.json")) || "[]") as {
      readonly fixture?: string;
    }[];

    expect(cases.length).toBeGreaterThanOrEqual(12);
    for (const { fixture } of cases) {
      expect(
        existsSync(join(SKILL, "evals/fixtures", `${fixture}.json`)),
        `fixture ${fixture} is missing`,
      ).toBe(true);
    }
    expect(existsSync(PENDING_CASES)).toBe(false);
  });

  // @us-05 @slice-05 @error @contract-shape:unbounded-preservation
  // The dry run checks a fixed list of zips, so a skill missing from it could fail to pack without anyone noticing.
  it.skip(`is packed by CI's dry run and listed in the skills README (${pending})`, () => {
    const ci = read(join(REPOSITORY, ".github/workflows/ci.yml"));
    const expected = /expected=\(([^)]*)\)/u.exec(ci)?.[1]?.split(/\s+/u) ?? [];

    expect(expected).toContain("lighthouse-reports");
    expect(read(join(REPOSITORY, "skills/README.md"))).toContain(
      "`lighthouse-reports-skill.zip`",
    );
  });

  // @us-04 @slice-04 @contract-shape:bounded-change
  it.skip(`is reached from the general skill, which names the four report tools and both lh commands (${pending})`, () => {
    const general = read(join(REPOSITORY, "skills/lighthouse/SKILL.md"));
    const catalogue = read(
      join(REPOSITORY, "skills/lighthouse/references/tools-and-commands.md"),
    );

    for (const name of [...THE_FOUR_TOOLS, "lh report list", "lh report get"]) {
      expect(catalogue).toContain(name);
    }
    expect(general).toContain("lighthouse-reports");
  });
});
