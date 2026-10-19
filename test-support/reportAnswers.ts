import { readFileSync } from "node:fs";

/**
 * Lighthouse's answers to the report reads, as text exactly as the server sends them, so a test can prove a
 * client passes every value on untouched. Team Lightspeed (9) holds the engagement-start report (42), whose
 * values are not rounded on the wire (0.5777… per day, an average WIP of 8.62), and a report of a type this
 * client does not know (44). Portfolio Apollo II (6) holds a quarter review (51) whose Now has no finished
 * Work Items, so its values are dashes with their reason.
 */

const anAnswer = (file: string): string =>
  readFileSync(new URL(`./reportAnswers/${file}`, import.meta.url), "utf8");

export const LIGHTSPEED = { id: 9, name: "Lightspeed" } as const;
export const APOLLO = { id: 6, name: "Apollo II" } as const;

export const ENGAGEMENT_START = {
  id: 42,
  name: "Then & Now — engagement start",
} as const;
export const QUARTER_REVIEW = {
  id: 51,
  name: "Then & Now — quarter review",
} as const;
export const A_LATER_TYPE = { id: 44, name: "Signals — flow alerts" } as const;

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
    type: "about:blank",
    title: "The report request was refused.",
    status: 422,
    code: "template-not-supported",
  },
} as const;

/** The routes the fake Lighthouse answers for both owners' reports, ahead of any a test adds. */
export const theReportReads = () => ({
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
