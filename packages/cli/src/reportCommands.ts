import {
  type CliConnection,
  describeReportOwner,
  type LighthouseApiResult,
  type LighthouseClient,
  type ReportOwnerKind,
  readReportRefusal,
  readTerms,
} from "@letpeoplework/lighthouse-client";
import {
  type CliCommandResult,
  getErrorResult,
  getOptionValue,
  isCliCommandResult,
  mapApiResultToCliResult,
} from "./commandResult";
import type { OutputFormat } from "./output";
import {
  type ReportRenderer,
  renderReport,
  renderReportList,
} from "./reportOutput";

type ReportClient = Pick<
  LighthouseClient,
  | "getTeamReports"
  | "getTeamReport"
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

type ReportOwner = {
  readonly kind: ReportOwnerKind;
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
    return { kind: "team", id: teamId };
  }
  if (portfolioId !== undefined) {
    return { kind: "portfolio", id: portfolioId };
  }
  return getErrorResult(
    `Missing --team-id or --portfolio-id for report ${command}.`,
  );
};

const UNREAD = { ok: false as const, error: null };

// The owner's name is only for the heading, so an owner that cannot be read is named by its id instead.
const readOwnerName = async (
  client: ReportClient,
  owner: ReportOwner,
): Promise<string> => {
  const read =
    owner.kind === "team"
      ? client.getTeam(owner.id)
      : client.getPortfolio(owner.id);
  const [terms, named] = await Promise.all([
    readTerms(client),
    read.catch(() => UNREAD),
  ]);
  return describeReportOwner(
    owner.kind,
    owner.id,
    named.ok ? named.value : undefined,
    terms,
  );
};

// The owner is named only once the report was read and only for the pretty view, so a refused read, --json and
// --toon ask Lighthouse for nothing beyond the reports.
const mapReportRead = async (
  client: ReportClient,
  owner: ReportOwner,
  read: Promise<LighthouseApiResult<unknown>>,
  outputFormat: OutputFormat,
  render: ReportRenderer,
): Promise<CliCommandResult> => {
  const result = await read;
  if (!result.ok) {
    return getErrorResult(
      await readReportRefusal(client, result.error, owner.kind),
    );
  }
  if (outputFormat !== "pretty") {
    return mapApiResultToCliResult(result, outputFormat);
  }
  const ownerName = await readOwnerName(client, owner);
  return mapApiResultToCliResult(result, outputFormat, (value) =>
    render(value, ownerName),
  );
};

const runReportList: ReportCommand = async (
  args,
  outputFormat,
  connection,
  dependencies,
) => {
  const owner = parseOwner(args, "list");
  if (isCliCommandResult(owner)) {
    return owner;
  }

  const client = dependencies.createClient(connection);
  const read =
    owner.kind === "team"
      ? client.getTeamReports(owner.id)
      : client.getPortfolioReports(owner.id);
  return mapReportRead(client, owner, read, outputFormat, renderReportList);
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
  const read =
    owner.kind === "team"
      ? client.getTeamReport(owner.id, reportId)
      : client.getPortfolioReport(owner.id, reportId);
  return mapReportRead(client, owner, read, outputFormat, renderReport);
};

const REPORT_COMMANDS: ReadonlyMap<string, ReportCommand> = new Map([
  ["list", runReportList],
  ["get", runReportGet],
]);

/** The `lh report <subcommand>` handler, or undefined for a subcommand there is none for. */
export const findReportCommand = (
  subcommand: string,
): ReportCommand | undefined => REPORT_COMMANDS.get(subcommand);
