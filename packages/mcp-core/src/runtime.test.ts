import { describe, expect, it } from "vitest";
import { createMcpCoreRuntime } from "./index";

describe("createMcpCoreRuntime", () => {
  it("lists baseline Lighthouse tools", () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.2.3" }),
      }),
    });

    const tools = runtime.listTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "lighthouse.health.check",
      "lighthouse.version.get",
    ]);
  });

  it("calls health-check tool and returns success", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v1.2.3" }),
      }),
    });

    const result = await runtime.callTool("lighthouse.health.check", {});

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("success");
  });

  it("calls version tool and returns version", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v2.0.0" }),
      }),
    });

    const result = await runtime.callTool("lighthouse.version.get", {});

    expect(result.isError).toBe(false);
    expect(result.content[0]?.text).toContain("v2.0.0");
  });

  it("returns error for unknown tools", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({ category: "success" }),
        getVersion: async () => ({ ok: true, value: "v2.0.0" }),
      }),
    });

    const result = await runtime.callTool("lighthouse.unknown", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("Unknown tool");
  });

  it("propagates client errors through MCP tool responses", async () => {
    const runtime = createMcpCoreRuntime({
      createClient: () => ({
        checkConnectivity: async () => ({
          category: "unauthorized",
          reason: "token missing",
        }),
        getVersion: async () => ({ ok: true, value: "v2.0.0" }),
      }),
    });

    const result = await runtime.callTool("lighthouse.health.check", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("unauthorized");
  });
});
