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
    | "lighthouse.health.check"
    | "lighthouse.version.get"
    | "lighthouse.worktracking.list"
    | "lighthouse.worktracking.get"
    | "lighthouse.team.list"
    | "lighthouse.team.get"
    | "lighthouse.team.refresh"
    | "lighthouse.portfolio.list"
    | "lighthouse.portfolio.get"
    | "lighthouse.portfolio.refresh"
    | "lighthouse.team.metrics.throughput"
    | "lighthouse.team.metrics.cycleTimePercentiles"
    | "lighthouse.portfolio.metrics.throughput"
    | "lighthouse.feature.get"
    | "lighthouse.feature.workitems"
    | "lighthouse.delivery.list"
    | "lighthouse.forecast.manual"
    | "lighthouse.forecast.backtest";
  readonly description: string;
  readonly inputSchema: {
    readonly type: "object";
    readonly properties: Record<string, never>;
    readonly additionalProperties: false;
  };
};

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
    name: "lighthouse.health.check",
    description: "Validate Lighthouse API connectivity.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.version.get",
    description: "Get Lighthouse version from /api/v1/version.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.worktracking.list",
    description: "List work-tracking system connections.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.worktracking.get",
    description: "Get one work-tracking system connection by id.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.team.list",
    description: "List teams.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.team.get",
    description: "Get one team by id.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.team.refresh",
    description: "Trigger a refresh for one team.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.portfolio.list",
    description: "List portfolios.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.portfolio.get",
    description: "Get one portfolio by id.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.portfolio.refresh",
    description: "Trigger a refresh for one portfolio.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.team.metrics.throughput",
    description:
      "Get throughput run-chart data for a team. Requires id. Optional startDate and endDate (ISO date strings, defaults to last 90 days).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.team.metrics.cycleTimePercentiles",
    description:
      "Get cycle-time percentiles for a team. Requires id. Optional startDate and endDate (ISO date strings, defaults to last 90 days).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.portfolio.metrics.throughput",
    description:
      "Get throughput run-chart data for a portfolio. Requires id. Optional startDate and endDate (ISO date strings, defaults to last 90 days).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.feature.get",
    description:
      "Get features by ids (provide ids array) or by reference ids (provide refs array).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.feature.workitems",
    description: "Get work items for a feature. Requires id.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.delivery.list",
    description: "List deliveries for a portfolio. Requires id (portfolio id).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.forecast.manual",
    description:
      "Run a manual forecast for a team. Requires id (team id). Optional remainingItems and targetDate.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse.forecast.backtest",
    description:
      "Run a backtest forecast for a team. Requires id, startDate, endDate, historicalStartDate, historicalEndDate.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

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

export const createMcpCoreRuntime = (
  dependencies: McpCoreRuntimeDependencies,
): McpCoreRuntime => ({
  listTools: () => toolDefinitions,
  callTool: async (name: string, argumentsPayload: unknown) => {
    const client = dependencies.createClient();

    if (name === "lighthouse.health.check") {
      const health = await client.checkConnectivity();
      if (health.category === "success") {
        return getSuccessToolResult("connectivity: success");
      }

      return getErrorToolResult(
        `connectivity: ${health.category}${
          health.reason !== undefined ? ` (${health.reason})` : ""
        }`,
      );
    }

    if (name === "lighthouse.version.get") {
      const version = await client.getVersion();
      if (version.ok) {
        return getSuccessToolResult(`version: ${version.value}`);
      }

      return getErrorToolResult(
        `version: ${version.error.category} (${version.error.reason})`,
      );
    }

    if (name === "lighthouse.worktracking.list") {
      const connections = await client.listWorkTrackingConnections();
      if (connections.ok) {
        return getSuccessToolResult(
          `worktracking: ${JSON.stringify(connections.value)}`,
        );
      }

      return getErrorToolResult(
        `worktracking: ${connections.error.category} (${connections.error.reason})`,
      );
    }

    if (name === "lighthouse.worktracking.get") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("worktracking: invalid id");
      }

      const connection = await client.getWorkTrackingConnection(id);
      if (connection.ok) {
        return getSuccessToolResult(
          `worktracking: ${JSON.stringify(connection.value)}`,
        );
      }

      return getErrorToolResult(
        `worktracking: ${connection.error.category} (${connection.error.reason})`,
      );
    }

    if (name === "lighthouse.team.list") {
      const teams = await client.listTeams();
      if (teams.ok) {
        return getSuccessToolResult(`teams: ${JSON.stringify(teams.value)}`);
      }

      return getErrorToolResult(
        `teams: ${teams.error.category} (${teams.error.reason})`,
      );
    }

    if (name === "lighthouse.team.get") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team: invalid id");
      }

      const team = await client.getTeam(id);
      if (team.ok) {
        return getSuccessToolResult(`team: ${JSON.stringify(team.value)}`);
      }

      return getErrorToolResult(
        `team: ${team.error.category} (${team.error.reason})`,
      );
    }

    if (name === "lighthouse.team.refresh") {
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

    if (name === "lighthouse.portfolio.list") {
      const portfolios = await client.listPortfolios();
      if (portfolios.ok) {
        return getSuccessToolResult(
          `portfolios: ${JSON.stringify(portfolios.value)}`,
        );
      }

      return getErrorToolResult(
        `portfolios: ${portfolios.error.category} (${portfolios.error.reason})`,
      );
    }

    if (name === "lighthouse.portfolio.get") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio: invalid id");
      }

      const portfolio = await client.getPortfolio(id);
      if (portfolio.ok) {
        return getSuccessToolResult(
          `portfolio: ${JSON.stringify(portfolio.value)}`,
        );
      }

      return getErrorToolResult(
        `portfolio: ${portfolio.error.category} (${portfolio.error.reason})`,
      );
    }

    if (name === "lighthouse.portfolio.refresh") {
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

    if (name === "lighthouse.team.metrics.throughput") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getTeamThroughput(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `team throughput: ${JSON.stringify(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse.team.metrics.cycleTimePercentiles") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("team metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getTeamCycleTimePercentiles(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `team cycleTimePercentiles: ${JSON.stringify(result.value)}`,
        );
      }
      return getErrorToolResult(
        `team metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse.portfolio.metrics.throughput") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("portfolio metrics: invalid id");
      }
      const range = getDateRange(argumentsPayload);
      const result = await client.getPortfolioThroughput(id, range);
      if (result.ok) {
        return getSuccessToolResult(
          `portfolio throughput: ${JSON.stringify(result.value)}`,
        );
      }
      return getErrorToolResult(
        `portfolio metrics: ${result.error.category} (${result.error.reason})`,
      );
    }

    // ── Feature tools ────────────────────────────────────────────────────────

    if (name === "lighthouse.feature.get") {
      const payload = isObjectRecord(argumentsPayload) ? argumentsPayload : {};
      const idsValue = payload.ids;
      const refsValue = payload.refs;

      if (Array.isArray(idsValue) && idsValue.length > 0) {
        const ids = idsValue.filter((v): v is number => typeof v === "number");
        const result = await client.getFeaturesByIds(ids);
        if (result.ok) {
          return getSuccessToolResult(
            `features: ${JSON.stringify(result.value)}`,
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
            `features: ${JSON.stringify(result.value)}`,
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

    if (name === "lighthouse.feature.workitems") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult("feature workitems: invalid id");
      }
      const result = await client.getFeatureWorkItems(id);
      if (result.ok) {
        return getSuccessToolResult(
          `feature workitems: ${JSON.stringify(result.value)}`,
        );
      }
      return getErrorToolResult(
        `feature workitems: ${result.error.category} (${result.error.reason})`,
      );
    }

    // ── Delivery tools ───────────────────────────────────────────────────────

    if (name === "lighthouse.delivery.list") {
      const id = getNumericId(argumentsPayload);
      if (id === null) {
        return getErrorToolResult(
          "delivery: invalid id (portfolio id required)",
        );
      }
      const result = await client.listDeliveries(id);
      if (result.ok) {
        return getSuccessToolResult(
          `deliveries: ${JSON.stringify(result.value)}`,
        );
      }
      return getErrorToolResult(
        `delivery: ${result.error.category} (${result.error.reason})`,
      );
    }

    // ── Forecast tools ───────────────────────────────────────────────────────

    if (name === "lighthouse.forecast.manual") {
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
        return getSuccessToolResult(
          `forecast: ${JSON.stringify(result.value)}`,
        );
      }
      return getErrorToolResult(
        `forecast: ${result.error.category} (${result.error.reason})`,
      );
    }

    if (name === "lighthouse.forecast.backtest") {
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
        return getSuccessToolResult(
          `backtest: ${JSON.stringify(result.value)}`,
        );
      }
      return getErrorToolResult(
        `backtest: ${result.error.category} (${result.error.reason})`,
      );
    }

    return getErrorToolResult(`Unknown tool: ${name}`);
  },
});
