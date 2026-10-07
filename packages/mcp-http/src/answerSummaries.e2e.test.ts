import { createServer, type Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it } from "vitest";
import { type McpHttpServerHandle, startMcpHttpServer } from "./bin";

// Story 6218 (ADR-224): a list answer's summary rides in a second text block. This proves the block reaches an
// assistant's MCP SDK client over the HTTP transport, against a recording `node:http` Lighthouse. Pending until
// DELIVER slice 05 adds the first list summary.

const gravity = {
  name: "Gravity",
  id: 3,
  lastUpdated: "2026-10-06T05:14:00Z",
  serviceLevelExpectationProbability: 85,
  serviceLevelExpectationRange: 12,
  systemWIPLimit: 10,
  featureWip: 2,
  features: [{ id: 2, name: "Deep-sea camera stream" }],
  portfolios: [{ id: 2, name: "Ocean Explorer" }],
  workItemTypes: ["User Story", "Bug"],
};

const startLighthouse = async () => {
  const server: Server = createServer((req, res) => {
    const path = (req.url ?? "").split("?")[0];
    if (path.endsWith("/v1/version/current")) {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("v26.10.7.1");
      return;
    }
    if (path.endsWith("/v1/auth/mode")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ mode: "Disabled" }));
      return;
    }
    if (path.endsWith("/v1/terminology/all")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("[]");
      return;
    }
    if (path.endsWith("/v1/teams")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify([gravity]));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ title: "Not Found" }));
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
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
};

describe("an answer's summary over the shared MCP server", () => {
  let lighthouse: Awaited<ReturnType<typeof startLighthouse>> | undefined;
  let mcp: McpHttpServerHandle | undefined;

  afterEach(async () => {
    await mcp?.close();
    await lighthouse?.close();
    mcp = undefined;
    lighthouse = undefined;
  });

  // @real-io @adapter-integration @US-05 @contract-shape:bounded-change
  it("hands an assistant's MCP client the Team list's facts and then its summary, as two blocks", async () => {
    lighthouse = await startLighthouse();
    mcp = await startMcpHttpServer({
      lighthouseUrl: lighthouse.url,
      host: "127.0.0.1",
      port: 0,
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(`${mcp.url}/mcp`),
    );
    const client = new Client({
      name: "answer-summaries-test",
      version: "0.0.0",
    });
    await client.connect(transport);

    try {
      const result = (await client.callTool({
        name: "lighthouse_team_list",
        arguments: {},
      })) as {
        readonly isError?: boolean;
        readonly content: readonly { readonly text?: string }[];
      };

      expect(result.isError ?? false).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(result.content[0]?.text?.startsWith("teams: ")).toBe(true);
      expect(result.content[1]?.text).toBe("summary: 1 Team");
    } finally {
      await client.close();
    }
  });
});
