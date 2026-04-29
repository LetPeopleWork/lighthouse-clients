import { beforeEach, describe, expect, it, vi } from "vitest";
import * as undiciModule from "undici";

vi.mock("undici", async (importOriginal) => {
  const mod = await importOriginal<typeof import("undici")>();
  const OriginalAgent = mod.Agent;
  return {
    ...mod,
    Agent: vi.fn().mockImplementation(
      (opts: ConstructorParameters<typeof OriginalAgent>[0]) =>
        new OriginalAgent(opts),
    ),
  };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    McpServer: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock("@letpeoplework/lighthouse-mcp-core", async (importOriginal) => {
  const mod = await importOriginal<
    typeof import("@letpeoplework/lighthouse-mcp-core")
  >();
  return {
    ...mod,
    registerMcpTools: vi.fn(),
  };
});

describe("mcp-stdio insecure HTTPS wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes a createClient factory that creates Agent with rejectUnauthorized: false", async () => {
    const { runMcpStdioRuntime } = await import("./bin");
    const MockAgent = vi.mocked(undiciModule.Agent);
    const { registerMcpTools } = await import(
      "@letpeoplework/lighthouse-mcp-core"
    );
    const MockRegisterMcpTools = vi.mocked(registerMcpTools);

    const code = await runMcpStdioRuntime({
      LIGHTHOUSE_URL: "https://127.0.0.1:9999",
    });
    expect(code).toBe(0);

    // registerMcpTools is called with a { createClient } factory
    expect(MockRegisterMcpTools).toHaveBeenCalledOnce();
    const deps = MockRegisterMcpTools.mock.calls[0]?.[1] as {
      createClient: () => unknown;
    };

    // Invoke the factory directly to trigger Agent instantiation
    deps.createClient();

    expect(MockAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        connect: expect.objectContaining({ rejectUnauthorized: false }),
      }),
    );
  });
});
