import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aBatchOf,
  type FakeLighthouse,
} from "../../../test-support/fakeLighthouse";
import {
  A_LATER_TYPE,
  APOLLO,
  APOLLOS_QUARTER_REVIEW,
  APOLLOS_REPORTS,
  aLighthouseWithReports,
  ENGAGEMENT_START,
  LAST_SERVER_WITHOUT_REPORTS,
  LIGHTSPEED,
  LIGHTSPEEDS_ENGAGEMENT_START,
  LIGHTSPEEDS_REPORTS,
  QUARTER_REVIEW,
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

// An assistant lists and reads a Team's or a Portfolio's reports through the local MCP server, from a Lighthouse
// on a real socket answering with the server's own words. The first block is Lighthouse's answer unchanged; the
// second, `summary: …`, names the report, its owner and its two windows, or for a list how many reports there
// are. The four tools only read, and a read Lighthouse refuses comes back as an error saying why.

const THE_FOUR_TOOLS = [
  "lighthouse_team_report_list",
  "lighthouse_team_report_get",
  "lighthouse_portfolio_report_list",
  "lighthouse_portfolio_report_get",
];

const A_YES_KEPT_AN_HOUR_AGO = "priyas-yes-to-usage-data";

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0)) {
    await close();
  }
});

const anAssistantReading = async (
  options: {
    readonly replies?: ReportReplies;
    readonly version?: string;
    readonly saidYes?: boolean;
  } = {},
) => {
  const lighthouse = await aLighthouseWithReports({
    replies: options.replies,
    version: options.version,
  });
  const laptop = await connectedTo(aMachine(), lighthouse.url);
  if (options.saidYes === true) {
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
    ...(options.saidYes === true ? {} : { DO_NOT_TRACK: "1" }),
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

const calling = async (
  client: Client,
  name: string,
  args: Record<string, unknown>,
) => {
  const result = await client.callTool({ name, arguments: args });
  const blocks = (result.content ?? []) as readonly Block[];
  const said = blocks.map((block) => block.text ?? "").join("\n");
  return {
    isError: result.isError === true,
    said,
    // The facts block opens with its own label, which is the tool's to choose.
    facts: () => {
      const text = blocks[0]?.text ?? "";
      return decodeFacts(text, text.slice(0, text.indexOf(": ") + 2));
    },
    summary: (blocks[1]?.text ?? "").replace(/^summary: /u, ""),
  };
};

const reported = (lighthouse: FakeLighthouse) =>
  lighthouse.handedIn().map(({ batch }) => batch);

/** Longer than any send may take, so "nothing was sent" is not merely "not sent yet". */
const pastTheSendBudget = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 1100);
  });

describe("an assistant reads reports over the local MCP server", () => {
  // @driving_port @us-04 @slice-04 @contract-shape:pure-function
  it("offers the four report tools, each marked as only reading", async () => {
    const { client } = await anAssistantReading();

    const { tools } = await client.listTools();
    const reportTools = tools.filter((tool) =>
      THE_FOUR_TOOLS.includes(tool.name),
    );

    expect(reportTools.map((tool) => tool.name).sort()).toEqual(
      [...THE_FOUR_TOOLS].sort(),
    );
    for (const tool of reportTools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  // @walking_skeleton @driving_port @real-io @us-04 @slice-04 @contract-shape:unbounded-preservation
  it("hands the assistant a Team's report exactly as Lighthouse sent it, and a summary naming it, its owner and its windows", async () => {
    const { client } = await anAssistantReading();

    const read = await calling(client, "lighthouse_team_report_get", {
      id: LIGHTSPEED.id,
      reportId: ENGAGEMENT_START.id,
    });

    expect(read.isError).toBe(false);
    expect(read.facts()).toEqual(JSON.parse(LIGHTSPEEDS_ENGAGEMENT_START));
    expect(read.summary).toContain(ENGAGEMENT_START.name);
    expect(read.summary).toContain(LIGHTSPEED.name);
    expect(read.summary).toMatch(/(?<![\d-])(?:2026-05-03|3 May)(?!\d)/u);
    expect(read.summary).toMatch(/(?<![\d-])(?:2026-10-02|2 Oct)(?!\d)/u);
  });

  // @driving_port @real-io @us-04 @slice-04 @edge @contract-shape:unbounded-preservation
  // A value Lighthouse has no number for stays absent with its reason; nothing turns it into a 0.
  it("hands over a Portfolio's report with its missing values and their reason", async () => {
    const { client } = await anAssistantReading();

    const read = await calling(client, "lighthouse_portfolio_report_get", {
      id: APOLLO.id,
      reportId: QUARTER_REVIEW.id,
    });

    expect(read.isError).toBe(false);
    expect(read.facts()).toEqual(JSON.parse(APOLLOS_QUARTER_REVIEW));
    expect(read.summary).toContain(APOLLO.name);
  });

  // @driving_port @real-io @us-04 @slice-04 @contract-shape:unbounded-preservation
  it.each([
    ["lighthouse_team_report_list", LIGHTSPEED.id, LIGHTSPEEDS_REPORTS, 2],
    ["lighthouse_portfolio_report_list", APOLLO.id, APOLLOS_REPORTS, 1],
  ])(
    "%s hands over the owner's reports as Lighthouse sent them, and says how many",
    async (tool, id, answer, count) => {
      const { client } = await anAssistantReading();

      const listed = await calling(client, tool, { id });

      expect(listed.isError).toBe(false);
      expect(listed.facts()).toEqual(JSON.parse(answer));
      expect(listed.summary).toMatch(
        new RegExp(`\\b${count} reports?\\b`, "u"),
      );
    },
  );
});

describe("an assistant is told why a report cannot be read", () => {
  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  it.each<[string, ReportReplies, number, RegExp]>([
    [
      "the reader has no access to that Team",
      {
        [`GET /teams/${LIGHTSPEED.id}/reports/${ENGAGEMENT_START.id}`]: {
          status: 403,
        },
      },
      ENGAGEMENT_START.id,
      /no access.*Team|Team.*no access/isu,
    ],
    [
      "a newer version of Lighthouse made the report",
      {},
      A_LATER_TYPE.id,
      /newer version.*can't be shown here/isu,
    ],
    [
      "there is no such report",
      { [`GET /teams/${LIGHTSPEED.id}/reports/77`]: { status: 404 } },
      77,
      /no such report/iu,
    ],
  ])("says so when %s", async (_why, replies, reportId, says) => {
    const { client } = await anAssistantReading({ replies });

    const read = await calling(client, "lighthouse_team_report_get", {
      id: LIGHTSPEED.id,
      reportId,
    });

    expect(read.isError).toBe(true);
    expect(read.said).toMatch(says);
  });

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  it("says there is no such Portfolio when a list's owner does not exist", async () => {
    const { client } = await anAssistantReading({
      replies: { "GET /portfolios/77/reports": { status: 404 } },
    });

    const read = await calling(client, "lighthouse_portfolio_report_list", {
      id: 77,
    });

    expect(read.isError).toBe(true);
    expect(read.said).toContain("There is no such Portfolio.");
    expect(read.said).not.toMatch(/no such report/iu);
  });

  // @driving_port @real-io @us-04 @slice-04 @error @contract-shape:unbounded-preservation
  it("tells the assistant to upgrade a Lighthouse without reports, and does not ask it", async () => {
    const { client, lighthouse } = await anAssistantReading({
      version: LAST_SERVER_WITHOUT_REPORTS,
    });

    const read = await calling(client, "lighthouse_team_report_list", {
      id: LIGHTSPEED.id,
    });

    expect(read.isError).toBe(true);
    expect(read.said).toContain("Upgrade Lighthouse");
    expect(theReportReadsAmong(lighthouse.operations())).toEqual([]);
  });
});

describe("reading a report through the MCP server counts as the report being opened", () => {
  // @driving_port @real-io @us-04 @slice-04 @kpi-OUT-6298-K4-reports-read-by-clients @contract-shape:bounded-change
  it(`reports ReportOpened with the report's type and source Mcp, once per read`, async () => {
    const { client, lighthouse } = await anAssistantReading({ saidYes: true });

    await calling(client, "lighthouse_team_report_get", {
      id: LIGHTSPEED.id,
      reportId: ENGAGEMENT_START.id,
    });

    const oneOpening = [
      aBatchOf("Mcp", { name: "ReportOpened", reportTemplate: "ThenAndNow" }),
    ];
    await vi.waitFor(() => expect(reported(lighthouse)).toEqual(oneOpening), {
      timeout: 3000,
    });
    await pastTheSendBudget();

    expect(reported(lighthouse)).toEqual(oneOpening);
  });

  // @driving_port @real-io @us-04 @slice-04 @error @kpi-OUT-6298-K4-reports-read-by-clients @contract-shape:unbounded-preservation
  it("reports nothing for a list, or a report of a type it cannot name", async () => {
    const { client, lighthouse } = await anAssistantReading({ saidYes: true });

    await calling(client, "lighthouse_team_report_list", { id: LIGHTSPEED.id });
    await calling(client, "lighthouse_team_report_get", {
      id: LIGHTSPEED.id,
      reportId: A_LATER_TYPE.id,
    });
    await pastTheSendBudget();

    expect(lighthouse.handedIn()).toEqual([]);
  });
});
