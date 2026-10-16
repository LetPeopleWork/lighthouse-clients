import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { gravityBeforeTheDaily } from "../../../test-support/dailyFlowAnswers";
import {
  aFakeLighthouse,
  WIP_READ_WITH_STALENESS,
  WIP_READ_WITHOUT_STALENESS,
} from "../../../test-support/fakeLighthouse";
import { aMachine } from "../../cli/test-support/lhSession";
import { decodeFacts } from "../../mcp-core/test-support/mcpHarness";
import { createLocalLighthouseMcpServer } from "./localServer";

// An assistant reads which Work Items Lighthouse marks stale, and why, through the local MCP server, from a
// Lighthouse on a real socket that answers the Team's WIP read with the backend's own contract fixture.

const TOOL = "lighthouse_team_metrics_wip";
const TEAM = 7;

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0)) {
    await close();
  }
});

const anAssistantReading = async (wipRead: string) => {
  const lighthouse = await aFakeLighthouse({
    replies: {
      [`GET /teams/${TEAM}`]: { status: 200, body: gravityBeforeTheDaily() },
      [`GET /teams/${TEAM}/metrics/wip`]: { status: 200, text: wipRead },
    },
  });
  const machine = aMachine();
  const server = await createLocalLighthouseMcpServer({
    HOME: machine.home,
    LIGHTHOUSE_CLI_CONFIG_PATH: machine.configPath,
    LIGHTHOUSE_URL: lighthouse.url,
    DO_NOT_TRACK: "1",
  });
  if (server === null) {
    throw new Error("the local server resolved no Lighthouse");
  }
  const client = new Client({ name: "claude-desktop", version: "0.0.0" });
  const [clientEnd, serverEnd] = InMemoryTransport.createLinkedPair();
  await server.connect(serverEnd);
  await client.connect(clientEnd);
  closers.push(async () => {
    await client.close();
    await server.close();
  });
  return client;
};

type Block = { readonly type: string; readonly text?: string };

const readWip = async (wipRead: string) => {
  const client = await anAssistantReading(wipRead);
  const result = await client.callTool({ name: TOOL, arguments: { id: TEAM } });
  const blocks = (result.content ?? []) as readonly Block[];
  return {
    isError: result.isError === true,
    items: decodeFacts(blocks[0]?.text ?? "", "team wip: ") as readonly Record<
      string,
      unknown
    >[],
    summary: (blocks[1]?.text ?? "").replace(/^summary: /u, ""),
  };
};

const stalenessOf = (items: readonly Record<string, unknown>[]) =>
  items.map(({ referenceId, isStale, staleReasons }) => ({
    referenceId,
    isStale,
    staleReasons,
  }));

describe("an assistant reads which Work Items are stale over the local MCP server", () => {
  // @walking_skeleton @driving_port @us-03 @AC-1 @contract-shape:bounded-change
  it("sees which Work Items Lighthouse marks stale and why, and a summary counting them", async () => {
    const wip = await readWip(WIP_READ_WITH_STALENESS);

    expect(wip.isError).toBe(false);
    expect(stalenessOf(wip.items)).toEqual(
      stalenessOf(JSON.parse(WIP_READ_WITH_STALENESS)),
    );
    expect(wip.summary.split("\n")).toContain("Stale Work Items: 2");
  });

  // @driving_port @us-03 @AC-3 @error @contract-shape:bounded-change
  it("is told an older Lighthouse does not say which Work Items are stale", async () => {
    const wip = await readWip(WIP_READ_WITHOUT_STALENESS);

    expect(wip.isError).toBe(false);
    expect(wip.summary.split("\n")).toContain(
      "Lighthouse does not say which Work Items are Stale.",
    );
    expect(wip.items).toHaveLength(3);
    expect(wip.items.filter((item) => "isStale" in item)).toEqual([]);
  });

  // @us-03 @AC-1 @contract-shape:pure-function
  // No tool reads a Portfolio's Work Items in progress; the Portfolio's Blocked tool names the lh command
  // that does, so it names the fields that command carries.
  it.skip.each([
    "lighthouse_team_metrics_wip",
    "lighthouse_portfolio_metrics_blockedCountHistory",
  ])(
    "%s names isStale and staleReasons, and that an older Lighthouse leaves them out",
    async (name) => {
      const client = await anAssistantReading(WIP_READ_WITH_STALENESS);
      const { tools } = await client.listTools();
      const description =
        tools.find((tool) => tool.name === name)?.description ?? "";

      expect(description).toContain("isStale");
      expect(description).toContain("staleReasons");
      expect(description).toMatch(/absent on an older Lighthouse/u);
    },
  );
});
