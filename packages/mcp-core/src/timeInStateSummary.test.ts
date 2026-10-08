import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { gravity, ok } from "../../../test-support/lighthouseAnswers";
import {
  gravitysTimeInState,
  reviewsContributors,
  timeInStateCandidates,
} from "../../../test-support/metricsAnswers";
import {
  anAssistantOn,
  answerOf,
  factsBlockOf,
} from "../test-support/mcpHarness";

// The Time in State tools. The bar and the drill-down gain a `summary`; the picker's
// candidate list does not, as lh never prints it.

const gravitysRange = { id: 3, startDate: "2026-09-07", endDate: "2026-10-06" };

const gravitysAssistant = () =>
  anAssistantOn({
    getTeam: ok(gravity()),
    getTeamCumulativeStateTime: ok(gravitysTimeInState()),
    getTeamCumulativeStateTimeItems: ok(reviewsContributors()),
    getTeamCumulativeStateTimeCandidates: ok(timeInStateCandidates()),
  });

describe("the Time in State tools' summary", () => {
  it("hands an assistant the drill-down's facts with the dialog's title as its summary", async () => {
    const result = await gravitysAssistant().call(
      "lighthouse_team_metrics_cumulativeStateTimeItems",
      { ...gravitysRange, state: "Review" },
    );

    expect(result.isError).toBe(false);
    const { summary, ...facts } = answerOf(
      result,
      "team cumulativeStateTimeItems: ",
    );
    expect(facts).toEqual(reviewsContributors());
    expect(String(summary)).toContain("Work Items contributing to Review");
  });

  it("hands an assistant the bar's facts unchanged with a summary beside them", async () => {
    const result = await gravitysAssistant().call(
      "lighthouse_team_metrics_cumulativeStateTime",
      gravitysRange,
    );

    expect(result.isError).toBe(false);
    const { summary, ...facts } = answerOf(
      result,
      "team cumulativeStateTime: ",
    );
    expect(facts).toEqual(gravitysTimeInState());
    expect(typeof summary).toBe("string");
  });
});

describe("the Time in State candidates tool", () => {
  it("hands the picker's list over exactly as today, without a summary", async () => {
    const result = await gravitysAssistant().call(
      "lighthouse_team_metrics_cumulativeStateTimeCandidates",
      gravitysRange,
    );

    expect(result.content).toHaveLength(1);
    expect(factsBlockOf(result)).toBe(
      `team cumulativeStateTimeCandidates: ${encode(timeInStateCandidates())}`,
    );
  });
});
