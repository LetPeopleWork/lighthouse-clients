import * as undiciModule from "undici";
import { describe, expect, it, vi } from "vitest";
import { startMcpHttpServer } from "./bin";

vi.mock("undici", async (importOriginal) => {
  const mod = await importOriginal<typeof import("undici")>();
  const OriginalAgent = mod.Agent;
  const MockAgent = vi
    .fn()
    .mockImplementation(
      (opts: ConstructorParameters<typeof OriginalAgent>[0]) =>
        new OriginalAgent(opts),
    );
  return {
    ...mod,
    Agent: MockAgent,
  };
});

describe("mcp-http insecure HTTPS wiring", () => {
  it("creates undici Agent with rejectUnauthorized: false for every tool call", async () => {
    const MockAgent = vi.mocked(undiciModule.Agent);

    const server = await startMcpHttpServer({
      lighthouseUrl: "http://127.0.0.1:9999",
      host: "127.0.0.1",
      port: 0,
    });

    try {
      // Trigger createClient by making an MCP tools/call request.
      // The call will fail at the Lighthouse connectivity level (no server at 9999),
      // but the Agent must have been instantiated before any HTTP attempt.
      const response = await fetch(`${server.url}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "lighthouse_team_list", arguments: {} },
        }),
      });

      expect(response.status).toBe(200);

      expect(MockAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          connect: expect.objectContaining({ rejectUnauthorized: false }),
        }),
      );
    } finally {
      await server.close();
    }
  });
});
