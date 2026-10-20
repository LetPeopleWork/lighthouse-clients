import { FEATURE_REQUIRES_SERVER_NEWER_THAN } from "@letpeoplework/lighthouse-client";
import { describe, expect, it } from "vitest";
import { aFakeLighthouse } from "../../../test-support/fakeLighthouse";
import {
  A_LATER_TYPE,
  A_SERVER_WITH_REPORTS,
  APOLLO,
  APOLLOS_QUARTER_REVIEW,
  APOLLOS_REPORTS,
  ENGAGEMENT_START,
  LAST_SERVER_WITHOUT_REPORTS,
  LIGHTSPEED,
  LIGHTSPEEDS_ENGAGEMENT_START,
  LIGHTSPEEDS_REPORTS,
  QUARTER_REVIEW,
  theReportReads,
} from "../../../test-support/reportAnswers";
import {
  aMachine,
  connectedTo,
  lhOn,
  NO_TERMINAL,
} from "../test-support/lhSession";

// `lh report list` and `lh report get` read a Team's or a Portfolio's reports from a Lighthouse on a real socket
// that answers with the server's own words. lh passes every value on as Lighthouse sent it - it rounds, compares
// and judges nothing - and its summary names the report, its owner and its two windows. It only ever reads.

type Replies = NonNullable<
  NonNullable<Parameters<typeof aFakeLighthouse>[0]>["replies"]
>;

const lhAgainst = async (
  replies: Replies = {},
  version: string = A_SERVER_WITH_REPORTS,
) => {
  const lighthouse = await aFakeLighthouse({
    replies: { ...theReportReads(), ...replies },
    version,
  });
  const lh = lhOn(await connectedTo(aMachine(), lighthouse.url), {
    terminal: NO_TERMINAL,
    env: { DO_NOT_TRACK: "1" },
  });
  return { lighthouse, run: (...args: string[]) => lh.run(args) };
};

const ofLightspeed = ["--team-id", String(LIGHTSPEED.id)];
const ofApollo = ["--portfolio-id", String(APOLLO.id)];

const reportReads = (operations: readonly string[]) =>
  operations.filter((operation) => /\/reports(\/\d+)?$/u.test(operation));

/** Whether Lighthouse's answer sits somewhere in what lh printed, every value as it was sent. */
const holdsUnchanged = (printed: unknown, answer: unknown): boolean => {
  if (JSON.stringify(printed) === JSON.stringify(answer)) return true;
  if (printed === null || typeof printed !== "object") return false;
  return Object.values(printed).some((part) => holdsUnchanged(part, answer));
};

// A window may be written as Lighthouse sends it or as the web writes it; either names both its days.
const namesTheWindow = (said: string, start: string, end: string) => {
  const asTheWebWritesIt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  // "3 May" must not be read inside "13 May", nor "2 Oct" inside "12 Oct".
  const standsAlone = (day: string) =>
    new RegExp(`(?<![\\d-])${day}(?!\\d)`, "u").test(said);
  return (
    (standsAlone(start) && standsAlone(end)) ||
    (standsAlone(asTheWebWritesIt(start)) && standsAlone(asTheWebWritesIt(end)))
  );
};

describe("lh reads a Team's and a Portfolio's reports", () => {
  // @walking_skeleton @driving_port @real-io @us-04 @slice-04 @contract-shape:unbounded-preservation
  it("passes on a Team's report exactly as Lighthouse sent it", async () => {
    const { run } = await lhAgainst();

    const read = await run(
      "report",
      "get",
      ...ofLightspeed,
      "--id",
      String(ENGAGEMENT_START.id),
      "--json",
    );

    expect(read.exitCode).toBe(0);
    expect(
      holdsUnchanged(
        JSON.parse(read.stdout),
        JSON.parse(LIGHTSPEEDS_ENGAGEMENT_START),
      ),
    ).toBe(true);
  });

  // @driving_port @real-io @us-04 @slice-04 @edge @contract-shape:unbounded-preservation
  // A value Lighthouse has no number for stays absent with its reason; lh never makes it a 0.
  it("passes on a Portfolio's report with its missing values and their reason", async () => {
    const { run } = await lhAgainst();

    const read = await run(
      "report",
      "get",
      ...ofApollo,
      "--id",
      String(QUARTER_REVIEW.id),
      "--json",
    );

    expect(read.exitCode).toBe(0);
    expect(
      holdsUnchanged(
        JSON.parse(read.stdout),
        JSON.parse(APOLLOS_QUARTER_REVIEW),
      ),
    ).toBe(true);
  });

  // @driving_port @real-io @us-04 @slice-04 @contract-shape:unbounded-preservation
  it.each([
    ["a Team", ofLightspeed, LIGHTSPEEDS_REPORTS],
    ["a Portfolio", ofApollo, APOLLOS_REPORTS],
  ])(
    "lists the reports of %s exactly as Lighthouse sent them",
    async (_owner, owner, answer) => {
      const { run } = await lhAgainst();

      const listed = await run("report", "list", ...owner, "--json");

      expect(listed.exitCode).toBe(0);
      expect(
        holdsUnchanged(JSON.parse(listed.stdout), JSON.parse(answer)),
      ).toBe(true);
    },
  );

  // @driving_port @real-io @us-04 @slice-04 @contract-shape:unbounded-preservation
  it("sums a report up by its name, its owner and its two windows", async () => {
    const { run } = await lhAgainst();

    const read = await run(
      "report",
      "get",
      ...ofLightspeed,
      "--id",
      String(ENGAGEMENT_START.id),
      "--pretty",
    );

    expect(read.exitCode).toBe(0);
    expect(read.stdout).toContain(ENGAGEMENT_START.name);
    expect(read.stdout).toContain(`Team ${LIGHTSPEED.name}`);
    expect(namesTheWindow(read.stdout, "2026-05-03", "2026-07-31")).toBe(true);
    expect(namesTheWindow(read.stdout, "2026-07-05", "2026-10-02")).toBe(true);
  });

  // @driving_port @real-io @us-04 @slice-04 @contract-shape:unbounded-preservation
  it("sums a list up by how many reports the owner has", async () => {
    const { run } = await lhAgainst();

    const listed = await run("report", "list", ...ofLightspeed, "--pretty");

    expect(listed.exitCode).toBe(0);
    expect(listed.stdout).toContain(ENGAGEMENT_START.name);
    expect(listed.stdout).toContain(A_LATER_TYPE.name);
    expect(listed.stdout).toMatch(/\b2 reports\b/u);
  });

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  // Reading never changes anything on the server.
  it("only ever reads", async () => {
    const { lighthouse, run } = await lhAgainst();

    await run("report", "list", ...ofLightspeed, "--json");
    await run(
      "report",
      "get",
      ...ofLightspeed,
      "--id",
      String(ENGAGEMENT_START.id),
      "--json",
    );

    expect(reportReads(lighthouse.operations())).toHaveLength(2);
    expect(
      lighthouse
        .operations()
        .filter((operation) => !operation.startsWith("GET ")),
    ).toEqual([]);
  });
});

describe("lh says why a report cannot be read", () => {
  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  it("says the reader has no access to that Team", async () => {
    const { run } = await lhAgainst({
      [`GET /teams/${LIGHTSPEED.id}/reports/${ENGAGEMENT_START.id}`]: {
        status: 403,
      },
    });

    const read = await run(
      "report",
      "get",
      ...ofLightspeed,
      "--id",
      String(ENGAGEMENT_START.id),
    );

    expect(read.exitCode).not.toBe(0);
    expect(`${read.stdout}\n${read.stderr}`).toMatch(/no access/iu);
    expect(`${read.stdout}\n${read.stderr}`).toContain("Team");
  });

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  it("says a report made by a newer version of Lighthouse can't be shown here", async () => {
    const { run } = await lhAgainst();

    const read = await run(
      "report",
      "get",
      ...ofLightspeed,
      "--id",
      String(A_LATER_TYPE.id),
    );

    expect(read.exitCode).not.toBe(0);
    expect(`${read.stdout}\n${read.stderr}`).toMatch(/newer version/iu);
    expect(`${read.stdout}\n${read.stderr}`).toMatch(/can't be shown here/iu);
  });

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  it("says there is no such report", async () => {
    const { run } = await lhAgainst({
      [`GET /teams/${LIGHTSPEED.id}/reports/77`]: { status: 404 },
    });

    const read = await run("report", "get", ...ofLightspeed, "--id", "77");

    expect(read.exitCode).not.toBe(0);
    expect(`${read.stdout}\n${read.stderr}`).toMatch(/no such report/iu);
  });

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  it.each([
    ["list", []],
    ["get", ["--id", String(ENGAGEMENT_START.id)]],
  ])(
    "tells the reader to upgrade a Lighthouse without reports, and does not ask it, for report %s",
    async (command, more) => {
      const { lighthouse, run } = await lhAgainst(
        {},
        LAST_SERVER_WITHOUT_REPORTS,
      );

      const read = await run("report", command, ...ofLightspeed, ...more);

      expect(read.exitCode).not.toBe(0);
      expect(`${read.stdout}\n${read.stderr}`).toContain("Upgrade Lighthouse");
      expect(reportReads(lighthouse.operations())).toEqual([]);
    },
  );

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  // Holds today and must keep holding once the report reads are built.
  it.each([
    ["no owner", ["report", "get", "--id", "42"]],
    [
      "both a Team and a Portfolio",
      ["report", "list", ...ofLightspeed, ...ofApollo],
    ],
    ["no report to get", ["report", "get", ...ofLightspeed]],
  ])(
    "refuses a read with %s, and asks Lighthouse nothing",
    async (_what, args) => {
      const { lighthouse, run } = await lhAgainst();

      const read = await run(...args);

      expect(read.exitCode).not.toBe(0);
      expect(reportReads(lighthouse.operations())).toEqual([]);
    },
  );

  // @us-04 @slice-04 @contract-shape:pure-function
  it("needs a Lighthouse newer than the last release without report reads", () => {
    expect(
      (FEATURE_REQUIRES_SERVER_NEWER_THAN as Readonly<Record<string, string>>)
        .reports,
    ).toBe(LAST_SERVER_WITHOUT_REPORTS);
  });
});
