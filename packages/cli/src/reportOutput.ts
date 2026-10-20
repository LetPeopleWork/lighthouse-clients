import {
  describeReportListSummary,
  describeReportSummary,
  readReport,
  readReportList,
} from "@letpeoplework/lighthouse-client";

/** A report's pretty view, said of its owner; null when the answer is not one the summary can read. */
export type ReportRenderer = (value: unknown, owner: string) => string | null;

export const renderReport: ReportRenderer = (value, owner) => {
  const report = readReport(value);
  return report === null ? null : describeReportSummary(report, owner);
};

export const renderReportList: ReportRenderer = (value, owner) => {
  const reports = readReportList(value);
  return reports === null ? null : describeReportListSummary(reports, owner);
};
