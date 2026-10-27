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

const PENDING =
  "pending: every report through the clients (epic 6350, slice 06)";

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
  // @driving_port @real-io @us-06 @slice-06 @kpi-OUT-6350-K5-all-reports-listed-by-clients @contract-shape:bounded-change
  it.skip(`reports AllReportsListed by name alone (${PENDING})`, async () => {
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

  // @driving_port @real-io @us-06 @slice-06 @error @contract-shape:unbounded-preservation
  it.skip(`reports nothing for a reader who said no (${PENDING})`, async () => {
    const lighthouse = await aLighthouseListingEverything();
    const lh = await martinWhoAnswered(lighthouse, aNo());

    await lh.run(["report", "list", "--json"]);

    expect(reported(lighthouse)).toEqual([]);
  });

  // @driving_port @real-io @us-06 @slice-06 @error @contract-shape:unbounded-preservation
  it.skip(`reports nothing for a list Lighthouse refused (${PENDING})`, async () => {
    const lighthouse = await aLighthouseListingEverything({ status: 403 });
    const lh = await martinWhoAnswered(
      lighthouse,
      aYesGiven(A_YES_KEPT_AN_HOUR_AGO, 1 * HOURS),
    );

    await lh.run(["report", "list"]);

    expect(reported(lighthouse)).toEqual([]);
  });

  // @driving_port @real-io @us-06 @slice-06 @edge @contract-shape:unbounded-preservation
  it.skip(`reports nothing for a list of one Team's reports (${PENDING})`, async () => {
    const lighthouse = await aLighthouseListingEverything();
    const lh = await martinWhoAnswered(
      lighthouse,
      aYesGiven(A_YES_KEPT_AN_HOUR_AGO, 1 * HOURS),
    );

    await lh.run(["report", "list", "--team-id", String(LIGHTSPEED.id)]);

    expect(reported(lighthouse)).toEqual([]);
  });
});
