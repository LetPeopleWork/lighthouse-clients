import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it } from "vitest";
import {
  aLighthouseWithReports,
  ENGAGEMENT_START,
  LIGHTSPEED,
  LIGHTSPEEDS_ENGAGEMENT_START,
} from "../../../test-support/reportAnswers";
import { decodeFacts } from "../../mcp-core/test-support/mcpHarness";
import { type McpHttpServerHandle, startMcpHttpServer } from "./bin";

// The shared, hosted MCP server reads a report the same way the local one does: Lighthouse's answer unchanged
// in the first block and its summary in the second, over the HTTP transport an assistant's MCP SDK speaks.

describe("an assistant reads a report over the shared MCP server", () => {
  let mcp: McpHttpServerHandle | undefined;

  afterEach(async () => {
    await mcp?.close();
    mcp = undefined;
  });

  // @driving_port @real-io @us-04 @slice-04 @contract-shape:unbounded-preservation
  it("hands over a Team's report exactly as Lighthouse sent it, with its summary", async () => {
    const lighthouse = await aLighthouseWithReports();
    mcp = await startMcpHttpServer({
      lighthouseUrl: lighthouse.url,
      host: "127.0.0.1",
      port: 0,
    });
    const client = new Client({ name: "reports-test", version: "0.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${mcp.url}/mcp`)),
    );

    try {
      const result = (await client.callTool({
        name: "lighthouse_team_report_get",
        arguments: { id: LIGHTSPEED.id, reportId: ENGAGEMENT_START.id },
      })) as {
        readonly isError?: boolean;
        readonly content: readonly { readonly text?: string }[];
      };
      const facts = result.content[0]?.text ?? "";

      expect(result.isError ?? false).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(
        decodeFacts(facts, facts.slice(0, facts.indexOf(": ") + 2)),
      ).toEqual(JSON.parse(LIGHTSPEEDS_ENGAGEMENT_START));
      expect(result.content[1]?.text).toContain(ENGAGEMENT_START.name);
    } finally {
      await client.close();
    }
  });
});
