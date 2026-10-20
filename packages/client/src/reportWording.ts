import type { Terms } from "./terminology";
import { dayOf, isDay, isRecord, textOf } from "./wireFacts";

// The summary only says which report this is: its name, its owner and its windows, or how many reports a list
// holds. Every value stays in the answer exactly as Lighthouse sent it, because how a value is rounded, which
// way is better and what counts as a change are Lighthouse's rules, and a second copy of them would drift.

/** Who a report belongs to: a Team or a Portfolio. */
export type ReportOwnerKind = "team" | "portfolio";

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

/** The owner as the instance names it, "Team Lightspeed", or by its id when its name could not be read. */
export const describeReportOwner = (
  kind: ReportOwnerKind,
  id: number,
  owner: unknown,
  terms: Terms,
): string => {
  const term = kind === "team" ? terms.team : terms.portfolio;
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
