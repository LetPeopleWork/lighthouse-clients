import {
  type LighthouseApiResult,
  type ReportOwner,
  type ReportOwnerKind,
  type ReportOwnerSource,
  type ReportRead,
  type ReportReads,
  type ReportSummariser,
  readOwnersReport,
  readOwnersReports,
  readReportOwner,
  readReportRefusal,
  reportOpenedOccurrencesOf,
  summariseReport,
  summariseReportList,
} from "@letpeoplework/lighthouse-client";
import { z } from "zod";
import {
  encodePayload,
  getErrorToolResult,
  getNumericId,
  type McpToolResult,
  withSummaryBlock,
} from "./toolResult";
import { type CountedToolResult, countedToolResult } from "./usageDataPort";

// A report's values are Lighthouse's answer handed over whole, so the summary sits in a second block rather than
// inside the report: an assistant reading the first block reads exactly what the server sent.

export type ReportToolClient = ReportReads & ReportOwnerSource;

type ReportTool = (
  argumentsPayload: unknown,
  client: ReportToolClient,
) => Promise<McpToolResult | CountedToolResult>;

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

// The owner is read only once the report was, so a refused read asks Lighthouse for nothing more.
const answerReportRead = async (
  client: ReportToolClient,
  owner: ReportOwner,
  result: LighthouseApiResult<unknown>,
  answer: {
    readonly label: string;
    readonly read: ReportRead;
    readonly summarise: ReportSummariser;
  },
): Promise<McpToolResult> => {
  if (!result.ok) {
    return getErrorToolResult(
      `${answer.label}: ${await readReportRefusal(client, result.error, owner.kind, answer.read)}`,
    );
  }
  const ownerName = await readReportOwner(client, owner);
  return withSummaryBlock(
    `${answer.label}: ${encodePayload(result.value)}`,
    answer.summarise(result.value, ownerName),
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
    const owner = { kind, id };
    return answerReportRead(
      client,
      owner,
      await readOwnersReports(client, owner),
      {
        label: LIST_LABEL,
        read: "list",
        summarise: summariseReportList,
      },
    );
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
    const owner = { kind, id };
    const result = await readOwnersReport(client, owner, reportId);
    const answered = await answerReportRead(client, owner, result, {
      label: GET_LABEL,
      read: "report",
      summarise: summariseReport,
    });
    return countedToolResult(answered, reportOpenedOccurrencesOf(result));
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
