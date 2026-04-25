import type { McpCoreRuntime } from "@lighthouse/mcp-core";

export type McpHttpPackageContract = {
  readonly name: "@lighthouse/mcp-http";
  readonly dependsOn: "@lighthouse/mcp-core";
  readonly transport: "streamable-http";
};

export const getMcpHttpPackageContract = (): McpHttpPackageContract => ({
  name: "@lighthouse/mcp-http",
  dependsOn: "@lighthouse/mcp-core",
  transport: "streamable-http",
});

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly method: string;
  readonly params?: unknown;
};

export type JsonRpcSuccessResponse = {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly result: unknown;
};

export type JsonRpcErrorResponse = {
  readonly jsonrpc: "2.0";
  readonly id: JsonRpcId;
  readonly error: {
    readonly code: number;
    readonly message: string;
  };
};

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export type McpHttpRuntimeDependencies = {
  readonly coreRuntime: McpCoreRuntime;
};

export type McpHttpRuntime = {
  readonly getHealth: () => {
    readonly status: "ok";
  };
  readonly handleJsonRpcRequest: (
    request: JsonRpcRequest,
  ) => Promise<JsonRpcResponse>;
};

const getSuccessResponse = (
  id: JsonRpcId,
  result: unknown,
): JsonRpcSuccessResponse => ({
  jsonrpc: "2.0",
  id,
  result,
});

const getErrorResponse = (
  id: JsonRpcId,
  code: number,
  message: string,
): JsonRpcErrorResponse => ({
  jsonrpc: "2.0",
  id,
  error: {
    code,
    message,
  },
});

export const createMcpHttpRuntime = (
  dependencies: McpHttpRuntimeDependencies,
): McpHttpRuntime => ({
  getHealth: () => ({
    status: "ok",
  }),
  handleJsonRpcRequest: async (request: JsonRpcRequest) => {
    if (request.method === "initialize") {
      return getSuccessResponse(request.id, {
        protocolVersion: "2025-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "@lighthouse/mcp-http",
          version: "0.1.0",
        },
      });
    }

    if (request.method === "tools/list") {
      return getSuccessResponse(request.id, {
        tools: dependencies.coreRuntime.listTools(),
      });
    }

    if (request.method === "tools/call") {
      const params = (request.params ?? {}) as {
        readonly name?: string;
        readonly arguments?: unknown;
      };

      if (typeof params.name !== "string") {
        return getErrorResponse(request.id, -32602, "Invalid params");
      }

      const result = await dependencies.coreRuntime.callTool(
        params.name,
        params.arguments ?? {},
      );

      return getSuccessResponse(request.id, result);
    }

    return getErrorResponse(request.id, -32601, "Method not found");
  },
});
