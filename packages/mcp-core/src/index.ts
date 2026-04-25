export type McpCorePackageContract = {
  readonly name: "@lighthouse/mcp-core";
  readonly dependsOn: "@lighthouse/client";
  readonly transports: readonly ["stdio", "streamable-http"];
};

export const getMcpCorePackageContract = (): McpCorePackageContract => ({
  name: "@lighthouse/mcp-core",
  dependsOn: "@lighthouse/client",
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
    | "lighthouse.portfolio.refresh";
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

    return getErrorToolResult(`Unknown tool: ${name}`);
  },
});
