import type { LighthouseApiError } from "./index";
import {
  readTerms,
  SEEDED_TERMS,
  type Terms,
  type TermsSource,
} from "./terminology";
import { dayOf, isDay, isRecord, textOf } from "./wireFacts";

// The summary only says which report this is: its name, its owner and its windows, or how many reports a list
// holds. Every value stays in the answer exactly as Lighthouse sent it, because how a value is rounded, which
// way is better and what counts as a change are Lighthouse's rules, and a second copy of them would drift.

/** Who a report belongs to: a Team or a Portfolio. */
export type ReportOwnerKind = "team" | "portfolio";

/** The Team or Portfolio whose reports are read, by its id. */
export type ReportOwner = {
  readonly kind: ReportOwnerKind;
  readonly id: number;
};

/** A window of days as Lighthouse sends it: its first and its last day. */
export type ReportWindow = {
  readonly start: string;
  readonly end: string;
};

/** What a report's summary says: its name and its two windows. */
export type ReportView = {
  readonly name: string;
  readonly thenWindow: ReportWindow;
  readonly nowWindow: ReportWindow;
};

/** One report as a list row shows it. Fields Lighthouse did not send stay undefined. */
export type ReportListItem = {
  readonly id: number;
  readonly name: string;
  readonly templateKey: string | undefined;
  readonly createdOn: string | undefined;
};

const readWindow = (value: unknown): ReportWindow | null =>
  isRecord(value) && isDay(value.start) && isDay(value.end)
    ? { start: value.start, end: value.end }
    : null;

/** The report's name and windows, or null when the answer does not carry all three. */
export const readReport = (value: unknown): ReportView | null => {
  if (!isRecord(value) || !isRecord(value.thenAndNow)) {
    return null;
  }
  const name = textOf(value.name);
  const thenWindow = readWindow(value.thenAndNow.thenWindow);
  const nowWindow = readWindow(value.thenAndNow.nowWindow);
  if (name === undefined || thenWindow === null || nowWindow === null) {
    return null;
  }
  return { name, thenWindow, nowWindow };
};

const readReportListItem = (value: unknown): ReportListItem | null => {
  if (!isRecord(value) || typeof value.id !== "number") {
    return null;
  }
  const name = textOf(value.name);
  if (name === undefined) {
    return null;
  }
  return {
    id: value.id,
    name,
    templateKey: textOf(value.templateKey),
    createdOn: textOf(value.createdOn),
  };
};

/**
 * Every report in the list, or null when the answer holds no list or any one report comes without its id or
 * name: a row that cannot say which report it is would misname the whole list.
 */
export const readReportList = (value: unknown): ReportListItem[] | null => {
  if (!isRecord(value) || !Array.isArray(value.reports)) {
    return null;
  }
  const items = value.reports.map(readReportListItem);
  return items.every((item) => item !== null) ? items : null;
};

const ownerTerm = (kind: ReportOwnerKind, terms: Terms): string =>
  kind === "team" ? terms.team : terms.portfolio;

/** The owner as the instance names it, "Team Lightspeed", or by its id when its name could not be read. */
export const describeReportOwner = (
  kind: ReportOwnerKind,
  id: number,
  owner: unknown,
  terms: Terms,
): string => {
  const term = ownerTerm(kind, terms);
  const name = isRecord(owner) ? textOf(owner.name) : undefined;
  return name === undefined ? `${term} [id: ${id}]` : `${term} ${name}`;
};

const describeWindow = (label: string, window: ReportWindow): string =>
  `${label} ${dayOf(window.start)} – ${dayOf(window.end)}`;

/** The report's name, its owner and its two windows, one to a line. */
export const describeReportSummary = (
  report: ReportView,
  owner: string,
): string =>
  [
    report.name,
    owner,
    `${describeWindow("Then", report.thenWindow)} · ${describeWindow("Now", report.nowWindow)}`,
  ].join("\n");

const describeReportCount = (count: number): string => {
  if (count === 0) {
    return "No reports";
  }
  return count === 1 ? "1 report" : `${count} reports`;
};

const describeReportListItem = (item: ReportListItem): string =>
  [
    `${item.name} [id: ${item.id}]`,
    item.templateKey,
    item.createdOn === undefined
      ? undefined
      : `created ${dayOf(item.createdOn)}`,
  ]
    .filter((part) => part !== undefined)
    .join(" · ");

/** How many reports the owner has, then each report's name, type and created day. */
export const describeReportListSummary = (
  reports: readonly ReportListItem[],
  owner: string,
): string =>
  [
    `${owner} · ${describeReportCount(reports.length)}`,
    ...reports.map(describeReportListItem),
  ].join("\n");

/** A summary of Lighthouse's answer, said of its owner; null when the answer is not one the summary can read. */
export type ReportSummariser = (value: unknown, owner: string) => string | null;

export const summariseReport: ReportSummariser = (value, owner) => {
  const report = readReport(value);
  return report === null ? null : describeReportSummary(report, owner);
};

export const summariseReportList: ReportSummariser = (value, owner) => {
  const reports = readReportList(value);
  return reports === null ? null : describeReportListSummary(reports, owner);
};

const FORBIDDEN = 403;
const NOT_FOUND = 404;

/** What was read: the owner's list of reports, or one report. */
export type ReportRead = "list" | "report";

// Lighthouse answers a list with 404 only when the Team or Portfolio itself is unknown, so a missing list names
// the owner, never a report.
const NOTHING_THERE: Readonly<Record<ReportRead, (owner: string) => string>> = {
  list: (owner) => `There is no such ${owner}.`,
  report: (owner) => `There is no such report for that ${owner}.`,
};

/**
 * Why a report or a list could not be read, in words the reader can act on: the web's sentence where it has
 * one. Any other refusal, the client's own "upgrade Lighthouse" among them, keeps its category and reason.
 */
export const describeReportRefusal = (
  error: LighthouseApiError,
  kind: ReportOwnerKind,
  read: ReportRead,
  terms: Terms,
): string => {
  if (error.statusCode === FORBIDDEN) {
    return `You have no access to that ${ownerTerm(kind, terms)}'s reports.`;
  }
  if (error.problemCode === "template-not-supported") {
    return "This report was made by a newer version of Lighthouse and can't be shown here.";
  }
  if (error.statusCode === NOT_FOUND) {
    return NOTHING_THERE[read](ownerTerm(kind, terms));
  }
  return `${error.category}: ${error.reason}`;
};

/**
 * {@link describeReportRefusal} in the instance's own words. A refusal the client made before asking, as for a
 * Lighthouse too old for reports, asks that Lighthouse nothing more, not even its words.
 */
export const readReportRefusal = async (
  source: TermsSource,
  error: LighthouseApiError,
  kind: ReportOwnerKind,
  read: ReportRead,
): Promise<string> =>
  describeReportRefusal(
    error,
    kind,
    read,
    error.statusCode === undefined ? SEEDED_TERMS : await readTerms(source),
  );

/** One report of the cross-owner list: which report it is and whose it is. */
export type EveryReportItem = ReportListItem & {
  readonly ownerKind: ReportOwnerKind;
  readonly ownerName: string;
};

const OWNER_KINDS: Readonly<Record<string, ReportOwnerKind>> = {
  team: "team",
  portfolio: "portfolio",
};

const readEveryReportItem = (value: unknown): EveryReportItem | null => {
  const item = readReportListItem(value);
  if (item === null || !isRecord(value)) {
    return null;
  }
  const ownerKind = OWNER_KINDS[textOf(value.ownerKind)?.toLowerCase() ?? ""];
  const ownerName = textOf(value.ownerName);
  return ownerKind === undefined || ownerName === undefined
    ? null
    : { ...item, ownerKind, ownerName };
};

/** Every report with its owner, or null when the answer holds no list or any report cannot say which and whose it is. */
export const readEveryReport = (value: unknown): EveryReportItem[] | null => {
  if (!isRecord(value) || !Array.isArray(value.reports)) {
    return null;
  }
  const items = value.reports.map(readEveryReportItem);
  return items.every((item) => item !== null) ? items : null;
};

const describeEveryReportItem = (item: EveryReportItem, terms: Terms) =>
  [
    `ID ${item.id}`,
    item.name,
    item.templateKey,
    `${ownerTerm(item.ownerKind, terms)} ${item.ownerName}`,
    item.createdOn === undefined ? undefined : dayOf(item.createdOn),
  ]
    .filter((part) => part !== undefined)
    .join(" · ");

/** How many reports there are, then each one's id, name, type, owner and created day; the owner's kind in the instance's words. */
export const summariseEveryReport = (
  value: unknown,
  terms: Terms,
): string | null => {
  const reports = readEveryReport(value);
  return reports === null
    ? null
    : [
        reports.length === 1 ? "1 report" : `${reports.length} reports`,
        ...reports.map((item) => describeEveryReportItem(item, terms)),
      ].join("\n");
};
