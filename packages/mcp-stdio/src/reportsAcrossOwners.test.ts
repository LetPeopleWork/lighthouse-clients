import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aBatchOf,
  type FakeLighthouse,
} from "../../../test-support/fakeLighthouse";
import {
  APOLLO,
  aLighthouseWithReports,
  EVERY_REPORT,
  EVERY_REPORT_READ,
  LIGHTSPEED,
  type ReportReplies,
  theReportReadsAmong,
} from "../../../test-support/reportAnswers";
import {
  aMachine,
  anEarlierAnswer,
  aYesGiven,
  connectedTo,
  HOURS,
} from "../../cli/test-support/lhSession";
import { decodeFacts } from "../../mcp-core/test-support/mcpHarness";
import { createLocalLighthouseMcpServer } from "./localServer";

// An assistant lists every report the reader can read, on every Team and Portfolio, in one call to the local MCP
// server, from a Lighthouse on a real socket. The first block is Lighthouse's answer unchanged; the second,
// `summary: …`, says how many reports there are and names each one's owner. The tool only reads.

const PENDING =
  "pending: every report through the clients (epic 6350, slice 06)";
const THE_TOOL = "lighthouse_report_list";
const A_YES_KEPT_AN_HOUR_AGO = "martins-yes-to-usage-data";

// RESOLVED AT DELIVER: the release carrying this Epic is not cut yet, so this tag is a stand-in. DELIVER reads the
// real last Lighthouse tag without the cross-owner list from the releases and puts it here before enabling these.
const A_LIGHTHOUSE_BEFORE_THE_CROSS_OWNER_LIST = "v26.10.25.1";

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0)) {
    await close();
  }
});

const anAssistantListing = async (
  options: {
    readonly replies?: ReportReplies;
    readonly version?: string;
    readonly consent?: "said yes";
  } = {},
) => {
  const lighthouse = await aLighthouseWithReports({
    replies: {
      [EVERY_REPORT_READ]: { status: 200, text: EVERY_REPORT },
      ...options.replies,
    },
    version: options.version,
  });
  const laptop = await connectedTo(aMachine(), lighthouse.url);
  if (options.consent === "said yes") {
    await anEarlierAnswer(
      laptop,
      lighthouse.url,
      aYesGiven(A_YES_KEPT_AN_HOUR_AGO, 1 * HOURS),
    );
  }
  const server = await createLocalLighthouseMcpServer({
    HOME: laptop.home,
    LIGHTHOUSE_CLI_CONFIG_PATH: laptop.configPath,
    LIGHTHOUSE_URL: lighthouse.url,
    ...(options.consent === undefined ? { DO_NOT_TRACK: "1" } : {}),
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
  return { lighthouse, client };
};

type Block = { readonly type: string; readonly text?: string };

const listing = async (client: Client) => {
  const result = await client.callTool({ name: THE_TOOL, arguments: {} });
  const blocks = (result.content ?? []) as readonly Block[];
  return {
    isError: result.isError === true,
    said: blocks.map((block) => block.text ?? "").join("\n"),
    facts: () => {
      const text = blocks[0]?.text ?? "";
      return decodeFacts(text, text.slice(0, text.indexOf(": ") + 2));
    },
    summary: (blocks[1]?.text ?? "").replace(/^summary: /u, ""),
  };
};

const reported = (lighthouse: FakeLighthouse) =>
  lighthouse.handedIn().map(({ batch }) => batch);

describe("an assistant lists every report in one call", () => {
  // @driving_port @us-06 @slice-06 @contract-shape:pure-function
  it.skip(`offers the tool, marked as only reading and asking for nothing (${PENDING})`, async () => {
    const { client } = await anAssistantListing();

    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === THE_TOOL);

    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(Object.keys(tool?.inputSchema.properties ?? {})).toEqual([]);
  });

  // @walking_skeleton @driving_port @real-io @us-06 @slice-06 @kpi-OUT-6350-K5-all-reports-listed-by-clients @contract-shape:unbounded-preservation
  it.skip(`hands over every report as Lighthouse sent it, and a summary naming each owner (${PENDING})`, async () => {
    const { client, lighthouse } = await anAssistantListing();

    const listed = await listing(client);

    expect(listed.isError).toBe(false);
    expect(listed.facts()).toEqual(JSON.parse(EVERY_REPORT));
    expect(listed.summary).toMatch(/\b3 reports\b/u);
    expect(listed.summary).toContain(LIGHTSPEED.name);
    expect(listed.summary).toContain(APOLLO.name);
    expect(theReportReadsAmong(lighthouse.operations())).toEqual([
      EVERY_REPORT_READ,
    ]);
  });

  // @driving_port @real-io @us-06 @slice-06 @error @contract-shape:unbounded-preservation
  it.skip(`tells the assistant to upgrade a Lighthouse that has no list of every report (${PENDING})`, async () => {
    const { client } = await anAssistantListing({
      replies: { [EVERY_REPORT_READ]: { status: 404 } },
      version: A_LIGHTHOUSE_BEFORE_THE_CROSS_OWNER_LIST,
    });

    const listed = await listing(client);

    expect(listed.isError).toBe(true);
    expect(listed.said).toContain("Upgrade Lighthouse");
  });

  // @driving_port @real-io @us-06 @slice-06 @edge @contract-shape:pure-function
  it.skip(`says there are none when the reader can read no report (${PENDING})`, async () => {
    const { client } = await anAssistantListing({
      replies: { [EVERY_REPORT_READ]: { status: 200, text: '{"reports":[]}' } },
    });

    const listed = await listing(client);

    expect(listed.isError).toBe(false);
    expect(listed.summary).toMatch(/\b0 reports\b/u);
  });
});

describe("listing every report through the MCP server counts as every report being listed", () => {
  // @driving_port @real-io @us-06 @slice-06 @kpi-OUT-6350-K5-all-reports-listed-by-clients @contract-shape:bounded-change
  it.skip(`reports AllReportsListed by name alone, with source Mcp (${PENDING})`, async () => {
    const { client, lighthouse } = await anAssistantListing({
      consent: "said yes",
    });

    await listing(client);

    await vi.waitFor(
      () =>
        expect(reported(lighthouse)).toEqual([
          aBatchOf("Mcp", { name: "AllReportsListed" }),
        ]),
      { timeout: 3000 },
    );
  });

  // @driving_port @real-io @us-06 @slice-06 @error @contract-shape:unbounded-preservation
  it.skip(`reports nothing for a list Lighthouse refused (${PENDING})`, async () => {
    const { client, lighthouse } = await anAssistantListing({
      consent: "said yes",
      replies: { [EVERY_REPORT_READ]: { status: 403 } },
    });

    const listed = await listing(client);

    // The refusal is answered before anything could be counted; the scenario above proves a count arrives when due.
    await vi.waitFor(() =>
      expect(lighthouse.operations()).toContain(EVERY_REPORT_READ),
    );
    expect(listed.isError).toBe(true);
    expect(lighthouse.handedIn()).toEqual([]);
  });
});
