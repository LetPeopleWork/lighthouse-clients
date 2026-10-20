import { describe, expect, it } from "vitest";
import {
  aBatchOf,
  aFakeLighthouse,
  type FakeLighthouse,
} from "../../../test-support/fakeLighthouse";
import {
  A_LATER_TYPE,
  A_SERVER_WITH_REPORTS,
  APOLLO,
  ENGAGEMENT_START,
  LAST_SERVER_WITHOUT_REPORTS,
  LIGHTSPEED,
  QUARTER_REVIEW,
  theReportReads,
} from "../../../test-support/reportAnswers";
import {
  aMachine,
  aNo,
  anEarlierAnswer,
  aYesGiven,
  connectedTo,
  HOURS,
  lhOn,
  type Machine,
  NO_TERMINAL,
} from "../test-support/lhSession";

// With usage data on, reading a report with `lh report get` reports the web's own ReportOpened, with the report's
// type and source Cli, once per run and with no wait, after Lighthouse answered. Listing is not reading a report,
// and a read Lighthouse refused, or of a type lh cannot name, reports nothing. Nothing about the report, its
// owner or its numbers ever travels.

const A_YES_KEPT_AN_HOUR_AGO = "lenas-yes-to-usage-data";

const lighthouseWithReports = (
  replies: Parameters<typeof aFakeLighthouse>[0] = {},
  version = A_SERVER_WITH_REPORTS,
) =>
  aFakeLighthouse({
    ...replies,
    replies: { ...theReportReads(), ...replies?.replies },
    version,
  });

const lenaWhoSaidYes = async (lighthouse: FakeLighthouse): Promise<Machine> => {
  const lena = await connectedTo(aMachine(), lighthouse.url);
  await anEarlierAnswer(
    lena,
    lighthouse.url,
    aYesGiven(A_YES_KEPT_AN_HOUR_AGO, 1 * HOURS),
  );
  return lena;
};

const lhAt = (machine: Machine, env: Readonly<Record<string, string>> = {}) =>
  lhOn(machine, { terminal: NO_TERMINAL, env });

const reported = (lighthouse: FakeLighthouse) =>
  lighthouse.handedIn().map(({ batch }) => batch);

const getEngagementStart = [
  "report",
  "get",
  "--team-id",
  String(LIGHTSPEED.id),
  "--id",
  String(ENGAGEMENT_START.id),
];

describe("lh report get counts as the report being opened", () => {
  // @driving_port @real-io @us-04 @slice-04 @kpi-OUT-6298-K4-reports-read-by-clients @contract-shape:bounded-change
  it.each([
    ["a Team's", getEngagementStart],
    [
      "a Portfolio's",
      [
        "report",
        "get",
        "--portfolio-id",
        String(APOLLO.id),
        "--id",
        String(QUARTER_REVIEW.id),
      ],
    ],
  ])(
    `reports ReportOpened with the report's type when lh reads %s report`,
    async (_owner, args) => {
      const lighthouse = await lighthouseWithReports();
      const lena = await lenaWhoSaidYes(lighthouse);

      const run = await lhAt(lena).run(args);

      expect(run.exitCode).toBe(0);
      expect(reported(lighthouse)).toEqual([
        aBatchOf("Cli", { name: "ReportOpened", reportTemplate: "ThenAndNow" }),
      ]);
      expect(lighthouse.handedIn()[0]?.token).toBe(A_YES_KEPT_AN_HOUR_AGO);
    },
  );

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  // Scripts read the report as --json; it counts the same, and what lh prints is the same with usage data on.
  it(`reports the same opening for a read as JSON, and prints the same as with usage data off`, async () => {
    const lighthouse = await lighthouseWithReports();
    const lena = await lenaWhoSaidYes(lighthouse);

    const counted = await lhAt(lena).run([...getEngagementStart, "--json"]);
    const uncounted = await lhAt(lena, { DO_NOT_TRACK: "1" }).run([
      ...getEngagementStart,
      "--json",
    ]);

    expect(counted.stdout).toBe(uncounted.stdout);
    expect(reported(lighthouse)).toEqual([
      aBatchOf("Cli", { name: "ReportOpened", reportTemplate: "ThenAndNow" }),
    ]);
  });
});

describe("lh reports nothing for a read that opened no report", () => {
  // @driving_port @real-io @us-04 @slice-04 @error @kpi-OUT-6298-K4-reports-read-by-clients @contract-shape:unbounded-preservation
  // Holds today and must keep holding once the report reads are built.
  it.each<[string, readonly string[], Parameters<typeof aFakeLighthouse>[0]]>([
    [
      "a list of reports",
      ["report", "list", "--team-id", String(LIGHTSPEED.id)],
      {},
    ],
    [
      "a report of a type lh cannot name",
      [
        "report",
        "get",
        "--team-id",
        String(LIGHTSPEED.id),
        "--id",
        String(A_LATER_TYPE.id),
      ],
      {},
    ],
    [
      "a report the reader has no access to",
      getEngagementStart,
      {
        replies: {
          [`GET /teams/${LIGHTSPEED.id}/reports/${ENGAGEMENT_START.id}`]: {
            status: 403,
          },
        },
      },
    ],
    [
      "a report that does not exist",
      ["report", "get", "--team-id", String(LIGHTSPEED.id), "--id", "77"],
      {
        replies: {
          [`GET /teams/${LIGHTSPEED.id}/reports/77`]: { status: 404 },
        },
      },
    ],
  ])("reports nothing for %s", async (_what, args, replies) => {
    const lighthouse = await lighthouseWithReports(replies);
    const lena = await lenaWhoSaidYes(lighthouse);

    await lhAt(lena).run(args);

    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  // Holds today and must keep holding once the report reads are built.
  it("reports nothing when Lighthouse is too old to have reports", async () => {
    const lighthouse = await lighthouseWithReports(
      {},
      LAST_SERVER_WITHOUT_REPORTS,
    );
    const lena = await lenaWhoSaidYes(lighthouse);

    await lhAt(lena).run(getEngagementStart);

    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  // Holds today and must keep holding once the report reads are built.
  it.each<
    [
      string,
      (lighthouse: FakeLighthouse) => Promise<Machine>,
      Readonly<Record<string, string>>,
    ]
  >([
    [
      "a reader who said no",
      async (lighthouse) => {
        const ben = await connectedTo(aMachine(), lighthouse.url);
        await anEarlierAnswer(ben, lighthouse.url, aNo());
        return ben;
      },
      {},
    ],
    [
      "a reader who was never asked",
      (lighthouse) => connectedTo(aMachine(), lighthouse.url),
      {},
    ],
    [
      "a reader who said yes and set DO_NOT_TRACK",
      lenaWhoSaidYes,
      { DO_NOT_TRACK: "1" },
    ],
  ])("reports nothing for %s", async (_reader, theReader, env) => {
    const lighthouse = await lighthouseWithReports();
    const reader = await theReader(lighthouse);

    await lhAt(reader, env).run(getEngagementStart);

    expect(lighthouse.handedIn()).toEqual([]);
  });
});
