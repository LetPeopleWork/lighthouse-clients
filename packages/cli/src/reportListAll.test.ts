import { describe, expect, it } from "vitest";
import { terminology } from "../../../test-support/lighthouseAnswers";
import {
  A_LATER_TYPE,
  APOLLO,
  aLighthouseWithReports,
  ENGAGEMENT_START,
  EVERY_REPORT,
  EVERY_REPORT_READ,
  LIGHTSPEED,
  QUARTER_REVIEW,
  type ReportReplies,
  theReportReadsAmong,
} from "../../../test-support/reportAnswers";
import {
  aMachine,
  connectedTo,
  lhOn,
  NO_TERMINAL,
} from "../test-support/lhSession";

// `lh report list` naming no owner reads every report the reader can read, on every Team and Portfolio, in one
// call to a Lighthouse on a real socket. Lighthouse decides what the reader may see; lh passes the list on as it
// was sent and names each report's owner, so the next `lh report get` can be written from it. It only ever reads.

const PENDING =
  "pending: every report through the clients (epic 6350, slice 06)";

// RESOLVED AT DELIVER: the release carrying this Epic is not cut yet, so this tag is a stand-in. DELIVER reads the
// real last Lighthouse tag without the cross-owner list from the releases and puts it here before enabling these.
const A_LIGHTHOUSE_BEFORE_THE_CROSS_OWNER_LIST = "v26.10.25.1";

const lhAgainst = async (replies: ReportReplies = {}, version?: string) => {
  const lighthouse = await aLighthouseWithReports({
    replies: {
      [EVERY_REPORT_READ]: { status: 200, text: EVERY_REPORT },
      ...replies,
    },
    version,
  });
  const lh = lhOn(await connectedTo(aMachine(), lighthouse.url), {
    terminal: NO_TERMINAL,
    env: { DO_NOT_TRACK: "1" },
  });
  return { lighthouse, run: (...args: string[]) => lh.run(args) };
};

describe("lh lists every report without naming an owner", () => {
  // @walking_skeleton @driving_port @real-io @us-06 @slice-06 @kpi-OUT-6350-K5-all-reports-listed-by-clients @contract-shape:unbounded-preservation
  it.skip(`passes on every report exactly as Lighthouse sent it, each with its owner (${PENDING})`, async () => {
    const { run } = await lhAgainst();

    const listed = await run("report", "list", "--json");

    expect(listed.exitCode).toBe(0);
    expect(JSON.parse(listed.stdout)).toEqual(JSON.parse(EVERY_REPORT));
  });

  // @driving_port @real-io @us-06 @slice-06 @contract-shape:pure-function
  it.skip(`sums the list up by report, each naming its id and its owner (${PENDING})`, async () => {
    const { run } = await lhAgainst();

    const listed = await run("report", "list", "--pretty");

    expect(listed.exitCode).toBe(0);
    expect(listed.stdout).toContain(ENGAGEMENT_START.name);
    expect(listed.stdout).toContain(A_LATER_TYPE.name);
    expect(listed.stdout).toContain(QUARTER_REVIEW.name);
    // The fake Lighthouse answers the seeded terms, so the owners' kinds read "Team" and "Portfolio" here.
    expect(listed.stdout).toContain(`Team ${LIGHTSPEED.name}`);
    expect(listed.stdout).toContain(`Portfolio ${APOLLO.name}`);
    expect(listed.stdout).toMatch(/\b3 reports\b/u);
  });

  // @driving_port @real-io @us-06 @slice-06 @edge @contract-shape:pure-function
  it.skip(`names each owner's kind in the instance's own words (${PENDING})`, async () => {
    const { run } = await lhAgainst({
      "GET /terminology/all": {
        status: 200,
        body: terminology({ team: "Squad", portfolio: "Programme" }),
      },
    });

    const listed = await run("report", "list", "--pretty");

    expect(listed.exitCode).toBe(0);
    expect(listed.stdout).toContain(`Squad ${LIGHTSPEED.name}`);
    expect(listed.stdout).toContain(`Programme ${APOLLO.name}`);
    expect(listed.stdout).not.toMatch(/\bTeam\b|\bPortfolio\b/u);
  });

  // @driving_port @real-io @us-06 @slice-06 @error @contract-shape:unbounded-preservation
  it.skip(`only ever reads, and reads once (${PENDING})`, async () => {
    const { lighthouse, run } = await lhAgainst();

    await run("report", "list", "--json");

    expect(theReportReadsAmong(lighthouse.operations())).toEqual([
      EVERY_REPORT_READ,
    ]);
    expect(
      lighthouse
        .operations()
        .filter((operation) => !operation.startsWith("GET ")),
    ).toEqual([]);
  });

  // @driving_port @real-io @us-06 @slice-06 @edge @contract-shape:pure-function
  it.skip(`says there are no reports when the reader can read none (${PENDING})`, async () => {
    const { run } = await lhAgainst({
      [EVERY_REPORT_READ]: { status: 200, text: '{"reports":[]}' },
    });

    const listed = await run("report", "list", "--pretty");

    expect(listed.exitCode).toBe(0);
    expect(listed.stdout).toMatch(/\b0 reports\b/u);
  });

  // @driving_port @real-io @us-06 @slice-06 @error @contract-shape:unbounded-preservation
  it.skip(`tells the reader to upgrade a Lighthouse that has no list of every report (${PENDING})`, async () => {
    const { run } = await lhAgainst(
      { [EVERY_REPORT_READ]: { status: 404 } },
      A_LIGHTHOUSE_BEFORE_THE_CROSS_OWNER_LIST,
    );

    const listed = await run("report", "list");

    expect(listed.exitCode).not.toBe(0);
    expect(`${listed.stdout}\n${listed.stderr}`).toContain(
      "Upgrade Lighthouse",
    );
  });

  // @driving_port @real-io @us-06 @slice-06 @error @contract-shape:unbounded-preservation
  it.skip(`says the reader is not signed in when Lighthouse refuses who they are (${PENDING})`, async () => {
    const { run } = await lhAgainst({ [EVERY_REPORT_READ]: { status: 401 } });

    const listed = await run("report", "list");

    expect(listed.exitCode).not.toBe(0);
    expect(`${listed.stdout}\n${listed.stderr}`).toMatch(
      /sign(ed)? in|log ?in/iu,
    );
  });

  // @driving_port @real-io @us-06 @slice-06 @contract-shape:unbounded-preservation
  it.skip(`a list naming one Team still reads only that Team's reports (${PENDING})`, async () => {
    const { lighthouse, run } = await lhAgainst();

    const listed = await run(
      "report",
      "list",
      "--team-id",
      String(LIGHTSPEED.id),
      "--json",
    );

    expect(listed.exitCode).toBe(0);
    expect(theReportReadsAmong(lighthouse.operations())).toEqual([
      `GET /teams/${LIGHTSPEED.id}/reports`,
    ]);
  });
});
