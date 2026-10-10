import {
  type AnswerWording,
  type DeliveryMetricsHistory,
  describeAsOfHeading,
  describeBacktestActual,
  describeBacktestPeriod,
  describeBacktestSummary,
  describeBlackoutRuleCount,
  describeBlackoutRuleWriteConfirmation,
  describeBlockedDays,
  describeBlockedNow,
  describeConnectionSummary,
  describeCycleTimeDays,
  describeDeliveryCount,
  describeDeliveryMetricsHeading,
  describeFeatureListCount,
  describeFeatureWorkItemsHeading,
  describeInProgressNow,
  describeManualForecastLikelihood,
  describeManualForecastSummary,
  describeMetricSummary,
  describeMetricsHeading,
  describeOwnerCount,
  describePercentilesOverTimeDays,
  describePortfolioSummary,
  describeProcessBehaviorChart,
  describeProcessBehaviorOverTimeDays,
  describeRefreshConfirmation,
  describeSleRiskNow,
  describeTeamSummary,
  describeThroughputDays,
  describeTimeInStateContributorDays,
  describeTimeInStateDays,
  describeTotalWorkItemAgeDays,
  describeVersion,
  describeWhatWipLeavesUnsaid,
  describeWorkItemAgeDays,
  describeWorkItemAgePercentiles,
  describeWorkTrackingSystemCount,
  getDefaultMetricsDateRange,
  type InProgressItem,
  LIGHTHOUSE_IS_REACHABLE,
  type MetricDayView,
  type MetricLine,
  type MetricsDateRange,
  type MetricsScope,
  type OwnerKind,
  type PortfolioDeliveries,
  readAnswerWording,
  readBacktest,
  readBlackoutRules,
  readBlocked,
  readCycleTimeDefinitionName,
  readCycleTimePercentiles,
  readDeliveryList,
  readDeliveryMetricsHistory,
  readFeatureList,
  readFeatureWording,
  readFeatureWorkItems,
  readInProgressItems,
  readManualForecast,
  readOwnerList,
  readPercentilesOverTime,
  readPortfolio,
  readProcessBehaviorChart,
  readProcessBehaviorOverTime,
  readRunChart,
  readServiceLevelExpectation,
  readSleRisk,
  readSystemWipLimit,
  readTeam,
  readTerms,
  readTimeInStateBar,
  readTimeInStateContributors,
  readTotalWorkItemAge,
  readWorkItemAge,
  readWorkItemAgePercentiles,
  readWorkTrackingConnections,
  readWrittenBlackoutRule,
  type ServiceLevelExpectation,
  type SleRiskWording,
  summariseDeliveryMetricsHistory,
  type WriteVerb,
} from "@letpeoplework/lighthouse-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ElicitResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  findRefinementTool,
  type RefinementToolClient,
  type RefinementToolDependencies,
  refinementWriteInputSchemas,
  refinementWriteToolDefinitions,
} from "./refinementTools";
import {
  encodePayload,
  getErrorToolResult,
  getNumericId,
  getSuccessToolResult,
  isToolResult,
  type McpToolResult,
  withSummary,
  withSummaryBlock,
} from "./toolResult";
import {
  askThroughTheAssistant,
  type CountedToolResult,
  countedToolResult,
  type McpUsageDataPort,
  usageDataOccurrencesOf,
} from "./usageDataPort";

export type { McpVoterKeyStore } from "./refinementTools";
export type { McpToolResult } from "./toolResult";
export * from "./usageDataPort";

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
    | "lighthouse_team_metrics_wip"
    | "lighthouse_team_metrics_sleRisk"
    | "lighthouse_team_metrics_processBehaviorChart"
    | "lighthouse_portfolio_metrics_processBehaviorChart"
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

const processBehaviorMetricTypes = [
  "Throughput",
  "WorkItemAge",
  "Wip",
  "CycleTime",
  "Arrivals",
  "FeatureSize",
] as const;

// Feature Size is charted for Portfolios only.
const TEAM_CHART_TYPES = [
  "Throughput",
  "WorkItemAge",
  "Wip",
  "CycleTime",
  "Arrivals",
] as const;

type TeamChartType = (typeof TEAM_CHART_TYPES)[number];

const chartTypeProperty = (chartTypes: readonly string[]) =>
  ({
    metricType: {
      type: "string",
      enum: chartTypes,
      description: "Which Process Behaviour Chart to read.",
    },
  }) as const;

const chartInputSchema = (
  chartTypes: readonly string[],
): McpToolDefinition["inputSchema"] => ({
  type: "object",
  properties: {
    ...idInputSchema.properties,
    ...chartTypeProperty(chartTypes),
    ...dateRangeProperties,
  },
  required: ["id", "metricType"],
  additionalProperties: false,
});

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
  readonly getTeamSettings: (id: number) => Promise<
    | { readonly ok: true; readonly value: unknown }
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
  readonly getTeamWip: (
    id: number,
    asOfDate: string,
  ) => Promise<
    | { readonly ok: true; readonly value: readonly unknown[] }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamProcessBehaviorChart: (
    id: number,
    range: { readonly startDate: string; readonly endDate: string },
    metricType: TeamChartType,
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getPortfolioProcessBehaviorChart: (
    id: number,
    range: { readonly startDate: string; readonly endDate: string },
    metricType: ProcessBehaviorMetricTypeArgument,
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
  readonly getTeamSleRisk: (id: number) => Promise<
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
    | { readonly ok: true; readonly value: PortfolioDeliveries }
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
} & Omit<RefinementToolClient, "getTeam">;

export type McpCoreRuntimeDependencies = {
  readonly createClient: () => McpRuntimeClient;
  /** Where usage data goes; without it a tool call does exactly what it always did. */
  readonly usageData?: McpUsageDataPort;
} & RefinementToolDependencies;

export type McpCoreRuntime = {
  readonly listTools: () => readonly McpToolDefinition[];
  readonly callTool: (
    name: string,
    argumentsPayload: unknown,
  ) => Promise<McpToolResult>;
  /** The tool's result with what it did that the web counts too. */
  readonly callCountedTool: (
    name: string,
    argumentsPayload: unknown,
  ) => Promise<CountedToolResult>;
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

const toolDefinitions: readonly McpToolDefinition[] = [
  {
    name: "lighthouse_health_check",
    description:
      "Check connectivity to Lighthouse and return whether the configured endpoint is reachable. A second text block, `summary`, says that Lighthouse is reachable; the first block is the facts, unchanged.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_version_get",
    description:
      "Retrieve the Lighthouse server version from the version endpoint. A second text block, `summary`, names it as the web's footer does; the first block is the facts, unchanged.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_worktracking_list",
    description:
      "List configured work-tracking system connections in Lighthouse. A second text block, `summary`, counts them in the instance's terminology; the first block is the facts, unchanged.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_worktracking_get",
    description:
      "Get a single work-tracking system connection by ID. `summary` names the connection and its type as the Overview does, and never carries an option's value.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_list",
    description:
      "List all teams available in Lighthouse. A second text block, `summary`, counts them in the instance's terminology; the first block is the facts, unchanged.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_team_get",
    description:
      "Get full details for one team by ID. `summary` states the page's heading and settings as the web does, in the instance's terminology.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_refresh",
    description:
      "Trigger data refresh for a team by ID. A second text block, `summary`, confirms it in one line as lh does, in the instance's terminology; the first block is the facts, unchanged.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_refinement_get",
    description:
      "How many work items a team should refine before its next Refinement, as on the team's Refinement tab (Lighthouse newer than v26.10.3.6). `summary` is the sentence the web page states, in the instance's terminology. need.low and need.high are the range of work items the team is likely to pull over one cycle (need.cycleStart to need.cycleEnd: from the next Refinement to the one after, or from today on a Refinement day), read at need.lowPercentile and need.highPercentile. need.verdict says where readyCount sits against that range: Below, In or Above. Without a verdict, need.unavailableReason says why: NoCadence, InsufficientData or NoRefinementStates. isRefinementDay is true on a Refinement day, when the cycle starts today. daysUntilNextRefinement counts the days from the instance's today to nextRefinementDate. readySource says what readyCount counts: work items ready by Votes, or by Stages on a team with stage rules. workItems are the items in refinement, in the order the Refinement tab lists them.",
    inputSchema: idInputSchema,
  },
  ...refinementWriteToolDefinitions,
  {
    name: "lighthouse_portfolio_list",
    description:
      "List all portfolios in Lighthouse. A second text block, `summary`, counts them in the instance's terminology; the first block is the facts, unchanged.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_portfolio_get",
    description:
      "Get full details for one portfolio by ID. `summary` states the page's heading and settings as the web does, in the instance's terminology.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_portfolio_refresh",
    description:
      "Trigger data refresh for a portfolio by ID. A second text block, `summary`, confirms it in one line as lh does, in the instance's terminology; the first block is the facts, unchanged.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_metrics_throughput",
    description:
      'Get throughput run-chart data for a team by ID, optionally filtered by start and end dates. Pass view="filtered" to apply the team\'s forecast-exclusion rule (Lighthouse v26.5.24.10+); omit or "raw" returns unfiltered data. `summary` states the answer as the dashboard does, in the instance\'s terminology: the heading and its sentence.',
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
      "Get cycle-time percentiles for a team by ID, optionally filtered by start and end dates. Pass definitionId to get the percentiles for a named cycle time (premium) instead of the default cycle time. A second text block, `summary: …`, states the answer as the dashboard does, in the instance's terminology: the heading and its sentence; the first block is the facts, unchanged.",
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
      "Get work-item age percentiles for a team by ID, optionally filtered by start and end dates. Ages are measured as of the last day of the selected range, not as of today — a historical range reports how old the items were at the end of that period, so do not present the result as the team's current ages unless the range ends today. A second text block, `summary: …`, states the answer as the dashboard does, in the instance's terminology: the heading and its sentence; the first block is the facts, unchanged.",
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
      "Get work-item age percentiles for a portfolio by ID, optionally filtered by start and end dates. Ages are measured as of the last day of the selected range, not as of today — a historical range reports how old the items were at the end of that period, so do not present the result as the portfolio's current ages unless the range ends today. A second text block, `summary: …`, states the answer as the dashboard does, in the instance's terminology: the heading and its sentence; the first block is the facts, unchanged.",
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
      "Get the blocked-items-over-time trend for a team by ID: how many work items were blocked on each captured day, optionally filtered by start and end dates. To see what is blocked right now and for how long, call lighthouse_team_metrics_wip — each item carries isBlocked and, when blocked, a blockedSince timestamp. A second text block, `summary: …`, states the answer as the dashboard does, in the instance's terminology: the heading and its sentence; the first block is the facts, unchanged.",
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
      "Get the blocked-items-over-time trend for a portfolio by ID: how many work items were blocked on each captured day, optionally filtered by start and end dates. No tool reads what is blocked right now for a portfolio: name the command `lh metrics portfolio --metrics wip --id <id>`, whose items each carry isBlocked and, when blocked, a blockedSince timestamp. A second text block, `summary: …`, states the answer as the dashboard does, in the instance's terminology: the heading and its sentence; the first block is the facts, unchanged.",
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
      "Get the percentiles-over-time trend for a team by ID: the p50/p70/p85/p95 quartet recorded on each captured day, optionally filtered by start and end dates. By default Lighthouse only returns days it recorded, so a recently upgraded server returns an empty series until it has recorded some; where a System Admin has switched on filling in past days (a Preview), the read starts filling missing days in the background and a later call may return more. Use metricType to pick the family and horizon to pick the cycle-time window. A second text block, `summary: …`, states the answer as the dashboard does, in the instance's terminology: the heading and its sentence; the first block is the facts, unchanged.",
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
      "Get the percentiles-over-time trend for a portfolio by ID: the p50/p70/p85/p95 quartet recorded on each captured day, optionally filtered by start and end dates. By default Lighthouse only returns days it recorded, so a recently upgraded server returns an empty series until it has recorded some; where a System Admin has switched on filling in past days (a Preview), the read starts filling missing days in the background and a later call may return more. Use metricType to pick the family and horizon to pick the cycle-time window. A second text block, `summary: …`, states the answer as the dashboard does, in the instance's terminology: the heading and its sentence; the first block is the facts, unchanged.",
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
      "Get the process-behaviour-limits-over-time trend for a team by ID: the upper limit, average and lower limit (UNPL/Average/LNPL) recorded on each captured day, optionally filtered by start and end dates. Days are recorded on refresh (and, where a System Admin has switched on filling in past days, filled in the background after a read), and days without a usable baseline are absent rather than zeroed — an empty series means nothing was recorded, never a process pinned at zero. A second text block, `summary: …`, states the answer as the dashboard does, in the instance's terminology: the heading and its sentence; the first block is the facts, unchanged.",
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
      "Get the process-behaviour-limits-over-time trend for a portfolio by ID: the upper limit, average and lower limit (UNPL/Average/LNPL) recorded on each captured day, optionally filtered by start and end dates. Days are recorded on refresh (and, where a System Admin has switched on filling in past days, filled in the background after a read), and days without a usable baseline are absent rather than zeroed — an empty series means nothing was recorded, never a process pinned at zero. FeatureSize is available here and not on teams. A second text block, `summary: …`, states the answer as the dashboard does, in the instance's terminology: the heading and its sentence; the first block is the facts, unchanged.",
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
      "Get throughput run-chart data for a portfolio by ID, optionally filtered by start and end dates. `summary` states the answer as the dashboard does, in the instance's terminology: the heading and its sentence.",
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
      "Get per-item work item age over time for a team by ID. Returns daily snapshots with each in-progress item's age in days derived from its startedDate. Items without a startedDate are omitted. `summary` states the answer as the dashboard does, in the instance's terminology: the heading and its sentence.",
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
      "Get the total (summed) work item age over time for a team by ID. Returns daily totals of all in-progress item ages derived from startedDate. Items without a startedDate are not counted. `summary` states the answer as the dashboard does, in the instance's terminology: the heading and its sentence.",
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
      "Get per-item work item age over time for a portfolio by ID. Returns daily snapshots with each in-progress item's age in days derived from its startedDate. Items without a startedDate are omitted. `summary` states the answer as the dashboard does, in the instance's terminology: the heading and its sentence.",
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
      "Get the total (summed) work item age over time for a portfolio by ID. Returns daily totals of all in-progress item ages derived from startedDate. Items without a startedDate are not counted. `summary` states the answer as the dashboard does, in the instance's terminology: the heading and its sentence.",
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
      "Get feature details by numeric IDs or external reference IDs. A second text block, `summary`, counts them in the instance's terminology; the first block is the facts, unchanged.",
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
    description:
      "Get work items linked to a feature by ID. A second text block, `summary`, heads them as lh does: the feature and how many work items it holds, in the instance's terminology; the first block is the facts, unchanged.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_delivery_list",
    description:
      "List deliveries for a portfolio by portfolio ID. A second text block, `summary`, counts them in the instance's terminology; the first block is the facts, unchanged.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_delivery_metrics",
    description:
      "Get a delivery's recorded trend by delivery ID: one row per day with total, done and remaining work, the epic count and the likelihood. Set detail to \"epics\" for the per-epic breakdown and the forecast distribution, which are far larger. Forward-only, so it starts at the first recorded snapshot. `summary` states the delivery and its date as lh heads them, in the instance's terminology: a second text block beside the rows, a field of the detailed payload. Requires Lighthouse newer than v26.5.29.5.",
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
      "List the recurring blackout rules (recurring non-working days excluded from forecasts). Requires Lighthouse newer than v26.5.29.5. A second text block, `summary`, counts them as the settings page does; the first block is the facts, unchanged, each rule's own `summary` field included.",
    inputSchema: emptyInputSchema,
  },
  {
    name: "lighthouse_blackout_create",
    description:
      "Create a recurring blackout rule (weekdays + every-N-weeks interval + start date + optional open end). Premium, system-admin only. Requires Lighthouse newer than v26.5.29.5. A second text block, `summary`, confirms it in one line as lh does; the first block is the facts, unchanged, the rule's own `summary` field included.",
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
      "Update a recurring blackout rule by ID. Premium, system-admin only. Requires Lighthouse newer than v26.5.29.5. A second text block, `summary`, confirms it in one line as lh does; the first block is the facts, unchanged, the rule's own `summary` field included.",
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
      "Delete a recurring blackout rule by ID. Premium, system-admin only. Requires Lighthouse newer than v26.5.29.5. A second text block, `summary`, confirms it in one line as lh does; the first block is the facts, unchanged.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_forecast_manual",
    description:
      "Run a manual forecast for a team by ID with optional remaining items and target date. Pass applyFilterOverride=true to apply the team's forecast filter, false to skip it, or omit to respect the team setting (Lighthouse v26.5.24.10+). The response includes filterApplied (boolean) and excludedSummary (string) when a filter was applied. `summary` states the answer as the web does, in the instance's terminology: the heading, then the likelihood sentence when both remaining items and a target date were given.",
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
      "Run a forecast backtest for a team by ID using forecast and historical date ranges. Pass applyFilterOverride=true to apply the team's forecast filter, false to skip it, or omit to respect the team setting (Lighthouse v26.5.24.10+). The response includes filterApplied (boolean) and excludedSummary (string) when a filter was applied. `summary` states the answer as the web does, in the instance's terminology: the heading, the period with its historical data, and the actual throughput.",
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
      "Get cumulative time-per-state bar data for a team by ID: one entry per Doing-category workflow state with total/completed/ongoing contribution days and item counts. Optionally filter by date range and a subset of work-item IDs. `summary` states the answer as the dashboard does, in the instance's terminology: the heading and its sentence.",
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
      "Get the per-item drill-down for ONE state of a team's cumulative time-per-state chart: the work items that contributed to that state, with days contributed. Requires the state name. `summary` states the answer as the dashboard does, in the instance's terminology: the heading and the drill-down's title.",
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
      "Get cumulative time-per-state bar data for a portfolio by ID: one entry per Doing-category workflow state with total/completed/ongoing contribution days and item counts. Optionally filter by date range and a subset of work-item IDs. `summary` states the answer as the dashboard does, in the instance's terminology: the heading and its sentence.",
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
      "Get the per-item drill-down for ONE state of a portfolio's cumulative time-per-state chart: the work items that contributed to that state, with days contributed. Requires the state name. `summary` states the answer as the dashboard does, in the instance's terminology: the heading and the drill-down's title.",
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
  {
    name: "lighthouse_team_metrics_wip",
    description:
      "Get what a team has in progress right now by ID: each work item in progress today with its age (workItemAge), state, whether it is blocked (isBlocked) and since when (blockedSince), and its link (url). Use it for what is blocked or aging today; for how many were blocked on past days use lighthouse_team_metrics_blockedCountHistory. A second text block, `summary: …`, states the answer as lh does, in the instance's terminology: the heading, how many are in progress against the System WIP Limit, and how many are blocked; the first block is the facts, unchanged.",
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_metrics_sleRisk",
    description:
      'Get how likely each work item a team has in progress is to miss the team\'s SLE, by team ID: Lighthouse\'s own risk per work item (referenceId, risk in percent), with the finished work items that reached the same age (finishedItemsStillOpenAtThisAge) and how many of those went on to miss (finishedItemsThatWentOnToMiss, null when the work item is already past the SLE). A work item counts as at risk from 70%. Use it for "which work items will miss our SLE" and "what should we swarm on"; never compute a risk yourself. Needs a Lighthouse newer than v26.9.19.10. A second text block, `summary: …`, states the answer as lh does, in the instance\'s terminology: the heading, how many are at risk against the SLE, then every work item highest risk first with its name and age; the first block is the facts, unchanged.',
    inputSchema: idInputSchema,
  },
  {
    name: "lighthouse_team_metrics_processBehaviorChart",
    description:
      'Get one Process Behaviour Chart of a team by ID, as Lighthouse computes it: its status (and statusReason when it is not Ready), the average and natural process limits, whether a baseline is configured, and every point (xValue, yValue) with the signals Lighthouse found on it (specialCauses: LargeChange, ModerateChange, ModerateShift, SmallShift; None means no signal) and whether it falls on a blackout day (isBlackout). metricType picks the chart: Throughput, Arrivals, Wip, WorkItemAge (the Total Work Item Age chart) or CycleTime; a team has no FeatureSize chart. A point is a day, except on CycleTime, which has one point per finished work item, dated when it finished, so several can share a day. Use it for "is something unusual going on" and "did our process change"; never work a signal out yourself. Optionally filtered by start and end dates. A second text block, `summary: …`, states the answer as lh does, in the instance\'s terminology: the heading, the chart\'s title, and each signal with the days it fired, or that there are no signals; the facts are unchanged.',
    inputSchema: chartInputSchema(TEAM_CHART_TYPES),
  },
  {
    name: "lighthouse_portfolio_metrics_processBehaviorChart",
    description:
      'Get one Process Behaviour Chart of a portfolio by ID, as Lighthouse computes it: its status (and statusReason when it is not Ready), the average and natural process limits, whether a baseline is configured, and every point (xValue, yValue) with the signals Lighthouse found on it (specialCauses: LargeChange, ModerateChange, ModerateShift, SmallShift; None means no signal) and whether it falls on a blackout day (isBlackout). metricType picks the chart: Throughput, Arrivals, Wip, WorkItemAge (the Total Work Item Age chart), CycleTime or FeatureSize. A point is a day, except on CycleTime, which has one point per finished work item, and FeatureSize, which has one per finished feature, each dated when it finished, so several can share a day. Use it for "is something unusual going on" and "did our process change"; never work a signal out yourself. Optionally filtered by start and end dates. A second text block, `summary: …`, states the answer as lh does, in the instance\'s terminology: the heading, the chart\'s title, and each signal with the days it fired, or that there are no signals; the facts are unchanged.',
    inputSchema: chartInputSchema(processBehaviorMetricTypes),
  },
];

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

const linesOf = (...lines: readonly (string | null)[]): string =>
  lines.filter((line) => line !== null).join("\n");

const readTeamWording = (client: McpRuntimeClient, teamId: number) =>
  readAnswerWording(client, {
    term: "team",
    id: teamId,
    read: () => client.getTeam(teamId),
  });

const readPortfolioWording = (client: McpRuntimeClient, portfolioId: number) =>
  readAnswerWording(client, {
    term: "portfolio",
    id: portfolioId,
    read: () => client.getPortfolio(portfolioId),
  });

const readMetricsWording = (
  client: McpRuntimeClient,
  scope: MetricsScope,
  id: number,
): Promise<AnswerWording> =>
  scope === "team"
    ? readTeamWording(client, id)
    : readPortfolioWording(client, id);

type LighthouseRead = Promise<
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly error: { readonly category: string; readonly reason: string };
    }
>;

// A read made only for the summary: when it fails, the summary is left out and the facts still go out.
const readForSummary = async <T>(
  read: () => Promise<T>,
): Promise<T | undefined> => {
  try {
    return await read();
  } catch {
    return undefined;
  }
};

const answeredValue = (read: Awaited<LighthouseRead> | undefined): unknown =>
  read?.ok === true ? read.value : undefined;

const summaryOrNull = (summarise: () => string | null): string | null => {
  try {
    return summarise();
  } catch {
    return null;
  }
};

/**
 * A write's facts block exactly as before, with the line lh confirms it with in a second block. The
 * confirmation never sits inside the facts: a blackout rule's own `summary` field is Lighthouse's
 * wording of its schedule and must reach the assistant untouched.
 */
const withConfirmation = (
  facts: string,
  confirm: () => string | null,
): McpToolResult => withSummaryBlock(facts, summaryOrNull(confirm));

/** How many a list holds, in words; left out when the list cannot be read. */
const countSummary = (
  facts: unknown,
  readList: (value: unknown) => readonly unknown[] | null,
  describeCount: (count: number) => string,
): string | null =>
  summaryOrNull(() => {
    const listed = readList(facts);
    return listed === null ? null : describeCount(listed.length);
  });

/** A refresh as before, confirmed as queued in the instance's word for a Team or Portfolio. */
const answerRefresh = async (
  client: McpRuntimeClient,
  kind: OwnerKind,
  id: number,
  refresh: LighthouseRead,
): Promise<McpToolResult> => {
  const [result, terms] = await Promise.all([refresh, readTerms(client)]);
  if (!result.ok) {
    return getErrorToolResult(
      `${kind} refresh: ${result.error.category} (${result.error.reason})`,
    );
  }
  return withConfirmation(`${kind} refreshed: ${id}`, () =>
    describeRefreshConfirmation(kind, id, terms),
  );
};

/** A written blackout rule as before, confirmed with Lighthouse's own wording of its schedule. */
const answerBlackoutRuleWrite = async (
  verb: WriteVerb,
  write: LighthouseRead,
): Promise<McpToolResult> => {
  const result = await write;
  if (!result.ok) {
    return getErrorToolResult(
      `blackout: ${result.error.category} (${result.error.reason})`,
    );
  }
  return withConfirmation(
    `recurringBlackoutRule: ${encodePayload(result.value)}`,
    () => {
      const rule = readWrittenBlackoutRule(result.value);
      return rule === null
        ? null
        : describeBlackoutRuleWriteConfirmation(verb, rule);
    },
  );
};

/** The Features under their label with their count in the instance's words, or Lighthouse's refusal as before. */
const answerFeatures = async (
  client: McpRuntimeClient,
  read: LighthouseRead,
): Promise<McpToolResult> => {
  const [result, terms] = await Promise.all([read, readTerms(client)]);
  if (!result.ok) {
    return getErrorToolResult(
      `features: ${result.error.category} (${result.error.reason})`,
    );
  }
  return withSummary(
    "features",
    result.value,
    countSummary(result.value, readFeatureList, (count) =>
      describeFeatureListCount(count, terms),
    ),
  );
};

/**
 * One per-metric tool's answer: the facts under their label with the metric stated as lh states it, or
 * Lighthouse's refusal exactly as before. The summary's own reads run beside the metric's.
 */
const answerMetric = async <Context>(
  labels: { readonly answer: string; readonly refusal: string },
  read: LighthouseRead,
  context: Promise<Context>,
  summarise: (facts: unknown, context: Context) => string | null,
): Promise<McpToolResult> => {
  const [result, known] = await Promise.all([read, context]);
  if (!result.ok) {
    return getErrorToolResult(
      `${labels.refusal}: ${result.error.category} (${result.error.reason})`,
    );
  }
  return withSummary(
    labels.answer,
    result.value,
    summaryOrNull(() => summarise(result.value, known)),
  );
};

/** A Team or Portfolio list's facts, then how many it holds, unless a row cannot say what it is. */
const answerOwnerList = async (
  kind: OwnerKind,
  label: string,
  read: LighthouseRead,
  client: McpRuntimeClient,
): Promise<McpToolResult> => {
  const [result, terms] = await Promise.all([read, readTerms(client)]);
  if (!result.ok) {
    return getErrorToolResult(
      `${label}: ${result.error.category} (${result.error.reason})`,
    );
  }
  return withSummary(
    label,
    result.value,
    countSummary(result.value, readOwnerList, (count) =>
      describeOwnerCount(kind, count, terms),
    ),
  );
};

/** One Team or Portfolio: its facts, with the page's heading and settings as its summary when it can be read. */
const answerOwner = async <Owner>(
  label: string,
  read: LighthouseRead,
  client: McpRuntimeClient,
  describe: {
    readonly read: (value: unknown) => Owner | null;
    readonly lines: (
      owner: Owner,
      terms: Awaited<ReturnType<typeof readTerms>>,
    ) => string[];
  },
): Promise<McpToolResult> => {
  const [result, terms] = await Promise.all([read, readTerms(client)]);
  if (!result.ok) {
    return getErrorToolResult(
      `${label}: ${result.error.category} (${result.error.reason})`,
    );
  }
  return withSummary(
    label,
    result.value,
    summaryOrNull(() => {
      const owner = describe.read(result.value);
      return owner === null ? null : linesOf(...describe.lines(owner, terms));
    }),
  );
};

const metricLabels = (scope: MetricsScope, metric: string) => ({
  answer: `${scope} ${metric}`,
  refusal: `${scope} metrics`,
});

const overTheRange = (
  range: MetricsDateRange,
  wording: AnswerWording,
  view: MetricDayView | null,
): string | null =>
  view === null
    ? null
    : describeMetricSummary(describeMetricsHeading(range, wording), view);

const summariseThroughput =
  (scope: MetricsScope, range: MetricsDateRange) =>
  (facts: unknown, wording: AnswerWording): string | null => {
    const chart = readRunChart(facts, range);
    return overTheRange(
      range,
      wording,
      chart === null
        ? null
        : describeThroughputDays(chart, scope, wording.terms),
    );
  };

const summariseCycleTimePercentiles =
  (range: MetricsDateRange) =>
  (
    facts: unknown,
    known: {
      readonly wording: AnswerWording;
      readonly definitionName: string | undefined;
    },
  ): string | null => {
    const percentiles = readCycleTimePercentiles({ values: facts });
    return overTheRange(
      range,
      known.wording,
      percentiles === null
        ? null
        : describeCycleTimeDays(
            percentiles,
            [],
            known.wording.terms,
            known.definitionName,
          ),
    );
  };

const summariseWorkItemAgePercentiles =
  (range: MetricsDateRange) =>
  (facts: unknown, wording: AnswerWording): string | null => {
    const percentiles = readWorkItemAgePercentiles({ values: facts });
    return percentiles === null
      ? null
      : linesOf(
          describeAsOfHeading(range, wording),
          describeWorkItemAgePercentiles(percentiles, wording.terms),
        );
  };

const summariseWorkItemAge =
  (scope: MetricsScope) =>
  (
    facts: unknown,
    known: { readonly wording: AnswerWording; readonly percentiles: unknown },
  ): string | null => {
    const overTime = readWorkItemAge(facts);
    const percentiles = readWorkItemAgePercentiles({
      values: known.percentiles,
    });
    return overTime === null || percentiles === null
      ? null
      : describeMetricSummary(
          describeAsOfHeading(overTime, known.wording),
          describeWorkItemAgeDays(
            percentiles,
            overTime,
            scope,
            known.wording.terms,
          ),
        );
  };

const summariseTotalWorkItemAge =
  (scope: MetricsScope) =>
  (facts: unknown, wording: AnswerWording): string | null => {
    const view = readTotalWorkItemAge(facts);
    return view === null
      ? null
      : overTheRange(
          view,
          wording,
          describeTotalWorkItemAgeDays(view, scope, wording.terms),
        );
  };

const sentenceOf = (line: MetricLine): string =>
  line.detail === ""
    ? `${line.label}: ${line.value}`
    : `${line.label}: ${line.value} (${line.detail})`;

const summariseCurrentWip =
  (today: string) =>
  (
    facts: unknown,
    known: {
      readonly wording: AnswerWording;
      readonly systemWipLimit: number | undefined | null;
    },
  ): string | null => {
    const now = readInProgressItems(facts, today);
    if (now === null) {
      return null;
    }
    const { terms } = known.wording;
    const blocked = describeBlockedNow(now, "team", terms);
    return linesOf(
      describeAsOfHeading({ endDate: today }, known.wording),
      sentenceOf(
        describeInProgressNow(
          now,
          "team",
          terms,
          known.systemWipLimit ?? undefined,
        ),
      ),
      blocked === null ? null : sentenceOf(blocked),
      ...describeWhatWipLeavesUnsaid(now, "team", terms, known.systemWipLimit),
    );
  };

// One Team read serves both the heading's name and the Team's own settings the summary states.
const readTeamForSummary = async (client: McpRuntimeClient, teamId: number) => {
  const team = client.getTeam(teamId);
  const [wording, teamRead] = await Promise.all([
    readAnswerWording(client, { term: "team", id: teamId, read: () => team }),
    readForSummary(() => team),
  ]);
  return { wording, team: teamRead?.ok === true ? teamRead : null };
};

// A Team that could not be read may well have the setting, so the summary leaves it unsaid rather than missing.
const teamSettingOf = <T>(
  team: { readonly value: unknown } | null,
  read: (value: unknown) => T | undefined,
): T | undefined | null => (team === null ? null : read(team.value));

const readCurrentWipContext = async (
  client: McpRuntimeClient,
  teamId: number,
) => {
  const { wording, team } = await readTeamForSummary(client, teamId);
  return { wording, systemWipLimit: teamSettingOf(team, readSystemWipLimit) };
};

// lh's words and order, one Work Item per line; lining the cells up in columns is left to the terminal view.
const sleRiskLines = (view: SleRiskWording): string =>
  [
    view.title,
    ...(view.sentence === null ? [] : [view.sentence]),
    ...view.rows.map((row) => row.filter((cell) => cell !== "").join(" · ")),
  ].join("\n");

const summariseSleRisk =
  (today: string) =>
  (
    facts: unknown,
    known: {
      readonly wording: AnswerWording;
      readonly serviceLevelExpectation:
        | ServiceLevelExpectation
        | undefined
        | null;
      readonly inProgress: readonly InProgressItem[] | undefined;
    },
  ): string | null => {
    const entries = readSleRisk(facts);
    return entries === null
      ? null
      : linesOf(
          describeAsOfHeading({ endDate: today }, known.wording),
          sleRiskLines(
            describeSleRiskNow(
              entries,
              known.wording,
              known.serviceLevelExpectation,
              known.inProgress,
            ),
          ),
        );
  };

// SLE Risk names only a reference: today's Work Items in progress give each its name and age.
const readSleRiskContext = async (
  client: McpRuntimeClient,
  teamId: number,
  today: string,
) => {
  const [{ wording, team }, wipRead] = await Promise.all([
    readTeamForSummary(client, teamId),
    readForSummary(() => client.getTeamWip(teamId, today)),
  ]);
  return {
    wording,
    serviceLevelExpectation: teamSettingOf(team, readServiceLevelExpectation),
    inProgress: readInProgressItems(answeredValue(wipRead), today)?.items,
  };
};

const summariseProcessBehaviorChart =
  (range: MetricsDateRange, chartType: ProcessBehaviorMetricTypeArgument) =>
  (facts: unknown, wording: AnswerWording): string | null => {
    const chart = readProcessBehaviorChart(facts);
    if (chart === null) {
      return null;
    }
    const said = describeProcessBehaviorChart(chart, chartType, wording.terms);
    return linesOf(
      describeMetricsHeading(range, wording),
      said.title,
      said.sentence,
    );
  };

// Only lh reads the Work Items Time in State can be narrowed to, so the bar is told without their count.
const summariseTimeInState =
  (scope: MetricsScope, range: MetricsDateRange) =>
  (facts: unknown, wording: AnswerWording): string | null => {
    const bar = readTimeInStateBar(facts);
    return overTheRange(
      range,
      wording,
      bar === null
        ? null
        : describeTimeInStateDays(
            bar,
            undefined,
            undefined,
            scope,
            wording.terms,
          ),
    );
  };

const summariseTimeInStateContributors =
  (scope: MetricsScope, range: MetricsDateRange) =>
  (facts: unknown, wording: AnswerWording): string | null => {
    const contributors = readTimeInStateContributors(facts);
    return overTheRange(
      range,
      wording,
      contributors === null
        ? null
        : describeTimeInStateContributorDays(
            contributors,
            scope,
            wording.terms,
          ),
    );
  };

const summariseBlocked =
  (scope: MetricsScope, range: MetricsDateRange) =>
  (facts: unknown, wording: AnswerWording): string | null => {
    const view = readBlocked({ ...range, history: facts });
    return overTheRange(
      range,
      wording,
      view === null ? null : describeBlockedDays(view, scope, wording.terms),
    );
  };

// lh only ever states the Cycle Time percentiles' history; another family gets no sentence of its own.
const summarisePercentilesOverTime =
  (range: MetricsDateRange, argumentsPayload: unknown) =>
  (facts: unknown, wording: AnswerWording): string | null => {
    const view = readPercentilesOverTime({
      ...range,
      history: facts,
      horizon: getHorizonArgument(argumentsPayload),
    });
    const ofCycleTime =
      getPercentilesOverTimeMetricType(argumentsPayload) !== "WorkItemAge" &&
      view !== null &&
      view.history.every((day) => day.metricType === "CycleTime");
    return overTheRange(
      range,
      wording,
      view !== null && ofCycleTime
        ? describePercentilesOverTimeDays(view, wording.terms)
        : null,
    );
  };

// lh only ever states the Throughput process limits, which Lighthouse answers when no family is asked for.
const summariseProcessBehaviorOverTime =
  (range: MetricsDateRange, argumentsPayload: unknown) =>
  (facts: unknown, wording: AnswerWording): string | null => {
    const family = getProcessBehaviorMetricType(argumentsPayload);
    const view = readProcessBehaviorOverTime({ ...range, history: facts });
    return overTheRange(
      range,
      wording,
      view !== null && (family === undefined || family === "Throughput")
        ? describeProcessBehaviorOverTimeDays(view, wording.terms)
        : null,
    );
  };

const describeManualForecastAnswer = (
  facts: unknown,
  wording: AnswerWording,
): string | null => {
  const forecast = readManualForecast(facts);
  return forecast === null
    ? null
    : linesOf(
        describeManualForecastSummary(forecast, wording),
        describeManualForecastLikelihood(forecast, wording),
      );
};

const describeBacktestAnswer = (
  facts: unknown,
  wording: AnswerWording,
): string | null => {
  const backtest = readBacktest(facts);
  return backtest === null
    ? null
    : linesOf(
        describeBacktestSummary(wording),
        describeBacktestPeriod(backtest),
        describeBacktestActual(backtest, wording),
      );
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

type ProcessBehaviorMetricTypeArgument =
  (typeof processBehaviorMetricTypes)[number];

const getChartType = <T extends string>(
  argumentsPayload: unknown,
  chartTypes: readonly T[],
): T | undefined => {
  const raw = getStringArgument(argumentsPayload, "metricType");
  return chartTypes.find((candidate) => candidate === raw);
};

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
  ...refinementWriteInputSchemas,
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
  lighthouse_team_metrics_wip: z.object({ id: z.number().int() }),
  lighthouse_team_metrics_sleRisk: z.object({ id: z.number().int() }),
  lighthouse_team_metrics_processBehaviorChart: z.object({
    id: z.number().int(),
    metricType: z.enum(TEAM_CHART_TYPES),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_portfolio_metrics_processBehaviorChart: z.object({
    id: z.number().int(),
    metricType: z.enum(processBehaviorMetricTypes),
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

const answerToolCall =
  (dependencies: McpCoreRuntimeDependencies) =>
  async (
    name: string,
    argumentsPayload: unknown,
  ): Promise<McpToolResult | CountedToolResult> => {
    const client = dependencies.createClient();

    if (name === "lighthouse_health_check") {
      const health = await client.checkConnectivity();
      if (health.category === "success") {
        return withConfirmation(
          "connectivity: success",
          () => LIGHTHOUSE_IS_REACHABLE,
        );
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
        return withConfirmation(`version: ${version.value}`, () =>
          describeVersion(version.value),
        );
      }

      return getErrorToolResult(
        `version: ${version.error.category} (${version.error.reason})`,
      );
    }

    if (name === "lighthouse_worktracking_list") {
      const [connections, terms] = await Promise.all([
        client.listWorkTrackingConnections(),
        readTerms(client),
      ]);
      if (connections.ok) {
        return withSummary(
          "worktracking",
          connections.value,
          countSummary(
            connections.value,
            readWorkTrackingConnections,
            (count) => describeWorkTrackingSystemCount(count, terms),
          ),
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
        return withSummary(
          "worktracking",
          connection.value,
          summaryOrNull(() => describeConnectionSummary(connection.value)),
        );
      }

      return getErrorToolResult(
        `worktracking: ${connection.error.category} (${connection.error.reason})`,
      );
    }

    if (name === "lighthouse_team_list") {
      return answerOwnerList("team", "teams", client.listTeams(), client);
    }

    if (name === "lighthouse_team_get") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team: invalid id");
      }

      return answerOwner("team", client.getTeam(id), client, {
        read: readTeam,
        lines: describeTeamSummary,
      });
    }

    if (name === "lighthouse_team_refresh") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team: invalid id");
      }

      return answerRefresh(client, "team", id, client.refreshTeam(id));
    }

    const refinementTool = findRefinementTool(name);
    if (refinementTool !== undefined) {
      return refinementTool(argumentsPayload, client, dependencies);
    }

    if (name === "lighthouse_portfolio_list") {
      return answerOwnerList(
        "portfolio",
        "portfolios",
        client.listPortfolios(),
        client,
      );
    }

    if (name === "lighthouse_portfolio_get") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio: invalid id");
      }

      return answerOwner("portfolio", client.getPortfolio(id), client, {
        read: readPortfolio,
        lines: describePortfolioSummary,
      });
    }

    if (name === "lighthouse_portfolio_refresh") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio: invalid id");
      }

      return answerRefresh(
        client,
        "portfolio",
        id,
        client.refreshPortfolio(id),
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
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("team", "throughput"),
        client.getTeamThroughput(id, range, view),
        readMetricsWording(client, "team", id),
        summariseThroughput("team", summaryRange),
      );
    }

    if (name === "lighthouse_team_metrics_cycleTimePercentiles") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const definitionId = getDefinitionId(argumentsPayload);
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("team", "cycleTimePercentiles"),
        client.getTeamCycleTimePercentiles(id, range, definitionId),
        Promise.all([
          readTeamWording(client, id),
          definitionId === undefined
            ? undefined
            : readForSummary(() => client.getTeamSettings(id)).then(
                (settings) =>
                  readCycleTimeDefinitionName(
                    answeredValue(settings),
                    definitionId,
                  ),
              ),
        ]).then(([wording, definitionName]) => ({ wording, definitionName })),
        summariseCycleTimePercentiles(summaryRange),
      );
    }

    if (name === "lighthouse_team_metrics_workItemAgePercentiles") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("team", "workItemAgePercentiles"),
        client.getTeamWorkItemAgePercentiles(id, range),
        readMetricsWording(client, "team", id),
        summariseWorkItemAgePercentiles(summaryRange),
      );
    }

    if (name === "lighthouse_portfolio_metrics_workItemAgePercentiles") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("portfolio", "workItemAgePercentiles"),
        client.getPortfolioWorkItemAgePercentiles(id, range),
        readMetricsWording(client, "portfolio", id),
        summariseWorkItemAgePercentiles(summaryRange),
      );
    }

    if (name === "lighthouse_team_metrics_blockedCountHistory") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("team", "blockedCountHistory"),
        client.getTeamBlockedCountHistory(id, range),
        readMetricsWording(client, "team", id),
        summariseBlocked("team", summaryRange),
      );
    }

    if (name === "lighthouse_portfolio_metrics_blockedCountHistory") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("portfolio", "blockedCountHistory"),
        client.getPortfolioBlockedCountHistory(id, range),
        readMetricsWording(client, "portfolio", id),
        summariseBlocked("portfolio", summaryRange),
      );
    }

    if (name === "lighthouse_team_metrics_wip") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const today = getDefaultMetricsDateRange().endDate;
      return answerMetric(
        metricLabels("team", "wip"),
        client.getTeamWip(id, today),
        readCurrentWipContext(client, id),
        summariseCurrentWip(today),
      );
    }

    if (name === "lighthouse_team_metrics_sleRisk") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const today = getDefaultMetricsDateRange().endDate;
      return answerMetric(
        metricLabels("team", "sleRisk"),
        client.getTeamSleRisk(id),
        readSleRiskContext(client, id, today),
        summariseSleRisk(today),
      );
    }

    if (name === "lighthouse_team_metrics_processBehaviorChart") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const chartType = getChartType(argumentsPayload, TEAM_CHART_TYPES);
      if (chartType === undefined) {
        return getErrorToolResult("team metrics: invalid metricType");
      }
      const range =
        getDateRange(argumentsPayload) ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("team", "processBehaviorChart"),
        client.getTeamProcessBehaviorChart(id, range, chartType),
        readMetricsWording(client, "team", id),
        summariseProcessBehaviorChart(range, chartType),
      );
    }

    if (name === "lighthouse_portfolio_metrics_processBehaviorChart") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const chartType = getChartType(
        argumentsPayload,
        processBehaviorMetricTypes,
      );
      if (chartType === undefined) {
        return getErrorToolResult("portfolio metrics: invalid metricType");
      }
      const range =
        getDateRange(argumentsPayload) ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("portfolio", "processBehaviorChart"),
        client.getPortfolioProcessBehaviorChart(id, range, chartType),
        readMetricsWording(client, "portfolio", id),
        summariseProcessBehaviorChart(range, chartType),
      );
    }

    if (name === "lighthouse_team_metrics_percentilesOverTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("team", "percentilesOverTime"),
        client.getTeamPercentilesOverTime(
          id,
          range,
          getPercentilesOverTimeMetricType(argumentsPayload),
          getHorizonArgument(argumentsPayload),
        ),
        readMetricsWording(client, "team", id),
        summarisePercentilesOverTime(summaryRange, argumentsPayload),
      );
    }

    if (name === "lighthouse_portfolio_metrics_percentilesOverTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("portfolio", "percentilesOverTime"),
        client.getPortfolioPercentilesOverTime(
          id,
          range,
          getPercentilesOverTimeMetricType(argumentsPayload),
          getHorizonArgument(argumentsPayload),
        ),
        readMetricsWording(client, "portfolio", id),
        summarisePercentilesOverTime(summaryRange, argumentsPayload),
      );
    }

    if (name === "lighthouse_team_metrics_processBehaviorOverTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("team", "processBehaviorOverTime"),
        client.getTeamProcessBehaviorOverTime(
          id,
          range,
          getProcessBehaviorMetricType(argumentsPayload),
        ),
        readMetricsWording(client, "team", id),
        summariseProcessBehaviorOverTime(summaryRange, argumentsPayload),
      );
    }

    if (name === "lighthouse_portfolio_metrics_processBehaviorOverTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("portfolio", "processBehaviorOverTime"),
        client.getPortfolioProcessBehaviorOverTime(
          id,
          range,
          getProcessBehaviorMetricType(argumentsPayload),
        ),
        readMetricsWording(client, "portfolio", id),
        summariseProcessBehaviorOverTime(summaryRange, argumentsPayload),
      );
    }

    if (name === "lighthouse_team_metrics_cumulativeStateTime") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      return answerMetric(
        metricLabels("team", "cumulativeStateTime"),
        client.getTeamCumulativeStateTime(
          id,
          range,
          getItemIdsArgument(argumentsPayload),
        ),
        readMetricsWording(client, "team", id),
        summariseTimeInState("team", range ?? getDefaultMetricsDateRange()),
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
      const range = getDateRange(argumentsPayload);
      return answerMetric(
        metricLabels("team", "cumulativeStateTimeItems"),
        client.getTeamCumulativeStateTimeItems(
          id,
          state,
          range,
          getItemIdsArgument(argumentsPayload),
        ),
        readMetricsWording(client, "team", id),
        summariseTimeInStateContributors(
          "team",
          range ?? getDefaultMetricsDateRange(),
        ),
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
      const range = getDateRange(argumentsPayload);
      return answerMetric(
        metricLabels("portfolio", "cumulativeStateTime"),
        client.getPortfolioCumulativeStateTime(
          id,
          range,
          getItemIdsArgument(argumentsPayload),
        ),
        readMetricsWording(client, "portfolio", id),
        summariseTimeInState(
          "portfolio",
          range ?? getDefaultMetricsDateRange(),
        ),
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
      const range = getDateRange(argumentsPayload);
      return answerMetric(
        metricLabels("portfolio", "cumulativeStateTimeItems"),
        client.getPortfolioCumulativeStateTimeItems(
          id,
          state,
          range,
          getItemIdsArgument(argumentsPayload),
        ),
        readMetricsWording(client, "portfolio", id),
        summariseTimeInStateContributors(
          "portfolio",
          range ?? getDefaultMetricsDateRange(),
        ),
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
      const summaryRange = range ?? getDefaultMetricsDateRange();
      return answerMetric(
        metricLabels("portfolio", "throughput"),
        client.getPortfolioThroughput(id, range),
        readMetricsWording(client, "portfolio", id),
        summariseThroughput("portfolio", summaryRange),
      );
    }

    if (name === "lighthouse_team_metrics_workItemAge") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      return answerMetric(
        metricLabels("team", "workItemAge"),
        client.getTeamWorkItemAgeOverTime(id, range),
        Promise.all([
          readMetricsWording(client, "team", id),
          readForSummary(() => client.getTeamWorkItemAgePercentiles(id, range)),
        ]).then(([wording, percentiles]) => ({
          wording,
          percentiles: answeredValue(percentiles),
        })),
        summariseWorkItemAge("team"),
      );
    }

    if (name === "lighthouse_team_metrics_totalWorkItemAge") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      return answerMetric(
        metricLabels("team", "totalWorkItemAge"),
        client.getTeamTotalWorkItemAgeOverTime(id, range),
        readMetricsWording(client, "team", id),
        summariseTotalWorkItemAge("team"),
      );
    }

    if (name === "lighthouse_portfolio_metrics_workItemAge") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      return answerMetric(
        metricLabels("portfolio", "workItemAge"),
        client.getPortfolioWorkItemAgeOverTime(id, range),
        Promise.all([
          readMetricsWording(client, "portfolio", id),
          readForSummary(() =>
            client.getPortfolioWorkItemAgePercentiles(id, range),
          ),
        ]).then(([wording, percentiles]) => ({
          wording,
          percentiles: answeredValue(percentiles),
        })),
        summariseWorkItemAge("portfolio"),
      );
    }

    if (name === "lighthouse_portfolio_metrics_totalWorkItemAge") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      return answerMetric(
        metricLabels("portfolio", "totalWorkItemAge"),
        client.getPortfolioTotalWorkItemAgeOverTime(id, range),
        readMetricsWording(client, "portfolio", id),
        summariseTotalWorkItemAge("portfolio"),
      );
    }

    // ── Feature tools ────────────────────────────────────────────────────────

    if (name === "lighthouse_feature_get") {
      const payload = isObjectRecord(argumentsPayload) ? argumentsPayload : {};
      const idsValue = payload.ids;
      const refsValue = payload.refs;

      if (Array.isArray(idsValue) && idsValue.length > 0) {
        const ids = idsValue.filter((v): v is number => typeof v === "number");
        return answerFeatures(client, client.getFeaturesByIds(ids));
      }

      if (Array.isArray(refsValue) && refsValue.length > 0) {
        const refs = refsValue.filter(
          (v): v is string => typeof v === "string",
        );
        return answerFeatures(client, client.getFeaturesByReferences(refs));
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
      // The Work Items answer does not carry the Feature's name, so the heading reads it from the Feature.
      const [result, wording] = await Promise.all([
        client.getFeatureWorkItems(id),
        readFeatureWording(client, id),
      ]);
      if (!result.ok) {
        return getErrorToolResult(
          `feature workitems: ${result.error.category} (${result.error.reason})`,
        );
      }
      return withSummary(
        "feature workitems",
        result.value,
        summaryOrNull(() => {
          const items = readFeatureWorkItems(result.value);
          return items === null
            ? null
            : describeFeatureWorkItemsHeading(
                wording.name,
                items.length,
                wording.terms,
              );
        }),
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
      const [result, terms] = await Promise.all([
        client.listDeliveries(id),
        readTerms(client),
      ]);
      if (!result.ok) {
        return getErrorToolResult(
          `delivery: ${result.error.category} (${result.error.reason})`,
        );
      }
      return withSummary(
        "deliveries",
        result.value,
        countSummary(result.value, readDeliveryList, (count) =>
          describeDeliveryCount(count, terms),
        ),
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
      const [result, terms] = await Promise.all([
        client.getDeliveryMetricsHistory(id),
        readTerms(client),
      ]);
      if (!result.ok) {
        return getErrorToolResult(
          `delivery metrics: ${result.error.category} (${result.error.reason})`,
        );
      }
      // Summarised by default: a 90-day window over fifteen epics is more breakdown objects than an
      // assistant should be handed to answer "how has the scope moved?".
      const payload = wantsEpics
        ? result.value
        : summariseDeliveryMetricsHistory(result.value);
      return withSummary(
        "delivery metrics",
        payload,
        summaryOrNull(() => {
          const history = readDeliveryMetricsHistory(result.value);
          return history === null
            ? null
            : describeDeliveryMetricsHeading(history, id, terms);
        }),
      );
    }

    // ── Recurring blackout-rule tools ────────────────────────────────────────

    if (name === "lighthouse_blackout_list") {
      const result = await client.getRecurringBlackoutRules();
      if (result.ok) {
        return withSummary(
          "recurringBlackoutRules",
          result.value,
          countSummary(
            result.value,
            readBlackoutRules,
            describeBlackoutRuleCount,
          ),
        );
      }
      return getErrorToolResult(
        `blackout: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse_blackout_create") {
      const payload = isObjectRecord(argumentsPayload) ? argumentsPayload : {};
      return answerBlackoutRuleWrite(
        "Created",
        client.createRecurringBlackoutRule(payload),
      );
    }

    if (name === "lighthouse_blackout_update") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("blackout: invalid id (rule id required)");
      }
      const payload = isObjectRecord(argumentsPayload) ? argumentsPayload : {};
      const { id: _ignoredId, ...rulePayload } = payload;
      return answerBlackoutRuleWrite(
        "Updated",
        client.updateRecurringBlackoutRule(id, rulePayload),
      );
    }

    if (name === "lighthouse_blackout_delete") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("blackout: invalid id (rule id required)");
      }
      const result = await client.deleteRecurringBlackoutRule(id);
      if (!result.ok) {
        return getErrorToolResult(
          `blackout: ${result.error.category} (${result.error.reason})`,
        );
      }
      return withConfirmation(`recurringBlackoutRule deleted: ${id}`, () =>
        describeBlackoutRuleWriteConfirmation("Deleted", { id }),
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

      const [result, wording] = await Promise.all([
        client.runManualForecast(id, {
          remainingItems,
          targetDate,
          applyFilterOverride,
        }),
        readTeamWording(client, id),
      ]);
      if (result.ok) {
        return withSummary(
          "forecast",
          result.value,
          summaryOrNull(() =>
            describeManualForecastAnswer(result.value, wording),
          ),
        );
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

      const [result, wording] = await Promise.all([
        client.runBacktest(id, {
          startDate,
          endDate,
          historicalStartDate,
          historicalEndDate,
          applyFilterOverride,
        }),
        readTeamWording(client, id),
      ]);
      if (result.ok) {
        return withSummary(
          "backtest",
          result.value,
          summaryOrNull(() => describeBacktestAnswer(result.value, wording)),
        );
      }
      return getErrorToolResult(
        `backtest: ${result.error.category} (${result.error.reason})`,
      );
    }

    return getErrorToolResult(`Unknown tool: ${name}`);
  };

const countedOf = (
  name: string,
  answered: McpToolResult | CountedToolResult,
): CountedToolResult =>
  isToolResult(answered)
    ? countedToolResult(answered, usageDataOccurrencesOf(name))
    : answered;

export const createMcpCoreRuntime = (
  dependencies: McpCoreRuntimeDependencies,
): McpCoreRuntime => {
  const answer = answerToolCall(dependencies);
  const callCountedTool = async (name: string, argumentsPayload: unknown) =>
    countedOf(name, await answer(name, argumentsPayload));
  return {
    listTools: () => toolDefinitions,
    callTool: async (name, argumentsPayload) =>
      (await callCountedTool(name, argumentsPayload)).result,
    callCountedTool,
  };
};

/** The server, and through it what the assistant said it can do once it connected. */
type McpToolServer = Pick<McpServer, "registerTool"> & {
  readonly server?: Pick<McpServer["server"], "getClientCapabilities">;
};

const canElicit = (server: McpToolServer): boolean =>
  server.server?.getClientCapabilities()?.elicitation !== undefined;

export const registerMcpTools = (
  server: McpToolServer,
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
      async (argumentsPayload, extra) => {
        const { result, occurrences } = await runtime.callCountedTool(
          tool.name,
          argumentsPayload,
        );
        await dependencies.usageData?.({
          reached: !result.isError,
          occurrences,
          ask: canElicit(server)
            ? askThroughTheAssistant((params, options) =>
                extra.sendRequest(
                  { method: "elicitation/create", params },
                  ElicitResultSchema,
                  { ...options, signal: extra.signal },
                ),
              )
            : undefined,
        });
        return {
          ...result,
          content: [...result.content],
        };
      },
    );
  }
};
