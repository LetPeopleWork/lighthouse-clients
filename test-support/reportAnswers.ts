import { readFileSync } from "node:fs";
import { aFakeLighthouse } from "./fakeLighthouse";
import { aPortfolio, aTeam } from "./lighthouseAnswers";

/**
 * Lighthouse's answers to the report reads, as text exactly as the server sends them, so a test can prove a
 * client passes every value on untouched. They were read from a Lighthouse running the demo data, with the
 * dates moved back together so the reports read as if made on 2 Oct 2026. Team Lightspeed (2) holds the
 * engagement-start report (1), whose values are not rounded on the wire (0.1777… per day), and a report of a
 * type this client does not know (2). Portfolio Apollo II (1) holds a quarter review (3) whose Then has no
 * finished Work Items, so its Cycle Time there is a dash with its reason.
 */

const anAnswer = (file: string): string =>
  readFileSync(new URL(`./reportAnswers/${file}`, import.meta.url), "utf8");

export const LIGHTSPEED = { id: 2, name: "Lightspeed" } as const;
export const APOLLO = { id: 1, name: "Apollo II" } as const;

export const ENGAGEMENT_START = {
  id: 1,
  name: "Then & Now — engagement start",
} as const;
export const QUARTER_REVIEW = {
  id: 3,
  name: "Then & Now — quarter review",
} as const;
export const A_LATER_TYPE = { id: 2, name: "Signals — flow alerts" } as const;

export const LIGHTSPEEDS_REPORTS = anAnswer("lightspeeds-reports.json");
export const LIGHTSPEEDS_ENGAGEMENT_START = anAnswer(
  "lightspeeds-engagement-start.json",
);
export const APOLLOS_REPORTS = anAnswer("apollos-reports.json");
export const APOLLOS_QUARTER_REVIEW = anAnswer("apollos-quarter-review.json");

/** The last Lighthouse release without the report reads, and one that has them. */
export const LAST_SERVER_WITHOUT_REPORTS = "v26.10.10.1";
export const A_SERVER_WITH_REPORTS = "v26.10.16.6";

/** How Lighthouse refuses to show a report made by a newer version of it. */
export const MADE_BY_A_NEWER_VERSION = {
  status: 422,
  body: {
    title: "The report request was refused.",
    status: 422,
    code: "template-not-supported",
  },
} as const;

/** The routes the fake Lighthouse answers for both owners and their reports, ahead of any a test adds. */
export const theReportReads = () => ({
  [`GET /teams/${LIGHTSPEED.id}`]: { status: 200, body: aTeam(LIGHTSPEED) },
  [`GET /portfolios/${APOLLO.id}`]: { status: 200, body: aPortfolio(APOLLO) },
  [`GET /teams/${LIGHTSPEED.id}/reports`]: {
    status: 200,
    text: LIGHTSPEEDS_REPORTS,
  },
  [`GET /teams/${LIGHTSPEED.id}/reports/${ENGAGEMENT_START.id}`]: {
    status: 200,
    text: LIGHTSPEEDS_ENGAGEMENT_START,
  },
  [`GET /teams/${LIGHTSPEED.id}/reports/${A_LATER_TYPE.id}`]:
    MADE_BY_A_NEWER_VERSION,
  [`GET /portfolios/${APOLLO.id}/reports`]: {
    status: 200,
    text: APOLLOS_REPORTS,
  },
  [`GET /portfolios/${APOLLO.id}/reports/${QUARTER_REVIEW.id}`]: {
    status: 200,
    text: APOLLOS_QUARTER_REVIEW,
  },
});

type FakeLighthouseOptions = NonNullable<Parameters<typeof aFakeLighthouse>[0]>;

/** Routes a test answers on top of {@link theReportReads}, or in place of one of them. */
export type ReportReplies = NonNullable<FakeLighthouseOptions["replies"]>;

/** A fake Lighthouse new enough for reports that answers {@link theReportReads} and whatever a test adds. */
export const aLighthouseWithReports = (options: FakeLighthouseOptions = {}) =>
  aFakeLighthouse({
    ...options,
    replies: { ...theReportReads(), ...options.replies },
    version: options.version ?? A_SERVER_WITH_REPORTS,
  });

/** The report reads among the requests a fake Lighthouse saw, a list's or a report's. */
export const theReportReadsAmong = (operations: readonly string[]) =>
  operations.filter((operation) => /\/reports(\/\d+)?$/u.test(operation));
