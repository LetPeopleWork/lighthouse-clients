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
  readonly name: "lighthouse.health.check" | "lighthouse.version.get";
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

export const createMcpCoreRuntime = (
  dependencies: McpCoreRuntimeDependencies,
): McpCoreRuntime => ({
  listTools: () => toolDefinitions,
  callTool: async (name: string) => {
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

    return getErrorToolResult(`Unknown tool: ${name}`);
  },
});
