import {
  type CliConnection,
  describeEveryReportRefusal,
  type LighthouseApiResult,
  type LighthouseClient,
  type ReportOwner,
  type ReportRead,
  type ReportSummariser,
  readOwnersReport,
  readOwnersReports,
  readReportOwner,
  readReportRefusal,
  readTerms,
  reportOpenedOccurrencesOf,
  summariseEveryReport,
  summariseReport,
  summariseReportList,
} from "@letpeoplework/lighthouse-client";
import {
  type CliCommandResult,
  getErrorResult,
  getOptionValue,
  isCliCommandResult,
  mapApiResultToCliResult,
  occurrencesOf,
  withUsage,
} from "./commandResult";
import type { OutputFormat } from "./output";

type ReportClient = Pick<
  LighthouseClient,
  | "getTeamReports"
  | "getTeamReport"
  | "getAllReports"
  | "getPortfolioReports"
  | "getPortfolioReport"
  | "getTeam"
  | "getPortfolio"
  | "getTerminology"
>;

type ReportCommandDependencies = {
  readonly createClient: (connection: CliConnection) => ReportClient;
};

type ReportCommand = (
  args: readonly string[],
  outputFormat: OutputFormat,
  connection: CliConnection,
  dependencies: ReportCommandDependencies,
) => Promise<CliCommandResult>;

const parseNumericOption = (
  args: readonly string[],
  optionName: string,
  what: string,
): number | CliCommandResult | undefined => {
  const value = getOptionValue(args, optionName);
  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/u.test(value)) {
    return getErrorResult(
      `Invalid ${optionName} "${value}": expected a numeric ${what} id.`,
    );
  }
  return Number(value);
};

const parseOwner = (
  args: readonly string[],
  command: string,
): ReportOwner | CliCommandResult => {
  const teamId = parseNumericOption(args, "--team-id", "Team");
  if (isCliCommandResult(teamId)) {
    return teamId;
  }
  const portfolioId = parseNumericOption(args, "--portfolio-id", "Portfolio");
  if (isCliCommandResult(portfolioId)) {
    return portfolioId;
  }
  if (teamId !== undefined && portfolioId !== undefined) {
    return getErrorResult(
      `Give either --team-id or --portfolio-id for report ${command}, not both.`,
    );
  }
  if (teamId !== undefined) {
    return { kind: "team", id: teamId };
  }
  if (portfolioId !== undefined) {
    return { kind: "portfolio", id: portfolioId };
  }
  return getErrorResult(
    `Missing --team-id or --portfolio-id for report ${command}.`,
  );
};

// The owner is named only once the report was read and only for the pretty view, so a refused read, --json and
// --toon ask Lighthouse for nothing beyond the reports.
const printReportRead = async (
  client: ReportClient,
  owner: ReportOwner,
  result: LighthouseApiResult<unknown>,
  outputFormat: OutputFormat,
  answer: { readonly read: ReportRead; readonly summarise: ReportSummariser },
): Promise<CliCommandResult> => {
  if (!result.ok) {
    return getErrorResult(
      await readReportRefusal(client, result.error, owner.kind, answer.read),
    );
  }
  if (outputFormat !== "pretty") {
    return mapApiResultToCliResult(result, outputFormat);
  }
  const ownerName = await readReportOwner(client, owner);
  return mapApiResultToCliResult(result, outputFormat, (value) =>
    answer.summarise(value, ownerName),
  );
};

const namesAnOwner = (args: readonly string[]): boolean =>
  args.includes("--team-id") || args.includes("--portfolio-id");

// Lighthouse filters the list to what the caller may read, so lh asks once and relays the answer.
const runEveryReportList = async (
  client: ReportClient,
  outputFormat: OutputFormat,
): Promise<CliCommandResult> => {
  const result = await client.getAllReports();
  if (!result.ok) {
    return getErrorResult(describeEveryReportRefusal(result.error));
  }
  const terms = outputFormat === "pretty" ? await readTerms(client) : undefined;
  return withUsage(
    mapApiResultToCliResult(
      result,
      outputFormat,
      terms === undefined
        ? undefined
        : (value) => summariseEveryReport(value, terms),
    ),
    result,
    occurrencesOf("report list"),
  );
};

const runReportList: ReportCommand = async (
  args,
  outputFormat,
  connection,
  dependencies,
) => {
  if (!namesAnOwner(args)) {
    return runEveryReportList(
      dependencies.createClient(connection),
      outputFormat,
    );
  }
  const owner = parseOwner(args, "list");
  if (isCliCommandResult(owner)) {
    return owner;
  }

  const client = dependencies.createClient(connection);
  return printReportRead(
    client,
    owner,
    await readOwnersReports(client, owner),
    outputFormat,
    { read: "list", summarise: summariseReportList },
  );
};

const runReportGet: ReportCommand = async (
  args,
  outputFormat,
  connection,
  dependencies,
) => {
  const owner = parseOwner(args, "get");
  if (isCliCommandResult(owner)) {
    return owner;
  }
  const reportId = parseNumericOption(args, "--id", "report");
  if (isCliCommandResult(reportId)) {
    return reportId;
  }
  if (reportId === undefined) {
    return getErrorResult("Missing required --id for report get.");
  }

  const client = dependencies.createClient(connection);
  const answered = await readOwnersReport(client, owner, reportId);
  const printed = await printReportRead(client, owner, answered, outputFormat, {
    read: "report",
    summarise: summariseReport,
  });
  return withUsage(printed, answered, reportOpenedOccurrencesOf(answered));
};

const REPORT_COMMANDS: ReadonlyMap<string, ReportCommand> = new Map([
  ["list", runReportList],
  ["get", runReportGet],
]);

/** The `lh report <subcommand>` handler, or undefined for a subcommand there is none for. */
export const findReportCommand = (
  subcommand: string,
): ReportCommand | undefined => REPORT_COMMANDS.get(subcommand);
