import type { LighthouseApiResult, LighthouseClient } from "./index";
import { describeReportOwner, type ReportOwner } from "./reportWording";
import { readTerms, type TermsSource } from "./terminology";

/** The four report reads, a Team's and a Portfolio's list and one report of each. */
export type ReportReads = Pick<
  LighthouseClient,
  | "getTeamReports"
  | "getTeamReport"
  | "getPortfolioReports"
  | "getPortfolioReport"
>;

/** The owner's list of reports, exactly as Lighthouse answers it. */
export const readOwnersReports = (
  reads: ReportReads,
  owner: ReportOwner,
): Promise<LighthouseApiResult<unknown>> =>
  owner.kind === "team"
    ? reads.getTeamReports(owner.id)
    : reads.getPortfolioReports(owner.id);

/** One of the owner's reports, exactly as Lighthouse answers it. */
export const readOwnersReport = (
  reads: ReportReads,
  owner: ReportOwner,
  reportId: number,
): Promise<LighthouseApiResult<unknown>> =>
  owner.kind === "team"
    ? reads.getTeamReport(owner.id, reportId)
    : reads.getPortfolioReport(owner.id, reportId);

type OwnerRead = (
  id: number,
) => Promise<
  { readonly ok: true; readonly value: unknown } | { readonly ok: false }
>;

/** Where the owner's name and the instance's words are read from. */
export type ReportOwnerSource = TermsSource & {
  readonly getTeam: OwnerRead;
  readonly getPortfolio: OwnerRead;
};

/**
 * {@link describeReportOwner} for an owner read from Lighthouse. Its name only labels a summary, so an owner that
 * cannot be read is named by its id instead, and this never fails.
 */
export const readReportOwner = async (
  source: ReportOwnerSource,
  owner: ReportOwner,
): Promise<string> => {
  const read =
    owner.kind === "team"
      ? source.getTeam(owner.id)
      : source.getPortfolio(owner.id);
  const [terms, named] = await Promise.all([
    readTerms(source),
    read.then(
      (answer) => (answer.ok ? answer.value : undefined),
      () => undefined,
    ),
  ]);
  return describeReportOwner(owner.kind, owner.id, named, terms);
};
