import {
  type DeliveryMetricsHistory,
  describeNothingToTakeBack,
  describeRecordedComment,
  describeRecordedVote,
  describeRefinementSummary,
  describeTakenBack,
  describeVoteRefusal,
  type LighthouseApiError,
  type LighthouseApiResult,
  type LighthouseClient,
  mintVoterKey,
  type RefinementAnswer,
  readRefinementTerms,
  readRefinementWording,
  summariseDeliveryMetricsHistory,
  type VotedRow,
} from "@letpeoplework/lighthouse-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { encode } from "@toon-format/toon";
import { z } from "zod";

export type McpCorePackageContract = {
  readonly name: "@letpeoplework/lighthouse-mcp-core";
  readonly dependsOn: "@letpeoplework/lighthouse-client";
  readonly transports: readonly ["stdio", "streamable-http"];
};

export const getMcpCorePackageContract = (): McpCorePackageContract => ({
  name: "@letpeoplework/lighthouse-mcp-core",
  dependsOn: "@letpeoplework/lighthouse-client",
  transports: ["stdio", "streamable-http"],
});

type McpToolContent = {
  readonly type: "text";
  readonly text: string;
};

export type McpToolResult = {
  readonly isError: boolean;
  readonly content: readonly McpToolContent[];
};

export type McpToolDefinition = {
  readonly name:
    | "lighthouse_health_check"
    | "lighthouse_version_get"
    | "lighthouse_worktracking_list"
    | "lighthouse_worktracking_get"
    | "lighthouse_team_list"
    | "lighthouse_team_get"
    | "lighthouse_team_refresh"
    | "lighthouse_team_refinement_get"
    | "lighthouse_team_refinement_vote"
    | "lighthouse_team_refinement_comment"
    | "lighthouse_team_refinement_voteTakeBack"
    | "lighthouse_portfolio_list"
    | "lighthouse_portfolio_get"
    | "lighthouse_portfolio_refresh"
    | "lighthouse_team_metrics_throughput"
    | "lighthouse_team_metrics_cycleTimePercentiles"
    | "lighthouse_team_metrics_workItemAgePercentiles"
    | "lighthouse_portfolio_metrics_workItemAgePercentiles"
    | "lighthouse_team_metrics_workItemAge"
    | "lighthouse_team_metrics_totalWorkItemAge"
    | "lighthouse_portfolio_metrics_throughput"
    | "lighthouse_portfolio_metrics_workItemAge"
    | "lighthouse_portfolio_metrics_totalWorkItemAge"
    | "lighthouse_team_metrics_blockedCountHistory"
    | "lighthouse_portfolio_metrics_blockedCountHistory"
    | "lighthouse_team_metrics_percentilesOverTime"
    | "lighthouse_portfolio_metrics_percentilesOverTime"
    | "lighthouse_team_metrics_processBehaviorOverTime"
    | "lighthouse_portfolio_metrics_processBehaviorOverTime"
    | "lighthouse_team_metrics_cumulativeStateTime"
    | "lighthouse_team_metrics_cumulativeStateTimeItems"
    | "lighthouse_team_metrics_cumulativeStateTimeCandidates"
    | "lighthouse_portfolio_metrics_cumulativeStateTime"
    | "lighthouse_portfolio_metrics_cumulativeStateTimeItems"
    | "lighthouse_portfolio_metrics_cumulativeStateTimeCandidates"
    | "lighthouse_feature_get"
    | "lighthouse_feature_workitems"
    | "lighthouse_delivery_list"
    | "lighthouse_delivery_metrics"
    | "lighthouse_blackout_list"
    | "lighthouse_blackout_create"
    | "lighthouse_blackout_update"
    | "lighthouse_blackout_delete"
    | "lighthouse_forecast_manual"
    | "lighthouse_forecast_backtest";
  readonly description: string;
  readonly inputSchema: {
    readonly type: "object";
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
    readonly additionalProperties: false;
  };
};

const emptyInputSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const idInputSchema = {
  type: "object",
  properties: {
    id: {
      type: "integer",
      description: "Unique numeric identifier.",
    },
  },
  required: ["id"],
  additionalProperties: false,
} as const;

const dateRangeProperties = {
  startDate: {
    type: "string",
    description: "Inclusive start date in ISO format (YYYY-MM-DD).",
  },
  endDate: {
    type: "string",
    description: "Inclusive end date in ISO format (YYYY-MM-DD).",
  },
} as const;

const throughputFilterViewProperty = {
  view: {
    type: "string",
    enum: ["raw", "filtered"],
    description:
      'Forecast-filter view (Lighthouse v26.5.24.10+). "filtered" applies the team\'s exclusion rule to throughput. Omit or "raw" returns unfiltered data.',
  },
} as const;

const percentilesOverTimeProperties = {
  metricType: {
    type: "string",
    enum: ["CycleTime", "WorkItemAge"],
    description:
      'Percentile family to read. Defaults to "CycleTime" when omitted.',
  },
  horizon: {
    type: "number",
    description:
      "Cycle-time horizon in days (30, 60 or 90). Ignored for WorkItemAge, which is always as-of-today and has no horizon dimension.",
  },
} as const;

const processBehaviorOverTimeProperties = {
  metricType: {
    type: "string",
    enum: [
      "Throughput",
      "WorkItemAge",
      "Wip",
      "CycleTime",
      "Arrivals",
      "FeatureSize",
    ],
    description:
      'Process-behaviour family to read. Defaults to "Throughput" when omitted. "FeatureSize" is portfolio-only — a team never records it and returns an empty series.',
  },
} as const;

const cumulativeStateProperty = {
  state: {
    type: "string",
    description:
      "Workflow state name to drill into (must match a bar's state from the cumulativeStateTime response).",
  },
} as const;

const itemIdsProperty = {
  itemIds: {
    type: "array",
    items: { type: "integer" },
    description:
      "Optional work-item IDs to narrow the computation to a selected subset; omit for all in-scope items.",
  },
} as const;

const forecastFilterOverrideProperty = {
  applyFilterOverride: {
    type: "boolean",
    description:
      "Override the team's forecast-filter setting (Lighthouse v26.5.24.10+). true = apply the team filter; false = skip the filter (raw); omit = respect the team setting.",
  },
} as const;

type McpRuntimeClient = {
  readonly checkConnectivity: () => Promise<{
    readonly category:
      | "success"
      | "unreachable"
      | "misconfigured"
      | "unauthorized"
      | "dependency-failure"
      | "concurrency-conflict"
      | "unexpected";
    readonly reason?: string;
  }>;
  readonly getVersion: () => Promise<
    | {
        readonly ok: true;
        readonly value: string;
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly listWorkTrackingConnections: () => Promise<
    | {
        readonly ok: true;
        readonly value: readonly unknown[];
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly getWorkTrackingConnection: (id: number) => Promise<
    | {
        readonly ok: true;
        readonly value: unknown;
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly listTeams: () => Promise<
    | {
        readonly ok: true;
        readonly value: readonly unknown[];
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly getTeam: (id: number) => Promise<
    | {
        readonly ok: true;
        readonly value: unknown;
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly refreshTeam: (id: number) => Promise<
    | {
        readonly ok: true;
        readonly value: unknown;
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly listPortfolios: () => Promise<
    | {
        readonly ok: true;
        readonly value: readonly unknown[];
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly getPortfolio: (id: number) => Promise<
    | {
        readonly ok: true;
        readonly value: unknown;
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly refreshPortfolio: (id: number) => Promise<
    | {
        readonly ok: true;
        readonly value: unknown;
      }
    | {
        readonly ok: false;
        readonly error: {
          readonly category: string;
          readonly reason: string;
        };
      }
  >;
  readonly getTeamThroughput: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
    view?: "raw" | "filtered",
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamCycleTimePercentiles: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
    definitionId?: number,
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamWorkItemAgePercentiles: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioWorkItemAgePercentiles: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioThroughput: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamWorkItemAgeOverTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamTotalWorkItemAgeOverTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioWorkItemAgeOverTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioTotalWorkItemAgeOverTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamBlockedCountHistory: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioBlockedCountHistory: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamPercentilesOverTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
    metricType?: "CycleTime" | "WorkItemAge",
    horizon?: number,
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioPercentilesOverTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
    metricType?: "CycleTime" | "WorkItemAge",
    horizon?: number,
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamProcessBehaviorOverTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
    metricType?:
      | "Throughput"
      | "WorkItemAge"
      | "Wip"
      | "CycleTime"
      | "Arrivals"
      | "FeatureSize",
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioProcessBehaviorOverTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
    metricType?:
      | "Throughput"
      | "WorkItemAge"
      | "Wip"
      | "CycleTime"
      | "Arrivals"
      | "FeatureSize",
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamCumulativeStateTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
    itemIds?: readonly number[],
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamCumulativeStateTimeItems: (
    id: number,
    state: string,
    range?: { readonly startDate: string; readonly endDate: string },
    itemIds?: readonly number[],
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamCumulativeStateTimeCandidates: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioCumulativeStateTime: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
    itemIds?: readonly number[],
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioCumulativeStateTimeItems: (
    id: number,
    state: string,
    range?: { readonly startDate: string; readonly endDate: string },
    itemIds?: readonly number[],
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioCumulativeStateTimeCandidates: (
    id: number,
    range?: { readonly startDate: string; readonly endDate: string },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getFeaturesByIds: (ids: readonly number[]) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getFeaturesByReferences: (refs: readonly string[]) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getFeatureWorkItems: (featureId: number) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly listDeliveries: (portfolioId: number) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getDeliveryMetricsHistory: (deliveryId: number) => Promise<
    | { readonly ok: true; readonly value: DeliveryMetricsHistory }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly createDelivery: (
    portfolioId: number,
    payload: Readonly<Record<string, unknown>>,
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly updateDelivery: (
    deliveryId: number,
    payload: Readonly<Record<string, unknown>>,
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly deleteDelivery: (deliveryId: number) => Promise<
    | { readonly ok: true; readonly value: undefined }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getRecurringBlackoutRules: () => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly createRecurringBlackoutRule: (
    payload: Readonly<Record<string, unknown>>,
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly updateRecurringBlackoutRule: (
    id: number,
    payload: Readonly<Record<string, unknown>>,
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly deleteRecurringBlackoutRule: (id: number) => Promise<
    | { readonly ok: true; readonly value: undefined }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly runManualForecast: (
    teamId: number,
    payload: {
      readonly remainingItems?: number;
      readonly targetDate?: string;
      readonly applyFilterOverride?: boolean;
    },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly runBacktest: (
    teamId: number,
    payload: {
      readonly startDate: string;
      readonly endDate: string;
      readonly historicalStartDate: string;
      readonly historicalEndDate: string;
      readonly applyFilterOverride?: boolean;
    },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
} & Pick<
  LighthouseClient,
  | "getTeamRefinement"
  | "castRefinementVote"
  | "addRefinementComment"
  | "takeBackRefinementVote"
  | "getTerminology"
>;

/** The voter key one MCP server keeps for the one Lighthouse it talks to. */
export type McpVoterKeyStore = {
  readonly load: () => Promise<string | null>;
  readonly save: (key: string) => Promise<void>;
};

export type McpCoreRuntimeDependencies = {
  readonly createClient: () => McpRuntimeClient;
  /** Where a local server keeps its voter key; a server shared by many people keeps none. */
  readonly voterKeyStore?: McpVoterKeyStore;
  /** Why this server may not vote, comment or take back right now, or null when it may. */
  readonly refuseVoting?: () => Promise<string | null>;
};

export type McpCoreRuntime = {
  readonly listTools: () => readonly McpToolDefinition[];
  readonly callTool: (
    name: string,
    argumentsPayload: unknown,
  ) => Promise<McpToolResult>;
};

const recurringBlackoutRuleProperties = {
  weekdays: {
    type: "array",
    items: {
      type: "string",
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    description: "Weekdays the rule applies to.",
  },
  intervalWeeks: {
    type: "integer",
    description: "Repeat every N weeks (1 = every week).",
  },
  start: {
    type: "string",
    description: "Rule start date in ISO format (YYYY-MM-DD).",
  },
  end: {
    type: ["string", "null"],
    description:
      "Optional end date in ISO format (YYYY-MM-DD), or null for an open end.",
  },
  description: {
    type: "string",
    description: "Human-readable description of the rule.",
  },
} as const;

const workItemProperty = {
  type: "string",
  description:
    "The work item's reference, as referenceId shows it in lighthouse_team_refinement_get (for example GR-051).",
} as const;

const voterNameProperty = {
  type: "string",
  description:
    "The user's own name, needed when Lighthouse runs without sign-in. Ask the user for their name and never infer it, not from the system, an account or earlier messages. Leave it out with sign-in.",
} as const;

const toolDefinitions: readonly McpToolDefinition[] = [
  {
    name: "lighthouse_health_check",
    description:
      "Check connectivity to Lighthouse and return whether the configured endpoint is reachable.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_version_get",
    description:
      "Retrieve the Lighthouse server version from the version endpoint.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_worktracking_list",
    description:
      "List configured work-tracking system connections in Lighthouse.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_worktracking_get",
    description: "Get a single work-tracking system connection by ID.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_list",
    description: "List all teams available in Lighthouse.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_team_get",
    description: "Get full details for one team by ID.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_refresh",
    description: "Trigger data refresh for a team by ID.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_refinement_get",
    description:
      "How many work items a team should refine before its next Refinement, as on the team's Refinement tab (Lighthouse newer than v26.10.3.6). `summary` is the sentence the web page states, in the instance's terminology. need.low and need.high are the range of work items the team is likely to pull over one cycle (need.cycleStart to need.cycleEnd: from the next Refinement to the one after, or from today on a Refinement day), read at need.lowPercentile and need.highPercentile. need.verdict says where readyCount sits against that range: Below, In or Above. Without a verdict, need.unavailableReason says why: NoCadence, InsufficientData or NoRefinementStates. isRefinementDay is true on a Refinement day, when the cycle starts today. daysUntilNextRefinement counts the days from the instance's today to nextRefinementDate. readySource says what readyCount counts: work items ready by Votes, or by Stages on a team with stage rules. workItems are the items in refinement, in the order the Refinement tab lists them.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_refinement_vote",
    description:
      "Records the USER's own sizing judgement under their name. Never call this on your own initiative or on someone else's behalf: show the user the Work Item, the answer and any comment you intend to send, and call only after they explicitly confirm. answer is Yes (ready to be pulled), YesBut (\"Yes, if…\": ready under a condition, which goes in comment) or No; voting again replaces the user's earlier vote. Returns the work item as the vote left it, with `summary` stating where it now stands. Lighthouse newer than v26.10.3.6.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "The team's numeric id." },
        workItem: workItemProperty,
        answer: {
          type: "string",
          enum: ["Yes", "YesBut", "No"],
          description:
            'The user\'s answer: Yes, YesBut ("Yes, if…") or No, as myVote and split name them.',
        },
        comment: {
          type: "string",
          description:
            "Optional; required with YesBut, where it says what has to be true.",
        },
        voterName: voterNameProperty,
      },
      required: ["id", "workItem", "answer"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_refinement_comment",
    description:
      "Records a comment or question of the USER's on a work item in refinement, under their name, without a vote. Never call this on your own initiative or on someone else's behalf: show the user the work item and the comment you intend to send, and call only after they explicitly confirm. Returns the work item as the comment left it, with a `summary`. Lighthouse newer than v26.10.3.6.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "The team's numeric id." },
        workItem: workItemProperty,
        comment: { type: "string", description: "The user's comment." },
        voterName: voterNameProperty,
      },
      required: ["id", "workItem", "comment"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_refinement_voteTakeBack",
    description:
      "Takes back the vote the USER cast on a work item from this assistant. Call only when the user asks for it. When this assistant holds no vote of theirs on the work item it says so and takes nothing back. Returns the work item as the take-back left it, with `summary` stating where it now stands. Lighthouse newer than v26.10.3.6.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", description: "The team's numeric id." },
        workItem: workItemProperty,
      },
      required: ["id", "workItem"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_list",
    description: "List all portfolios in Lighthouse.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_portfolio_get",
    description: "Get full details for one portfolio by ID.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_portfolio_refresh",
    description: "Trigger data refresh for a portfolio by ID.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_metrics_throughput",
    description:
      'Get throughput run-chart data for a team by ID, optionally filtered by start and end dates. Pass view="filtered" to apply the team\'s forecast-exclusion rule (Lighthouse v26.5.24.10+); omit or "raw" returns unfiltered data.',
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
        ...throughputFilterViewProperty,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_cycleTimePercentiles",
    description:
      "Get cycle-time percentiles for a team by ID, optionally filtered by start and end dates. Pass definitionId to get the percentiles for a named cycle time (premium) instead of the default cycle time.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
        definitionId: {
          type: "number",
          description:
            "Optional named cycle time definition ID; omit for the default cycle time.",
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_workItemAgePercentiles",
    description:
      "Get work-item age percentiles for a team by ID, optionally filtered by start and end dates. Ages are measured as of the last day of the selected range, not as of today — a historical range reports how old the items were at the end of that period, so do not present the result as the team's current ages unless the range ends today.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_workItemAgePercentiles",
    description:
      "Get work-item age percentiles for a portfolio by ID, optionally filtered by start and end dates. Ages are measured as of the last day of the selected range, not as of today — a historical range reports how old the items were at the end of that period, so do not present the result as the portfolio's current ages unless the range ends today.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_blockedCountHistory",
    description:
      "Get the blocked-items-over-time trend for a team by ID: how many work items were blocked on each captured day, optionally filtered by start and end dates. To see what is blocked right now and for how long, read the team's current WIP — each item carries isBlocked and, when blocked, a blockedSince timestamp.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_blockedCountHistory",
    description:
      "Get the blocked-items-over-time trend for a portfolio by ID: how many work items were blocked on each captured day, optionally filtered by start and end dates. To see what is blocked right now and for how long, read the portfolio's current WIP — each item carries isBlocked and, when blocked, a blockedSince timestamp.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_percentilesOverTime",
    description:
      "Get the percentiles-over-time trend for a team by ID: the p50/p70/p85/p95 quartet recorded on each captured day, optionally filtered by start and end dates. By default Lighthouse only returns days it recorded, so a recently upgraded server returns an empty series until it has recorded some; where a System Admin has switched on filling in past days (a Preview), the read starts filling missing days in the background and a later call may return more. Use metricType to pick the family and horizon to pick the cycle-time window.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
        ...percentilesOverTimeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_percentilesOverTime",
    description:
      "Get the percentiles-over-time trend for a portfolio by ID: the p50/p70/p85/p95 quartet recorded on each captured day, optionally filtered by start and end dates. By default Lighthouse only returns days it recorded, so a recently upgraded server returns an empty series until it has recorded some; where a System Admin has switched on filling in past days (a Preview), the read starts filling missing days in the background and a later call may return more. Use metricType to pick the family and horizon to pick the cycle-time window.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
        ...percentilesOverTimeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_processBehaviorOverTime",
    description:
      "Get the process-behaviour-limits-over-time trend for a team by ID: the upper limit, average and lower limit (UNPL/Average/LNPL) recorded on each captured day, optionally filtered by start and end dates. Days are recorded on refresh (and, where a System Admin has switched on filling in past days, filled in the background after a read), and days without a usable baseline are absent rather than zeroed — an empty series means nothing was recorded, never a process pinned at zero.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
        ...processBehaviorOverTimeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_processBehaviorOverTime",
    description:
      "Get the process-behaviour-limits-over-time trend for a portfolio by ID: the upper limit, average and lower limit (UNPL/Average/LNPL) recorded on each captured day, optionally filtered by start and end dates. Days are recorded on refresh (and, where a System Admin has switched on filling in past days, filled in the background after a read), and days without a usable baseline are absent rather than zeroed — an empty series means nothing was recorded, never a process pinned at zero. FeatureSize is available here and not on teams.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
        ...processBehaviorOverTimeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_throughput",
    description:
      "Get throughput run-chart data for a portfolio by ID, optionally filtered by start and end dates.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_workItemAge",
    description:
      "Get per-item work item age over time for a team by ID. Returns daily snapshots with each in-progress item's age in days derived from its startedDate. Items without a startedDate are omitted.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_totalWorkItemAge",
    description:
      "Get the total (summed) work item age over time for a team by ID. Returns daily totals of all in-progress item ages derived from startedDate. Items without a startedDate are not counted.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_workItemAge",
    description:
      "Get per-item work item age over time for a portfolio by ID. Returns daily snapshots with each in-progress item's age in days derived from its startedDate. Items without a startedDate are omitted.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_totalWorkItemAge",
    description:
      "Get the total (summed) work item age over time for a portfolio by ID. Returns daily totals of all in-progress item ages derived from startedDate. Items without a startedDate are not counted.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_feature_get",
    description:
      "Get feature details by numeric IDs or external reference IDs.",
    inputSchema: {
      type: "object",
      properties: {
        ids: {
          type: "array",
          items: {
            type: "integer",
          },
          description: "Feature IDs.",
        },
        refs: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Feature reference identifiers.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_feature_workitems",
    description: "Get work items linked to a feature by ID.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_delivery_list",
    description: "List deliveries for a portfolio by portfolio ID.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_delivery_metrics",
    description:
      'Get a delivery\'s recorded trend by delivery ID: one row per day with total, done and remaining work, the epic count and the likelihood. Set detail to "epics" for the per-epic breakdown and the forecast distribution, which are far larger. Forward-only, so it starts at the first recorded snapshot. Requires Lighthouse newer than v26.5.29.5.',
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Delivery ID." },
        detail: {
          type: "string",
          enum: ["epics"],
          description:
            'Omit for one row per day. "epics" returns the whole recorded payload.',
        },
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_blackout_list",
    description:
      "List the recurring blackout rules (recurring non-working days excluded from forecasts). Requires Lighthouse newer than v26.5.29.5.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_blackout_create",
    description:
      "Create a recurring blackout rule (weekdays + every-N-weeks interval + start date + optional open end). Premium, system-admin only. Requires Lighthouse newer than v26.5.29.5.",
    inputSchema: {
      type: "object",
      properties: {
        ...recurringBlackoutRuleProperties,
      },
      required: ["weekdays", "intervalWeeks", "start", "description"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_blackout_update",
    description:
      "Update a recurring blackout rule by ID. Premium, system-admin only. Requires Lighthouse newer than v26.5.29.5.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...recurringBlackoutRuleProperties,
      },
      required: ["id", "weekdays", "intervalWeeks", "start", "description"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_blackout_delete",
    description:
      "Delete a recurring blackout rule by ID. Premium, system-admin only. Requires Lighthouse newer than v26.5.29.5.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_forecast_manual",
    description:
      "Run a manual forecast for a team by ID with optional remaining items and target date. Pass applyFilterOverride=true to apply the team's forecast filter, false to skip it, or omit to respect the team setting (Lighthouse v26.5.24.10+). The response includes filterApplied (boolean) and excludedSummary (string) when a filter was applied.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        remainingItems: {
          type: "integer",
          description: "Remaining items to forecast.",
        },
        targetDate: {
          type: "string",
          description: "Optional target date in ISO format (YYYY-MM-DD).",
        },
        ...forecastFilterOverrideProperty,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_forecast_backtest",
    description:
      "Run a forecast backtest for a team by ID using forecast and historical date ranges. Pass applyFilterOverride=true to apply the team's forecast filter, false to skip it, or omit to respect the team setting (Lighthouse v26.5.24.10+). The response includes filterApplied (boolean) and excludedSummary (string) when a filter was applied.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        startDate: {
          type: "string",
          description: "Forecast start date in ISO format (YYYY-MM-DD).",
        },
        endDate: {
          type: "string",
          description: "Forecast end date in ISO format (YYYY-MM-DD).",
        },
        historicalStartDate: {
          type: "string",
          description:
            "Historical sample start date in ISO format (YYYY-MM-DD).",
        },
        historicalEndDate: {
          type: "string",
          description: "Historical sample end date in ISO format (YYYY-MM-DD).",
        },
        ...forecastFilterOverrideProperty,
      },
      required: [
        "id",
        "startDate",
        "endDate",
        "historicalStartDate",
        "historicalEndDate",
      ],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_cumulativeStateTime",
    description:
      "Get cumulative time-per-state bar data for a team by ID: one entry per Doing-category workflow state with total/completed/ongoing contribution days and item counts. Optionally filter by date range and a subset of work-item IDs.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
        ...itemIdsProperty,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_cumulativeStateTimeItems",
    description:
      "Get the per-item drill-down for ONE state of a team's cumulative time-per-state chart: the work items that contributed to that state, with days contributed. Requires the state name.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...cumulativeStateProperty,
        ...dateRangeProperties,
        ...itemIdsProperty,
      },
      required: ["id", "state"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_metrics_cumulativeStateTimeCandidates",
    description:
      "List the work items selectable in a team's cumulative time-per-state item picker for the window (the in-scope candidate set). Search keys are referenceId and title.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_cumulativeStateTime",
    description:
      "Get cumulative time-per-state bar data for a portfolio by ID: one entry per Doing-category workflow state with total/completed/ongoing contribution days and item counts. Optionally filter by date range and a subset of work-item IDs.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
        ...itemIdsProperty,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_cumulativeStateTimeItems",
    description:
      "Get the per-item drill-down for ONE state of a portfolio's cumulative time-per-state chart: the work items that contributed to that state, with days contributed. Requires the state name.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...cumulativeStateProperty,
        ...dateRangeProperties,
        ...itemIdsProperty,
      },
      required: ["id", "state"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_portfolio_metrics_cumulativeStateTimeCandidates",
    description:
      "List the work items selectable in a portfolio's cumulative time-per-state item picker for the window (the in-scope candidate set). Search keys are referenceId and title.",
    inputSchema: {
      type: "object",
      properties: {
        ...idInputSchema.properties,
        ...dateRangeProperties,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

const encodePayload = (value: unknown): string => {
  try {
    return encode(value as never);
  } catch {
    return JSON.stringify(value);
  }
};

const getSuccessToolResult = (text: string): McpToolResult => ({
  isError: false,
  content: [
    {
      type: "text",
      text,
    },
  ],
});

const getErrorToolResult = (text: string): McpToolResult => ({
  isError: true,
  content: [
    {
      type: "text",
      text,
    },
  ],
});

const getNumericId = (argumentsPayload: unknown): number | null => {
  if (
    typeof argumentsPayload !== "object" ||
    argumentsPayload === null ||
    Array.isArray(argumentsPayload)
  ) {
    return null;
  }

  const value = (argumentsPayload as { readonly id?: unknown }).id;
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  return null;
};

const getRefinementErrorToolResult = (error: {
  readonly category: string;
  readonly reason: string;
}): McpToolResult =>
  getErrorToolResult(`refinement: ${error.category} (${error.reason})`);

const getTeamRefinementToolResult = async (
  client: McpRuntimeClient,
  teamId: number,
  voterKey: string | undefined,
): Promise<McpToolResult> => {
  const [refinement, wording] = await Promise.all([
    client.getTeamRefinement(teamId, { voterKey }),
    readRefinementWording(client, teamId),
  ]);
  if (!refinement.ok) {
    return getRefinementErrorToolResult(refinement.error);
  }
  if (!wording.ok) {
    return getRefinementErrorToolResult(wording.error);
  }

  const summary = describeRefinementSummary(refinement.value, wording.value);
  return getSuccessToolResult(
    `refinement: ${encodePayload({ summary, ...refinement.value })}`,
  );
};

const ASK_FOR_THE_NAME =
  "Ask the user for their name and send it as voterName; never guess it.";

const REFINEMENT_ANSWERS: ReadonlySet<string> = new Set([
  "Yes",
  "YesBut",
  "No",
]);

const getArgument = (argumentsPayload: unknown, key: string): unknown =>
  typeof argumentsPayload === "object" &&
  argumentsPayload !== null &&
  !Array.isArray(argumentsPayload)
    ? (argumentsPayload as Readonly<Record<string, unknown>>)[key]
    : undefined;

const getNonBlankArgument = (
  argumentsPayload: unknown,
  key: string,
): string | undefined => {
  const value = getArgument(argumentsPayload, key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
};

type RefinementWriteTarget = {
  readonly teamId: number;
  readonly workItem: string;
};

/** The team and work item a write names, or the house "invalid …" refusal under its label. */
const getRefinementWriteTarget = (
  argumentsPayload: unknown,
  label: string,
): RefinementWriteTarget | McpToolResult => {
  const teamId = getNumericId(argumentsPayload);
  if (teamId === null) {
    return getErrorToolResult(`${label}: invalid id`);
  }
  const workItem = getNonBlankArgument(argumentsPayload, "workItem");
  if (workItem === undefined) {
    return getErrorToolResult(`${label}: invalid workItem`);
  }
  return { teamId, workItem };
};

const isToolResult = (value: unknown): value is McpToolResult =>
  typeof value === "object" &&
  value !== null &&
  "isError" in value &&
  "content" in value;

/** The key this server keeps, minted and kept on its first write; none on a server that keeps none. */
const keepVoterKey = async (
  store: McpVoterKeyStore | undefined,
): Promise<string | undefined> => {
  if (store === undefined) {
    return undefined;
  }
  const kept = await store.load();
  if (kept !== null) {
    return kept;
  }
  const minted = mintVoterKey();
  await store.save(minted);
  return minted;
};

const getVoteRefusalToolResult = async (
  label: string,
  error: LighthouseApiError,
  client: McpRuntimeClient,
): Promise<McpToolResult> =>
  getErrorToolResult(
    `${label}: ${describeVoteRefusal(error, {
      terms: await readRefinementTerms(client),
      nameRequired: ASK_FOR_THE_NAME,
    })}`,
  );

const getRefinementWriteToolResult = async (
  label: string,
  result: LighthouseApiResult<VotedRow>,
  client: McpRuntimeClient,
  describe: (row: VotedRow) => string,
): Promise<McpToolResult> =>
  result.ok
    ? getSuccessToolResult(
        `${label}: ${encodePayload({ summary: describe(result.value), ...result.value })}`,
      )
    : getVoteRefusalToolResult(label, result.error, client);

type RefinementWrite = (
  argumentsPayload: unknown,
  client: McpRuntimeClient,
  dependencies: McpCoreRuntimeDependencies,
) => Promise<McpToolResult>;

const refusedVoting = async (
  label: string,
  dependencies: McpCoreRuntimeDependencies,
): Promise<McpToolResult | null> => {
  const refusal = (await dependencies.refuseVoting?.()) ?? null;
  return refusal === null ? null : getErrorToolResult(`${label}: ${refusal}`);
};

const castVote: RefinementWrite = async (
  argumentsPayload,
  client,
  dependencies,
) => {
  const target = getRefinementWriteTarget(argumentsPayload, "vote");
  if (isToolResult(target)) {
    return target;
  }
  const answer = getArgument(argumentsPayload, "answer");
  if (typeof answer !== "string" || !REFINEMENT_ANSWERS.has(answer)) {
    return getErrorToolResult("vote: invalid answer");
  }
  const comment = getNonBlankArgument(argumentsPayload, "comment");
  if (answer === "YesBut" && comment === undefined) {
    return getErrorToolResult(
      'vote: A "Yes, if…" needs its condition: add a comment saying what has to be true.',
    );
  }
  const refused = await refusedVoting("vote", dependencies);
  if (refused !== null) {
    return refused;
  }

  const voterName = getNonBlankArgument(argumentsPayload, "voterName");
  const result = await client.castRefinementVote(
    target.teamId,
    target.workItem,
    {
      answer: answer as RefinementAnswer,
      channel: "Assistant",
      comment,
      voterName,
      voterKey: await keepVoterKey(dependencies.voterKeyStore),
    },
  );
  return getRefinementWriteToolResult("vote", result, client, (row) =>
    describeRecordedVote(
      { workItem: target.workItem, voterName },
      answer as RefinementAnswer,
      row,
    ),
  );
};

const addComment: RefinementWrite = async (
  argumentsPayload,
  client,
  dependencies,
) => {
  const target = getRefinementWriteTarget(argumentsPayload, "comment");
  if (isToolResult(target)) {
    return target;
  }
  const comment = getNonBlankArgument(argumentsPayload, "comment");
  if (comment === undefined) {
    return getErrorToolResult("comment: invalid comment");
  }
  const refused = await refusedVoting("comment", dependencies);
  if (refused !== null) {
    return refused;
  }

  const voterName = getNonBlankArgument(argumentsPayload, "voterName");
  const result = await client.addRefinementComment(
    target.teamId,
    target.workItem,
    {
      comment,
      channel: "Assistant",
      voterName,
      voterKey: await keepVoterKey(dependencies.voterKeyStore),
    },
  );
  return getRefinementWriteToolResult("comment", result, client, () =>
    describeRecordedComment({ workItem: target.workItem, voterName }),
  );
};

/**
 * Lighthouse answers a take-back that found nothing exactly like one that did, so the refinement is read
 * first, and nothing is sent when this assistant holds no vote of the user's on the work item.
 */
const takeBackVote: RefinementWrite = async (
  argumentsPayload,
  client,
  dependencies,
) => {
  const target = getRefinementWriteTarget(argumentsPayload, "takeBack");
  if (isToolResult(target)) {
    return target;
  }
  const refused = await refusedVoting("takeBack", dependencies);
  if (refused !== null) {
    return refused;
  }
  const nothingToTakeBack = getSuccessToolResult(
    `takeBack: ${encodePayload({ summary: describeNothingToTakeBack(target.workItem) })}`,
  );
  const store = dependencies.voterKeyStore;
  const voterKey = (await store?.load()) ?? undefined;
  if (store !== undefined && voterKey === undefined) {
    return nothingToTakeBack;
  }

  const refinement = await client.getTeamRefinement(target.teamId, {
    voterKey,
  });
  if (!refinement.ok) {
    return getVoteRefusalToolResult("takeBack", refinement.error, client);
  }
  const row = refinement.value.workItems.find(
    (candidate) => candidate.referenceId === target.workItem,
  );
  if (row?.myVote == null) {
    return nothingToTakeBack;
  }

  const result = await client.takeBackRefinementVote(
    target.teamId,
    target.workItem,
    { channel: "Assistant", voterKey },
  );
  return getRefinementWriteToolResult("takeBack", result, client, (takenBack) =>
    describeTakenBack({ workItem: target.workItem }, takenBack),
  );
};

const REFINEMENT_WRITES: ReadonlyMap<string, RefinementWrite> = new Map([
  ["lighthouse_team_refinement_vote", castVote],
  ["lighthouse_team_refinement_comment", addComment],
  ["lighthouse_team_refinement_voteTakeBack", takeBackVote],
]);

const getDefinitionId = (argumentsPayload: unknown): number | undefined => {
  if (
    typeof argumentsPayload !== "object" ||
    argumentsPayload === null ||
    Array.isArray(argumentsPayload)
  ) {
    return undefined;
  }

  const value = (argumentsPayload as { readonly definitionId?: unknown })
    .definitionId;
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const getDateRange = (
  argumentsPayload: unknown,
): { readonly startDate: string; readonly endDate: string } | undefined => {
  if (!isObjectRecord(argumentsPayload)) {
    return undefined;
  }

  const startDate = argumentsPayload.startDate;
  const endDate = argumentsPayload.endDate;

  if (typeof startDate === "string" && typeof endDate === "string") {
    return { startDate, endDate };
  }

  return undefined;
};

const getStringArgument = (
  argumentsPayload: unknown,
  key: string,
): string | undefined => {
  if (!isObjectRecord(argumentsPayload)) {
    return undefined;
  }
  const value = argumentsPayload[key];
  return typeof value === "string" ? value : undefined;
};

const getItemIdsArgument = (
  argumentsPayload: unknown,
): readonly number[] | undefined => {
  if (!isObjectRecord(argumentsPayload)) {
    return undefined;
  }
  const value = argumentsPayload.itemIds;
  if (!Array.isArray(value)) {
    return undefined;
  }
  const ids = value.filter(
    (entry): entry is number =>
      typeof entry === "number" && Number.isInteger(entry),
  );
  return ids.length > 0 ? ids : undefined;
};

const getThroughputFilterView = (
  argumentsPayload: unknown,
): "raw" | "filtered" | undefined => {
  if (!isObjectRecord(argumentsPayload)) {
    return undefined;
  }
  const view = argumentsPayload.view;
  return view === "raw" || view === "filtered" ? view : undefined;
};

const percentilesOverTimeMetricTypes = ["CycleTime", "WorkItemAge"] as const;

type PercentilesOverTimeMetricTypeArgument =
  (typeof percentilesOverTimeMetricTypes)[number];

const getPercentilesOverTimeMetricType = (
  argumentsPayload: unknown,
): PercentilesOverTimeMetricTypeArgument | undefined => {
  const raw = getStringArgument(argumentsPayload, "metricType");
  return percentilesOverTimeMetricTypes.find((candidate) => candidate === raw);
};

const processBehaviorMetricTypes = [
  "Throughput",
  "WorkItemAge",
  "Wip",
  "CycleTime",
  "Arrivals",
  "FeatureSize",
] as const;

type ProcessBehaviorMetricTypeArgument =
  (typeof processBehaviorMetricTypes)[number];

const getProcessBehaviorMetricType = (
  argumentsPayload: unknown,
): ProcessBehaviorMetricTypeArgument | undefined => {
  const raw = getStringArgument(argumentsPayload, "metricType");
  return processBehaviorMetricTypes.find((candidate) => candidate === raw);
};

const getHorizonArgument = (argumentsPayload: unknown): number | undefined => {
  if (!isObjectRecord(argumentsPayload)) {
    return undefined;
  }
  const horizon = argumentsPayload.horizon;
  return typeof horizon === "number" && Number.isInteger(horizon)
    ? horizon
    : undefined;
};

const getApplyFilterOverride = (
  argumentsPayload: unknown,
): boolean | undefined => {
  if (!isObjectRecord(argumentsPayload)) {
    return undefined;
  }
  const value = argumentsPayload.applyFilterOverride;
  return typeof value === "boolean" ? value : undefined;
};

const isoDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected ISO date in YYYY-MM-DD format.");

const weekdaySchema = z.enum([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

const recurringBlackoutRuleInputSchema = z.object({
  weekdays: z.array(weekdaySchema),
  intervalWeeks: z.number().int(),
  start: isoDateStringSchema,
  end: isoDateStringSchema.nullable().optional(),
  description: z.string(),
});

const toolInputSchemas: Record<McpToolDefinition["name"], z.ZodTypeAny> = {
  lighthouse_health_check: z.object({}),
  lighthouse_version_get: z.object({}),
  lighthouse_worktracking_list: z.object({}),
  lighthouse_worktracking_get: z.object({ id: z.number().int() }),
  lighthouse_team_list: z.object({}),
  lighthouse_team_get: z.object({ id: z.number().int() }),
  lighthouse_team_refresh: z.object({ id: z.number().int() }),
  lighthouse_team_refinement_get: z.object({ id: z.number().int() }),
  lighthouse_team_refinement_vote: z.object({
    id: z.number().int(),
    workItem: z.string(),
    answer: z.enum(["Yes", "YesBut", "No"]),
    comment: z.string().optional(),
    voterName: z.string().optional(),
  }),
  lighthouse_team_refinement_comment: z.object({
    id: z.number().int(),
    workItem: z.string(),
    comment: z.string(),
    voterName: z.string().optional(),
  }),
  lighthouse_team_refinement_voteTakeBack: z.object({
    id: z.number().int(),
    workItem: z.string(),
  }),
  lighthouse_portfolio_list: z.object({}),
  lighthouse_portfolio_get: z.object({ id: z.number().int() }),
  lighthouse_portfolio_refresh: z.object({ id: z.number().int() }),
  lighthouse_team_metrics_throughput: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    view: z.enum(["raw", "filtered"]).optional(),
  }),
  lighthouse_team_metrics_cycleTimePercentiles: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    definitionId: z.number().int().optional(),
  }),
  lighthouse_team_metrics_workItemAgePercentiles: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_portfolio_metrics_workItemAgePercentiles: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_team_metrics_blockedCountHistory: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_portfolio_metrics_blockedCountHistory: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_team_metrics_percentilesOverTime: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    metricType: z.enum(["CycleTime", "WorkItemAge"]).optional(),
    horizon: z.number().int().optional(),
  }),
  lighthouse_portfolio_metrics_percentilesOverTime: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    metricType: z.enum(["CycleTime", "WorkItemAge"]).optional(),
    horizon: z.number().int().optional(),
  }),
  lighthouse_team_metrics_processBehaviorOverTime: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    metricType: z
      .enum([
        "Throughput",
        "WorkItemAge",
        "Wip",
        "CycleTime",
        "Arrivals",
        "FeatureSize",
      ])
      .optional(),
  }),
  lighthouse_portfolio_metrics_processBehaviorOverTime: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    metricType: z
      .enum([
        "Throughput",
        "WorkItemAge",
        "Wip",
        "CycleTime",
        "Arrivals",
        "FeatureSize",
      ])
      .optional(),
  }),
  lighthouse_team_metrics_workItemAge: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_team_metrics_totalWorkItemAge: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_portfolio_metrics_throughput: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_portfolio_metrics_workItemAge: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_portfolio_metrics_totalWorkItemAge: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_team_metrics_cumulativeStateTime: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    itemIds: z.array(z.number().int()).optional(),
  }),
  lighthouse_team_metrics_cumulativeStateTimeItems: z.object({
    id: z.number().int(),
    state: z.string(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    itemIds: z.array(z.number().int()).optional(),
  }),
  lighthouse_team_metrics_cumulativeStateTimeCandidates: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_portfolio_metrics_cumulativeStateTime: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    itemIds: z.array(z.number().int()).optional(),
  }),
  lighthouse_portfolio_metrics_cumulativeStateTimeItems: z.object({
    id: z.number().int(),
    state: z.string(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
    itemIds: z.array(z.number().int()).optional(),
  }),
  lighthouse_portfolio_metrics_cumulativeStateTimeCandidates: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_feature_get: z.object({
    ids: z.array(z.number().int()).optional(),
    refs: z.array(z.string()).optional(),
  }),
  lighthouse_feature_workitems: z.object({ id: z.number().int() }),
  lighthouse_delivery_list: z.object({ id: z.number().int() }),
  lighthouse_delivery_metrics: z.object({
    id: z.number().int(),
    detail: z.literal("epics").optional(),
  }),
  lighthouse_blackout_list: z.object({}),
  lighthouse_blackout_create: recurringBlackoutRuleInputSchema,
  lighthouse_blackout_update: recurringBlackoutRuleInputSchema.extend({
    id: z.number().int(),
  }),
  lighthouse_blackout_delete: z.object({ id: z.number().int() }),
  lighthouse_forecast_manual: z.object({
    id: z.number().int(),
    remainingItems: z.number().int().optional(),
    targetDate: isoDateStringSchema.optional(),
    applyFilterOverride: z.boolean().optional(),
  }),
  lighthouse_forecast_backtest: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema,
    endDate: isoDateStringSchema,
    historicalStartDate: isoDateStringSchema,
    historicalEndDate: isoDateStringSchema,
    applyFilterOverride: z.boolean().optional(),
  }),
};

// Writes whose names end in a verb the suffix rule does not know.
const WRITING_TOOLS: ReadonlySet<McpToolDefinition["name"]> = new Set([
  "lighthouse_team_refinement_vote",
  "lighthouse_team_refinement_comment",
  "lighthouse_team_refinement_voteTakeBack",
]);

const isReadOnlyTool = (toolName: McpToolDefinition["name"]): boolean =>
  !(
    WRITING_TOOLS.has(toolName) ||
    toolName.endsWith("_refresh") ||
    toolName.endsWith("_create") ||
    toolName.endsWith("_update") ||
    toolName.endsWith("_delete")
  );

export const createMcpCoreRuntime = (
  dependencies: McpCoreRuntimeDependencies,
): McpCoreRuntime => ({
  listTools: () => toolDefinitions,
  callTool: async (name: string, argumentsPayload: unknown) => {
    const client = dependencies.createClient();

    if (name === "lighthouse_health_check") {
      const health = await client.checkConnectivity();
      if (health.category === "success") {
        return getSuccessToolResult("connectivity: success");
      }

      const healthReasonSuffix =
        health.reason === undefined ? "" : ` (${health.reason})`;

      return getErrorToolResult(
        `connectivity: ${health.category}${healthReasonSuffix}`,
      );
    }

    if (name === "lighthouse_version_get") {
      const version = await client.getVersion();
      if (version.ok) {
        return getSuccessToolResult(`version: ${version.value}`);
      }

      return getErrorToolResult(
        `version: ${version.error.category} (${version.error.reason})`,
      );
    }

    if (name === "lighthouse_worktracking_list") {
      const connections = await client.listWorkTrackingConnections();
      if (connections.ok) {
        return getSuccessToolResult(
          `worktracking: ${encodePayload(connections.value)}`,
        );
      }

      return getErrorToolResult(
        `worktracking: ${connections.error.category} (${connections.error.reason})`,
      );
    }

    if (name === "lighthouse_worktracking_get") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("worktracking: invalid id");
      }

      const connection = await client.getWorkTrackingConnection(id);
      if (connection.ok) {
        return getSuccessToolResult(
          `worktracking: ${encodePayload(connection.value)}`,
        );
      }

      return getErrorToolResult(
        `worktracking: ${connection.error.category} (${connection.error.reason})`,
      );
    }

    if (name === "lighthouse_team_list") {
      const teams = await client.listTeams();
      if (teams.ok) {
        return getSuccessToolResult(`teams: ${encodePayload(teams.value)}`);
      }

      return getErrorToolResult(
        `teams: ${teams.error.category} (${teams.error.reason})`,
      );
    }

    if (name === "lighthouse_team_get") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team: invalid id");
      }

      const team = await client.getTeam(id);
      if (team.ok) {
        return getSuccessToolResult(`team: ${encodePayload(team.value)}`);
      }

      return getErrorToolResult(
        `team: ${team.error.category} (${team.error.reason})`,
      );
    }

    if (name === "lighthouse_team_refresh") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team: invalid id");
      }

      const result = await client.refreshTeam(id);
      if (result.ok) {
        return getSuccessToolResult(`team refreshed: ${id}`);
      }

      return getErrorToolResult(
        `team refresh: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_refinement_get") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("refinement: invalid id");
      }

      return getTeamRefinementToolResult(
        client,
        id,
        (await dependencies.voterKeyStore?.load()) ?? undefined,
      );
    }

    const refinementWrite = REFINEMENT_WRITES.get(name);
    if (refinementWrite !== undefined) {
      return refinementWrite(argumentsPayload, client, dependencies);
    }

    if (name === "lighthouse_portfolio_list") {
      const portfolios = await client.listPortfolios();
      if (portfolios.ok) {
        return getSuccessToolResult(
          `portfolios: ${encodePayload(portfolios.value)}`,
        );
      }

      return getErrorToolResult(
        `portfolios: ${portfolios.error.category} (${portfolios.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_get") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio: invalid id");
      }

      const portfolio = await client.getPortfolio(id);
      if (portfolio.ok) {
        return getSuccessToolResult(
          `portfolio: ${encodePayload(portfolio.value)}`,
        );
      }

      return getErrorToolResult(
        `portfolio: ${portfolio.error.category} (${portfolio.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_refresh") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio: invalid id");
      }

      const result = await client.refreshPortfolio(id);
      if (result.ok) {
        return getSuccessToolResult(`portfolio refreshed: ${id}`);
      }

      return getErrorToolResult(
        `portfolio refresh: ${result.error.category} (${result.error.reason})`,
      );
    }

    // ── Metrics tools ────────────────────────────────────────────────────────

    if (name === "lighthouse_team_metrics_throughput") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const view = getThroughputFilterView(argumentsPayload);
      const result = await client.getTeamThroughput(id, range, view);
      if (result.ok) {
        return getSuccessToolResult(
          `team throughput: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_cycleTimePercentiles") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const definitionId = getDefinitionId(argumentsPayload);
      const result = await client.getTeamCycleTimePercentiles(
        id,
        range,
        definitionId,
      );
      if (result.ok) {
        return getSuccessToolResult(
          `team cycleTimePercentiles: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_workItemAgePercentiles") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getTeamWorkItemAgePercentiles(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `team workItemAgePercentiles: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_workItemAgePercentiles") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getPortfolioWorkItemAgePercentiles(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio workItemAgePercentiles: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_blockedCountHistory") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getTeamBlockedCountHistory(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `team blockedCountHistory: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_blockedCountHistory") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getPortfolioBlockedCountHistory(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio blockedCountHistory: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_percentilesOverTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getTeamPercentilesOverTime(
        id,
        range,
        getPercentilesOverTimeMetricType(argumentsPayload),
        getHorizonArgument(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `team percentilesOverTime: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_percentilesOverTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getPortfolioPercentilesOverTime(
        id,
        range,
        getPercentilesOverTimeMetricType(argumentsPayload),
        getHorizonArgument(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio percentilesOverTime: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_processBehaviorOverTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getTeamProcessBehaviorOverTime(
        id,
        range,
        getProcessBehaviorMetricType(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `team processBehaviorOverTime: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_processBehaviorOverTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getPortfolioProcessBehaviorOverTime(
        id,
        range,
        getProcessBehaviorMetricType(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio processBehaviorOverTime: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_cumulativeStateTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const result = await client.getTeamCumulativeStateTime(
        id,
        getDateRange(argumentsPayload),
        getItemIdsArgument(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `team cumulativeStateTime: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_cumulativeStateTimeItems") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const state = getStringArgument(argumentsPayload, "state");
      if (state === undefined) {
        return getErrorToolResult("team metrics: missing state");
      }
      const result = await client.getTeamCumulativeStateTimeItems(
        id,
        state,
        getDateRange(argumentsPayload),
        getItemIdsArgument(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `team cumulativeStateTimeItems: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_cumulativeStateTimeCandidates") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const result = await client.getTeamCumulativeStateTimeCandidates(
        id,
        getDateRange(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `team cumulativeStateTimeCandidates: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_cumulativeStateTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const result = await client.getPortfolioCumulativeStateTime(
        id,
        getDateRange(argumentsPayload),
        getItemIdsArgument(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio cumulativeStateTime: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_cumulativeStateTimeItems") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const state = getStringArgument(argumentsPayload, "state");
      if (state === undefined) {
        return getErrorToolResult("portfolio metrics: missing state");
      }
      const result = await client.getPortfolioCumulativeStateTimeItems(
        id,
        state,
        getDateRange(argumentsPayload),
        getItemIdsArgument(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio cumulativeStateTimeItems: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_cumulativeStateTimeCandidates") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const result = await client.getPortfolioCumulativeStateTimeCandidates(
        id,
        getDateRange(argumentsPayload),
      );
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio cumulativeStateTimeCandidates: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_throughput") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getPortfolioThroughput(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio throughput: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_workItemAge") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getTeamWorkItemAgeOverTime(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `team workItemAge: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_team_metrics_totalWorkItemAge") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getTeamTotalWorkItemAgeOverTime(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `team totalWorkItemAge: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_workItemAge") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getPortfolioWorkItemAgeOverTime(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio workItemAge: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_portfolio_metrics_totalWorkItemAge") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getPortfolioTotalWorkItemAgeOverTime(
        id,
        range,
      );
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio totalWorkItemAge: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    // ── Feature tools ────────────────────────────────────────────────────────

    if (name === "lighthouse_feature_get") {
      const payload = isObjectRecord(argumentsPayload) ? argumentsPayload : {};
      const idsValue = payload.ids;
      const refsValue = payload.refs;

      if (Array.isArray(idsValue) && idsValue.length > 0) {
        const ids = idsValue.filter((v): v is number => typeof v === "number");
        const result = await client.getFeaturesByIds(ids);
        if (result.ok) {
          return getSuccessToolResult(
            `features: ${encodePayload(result.value)}`,
          );
        }
        return getErrorToolResult(
          `features: ${result.error.category} (${result.error.reason})`,
        );
      }

      if (Array.isArray(refsValue) && refsValue.length > 0) {
        const refs = refsValue.filter(
          (v): v is string => typeof v === "string",
        );
        const result = await client.getFeaturesByReferences(refs);
        if (result.ok) {
          return getSuccessToolResult(
            `features: ${encodePayload(result.value)}`,
          );
        }
        return getErrorToolResult(
          `features: ${result.error.category} (${result.error.reason})`,
        );
      }

      return getErrorToolResult(
        "features: provide ids (array of numbers) or refs (array of strings)",
      );
    }

    if (name === "lighthouse_feature_workitems") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("feature workitems: invalid id");
      }
      const result = await client.getFeatureWorkItems(id);
      if (result.ok) {
        return getSuccessToolResult(
          `feature workitems: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `feature workitems: ${result.error.category} (${result.error.reason})`,
      );
    }

    // ── Delivery tools ───────────────────────────────────────────────────────

    if (name === "lighthouse_delivery_list") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult(
          "delivery: invalid id (portfolio id required)",
        );
      }
      const result = await client.listDeliveries(id);
      if (result.ok) {
        return getSuccessToolResult(
          `deliveries: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `delivery: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_delivery_metrics") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult(
          "delivery metrics: invalid id (delivery id required)",
        );
      }
      const wantsEpics =
        (argumentsPayload as { readonly detail?: unknown } | null)?.detail ===
        "epics";
      const result = await client.getDeliveryMetricsHistory(id);
      if (!result.ok) {
        return getErrorToolResult(
          `delivery metrics: ${result.error.category} (${result.error.reason})`,
        );
      }
      // Summarised by default (ADR-121): a 90-day window over fifteen epics is more breakdown
      // objects than an assistant should be handed to answer "how has the scope moved?".
      const payload = wantsEpics
        ? result.value
        : summariseDeliveryMetricsHistory(result.value);
      return getSuccessToolResult(
        `delivery metrics: ${encodePayload(payload)}`,
      );
    }

    // ── Recurring blackout-rule tools ────────────────────────────────────────

    if (name === "lighthouse_blackout_list") {
      const result = await client.getRecurringBlackoutRules();
      if (result.ok) {
        return getSuccessToolResult(
          `recurringBlackoutRules: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `blackout: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_blackout_create") {
      const payload = isObjectRecord(argumentsPayload) ? argumentsPayload : {};
      const result = await client.createRecurringBlackoutRule(payload);
      if (result.ok) {
        return getSuccessToolResult(
          `recurringBlackoutRule: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `blackout: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_blackout_update") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("blackout: invalid id (rule id required)");
      }
      const payload = isObjectRecord(argumentsPayload) ? argumentsPayload : {};
      const { id: _ignoredId, ...rulePayload } = payload;
      const result = await client.updateRecurringBlackoutRule(id, rulePayload);
      if (result.ok) {
        return getSuccessToolResult(
          `recurringBlackoutRule: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `blackout: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_blackout_delete") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("blackout: invalid id (rule id required)");
      }
      const result = await client.deleteRecurringBlackoutRule(id);
      if (result.ok) {
        return getSuccessToolResult(`recurringBlackoutRule deleted: ${id}`);
      }
      return getErrorToolResult(
        `blackout: ${result.error.category} (${result.error.reason})`,
      );
    }

    // ── Forecast tools ───────────────────────────────────────────────────────

    if (name === "lighthouse_forecast_manual") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("forecast: invalid id (team id required)");
      }
      const payload = isObjectRecord(argumentsPayload) ? argumentsPayload : {};
      const remainingItems =
        typeof payload.remainingItems === "number"
          ? payload.remainingItems
          : undefined;
      const targetDate =
        typeof payload.targetDate === "string" ? payload.targetDate : undefined;

      const applyFilterOverride = getApplyFilterOverride(argumentsPayload);

      const result = await client.runManualForecast(id, {
        remainingItems,
        targetDate,
        applyFilterOverride,
      });
      if (result.ok) {
        return getSuccessToolResult(`forecast: ${encodePayload(result.value)}`);
      }
      return getErrorToolResult(
        `forecast: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_forecast_backtest") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("backtest: invalid id (team id required)");
      }
      const payload = isObjectRecord(argumentsPayload) ? argumentsPayload : {};
      const startDate =
        typeof payload.startDate === "string" ? payload.startDate : undefined;
      const endDate =
        typeof payload.endDate === "string" ? payload.endDate : undefined;
      const historicalStartDate =
        typeof payload.historicalStartDate === "string"
          ? payload.historicalStartDate
          : undefined;
      const historicalEndDate =
        typeof payload.historicalEndDate === "string"
          ? payload.historicalEndDate
          : undefined;

      if (
        !startDate ||
        !endDate ||
        !historicalStartDate ||
        !historicalEndDate
      ) {
        return getErrorToolResult(
          "backtest: startDate, endDate, historicalStartDate, and historicalEndDate are required",
        );
      }

      const applyFilterOverride = getApplyFilterOverride(argumentsPayload);

      const result = await client.runBacktest(id, {
        startDate,
        endDate,
        historicalStartDate,
        historicalEndDate,
        applyFilterOverride,
      });
      if (result.ok) {
        return getSuccessToolResult(`backtest: ${encodePayload(result.value)}`);
      }
      return getErrorToolResult(
        `backtest: ${result.error.category} (${result.error.reason})`,
      );
    }

    return getErrorToolResult(`Unknown tool: ${name}`);
  },
});

export const registerMcpTools = (
  server: Pick<McpServer, "registerTool">,
  dependencies: McpCoreRuntimeDependencies,
): void => {
  const runtime = createMcpCoreRuntime(dependencies);

  for (const tool of toolDefinitions) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: toolInputSchemas[tool.name],
        annotations: {
          readOnlyHint: isReadOnlyTool(tool.name),
          idempotentHint: isReadOnlyTool(tool.name),
          openWorldHint: false,
        },
      },
      async (argumentsPayload) => {
        const result = await runtime.callTool(tool.name, argumentsPayload);
        return {
          ...result,
          content: [...result.content],
        };
      },
    );
  }
};
