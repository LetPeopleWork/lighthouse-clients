import { describe, expect, it, vi } from "vitest";
import {
  renderMcpHttpBanner,
  runMcpHttpRuntime,
  startMcpHttpServer,
} from "./bin";

describe("mcp-http runtime entrypoint", () => {
  it("renders hosted runtime banner with server url", () => {
    expect(renderMcpHttpBanner("http://127.0.0.1:3333")).toBe(
      "Lighthouse MCP HTTP server running at http://127.0.0.1:3333",
    );
  });

  it("fails fast when LIGHTHOUSE_URL is missing", async () => {
    const write = vi.fn<(message: string) => void>();
    const writeError = vi.fn<(message: string) => void>();

    const code = await runMcpHttpRuntime({}, write, writeError);

    expect(code).toBe(1);
    expect(write).not.toHaveBeenCalled();
    expect(writeError).toHaveBeenCalledOnce();
    expect(writeError.mock.calls[0]?.[0]).toContain("Missing LIGHTHOUSE_URL");
  });

  it("starts server and responds to health and mcp requests", async () => {
    const server = await startMcpHttpServer({
      lighthouseUrl: "http://127.0.0.1:9999",
      host: "127.0.0.1",
      port: 0,
    });

    try {
      const healthResponse = await fetch(`${server.url}/health`);
      expect(healthResponse.status).toBe(200);
      expect(await healthResponse.json()).toEqual({ status: "ok" });

      const initializeResponse = await fetch(`${server.url}/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      });

      expect(initializeResponse.status).toBe(200);

      const payload = (await initializeResponse.json()) as {
        readonly result?: {
          readonly serverInfo?: {
            readonly name?: string;
          };
        };
      };

      expect(payload.result?.serverInfo?.name).toBe("@lighthouse/mcp-http");
    } finally {
      await server.close();
    }
  });

  it("runs runtime successfully when environment is valid", async () => {
    const write = vi.fn<(message: string) => void>();
    const writeError = vi.fn<(message: string) => void>();
    let statusCode = 0;

    const code = await runMcpHttpRuntime(
      {
        LIGHTHOUSE_URL: "http://127.0.0.1:9999",
        HOST: "127.0.0.1",
        PORT: "0",
      },
      write,
      writeError,
      async (server) => {
        const health = await fetch(`${server.url}/health`);
        statusCode = health.status;
        await server.close();
      },
    );

    expect(code).toBe(0);
    expect(write).toHaveBeenCalledOnce();
    expect(writeError).not.toHaveBeenCalled();

    expect(statusCode).toBe(200);
  });
});
