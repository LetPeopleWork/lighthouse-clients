import type {
  CliConnection,
  LighthouseApiResult,
  LighthouseClient,
} from "@letpeoplework/lighthouse-client";
import {
  type CliCommandResult,
  getErrorResult,
  getOptionValue,
  isCliCommandResult,
  mapApiResultToCliResult,
} from "./commandResult";
import type { OutputFormat } from "./output";

type ReportClient = Pick<
  LighthouseClient,
  "getTeamReport" | "getPortfolioReport"
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

type ReportOwner = {
  readonly kind: "Team" | "Portfolio";
  readonly id: number;
};

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
    return { kind: "Team", id: teamId };
  }
  if (portfolioId !== undefined) {
    return { kind: "Portfolio", id: portfolioId };
  }
  return getErrorResult(
    `Missing --team-id or --portfolio-id for report ${command}.`,
  );
};

const readReport = (
  client: ReportClient,
  owner: ReportOwner,
  reportId: number,
): Promise<LighthouseApiResult<unknown>> =>
  owner.kind === "Team"
    ? client.getTeamReport(owner.id, reportId)
    : client.getPortfolioReport(owner.id, reportId);

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
  return mapApiResultToCliResult(
    await readReport(client, owner, reportId),
    outputFormat,
  );
};

const REPORT_COMMANDS: ReadonlyMap<string, ReportCommand> = new Map([
  ["get", runReportGet],
]);

/** The `lh report <subcommand>` handler, or undefined for a subcommand there is none for. */
export const findReportCommand = (
  subcommand: string,
): ReportCommand | undefined => REPORT_COMMANDS.get(subcommand);
