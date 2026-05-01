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
    | "lighthouse_portfolio_list"
    | "lighthouse_portfolio_get"
    | "lighthouse_portfolio_refresh"
    | "lighthouse_team_metrics_throughput"
    | "lighthouse_team_metrics_cycleTimePercentiles"
    | "lighthouse_portfolio_metrics_throughput"
    | "lighthouse_feature_get"
    | "lighthouse_feature_workitems"
    | "lighthouse_delivery_list"
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

type McpRuntimeClient = {
  readonly checkConnectivity: () => Promise<{
    readonly category:
      | "success"
      | "unreachable"
      | "misconfigured"
      | "unauthorized"
      | "dependency-failure"
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
  readonly runManualForecast: (
    teamId: number,
    payload: { readonly remainingItems?: number; readonly targetDate?: string },
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
    },
  ) => Promise<
    | { readonly ok: true; readonly value: unknown }
    | {
        readonly ok: false;
        readonly error: { readonly category: string; readonly reason: string };
      }
  >;
};

export type McpCoreRuntimeDependencies = {
  readonly createClient: () => McpRuntimeClient;
};

export type McpCoreRuntime = {
  readonly listTools: () => readonly McpToolDefinition[];
  readonly callTool: (
    name: string,
    argumentsPayload: unknown,
  ) => Promise<McpToolResult>;
};

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
      "Get throughput run-chart data for a team by ID, optionally filtered by start and end dates.",
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
    name: "lighthouse_team_metrics_cycleTimePercentiles",
    description:
      "Get cycle-time percentiles for a team by ID, optionally filtered by start and end dates.",
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
    name: "lighthouse_forecast_manual",
    description:
      "Run a manual forecast for a team by ID with optional remaining items and target date.",
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
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_forecast_backtest",
    description:
      "Run a forecast backtest for a team by ID using forecast and historical date ranges.",
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

const isoDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Expected ISO date in YYYY-MM-DD format.");

const toolInputSchemas: Record<McpToolDefinition["name"], z.ZodTypeAny> = {
  lighthouse_health_check: z.object({}),
  lighthouse_version_get: z.object({}),
  lighthouse_worktracking_list: z.object({}),
  lighthouse_worktracking_get: z.object({ id: z.number().int() }),
  lighthouse_team_list: z.object({}),
  lighthouse_team_get: z.object({ id: z.number().int() }),
  lighthouse_team_refresh: z.object({ id: z.number().int() }),
  lighthouse_portfolio_list: z.object({}),
  lighthouse_portfolio_get: z.object({ id: z.number().int() }),
  lighthouse_portfolio_refresh: z.object({ id: z.number().int() }),
  lighthouse_team_metrics_throughput: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_team_metrics_cycleTimePercentiles: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema.optional(),
    endDate: isoDateStringSchema.optional(),
  }),
  lighthouse_portfolio_metrics_throughput: z.object({
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
  lighthouse_forecast_manual: z.object({
    id: z.number().int(),
    remainingItems: z.number().int().optional(),
    targetDate: isoDateStringSchema.optional(),
  }),
  lighthouse_forecast_backtest: z.object({
    id: z.number().int(),
    startDate: isoDateStringSchema,
    endDate: isoDateStringSchema,
    historicalStartDate: isoDateStringSchema,
    historicalEndDate: isoDateStringSchema,
  }),
};

const isReadOnlyTool = (toolName: McpToolDefinition["name"]): boolean =>
  !toolName.endsWith("_refresh");

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
      const result = await client.getTeamThroughput(id, range);
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
      const result = await client.getTeamCycleTimePercentiles(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `team cycleTimePercentiles: ${encodePayload(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
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

      const result = await client.runManualForecast(id, {
        remainingItems,
        targetDate,
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

      const result = await client.runBacktest(id, {
        startDate,
        endDate,
        historicalStartDate,
        historicalEndDate,
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
