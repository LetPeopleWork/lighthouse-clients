import {
  describeReportListSummary,
  describeReportOwner,
  describeReportSummary,
  type LighthouseApiResult,
  type LighthouseClient,
  type ReportOwnerKind,
  readReport,
  readReportList,
  readReportRefusal,
  readTerms,
} from "@letpeoplework/lighthouse-client";
import { z } from "zod";
import {
  encodePayload,
  getErrorToolResult,
  getNumericId,
  type McpToolResult,
  withSummaryBlock,
} from "./toolResult";

// A report's values are Lighthouse's answer handed over whole, so the summary sits in a second block rather than
// inside the report: an assistant reading the first block reads exactly what the server sent.

type OwnerRead = (id: number) => Promise<
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly error: { readonly category: string; readonly reason: string };
    }
>;

export type ReportToolClient = Pick<
  LighthouseClient,
  | "getTeamReports"
  | "getTeamReport"
  | "getPortfolioReports"
  | "getPortfolioReport"
  | "getTerminology"
> & {
  readonly getTeam: OwnerRead;
  readonly getPortfolio: OwnerRead;
};

type ReportTool = (
  argumentsPayload: unknown,
  client: ReportToolClient,
) => Promise<McpToolResult>;

const HOW_LIGHTHOUSE_SHOWS_IT =
  "Read the lighthouse-reports skill for how Lighthouse shows these values, and quote them as they come.";

const HOW_THE_ANSWER_READS =
  "The first block is Lighthouse's answer, unchanged; a second text block, `summary`,";

const LIST_LABEL = "reports";
const GET_LABEL = "report";

const NEEDS_A_SERVER = "Needs a Lighthouse newer than v26.10.10.1.";

const ownerIdProperty = (kind: ReportOwnerKind) =>
  ({
    type: "integer",
    description: `The ${kind}'s numeric id.`,
  }) as const;

const reportIdProperty = {
  type: "integer",
  description:
    "The report's id, as its owner's report list names it under reports[].id.",
} as const;

const listInputSchema = (kind: ReportOwnerKind) =>
  ({
    type: "object",
    properties: { id: ownerIdProperty(kind) },
    required: ["id"],
    additionalProperties: false,
  }) as const;

const getInputSchema = (kind: ReportOwnerKind) =>
  ({
    type: "object",
    properties: { id: ownerIdProperty(kind), reportId: reportIdProperty },
    required: ["id", "reportId"],
    additionalProperties: false,
  }) as const;

const listDescription = (kind: ReportOwnerKind) =>
  `List the reports a ${kind} holds by ${kind} ID: each report's id, name, type (templateKey) and when it was created. ${HOW_THE_ANSWER_READS} names the ${kind} and counts its reports in the instance's terminology. ${HOW_LIGHTHOUSE_SHOWS_IT} ${NEEDS_A_SERVER}`;

const getDescription = (kind: ReportOwnerKind) =>
  `Get one of a ${kind}'s reports by ${kind} ID and reportId, exactly as Lighthouse froze it: its windows and every value, a missing value with its reason. ${HOW_LIGHTHOUSE_SHOWS_IT} ${HOW_THE_ANSWER_READS} names the report, its ${kind} and its Then and Now windows. ${NEEDS_A_SERVER}`;

export const reportToolDefinitions = [
  {
    name: "lighthouse_team_report_list",
    description: listDescription("team"),
    inputSchema: listInputSchema("team"),
  },
  {
    name: "lighthouse_team_report_get",
    description: getDescription("team"),
    inputSchema: getInputSchema("team"),
  },
  {
    name: "lighthouse_portfolio_report_list",
    description: listDescription("portfolio"),
    inputSchema: listInputSchema("portfolio"),
  },
  {
    name: "lighthouse_portfolio_report_get",
    description: getDescription("portfolio"),
    inputSchema: getInputSchema("portfolio"),
  },
] as const;

const listSchema = z.object({ id: z.number().int() });
const getSchema = z.object({
  id: z.number().int(),
  reportId: z.number().int(),
});

export const reportInputSchemas = {
  lighthouse_team_report_list: listSchema,
  lighthouse_team_report_get: getSchema,
  lighthouse_portfolio_report_list: listSchema,
  lighthouse_portfolio_report_get: getSchema,
};

const getReportId = (argumentsPayload: unknown): number | null => {
  const reportId =
    typeof argumentsPayload === "object" && argumentsPayload !== null
      ? (argumentsPayload as { readonly reportId?: unknown }).reportId
      : undefined;
  return typeof reportId === "number" && Number.isInteger(reportId)
    ? reportId
    : null;
};

// The owner's name is only for the summary, so an owner that cannot be read is named by its id instead.
const readOwnerName = async (
  client: ReportToolClient,
  kind: ReportOwnerKind,
  id: number,
): Promise<string> => {
  const read = kind === "team" ? client.getTeam(id) : client.getPortfolio(id);
  const [terms, owner] = await Promise.all([
    readTerms(client),
    read.then(
      (named) => (named.ok ? named.value : undefined),
      () => undefined,
    ),
  ]);
  return describeReportOwner(kind, id, owner, terms);
};

type Summarise = (facts: unknown, owner: string) => string | null;

const summariseReport: Summarise = (facts, owner) => {
  const report = readReport(facts);
  return report === null ? null : describeReportSummary(report, owner);
};

const summariseReportList: Summarise = (facts, owner) => {
  const reports = readReportList(facts);
  return reports === null ? null : describeReportListSummary(reports, owner);
};

// The owner is read only once the report was, so a refused read asks Lighthouse for nothing more.
const answerReportRead = async (
  client: ReportToolClient,
  kind: ReportOwnerKind,
  id: number,
  read: Promise<LighthouseApiResult<unknown>>,
  answer: { readonly label: string; readonly summarise: Summarise },
): Promise<McpToolResult> => {
  const result = await read;
  if (!result.ok) {
    return getErrorToolResult(
      `${answer.label}: ${await readReportRefusal(client, result.error, kind)}`,
    );
  }
  const owner = await readOwnerName(client, kind, id);
  return withSummaryBlock(
    `${answer.label}: ${encodePayload(result.value)}`,
    answer.summarise(result.value, owner),
  );
};

const invalid = (label: string, what: string): McpToolResult =>
  getErrorToolResult(`${label}: invalid ${what}`);

const reportList =
  (kind: ReportOwnerKind): ReportTool =>
  async (argumentsPayload, client) => {
    const id = getNumericId(argumentsPayload);
    if (id === null) {
      return invalid(LIST_LABEL, "id");
    }
    const read =
      kind === "team"
        ? client.getTeamReports(id)
        : client.getPortfolioReports(id);
    return answerReportRead(client, kind, id, read, {
      label: LIST_LABEL,
      summarise: summariseReportList,
    });
  };

const reportGet =
  (kind: ReportOwnerKind): ReportTool =>
  async (argumentsPayload, client) => {
    const id = getNumericId(argumentsPayload);
    if (id === null) {
      return invalid(GET_LABEL, "id");
    }
    const reportId = getReportId(argumentsPayload);
    if (reportId === null) {
      return invalid(GET_LABEL, "reportId");
    }
    const read =
      kind === "team"
        ? client.getTeamReport(id, reportId)
        : client.getPortfolioReport(id, reportId);
    return answerReportRead(client, kind, id, read, {
      label: GET_LABEL,
      summarise: summariseReport,
    });
  };

const REPORT_TOOLS: ReadonlyMap<string, ReportTool> = new Map([
  ["lighthouse_team_report_list", reportList("team")],
  ["lighthouse_team_report_get", reportGet("team")],
  ["lighthouse_portfolio_report_list", reportList("portfolio")],
  ["lighthouse_portfolio_report_get", reportGet("portfolio")],
]);

/** The handler of one of the report tools, or undefined for any other tool. */
export const findReportTool = (name: string): ReportTool | undefined =>
  REPORT_TOOLS.get(name);
