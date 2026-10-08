import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { describe, expect, it } from "vitest";
import { startMcpHttpServer } from "./bin";

const packageVersion = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { readonly version: string }
).version;

describe("the Streamable HTTP MCP server", () => {
  it("reports its package's own version to the assistant", async () => {
    const mcp = await startMcpHttpServer({
      lighthouseUrl: "http://127.0.0.1:5000",
      host: "127.0.0.1",
      port: 0,
    });
    const client = new Client({ name: "version-test", version: "0.0.0" });
    try {
      await client.connect(
        new StreamableHTTPClientTransport(new URL(`${mcp.url}/mcp`)),
      );

      expect(client.getServerVersion()?.version).toBe(packageVersion);
    } finally {
      await client.close();
      await mcp.close();
    }
  });
});
