import { describe, expect, it } from "vitest";
import { createMcpHttpRuntime } from "./index";

describe("createMcpHttpRuntime", () => {
  it("returns health payload", () => {
    const runtime = createMcpHttpRuntime({
      coreRuntime: {
        listTools: () => [],
        callTool: async () => ({
          isError: false,
          content: [{ type: "text", text: "ok" }],
        }),
      },
    });

    expect(runtime.getHealth()).toEqual({ status: "ok" });
  });

  it("handles initialize", async () => {
    const runtime = createMcpHttpRuntime({
      coreRuntime: {
        listTools: () => [],
        callTool: async () => ({
          isError: false,
          content: [{ type: "text", text: "ok" }],
        }),
      },
    });

    const response = await runtime.handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    });

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "@lighthouse/mcp-http",
          version: "0.1.0",
        },
      },
    });
  });

  it("handles tools/list", async () => {
    const runtime = createMcpHttpRuntime({
      coreRuntime: {
        listTools: () => [
          {
            name: "lighthouse.health.check",
            description: "Check connectivity",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
        ],
        callTool: async () => ({
          isError: false,
          content: [{ type: "text", text: "ok" }],
        }),
      },
    });

    const response = await runtime.handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 2,
      result: {
        tools: [
          {
            name: "lighthouse.health.check",
            description: "Check connectivity",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      },
    });
  });

  it("handles tools/call", async () => {
    const runtime = createMcpHttpRuntime({
      coreRuntime: {
        listTools: () => [],
        callTool: async (name, args) => ({
          isError: false,
          content: [
            {
              type: "text",
              text: `${name}:${JSON.stringify(args)}`,
            },
          ],
        }),
      },
    });

    const response = await runtime.handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: "abc",
      method: "tools/call",
      params: {
        name: "lighthouse.version.get",
        arguments: {
          includeBuild: true,
        },
      },
    });

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: "abc",
      result: {
        isError: false,
        content: [
          {
            type: "text",
            text: 'lighthouse.version.get:{"includeBuild":true}',
          },
        ],
      },
    });
  });

  it("returns JSON-RPC error for unsupported methods", async () => {
    const runtime = createMcpHttpRuntime({
      coreRuntime: {
        listTools: () => [],
        callTool: async () => ({
          isError: false,
          content: [{ type: "text", text: "ok" }],
        }),
      },
    });

    const response = await runtime.handleJsonRpcRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "unknown/method",
      params: {},
    });

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 3,
      error: {
        code: -32601,
        message: "Method not found",
      },
    });
  });
});
