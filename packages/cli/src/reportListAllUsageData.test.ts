import { describe, expect, it } from "vitest";
import {
  aBatchOf,
  type FakeLighthouse,
} from "../../../test-support/fakeLighthouse";
import {
  aLighthouseWithReports,
  EVERY_REPORT,
  EVERY_REPORT_READ,
  LIGHTSPEED,
} from "../../../test-support/reportAnswers";
import {
  aMachine,
  aNo,
  anEarlierAnswer,
  aYesGiven,
  connectedTo,
  HOURS,
  lhOn,
  NO_TERMINAL,
} from "../test-support/lhSession";

// With usage data on, `lh report list` naming no owner reports the web's own AllReportsListed with source Cli,
// once per run, after Lighthouse answered. Nothing about the reports, their owners or how many there were
// travels with it. Listing one owner's reports, a refused list, or a reader who said no, reports nothing.

const A_YES_KEPT_AN_HOUR_AGO = "martins-yes-to-usage-data";

const aLighthouseListingEverything = (
  everyReportAnswers: { status: number; text?: string } = {
    status: 200,
    text: EVERY_REPORT,
  },
) =>
  aLighthouseWithReports({
    replies: { [EVERY_REPORT_READ]: everyReportAnswers },
  });

const martinWhoAnswered = async (
  lighthouse: FakeLighthouse,
  answer: ReturnType<typeof aYesGiven> | ReturnType<typeof aNo>,
) => {
  const martin = await connectedTo(aMachine(), lighthouse.url);
  await anEarlierAnswer(martin, lighthouse.url, answer);
  return lhOn(martin, { terminal: NO_TERMINAL, env: {} });
};

const reported = (lighthouse: FakeLighthouse) =>
  lighthouse.handedIn().map(({ batch }) => batch);

describe("lh report list with no owner counts as every report being listed", () => {
  it("reports AllReportsListed by name alone", async () => {
    const lighthouse = await aLighthouseListingEverything();
    const lh = await martinWhoAnswered(
      lighthouse,
      aYesGiven(A_YES_KEPT_AN_HOUR_AGO, 1 * HOURS),
    );

    const run = await lh.run(["report", "list", "--json"]);

    expect(run.exitCode).toBe(0);
    expect(reported(lighthouse)).toEqual([
      aBatchOf("Cli", { name: "AllReportsListed" }),
    ]);
  });

  it("reports nothing for a reader who said no", async () => {
    const lighthouse = await aLighthouseListingEverything();
    const lh = await martinWhoAnswered(lighthouse, aNo());

    await lh.run(["report", "list", "--json"]);

    expect(reported(lighthouse)).toEqual([]);
  });

  it("reports nothing for a list Lighthouse refused", async () => {
    const lighthouse = await aLighthouseListingEverything({ status: 403 });
    const lh = await martinWhoAnswered(
      lighthouse,
      aYesGiven(A_YES_KEPT_AN_HOUR_AGO, 1 * HOURS),
    );

    await lh.run(["report", "list"]);

    expect(reported(lighthouse)).toEqual([]);
  });

  it("reports nothing for a list of one Team's reports", async () => {
    const lighthouse = await aLighthouseListingEverything();
    const lh = await martinWhoAnswered(
      lighthouse,
      aYesGiven(A_YES_KEPT_AN_HOUR_AGO, 1 * HOURS),
    );

    await lh.run(["report", "list", "--team-id", String(LIGHTSPEED.id)]);

    expect(reported(lighthouse)).toEqual([]);
  });
});
