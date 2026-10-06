import { afterAll, describe, expect, it } from "vitest";
import {
  describeRefinementSummary,
  type TeamRefinement,
} from "./refinementWording";

// A reader ten hours behind UTC, where midnight UTC on 8 Oct is still the evening of 7 Oct. Set before
// any Date is made; Node takes a TZ change at runtime.
const readersZone = process.env.TZ;
process.env.TZ = "America/Adak";

afterAll(() => {
  if (readersZone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = readersZone;
  }
});

const gravitysRefinement = {
  refinementConfigured: true,
  workItems: [
    {
      referenceId: "GR-051",
      name: "PDF export",
      url: null,
      state: "Refinement",
      parentReferenceId: "GR-010",
      voteCount: 0,
      myVote: null,
      split: { yes: 0, yesBut: 0, no: 0 },
      readiness: "MoreYesNeeded",
      missingVotes: 3,
    },
  ],
  yardstick: { source: "Sle", days: 7, probability: 85 },
  voterIdentity: "SelfDeclared",
  readyByVotesCount: 3,
  stagesConfigured: false,
  readyCount: 3,
  readySource: "Votes",
  nextRefinementDate: "2026-10-08",
  isRefinementDay: false,
  daysUntilNextRefinement: 2,
  need: {
    verdict: "Below",
    unavailableReason: null,
    low: 5,
    high: 8,
    lowPercentile: 50,
    highPercentile: 85,
    horizonWorkingDays: 5,
    cycleStart: "2026-10-08",
    cycleEnd: "2026-10-15",
  },
} as unknown as TeamRefinement;

const seededWording = {
  teamName: "Team Gravity",
  terms: {
    workItem: "Work Item",
    workItems: "Work Items",
    team: "Team",
    refinement: "Refinement",
  },
};

describe("the next Refinement for a reader behind UTC", () => {
  it("names the calendar day the server sent, not the day before", () => {
    expect(new Date(Date.UTC(2026, 9, 8)).getDate()).toBe(7);

    const summary = describeRefinementSummary(
      gravitysRefinement,
      seededWording,
    );

    expect(summary.split("\n")[0]).toBe(
      "Team Gravity · Next Refinement: Thu 8 Oct · in 2 days",
    );
  });
});
