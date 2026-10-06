import { createServer, type Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it } from "vitest";
import { type McpHttpServerHandle, startMcpHttpServer } from "./bin";

// The shared, hosted MCP server keeps no key for anyone, so on a Lighthouse without sign-in it cannot tell
// one voter from another. It refuses to vote there; with sign-in, the caller's own credential votes.
const NO_SHARED_VOTES =
  "Votes through the shared Lighthouse MCP server need sign-in, and this Lighthouse runs without it. Vote from the web page, the lh command line or an MCP server on your own machine.";

type Seen = {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly body: string;
};

const pdfExport = {
  referenceId: "GR-051",
  name: "PDF export",
  url: null,
  state: "Refinement",
  parentReferenceId: "GR-010",
  voteCount: 1,
  myVote: "Yes",
  split: { yes: 1, yesBut: 0, no: 0 },
  readiness: "MoreYesNeeded",
  missingVotes: 2,
  stage: null,
  signalsDisagree: false,
  hasComments: false,
  hasOpenQuestion: false,
  madeReady: false,
};

// A Lighthouse that says whether it runs with sign-in and records every request it gets.
const startLighthouse = async (signIn: boolean) => {
  const seen: Seen[] = [];
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
      body += String(chunk);
    });
    req.on("end", () => {
      seen.push({
        method: req.method ?? "GET",
        url: req.url ?? "",
        headers: req.headers,
        body,
      });
      const path = (req.url ?? "").split("?")[0];
      if (path.endsWith("/v1/version/current")) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("v26.10.7.1");
        return;
      }
      if (path.endsWith("/v1/auth/mode")) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ mode: signIn ? "Enabled" : "Disabled" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(pdfExport));
    });
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
    writes: () => seen.filter((request) => request.method !== "GET"),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
};

const callTool = async (
  mcpUrl: string,
  name: string,
  argumentsPayload: Record<string, unknown>,
  headers: Record<string, string> = {},
) => {
  const transport = new StreamableHTTPClientTransport(
    new URL(`${mcpUrl}/mcp`),
    { requestInit: { headers } },
  );
  const client = new Client({
    name: "refinement-votes-test",
    version: "0.0.0",
  });
  await client.connect(transport);
  try {
    return (await client.callTool({ name, arguments: argumentsPayload })) as {
      readonly isError?: boolean;
      readonly content: readonly { readonly text?: string }[];
    };
  } finally {
    await client.close();
  }
};

const textOf = (result: Awaited<ReturnType<typeof callTool>>) =>
  result.content.map((content) => content.text ?? "").join("\n");

describe("votes through the shared MCP server", () => {
  let lighthouse: Awaited<ReturnType<typeof startLighthouse>> | undefined;
  let mcp: McpHttpServerHandle | undefined;

  const start = async (signIn: boolean) => {
    lighthouse = await startLighthouse(signIn);
    mcp = await startMcpHttpServer({
      lighthouseUrl: lighthouse.url,
      host: "127.0.0.1",
      port: 0,
    });
    return { lighthouse, mcp };
  };

  afterEach(async () => {
    await mcp?.close();
    await lighthouse?.close();
    mcp = undefined;
    lighthouse = undefined;
  });

  // @error @real-io
  it.skip.each([
    {
      tool: "lighthouse_team_refinement_vote",
      argumentsPayload: {
        id: 3,
        workItem: "GR-051",
        answer: "Yes",
        voterName: "Ana Lima",
      },
    },
    {
      tool: "lighthouse_team_refinement_comment",
      argumentsPayload: {
        id: 3,
        workItem: "GR-051",
        comment: "Which export formats?",
        voterName: "Ana Lima",
      },
    },
    {
      tool: "lighthouse_team_refinement_voteTakeBack",
      argumentsPayload: { id: 3, workItem: "GR-051" },
    },
  ])(
    "refuses $tool on a Lighthouse without sign-in, and sends Lighthouse nothing to record",
    async ({ tool, argumentsPayload }) => {
      const { lighthouse, mcp } = await start(false);

      const result = await callTool(mcp.url, tool, argumentsPayload);

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain(NO_SHARED_VOTES);
      expect(lighthouse.writes()).toEqual([]);
    },
  );

  // @driving_port @real-io
  it.skip("with sign-in, records the vote as the caller's own credential, through an assistant, with no voter key", async () => {
    const { lighthouse, mcp } = await start(true);

    const result = await callTool(
      mcp.url,
      "lighthouse_team_refinement_vote",
      { id: 3, workItem: "GR-051", answer: "Yes" },
      { "x-api-key": "anas-personal-api-key" },
    );

    expect(result.isError).toBe(false);
    const [vote] = lighthouse.writes();
    expect(vote.method).toBe("POST");
    expect(vote.url).toBe("/api/v1/teams/3/refinement/work-items/GR-051/votes");
    expect(vote.headers["x-api-key"]).toBe("anas-personal-api-key");
    expect(vote.headers["x-lighthouse-voter-key"]).toBeUndefined();
    expect(JSON.parse(vote.body)).toMatchObject({
      answer: "Yes",
      channel: "Assistant",
    });
  });
});
