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

// The last Lighthouse release without the list of every report.
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
  it(`passes on every report exactly as Lighthouse sent it, each with its owner`, async () => {
    const { run } = await lhAgainst();

    const listed = await run("report", "list", "--json");

    expect(listed.exitCode).toBe(0);
    expect(JSON.parse(listed.stdout)).toEqual(JSON.parse(EVERY_REPORT));
  });

  it(`sums the list up by report, each naming its id and its owner`, async () => {
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

  it(`names each owner's kind in the instance's own words`, async () => {
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

  it(`only ever reads, and reads once`, async () => {
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

  it(`says there are no reports when the reader can read none`, async () => {
    const { run } = await lhAgainst({
      [EVERY_REPORT_READ]: { status: 200, text: '{"reports":[]}' },
    });

    const listed = await run("report", "list", "--pretty");

    expect(listed.exitCode).toBe(0);
    expect(listed.stdout).toMatch(/\b0 reports\b/u);
  });

  it(`tells the reader to upgrade a Lighthouse that has no list of every report`, async () => {
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

  it(`says the reader is not signed in when Lighthouse refuses who they are`, async () => {
    const { run } = await lhAgainst({ [EVERY_REPORT_READ]: { status: 401 } });

    const listed = await run("report", "list");

    expect(listed.exitCode).not.toBe(0);
    expect(`${listed.stdout}\n${listed.stderr}`).toMatch(
      /sign(ed)? in|log ?in/iu,
    );
  });

  it(`a list naming one Team still reads only that Team's reports`, async () => {
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
