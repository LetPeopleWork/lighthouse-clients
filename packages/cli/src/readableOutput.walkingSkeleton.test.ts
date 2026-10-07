import { describe, expect, it } from "vitest";
import { ok } from "../../../test-support/lighthouseAnswers";
import { aLighthouse } from "../test-support/cliHarness";

// Story 6218's walking skeleton. Every converted command reuses the seam `lh refinement get` already ships
// through: a renderer per command, the shared table, the instance's words with the seeded fallback. Slice 01
// moves the table and the word resolver out of refinement's files; this pins what Priya reads today, byte for
// byte, so the move cannot change it (DoD 4). Green before and after every slice.

const gr = (referenceId: string, name: string, parentReferenceId: string) => ({
  referenceId,
  name,
  url: null,
  state: "Refinement",
  parentReferenceId,
  voteCount: 2,
  myVote: null,
  split: { yes: 2, yesBut: 0, no: 0 },
  readiness: "MoreYesNeeded",
  missingVotes: 1,
  stage: null,
  signalsDisagree: false,
  hasComments: false,
  hasOpenQuestion: false,
});

// Tue 6 Oct: Team Gravity has 3 ready against the 2–3 it is likely to pull from Thu 8 Oct to the Refinement after.
const gravitysRefinement = {
  refinementConfigured: true,
  workItems: [
    gr("GR-051", "PDF export", "GR-010"),
    gr("GR-052", "Saved filters", "GR-010"),
    gr("GR-080", "Dark mode", ""),
  ],
  yardstick: { source: "Sle", days: 7, probability: 85 },
  voterIdentity: "SelfDeclared",
  readyByVotesCount: 1,
  stagesConfigured: false,
  readyCount: 1,
  readySource: "Votes",
  nextRefinementDate: "2026-10-08",
  isRefinementDay: false,
  daysUntilNextRefinement: 2,
  need: {
    verdict: "Below",
    unavailableReason: null,
    low: 2,
    high: 3,
    lowPercentile: 50,
    highPercentile: 85,
    horizonWorkingDays: 5,
    cycleStart: "2026-10-08",
    cycleEnd: "2026-10-15",
  },
};

describe("story 6218 walking skeleton: the pretty seam every command reuses", () => {
  // @walking_skeleton @driving_port @US-01 @contract-shape:unbounded-preservation
  it("still tells Priya, byte for byte, where Team Gravity's refinement stands while the shared table and words move", async () => {
    const lighthouse = aLighthouse({
      getTeam: ok({ id: 3, name: "Team Gravity" }),
      getTeamRefinement: ok(gravitysRefinement),
    });

    const result = await lighthouse.run([
      "refinement",
      "get",
      "--team-id",
      "3",
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toMatchInlineSnapshot(`
      "Team Gravity · Next Refinement: Thu 8 Oct · in 2 days
      1 ready — below the range of 2–3 Work Items Team Gravity is likely to pull until the Refinement after. Refine 1 to 2 more.

      #  Work Item             Parent  State       Votes  Readiness          Warnings
      1  GR-051 PDF export     GR-010  Refinement  2 Yes  1 more Yes needed
      2  GR-052 Saved filters  GR-010  Refinement  2 Yes  1 more Yes needed
      3  GR-080 Dark mode      -       Refinement  2 Yes  1 more Yes needed
      ── enough for the next Refinement (85%) · not needed before then ──"
    `);
    expect(lighthouse.asked().sort()).toEqual([
      "getTeam",
      "getTeamRefinement",
      "getTerminology",
    ]);
  });
});
