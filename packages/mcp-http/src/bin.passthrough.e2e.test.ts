import { type Server, createServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type McpHttpServerHandle, startMcpHttpServer } from "./bin";

type UpstreamProbe = {
  readonly url: string;
  readonly seenApiKeys: string[];
  readonly seenAuthorizations: string[];
  readonly close: () => Promise<void>;
};

const startUpstreamProbe = async (): Promise<UpstreamProbe> => {
  const seenApiKeys: string[] = [];
  const seenAuthorizations: string[] = [];

  const server: Server = createServer((req, res) => {
    const apiKey = req.headers["x-api-key"];
    if (typeof apiKey === "string") {
      seenApiKeys.push(apiKey);
    }
    const authorization = req.headers.authorization;
    if (typeof authorization === "string") {
      seenAuthorizations.push(authorization);
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("v-test");
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const port =
    typeof address === "object" && address !== null ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}`,
    seenApiKeys,
    seenAuthorizations,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
};

const callHealthCheckWithHeaders = async (
  mcpUrl: string,
  headers: Record<string, string>,
): Promise<void> => {
  const transport = new StreamableHTTPClientTransport(
    new URL(`${mcpUrl}/mcp`),
    {
      requestInit: { headers },
    },
  );
  const client = new Client({ name: "passthrough-test", version: "0.0.0" });

  await client.connect(transport);
  try {
    await client.callTool({ name: "lighthouse_health_check", arguments: {} });
  } finally {
    await client.close();
  }
};

describe("mcp-http forwards the caller's own credential (no shared baked key)", () => {
  let upstream: UpstreamProbe;
  let mcp: McpHttpServerHandle;

  beforeEach(async () => {
    upstream = await startUpstreamProbe();
    mcp = await startMcpHttpServer({
      lighthouseUrl: upstream.url,
      host: "127.0.0.1",
      port: 0,
      apiKey: "baked-key",
    });
  });

  afterEach(async () => {
    await mcp.close();
    await upstream.close();
  });

  it("forwards each caller's X-Api-Key to Lighthouse instead of the baked key", async () => {
    await callHealthCheckWithHeaders(mcp.url, { "x-api-key": "caller-one" });
    await callHealthCheckWithHeaders(mcp.url, { "x-api-key": "caller-two" });

    expect(upstream.seenApiKeys).toEqual(["caller-one", "caller-two"]);
  });

  it("forwards the caller's Authorization Bearer token to Lighthouse", async () => {
    await callHealthCheckWithHeaders(mcp.url, {
      authorization: "Bearer caller-token",
    });

    expect(upstream.seenAuthorizations).toContain("Bearer caller-token");
    expect(upstream.seenApiKeys).not.toContain("baked-key");
  });

  it("falls back to the baked key for a caller that sends no credential (dev/standalone path)", async () => {
    await callHealthCheckWithHeaders(mcp.url, {});

    expect(upstream.seenApiKeys).toEqual(["baked-key"]);
  });
});
