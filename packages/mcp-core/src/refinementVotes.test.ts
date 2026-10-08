import { createLighthouseClient } from "@letpeoplework/lighthouse-client";
import { decode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { createMcpCoreRuntime, registerMcpTools } from "./index";

type Runtime = ReturnType<typeof createMcpCoreRuntime>;

const VOTE = "lighthouse_team_refinement_vote";
const COMMENT = "lighthouse_team_refinement_comment";
const TAKE_BACK = "lighthouse_team_refinement_voteTakeBack";
const READ = "lighthouse_team_refinement_get";

// Team Gravity (id 3) refines GR-051 "PDF export" and GR-054 "API version". Ana Lima asks her assistant to
// vote for her; with sign-in off the assistant must ask her name, and the local server keeps a key for her.
const GRAVITY_ID = 3;
const ANA_LIMA = "Ana Lima";
const ANAS_ASSISTANT_KEY = "k3y-assistant-0123456789abcdef01234567";
const ONLY_IF_THE_PDF_EXPORT_MOVES_OUT =
  "only if the PDF export moves to its own Work Item";
const VOTER_KEY_HEADER = "x-lighthouse-voter-key";
const VERSION_PATH = "/v1/version/current";

const THE_USERS_OWN_JUDGEMENT =
  "Records the USER's own sizing judgement under their name. Never call this on your own initiative or on someone else's behalf: show the user the Work Item, the answer and any comment you intend to send, and call only after they explicitly confirm.";

const pdfExport = (facts: Record<string, unknown> = {}) => ({
  referenceId: "GR-051",
  name: "PDF export",
  url: null,
  state: "Refinement",
  parentReferenceId: "GR-010",
  voteCount: 0,
  myVote: null,
  split: { yes: 0, yesBut: 0, no: 0 },
  readiness: "MoreYesNeeded",
  missingVotes: 3,
  stage: null,
  signalsDisagree: false,
  hasComments: false,
  hasOpenQuestion: false,
  ...facts,
});

const pdfExportAfterAnasYesIf = {
  ...pdfExport({
    voteCount: 2,
    myVote: "YesBut",
    split: { yes: 1, yesBut: 1, no: 0 },
    missingVotes: 2,
    hasComments: true,
  }),
  madeReady: false,
};

type MockResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly text: () => Promise<string>;
  readonly json: () => Promise<unknown>;
};

const answering = (payload: unknown, status = 200): MockResponse => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () =>
    typeof payload === "string" ? payload : JSON.stringify(payload),
  json: async () => payload,
});

const refusing = (status: number, title: string, code: string) =>
  answering({ status, title, code }, status);

type Asked = {
  readonly method: string;
  readonly url: string;
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
};

const headersOf = (init: RequestInit | undefined): Record<string, string> => {
  const headers = new Headers(init?.headers);
  return Object.fromEntries(
    [...headers.entries()].map(([name, value]) => [name.toLowerCase(), value]),
  );
};

const bodyOf = (init: RequestInit | undefined): unknown =>
  typeof init?.body === "string" ? JSON.parse(init.body) : undefined;

const workItemPath = (referenceId: string) =>
  `/v1/teams/${GRAVITY_ID}/refinement/work-items/${referenceId}`;

// A local assistant's server (one user, one Lighthouse) with the key it keeps for that user, talking to
// Lighthouse through the production client.
const anAssistantOn = (
  options: {
    readonly answers?: Readonly<Record<string, MockResponse>>;
    readonly storedKey?: string | null;
    /** Whom Lighthouse takes a vote from: the signed-in account, or a name and a key. */
    readonly voterIdentity?: "Account" | "SelfDeclared";
    readonly keyFileRefusal?: string;
  } = {},
) => {
  const asked: Asked[] = [];
  const answers: Record<string, MockResponse> = {
    [`GET /v1/teams/${GRAVITY_ID}`]: answering({
      id: GRAVITY_ID,
      name: "Team Gravity",
    }),
    "GET /v1/terminology/all": answering([]),
    [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering({
      refinementConfigured: true,
      workItems: [pdfExport()],
      yardstick: { source: "Sle", days: 7, probability: 85 },
      voterIdentity: options.voterIdentity ?? "SelfDeclared",
      readyByVotesCount: 0,
      stagesConfigured: false,
      readyCount: 0,
      readySource: "Votes",
      nextRefinementDate: null,
      isRefinementDay: false,
      daysUntilNextRefinement: null,
      need: {
        verdict: null,
        unavailableReason: "NoCadence",
        low: null,
        high: null,
        lowPercentile: null,
        highPercentile: null,
        horizonWorkingDays: null,
        cycleStart: null,
        cycleEnd: null,
      },
    }),
    ...options.answers,
  };
  const fetch = async (
    url: string,
    init?: RequestInit,
  ): Promise<MockResponse> => {
    const method = init?.method ?? "GET";
    const path = new URL(url).pathname.replace(/^\/api/u, "");
    if (path === VERSION_PATH) {
      return answering("v26.10.7.1");
    }
    asked.push({
      method,
      url,
      path,
      headers: headersOf(init),
      body: bodyOf(init),
    });
    return answers[`${method} ${path}`] ?? answering("not found", 404);
  };

  let storedKey = options.storedKey ?? null;
  const runtime: Runtime = createMcpCoreRuntime({
    createClient: () =>
      createLighthouseClient(
        {
          connection: {
            kind: "explicit",
            lighthouseUrl: "http://localhost:5000",
          },
        },
        { fetch },
      ),
    voterKeyStore: {
      load: async () => storedKey,
      save: async (key: string) => {
        if (options.keyFileRefusal !== undefined) {
          throw new Error(options.keyFileRefusal);
        }
        storedKey = key;
      },
    },
  } as Parameters<typeof createMcpCoreRuntime>[0]);
  const writes = () => asked.filter((request) => request.method !== "GET");
  return { runtime, asked, writes, storedKey: () => storedKey };
};

const textOf = (result: Awaited<ReturnType<Runtime["callTool"]>>): string =>
  result.content.map((content) => content.text).join("\n");

// What an assistant reads back out of the tool's answer: a label, then the facts.
const factsOf = (
  result: Awaited<ReturnType<Runtime["callTool"]>>,
  label: string,
) => {
  const text = textOf(result);
  expect(text.startsWith(`${label}: `)).toBe(true);
  return decode(text.slice(label.length + 2)) as Record<string, unknown>;
};

describe("the refinement vote, comment and take-back tools", () => {
  it("are offered with descriptions that make the assistant ask the user first, and ask their name", () => {
    const { runtime } = anAssistantOn();

    const tools = new Map(runtime.listTools().map((tool) => [tool.name, tool]));

    const vote = tools.get(VOTE as never);
    const comment = tools.get(COMMENT as never);
    const takeBack = tools.get(TAKE_BACK as never);
    expect([vote, comment, takeBack].map((tool) => tool?.name)).toEqual([
      VOTE,
      COMMENT,
      TAKE_BACK,
    ]);
    expect(vote?.description).toContain(THE_USERS_OWN_JUDGEMENT);
    expect(comment?.description).toContain(
      "Never call this on your own initiative or on someone else's behalf",
    );
    expect(comment?.description).toContain(
      "call only after they explicitly confirm",
    );
    for (const tool of [vote, comment]) {
      const voterName = JSON.stringify(
        (tool?.inputSchema as { properties?: Record<string, unknown> })
          ?.properties?.voterName ?? {},
      ).toLowerCase();
      expect(voterName).toContain("ask the user for their name");
      expect(voterName).toContain("never infer it");
    }
    expect(vote?.inputSchema).toMatchObject({
      required: ["id", "workItem", "answer"],
    });
    expect(comment?.inputSchema).toMatchObject({
      required: ["id", "workItem", "comment"],
    });
    expect(takeBack?.inputSchema).toMatchObject({
      required: ["id", "workItem"],
    });
  });

  it("are registered as writes, never as safe to call freely", () => {
    const registered = new Map<
      string,
      {
        readonly annotations: Record<string, unknown>;
        readonly inputSchema: {
          readonly safeParse: (value: unknown) => { readonly success: boolean };
        };
      }
    >();
    const server = {
      registerTool: (name: string, configuration: never) => {
        registered.set(name, configuration);
      },
    };

    registerMcpTools(server as never, { createClient: () => ({}) as never });

    for (const tool of [VOTE, COMMENT, TAKE_BACK]) {
      expect(registered.get(tool)?.annotations).toMatchObject({
        readOnlyHint: false,
        idempotentHint: false,
      });
    }
    const voteInput = registered.get(VOTE)?.inputSchema;
    expect(
      voteInput?.safeParse({
        id: GRAVITY_ID,
        workItem: "GR-051",
        answer: "Yes",
      }).success,
    ).toBe(true);
    expect(
      voteInput?.safeParse({
        id: GRAVITY_ID,
        workItem: "GR-051",
        answer: "maybe",
      }).success,
    ).toBe(false);
    expect(registered.get(READ)?.annotations).toMatchObject({
      readOnlyHint: true,
    });
  });

  // @driving_port
  it("records Ana's Yes, if… through her assistant, marked as cast through an assistant, and states where GR-051 stands", async () => {
    const assistant = anAssistantOn({
      answers: {
        [`POST ${workItemPath("GR-051")}/votes`]: answering(
          pdfExportAfterAnasYesIf,
        ),
      },
    });

    const result = await assistant.runtime.callTool(VOTE, {
      id: GRAVITY_ID,
      workItem: "GR-051",
      answer: "YesBut",
      comment: ONLY_IF_THE_PDF_EXPORT_MOVES_OUT,
      voterName: ANA_LIMA,
    });

    expect(result.isError).toBe(false);
    expect(factsOf(result, "vote")).toEqual({
      summary:
        "Recorded: Ana Lima — Yes, if… on GR-051. GR-051: 2 more Yes needed.",
      ...pdfExportAfterAnasYesIf,
    });
    const [vote] = assistant.writes();
    expect(vote.body).toEqual({
      answer: "YesBut",
      comment: ONLY_IF_THE_PDF_EXPORT_MOVES_OUT,
      channel: "Assistant",
      voterName: ANA_LIMA,
    });
    const minted = assistant.storedKey();
    expect(minted?.length ?? 0).toBeGreaterThanOrEqual(32);
    expect(vote.headers[VOTER_KEY_HEADER]).toBe(minted);
  });

  it.each([
    {
      tool: COMMENT,
      label: "comment",
      argumentsPayload: {
        id: GRAVITY_ID,
        workItem: "GR-054",
        comment: "Which API version?",
        voterName: ANA_LIMA,
      },
      route: `POST ${workItemPath("GR-054")}/comments`,
      summary: "Recorded: Ana Lima's comment on GR-054.",
    },
    {
      tool: TAKE_BACK,
      label: "takeBack",
      argumentsPayload: { id: GRAVITY_ID, workItem: "GR-051" },
      route: `DELETE ${workItemPath("GR-051")}/votes/mine`,
      summary: "Took back your vote on GR-051. GR-051: 3 more Yes needed.",
    },
  ])(
    "$label goes out marked as from an assistant, with the key this assistant keeps",
    async ({ tool, label, argumentsPayload, route, summary }) => {
      const assistant = anAssistantOn({
        storedKey: ANAS_ASSISTANT_KEY,
        answers: {
          [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering({
            workItems: [pdfExport({ myVote: "Yes" })],
          }),
          [route]: answering(pdfExport()),
        },
      });

      const result = await assistant.runtime.callTool(tool, argumentsPayload);

      expect(result.isError).toBe(false);
      expect(factsOf(result, label).summary).toBe(summary);
      const [write] = assistant.writes();
      expect(`${write.method} ${write.path}`).toBe(route);
      expect(write.headers[VOTER_KEY_HEADER]).toBe(ANAS_ASSISTANT_KEY);
      const channel =
        write.method === "DELETE"
          ? new URL(write.url).searchParams.get("channel")
          : (write.body as { channel?: string }).channel;
      expect(channel).toBe("Assistant");
    },
  );

  it("reads the refinement with the key this assistant keeps, so the user's own vote is marked", async () => {
    const assistant = anAssistantOn({ storedKey: ANAS_ASSISTANT_KEY });

    const result = await assistant.runtime.callTool(READ, { id: GRAVITY_ID });

    expect(result.isError).toBe(false);
    const read = assistant.asked.find(
      (request) => request.path === `/v1/teams/${GRAVITY_ID}/refinement`,
    );
    expect(read?.headers[VOTER_KEY_HEADER]).toBe(ANAS_ASSISTANT_KEY);
  });

  // @error
  it.each([
    {
      case: "a Yes, if… without its condition",
      argumentsPayload: {
        id: GRAVITY_ID,
        workItem: "GR-051",
        answer: "YesBut",
        voterName: ANA_LIMA,
      },
      says: 'A "Yes, if…" needs its condition: add a comment saying what has to be true.',
    },
    {
      case: "an answer that is not Yes, YesBut or No",
      argumentsPayload: {
        id: GRAVITY_ID,
        workItem: "GR-051",
        answer: "Maybe",
        voterName: ANA_LIMA,
      },
      says: "invalid answer",
    },
    {
      case: "no Work Item",
      argumentsPayload: { id: GRAVITY_ID, answer: "Yes", voterName: ANA_LIMA },
      says: "invalid workItem",
    },
  ])(
    "refuses $case without asking Lighthouse",
    async ({ argumentsPayload, says }) => {
      const assistant = anAssistantOn();

      const result = await assistant.runtime.callTool(VOTE, argumentsPayload);

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain(says);
      expect(assistant.asked).toEqual([]);
    },
  );

  // @error
  it.each([
    {
      refusal: refusing(
        400,
        "A vote or comment needs the name of whoever sends it.",
        "voter-name-required",
      ),
      says: "Ask the user for their name and send it as voterName; never guess it.",
    },
    {
      refusal: refusing(
        403,
        "A vote, comment or take-back needs a person to send it.",
        "vote-needs-a-person",
      ),
      says: "This key belongs to no person, so it cannot vote. Use a personal API key.",
    },
    {
      refusal: refusing(
        409,
        "That Work Item is not in refinement.",
        "work-item-not-in-refinement",
      ),
      says: "This work item is no longer in refinement.",
    },
  ])(
    "puts Lighthouse's refusal into words: '$says'",
    async ({ refusal, says }) => {
      const assistant = anAssistantOn({
        answers: { [`POST ${workItemPath("GR-051")}/votes`]: refusal },
      });

      const result = await assistant.runtime.callTool(VOTE, {
        id: GRAVITY_ID,
        workItem: "GR-051",
        answer: "Yes",
        voterName: ANA_LIMA,
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain(says);
    },
  );

  // @error
  it("says there is nothing to take back when this assistant has never voted, and takes nothing back", async () => {
    const assistant = anAssistantOn({ storedKey: null });

    const result = await assistant.runtime.callTool(TAKE_BACK, {
      id: GRAVITY_ID,
      workItem: "GR-051",
    });

    expect(result.isError).toBe(false);
    expect(textOf(result)).toContain(
      "No vote of yours on GR-051 to take back from this client.",
    );
    expect(assistant.writes()).toEqual([]);
    expect(assistant.storedKey()).toBeNull();
  });
});

// Whether a vote is the signed-in account's is Lighthouse's to say, on the refinement it answers. A local
// server keeps a voter key only for a Lighthouse that needs one, and only once it has the user's name.
describe("the refinement write tools go by whom Lighthouse takes a vote from", () => {
  const theRowAfterAYes = {
    [`POST ${workItemPath("GR-051")}/votes`]: answering(
      pdfExportAfterAnasYesIf,
    ),
    [`POST ${workItemPath("GR-054")}/comments`]: answering(pdfExport()),
  };

  // @driving_port
  it("with sign-in, votes as the signed-in account, sending no name and no key and minting none", async () => {
    const assistant = anAssistantOn({
      voterIdentity: "Account",
      storedKey: null,
      answers: theRowAfterAYes,
    });

    const result = await assistant.runtime.callTool(VOTE, {
      id: GRAVITY_ID,
      workItem: "GR-051",
      answer: "Yes",
    });

    expect(result.isError).toBe(false);
    expect(factsOf(result, "vote").summary).toBe(
      "Recorded: your Yes on GR-051. GR-051: 2 more Yes needed.",
    );
    const [vote] = assistant.writes();
    expect(vote.body).toEqual({ answer: "Yes", channel: "Assistant" });
    expect(vote.headers[VOTER_KEY_HEADER]).toBeUndefined();
    expect(assistant.storedKey()).toBeNull();
  });

  it("with sign-in, takes back the signed-in account's vote though this server never kept a key", async () => {
    const assistant = anAssistantOn({
      voterIdentity: "Account",
      storedKey: null,
      answers: {
        [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering({
          voterIdentity: "Account",
          workItems: [pdfExport({ myVote: "Yes" })],
        }),
        [`DELETE ${workItemPath("GR-051")}/votes/mine`]: answering(pdfExport()),
      },
    });

    const result = await assistant.runtime.callTool(TAKE_BACK, {
      id: GRAVITY_ID,
      workItem: "GR-051",
    });

    expect(result.isError).toBe(false);
    expect(factsOf(result, "takeBack").summary).toBe(
      "Took back your vote on GR-051. GR-051: 3 more Yes needed.",
    );
    const [takeBack] = assistant.writes();
    expect(takeBack.method).toBe("DELETE");
    expect(takeBack.headers[VOTER_KEY_HEADER]).toBeUndefined();
    expect(assistant.storedKey()).toBeNull();
  });

  // @error
  it.each([
    {
      tool: VOTE,
      label: "vote",
      argumentsPayload: { id: GRAVITY_ID, workItem: "GR-051", answer: "Yes" },
    },
    {
      tool: COMMENT,
      label: "comment",
      argumentsPayload: {
        id: GRAVITY_ID,
        workItem: "GR-054",
        comment: "Which API version?",
      },
    },
  ])(
    "without sign-in, asks for the user's name before $label sends anything or mints a key",
    async ({ tool, label, argumentsPayload }) => {
      const assistant = anAssistantOn({
        voterIdentity: "SelfDeclared",
        storedKey: null,
        answers: theRowAfterAYes,
      });

      const result = await assistant.runtime.callTool(tool, argumentsPayload);

      expect(result.isError).toBe(true);
      expect(textOf(result)).toBe(
        `${label}: Ask the user for their name and send it as voterName; never guess it.`,
      );
      expect(assistant.writes()).toEqual([]);
      expect(assistant.storedKey()).toBeNull();
    },
  );

  // @error
  it("says why it cannot keep a voter key, and sends nothing, when the key file cannot be written", async () => {
    const theFileRefused =
      "The voter key file /home/ana/.config/lighthouse-clients/voter-keys.json cannot be read; fix or remove it.";
    const assistant = anAssistantOn({
      storedKey: null,
      keyFileRefusal: theFileRefused,
      answers: theRowAfterAYes,
    });

    const result = await assistant.runtime.callTool(VOTE, {
      id: GRAVITY_ID,
      workItem: "GR-051",
      answer: "Yes",
      voterName: ANA_LIMA,
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(`vote: ${theFileRefused}`);
    expect(assistant.writes()).toEqual([]);
  });
});

describe("the take-back tool names the vote it saw", () => {
  it.each(["Yes", "YesBut", "No"] as const)(
    "sends the %s it read as the user's, so a vote changed since from elsewhere stays",
    async (myVote) => {
      const assistant = anAssistantOn({
        storedKey: ANAS_ASSISTANT_KEY,
        answers: {
          [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering({
            voterIdentity: "SelfDeclared",
            workItems: [pdfExport({ myVote })],
          }),
          [`DELETE ${workItemPath("GR-051")}/votes/mine`]: answering(
            pdfExport(),
          ),
        },
      });

      const result = await assistant.runtime.callTool(TAKE_BACK, {
        id: GRAVITY_ID,
        workItem: "GR-051",
      });

      expect(result.isError).toBe(false);
      const [takeBack] = assistant.writes();
      expect(new URL(takeBack.url).searchParams.get("answer")).toBe(myVote);
    },
  );
});

describe("the take-back tool names the vote as it was cast", () => {
  it("names the vote by the name on the user's own latest vote in the Work Item's log", async () => {
    const assistant = anAssistantOn({
      storedKey: ANAS_ASSISTANT_KEY,
      answers: {
        [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering({
          voterIdentity: "SelfDeclared",
          workItems: [pdfExport({ myVote: "Yes" })],
        }),
        [`GET ${workItemPath("GR-051")}/log`]: answering({
          entries: [
            {
              kind: "Vote",
              answer: "Yes",
              comment: null,
              voterName: ANA_LIMA,
              channel: "Assistant",
              recordedAt: "2026-10-06T09:00:00.000Z",
              isMine: true,
              isOpenQuestion: false,
            },
            {
              kind: "Vote",
              answer: "No",
              comment: null,
              voterName: "Priya Shah",
              channel: "Web",
              recordedAt: "2026-10-06T09:05:00.000Z",
              isMine: false,
              isOpenQuestion: false,
            },
          ],
          voters: { yes: [ANA_LIMA], yesBut: [], no: ["Priya Shah"] },
        }),
        [`DELETE ${workItemPath("GR-051")}/votes/mine`]: answering(pdfExport()),
      },
    });

    const result = await assistant.runtime.callTool(TAKE_BACK, {
      id: GRAVITY_ID,
      workItem: "GR-051",
    });

    expect(result.isError).toBe(false);
    expect(factsOf(result, "takeBack").summary).toBe(
      "Took back Ana Lima's vote on GR-051. GR-051: 3 more Yes needed.",
    );
    const logRead = assistant.asked.find((request) =>
      request.path.endsWith("/log"),
    );
    expect(logRead?.headers[VOTER_KEY_HEADER]).toBe(ANAS_ASSISTANT_KEY);
  });
});
