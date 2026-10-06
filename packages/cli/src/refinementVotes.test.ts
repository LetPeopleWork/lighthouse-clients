import {
  type CliConnection,
  createLighthouseClient,
} from "@letpeoplework/lighthouse-client";
import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { type RunCliCommandDependencies, runCliCommand } from "./index";

// Team Gravity (id 3) refines three Work Items on Tue 6 Oct. Ana Lima votes from her terminal; with sign-in
// off she gives her name, and her client keeps a key of its own so she can take her vote back later.
const GRAVITY_ID = 3;
const LIGHTHOUSE_URL = "http://localhost:5000";
const OTHER_LIGHTHOUSE_URL = "http://lighthouse.example:5000";
const ANA_LIMA = "Ana Lima";
const ANAS_CLIENT_KEY = "k3y-ana-0123456789abcdef0123456789abcdef";
const ONLY_IF_THE_PDF_EXPORT_MOVES_OUT =
  "only if the PDF export moves to its own Work Item";
const VOTER_KEY_HEADER = "x-lighthouse-voter-key";
const VERSION_PATH = "/v1/version/current";

const GIVE_YOUR_NAME =
  'Give your name with --as "<name>", or store it once: lh config voter set --name "<name>".';
const A_YES_IF_NEEDS_ITS_CONDITION =
  'A "Yes, if…" needs its condition: add --comment "<what has to be true>"';
const NOTHING_TO_TAKE_BACK =
  "No vote of yours on GR-051 to take back from this client.";

type Split = {
  readonly yes: number;
  readonly yesBut: number;
  readonly no: number;
};

type RowFacts = {
  readonly split?: Split;
  readonly myVote?: "Yes" | "YesBut" | "No" | null;
  readonly readiness?:
    | "Ready"
    | "MoreYesNeeded"
    | "MoreVotersNeeded"
    | "NeedsDiscussion";
  readonly missingVotes?: number | null;
  readonly signalsDisagree?: boolean;
  readonly hasOpenQuestion?: boolean;
};

const row = (
  referenceId: string,
  name: string,
  parentReferenceId: string,
  facts: RowFacts = {},
) => {
  const split = facts.split ?? { yes: 0, yesBut: 0, no: 0 };
  return {
    referenceId,
    name,
    url: null,
    state: "Refinement",
    parentReferenceId,
    voteCount: split.yes + split.yesBut + split.no,
    myVote: facts.myVote ?? null,
    split,
    readiness: facts.readiness ?? "MoreYesNeeded",
    missingVotes: facts.missingVotes === undefined ? 3 : facts.missingVotes,
    stage: null,
    signalsDisagree: facts.signalsDisagree ?? false,
    hasComments: facts.hasOpenQuestion ?? false,
    hasOpenQuestion: facts.hasOpenQuestion ?? false,
  };
};

const pdfExport = (facts: RowFacts = {}) =>
  row("GR-051", "PDF export", "GR-010", facts);
const apiVersion = (facts: RowFacts = {}) =>
  row("GR-054", "API version", "GR-010", facts);
const bulkImport = (facts: RowFacts = {}) =>
  row("GR-073", "Bulk import", "GR-012", facts);

// The list as the maintainer sketched it: one vote each way on GR-051 (one of them the caller's), a No
// and an open question on GR-054, and GR-073 Ready by votes while its state says otherwise.
const gravitysVotedBacklog = [
  pdfExport({
    split: { yes: 1, yesBut: 1, no: 0 },
    myVote: "YesBut",
    readiness: "MoreYesNeeded",
    missingVotes: 2,
  }),
  apiVersion({
    split: { yes: 3, yesBut: 0, no: 1 },
    readiness: "NeedsDiscussion",
    missingVotes: null,
    hasOpenQuestion: true,
  }),
  bulkImport({
    split: { yes: 3, yesBut: 0, no: 0 },
    readiness: "Ready",
    missingVotes: null,
    signalsDisagree: true,
  }),
];

const gravitysRefinement = (workItems: readonly unknown[]) => ({
  refinementConfigured: true,
  workItems,
  yardstick: { source: "Sle", days: 7, probability: 85 },
  voterIdentity: "SelfDeclared",
  readyByVotesCount: 3,
  stagesConfigured: false,
  readyCount: 3,
  readySource: "Votes",
  nextRefinementDate: "2026-10-08",
  isRefinementDay: false,
  daysUntilNextRefinement: 2,
  need: {
    verdict: "Below",
    unavailableReason: null,
    low: 5,
    high: 8,
    lowPercentile: 50,
    highPercentile: 85,
    horizonWorkingDays: 5,
    cycleStart: "2026-10-08",
    cycleEnd: "2026-10-15",
  },
});

const seededTerminology = [
  ["workItem", "Work Item"],
  ["workItems", "Work Items"],
  ["team", "Team"],
  ["teams", "Teams"],
  ["refinement", "Refinement"],
  ["refinements", "Refinements"],
].map(([key, defaultValue], index) => ({
  id: index + 1,
  key,
  description: "",
  defaultValue,
  value: defaultValue,
}));

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

const refusing = (status: number, title: string, code?: string) =>
  answering(
    code === undefined ? { status, title } : { status, title, code },
    status,
  );

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

type KeptKeys = Readonly<Record<string, string>>;

type Voter = {
  readonly name?: string | null;
  readonly keys?: KeptKeys;
};

// Lighthouse as the production client meets it, answering by method and path; the voter's name and
// keys live where the command line keeps them between runs.
const aLighthouse = (
  options: {
    readonly answers?: Readonly<Record<string, MockResponse>>;
    readonly signIn?: boolean;
    readonly voter?: Voter;
    readonly connectedTo?: string;
  } = {},
) => {
  const asked: Asked[] = [];
  const answers: Record<string, MockResponse> = {
    [`GET /v1/teams/${GRAVITY_ID}`]: answering({
      id: GRAVITY_ID,
      name: "Team Gravity",
    }),
    "GET /v1/terminology/all": answering(seededTerminology),
    [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering(
      gravitysRefinement(gravitysVotedBacklog),
    ),
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

  let voterName = options.voter?.name ?? null;
  const voterKeys = new Map(Object.entries(options.voter?.keys ?? {}));
  const endpointUrl = options.connectedTo ?? LIGHTHOUSE_URL;
  const connection: CliConnection = options.signIn
    ? {
        mode: "server",
        endpointUrl,
        authMode: "required",
        auth: { kind: "api-key", value: "anas-personal-api-key" },
      }
    : { mode: "server", endpointUrl, authMode: "disabled" };

  const dependencies = {
    loadConnection: async () => connection,
    saveConnection: async () => undefined,
    loadOutputFormat: async () => null,
    saveOutputFormat: async () => undefined,
    loadVoterName: async () => voterName,
    saveVoterName: async (name: string | null) => {
      voterName = name;
    },
    loadVoterKey: async (lighthouseUrl: string) =>
      voterKeys.get(lighthouseUrl) ?? null,
    saveVoterKey: async (lighthouseUrl: string, key: string) => {
      voterKeys.set(lighthouseUrl, key);
    },
    readTextFile: async (filePath: string) => {
      throw new Error(`File not mocked: ${filePath}`);
    },
    prompt: async () => "",
    openBrowser: async () => undefined,
    validateConnectivity: async () => ({
      category: "unreachable",
      reason: "not used",
    }),
    validateStandaloneDiscovery: async () => ({
      category: "unreachable",
      reason: "not used",
    }),
    createClient: (used: CliConnection) =>
      createLighthouseClient(
        {
          connection: {
            kind: "explicit",
            lighthouseUrl: used.mode === "server" ? used.endpointUrl : "",
          },
          auth: used.mode === "server" ? used.auth : undefined,
        },
        { fetch },
      ),
  } as unknown as RunCliCommandDependencies;

  const writes = () => asked.filter((request) => request.method !== "GET");
  return {
    dependencies,
    asked,
    writes,
    storedVoterName: () => voterName,
    storedVoterKey: (lighthouseUrl: string = endpointUrl) =>
      voterKeys.get(lighthouseUrl),
  };
};

const onGravity = (command: string, ...args: string[]) => [
  "refinement",
  command,
  "--team-id",
  String(GRAVITY_ID),
  ...args,
];

// The output as a reader sees it: one entry per printed line, runs of spaces read as one.
const shownLines = (stdout: string): string[] =>
  stdout
    .split("\n")
    .map((line) => line.replaceAll(/\s+/gu, " ").trim())
    .filter((line) => line.length > 0);

const theLineFor = (stdout: string, referenceId: string) =>
  shownLines(stdout).find((line) => line.includes(` ${referenceId} `));

describe("lh refinement get shows how the votes stand", () => {
  // @driving_port
  it("tells Priya which Work Items are Ready, which need discussion and where the caller has voted", async () => {
    const lighthouse = aLighthouse();

    const result = await runCliCommand(
      onGravity("get"),
      lighthouse.dependencies,
    );

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines).toContain(
      "# Work Item Parent State Votes Readiness Warnings",
    );
    expect(theLineFor(result.stdout, "GR-051")).toBe(
      "1 GR-051 PDF export GR-010 Refinement 1 Yes · 1 Yes, if…* 2 more Yes needed",
    );
    expect(theLineFor(result.stdout, "GR-054")).toBe(
      "2 GR-054 API version GR-010 Refinement 3 Yes · 1 No Needs discussion open question",
    );
    expect(theLineFor(result.stdout, "GR-073")).toBe(
      "3 GR-073 Bulk import GR-012 Refinement 3 Yes Ready stage disagrees",
    );
  });

  it.each([
    {
      split: { yes: 0, yesBut: 0, no: 0 },
      myVote: null,
      shows: "No votes",
    },
    { split: { yes: 2, yesBut: 0, no: 0 }, myVote: null, shows: "2 Yes" },
    {
      split: { yes: 0, yesBut: 1, no: 2 },
      myVote: null,
      shows: "1 Yes, if… · 2 No",
    },
    {
      split: { yes: 1, yesBut: 1, no: 1 },
      myVote: "No",
      shows: "1 Yes · 1 Yes, if… · 1 No*",
    },
  ] as const)(
    "shows the votes as '$shows'",
    async ({ split, myVote, shows }) => {
      const lighthouse = aLighthouse({
        answers: {
          [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering(
            gravitysRefinement([
              pdfExport({
                split,
                myVote,
                readiness: "MoreYesNeeded",
                missingVotes: 3,
              }),
            ]),
          ),
        },
      });

      const result = await runCliCommand(
        onGravity("get"),
        lighthouse.dependencies,
      );

      expect(result.exitCode).toBe(0);
      expect(theLineFor(result.stdout, "GR-051")).toBe(
        `1 GR-051 PDF export GR-010 Refinement ${shows} 3 more Yes needed`,
      );
    },
  );

  it.each([
    { readiness: "Ready", missingVotes: null, says: "Ready" },
    { readiness: "MoreYesNeeded", missingVotes: 1, says: "1 more Yes needed" },
    {
      readiness: "MoreVotersNeeded",
      missingVotes: 1,
      says: "1 more voter needed",
    },
    {
      readiness: "MoreVotersNeeded",
      missingVotes: 2,
      says: "2 more voters needed",
    },
    {
      readiness: "NeedsDiscussion",
      missingVotes: null,
      says: "Needs discussion",
    },
  ] as const)(
    "says '$says' for a Work Item that is $readiness",
    async ({ readiness, missingVotes, says }) => {
      const lighthouse = aLighthouse({
        answers: {
          [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering(
            gravitysRefinement([
              pdfExport({
                split: { yes: 2, yesBut: 0, no: 0 },
                readiness,
                missingVotes,
              }),
            ]),
          ),
        },
      });

      const result = await runCliCommand(
        onGravity("get"),
        lighthouse.dependencies,
      );

      expect(theLineFor(result.stdout, "GR-051")).toBe(
        `1 GR-051 PDF export GR-010 Refinement 2 Yes ${says}`,
      );
    },
  );

  it.each([
    { hasOpenQuestion: false, signalsDisagree: false, warns: "" },
    { hasOpenQuestion: true, signalsDisagree: false, warns: " open question" },
    {
      hasOpenQuestion: false,
      signalsDisagree: true,
      warns: " stage disagrees",
    },
    {
      hasOpenQuestion: true,
      signalsDisagree: true,
      warns: " open question, stage disagrees",
    },
  ])(
    "warns '$warns' when a question is open: $hasOpenQuestion, and the stage disagrees: $signalsDisagree",
    async ({ hasOpenQuestion, signalsDisagree, warns }) => {
      const lighthouse = aLighthouse({
        answers: {
          [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering(
            gravitysRefinement([
              pdfExport({
                split: { yes: 3, yesBut: 0, no: 0 },
                readiness: "Ready",
                missingVotes: null,
                hasOpenQuestion,
                signalsDisagree,
              }),
            ]),
          ),
        },
      });

      const result = await runCliCommand(
        onGravity("get"),
        lighthouse.dependencies,
      );

      expect(theLineFor(result.stdout, "GR-051")).toBe(
        `1 GR-051 PDF export GR-010 Refinement 3 Yes Ready${warns}`,
      );
    },
  );

  it.each([
    {
      keys: { [LIGHTHOUSE_URL]: ANAS_CLIENT_KEY } as KeptKeys,
      sends: ANAS_CLIENT_KEY,
    },
    {
      keys: { [OTHER_LIGHTHOUSE_URL]: ANAS_CLIENT_KEY } as KeptKeys,
      sends: undefined,
    },
    { keys: {} as KeptKeys, sends: undefined },
  ])(
    "reads with the key this client keeps for this Lighthouse ($sends), so the caller's own vote is starred, and makes none up",
    async ({ keys, sends }) => {
      const lighthouse = aLighthouse({ voter: { keys } });

      const result = await runCliCommand(
        onGravity("get"),
        lighthouse.dependencies,
      );

      expect(result.exitCode).toBe(0);
      const read = lighthouse.asked.find(
        (request) => request.path === `/v1/teams/${GRAVITY_ID}/refinement`,
      );
      expect(read?.headers[VOTER_KEY_HEADER]).toBe(sends);
      expect(lighthouse.storedVoterKey()).toBe(
        keys[LIGHTHOUSE_URL as keyof typeof keys],
      );
    },
  );
});

describe("lh refinement vote, comment and take-back", () => {
  // @walking_skeleton @driving_port
  it("records Ana's Yes, if… with its condition from her terminal, and tells her where GR-051 stands", async () => {
    const lighthouse = aLighthouse({
      answers: {
        [`POST ${workItemPath("GR-051")}/votes`]: answering({
          ...pdfExport({
            split: { yes: 1, yesBut: 1, no: 0 },
            myVote: "YesBut",
            missingVotes: 2,
          }),
          madeReady: false,
        }),
      },
    });

    const result = await runCliCommand(
      onGravity(
        "vote",
        "--work-item",
        "GR-051",
        "--answer",
        "yes-but",
        "--comment",
        ONLY_IF_THE_PDF_EXPORT_MOVES_OUT,
        "--as",
        ANA_LIMA,
      ),
      lighthouse.dependencies,
    );

    expect(result).toEqual({
      exitCode: 0,
      stdout: expect.any(String),
      stderr: "",
    });
    expect(result.stdout.trim()).toBe(
      "Recorded: Ana Lima — Yes, if… on GR-051. GR-051: 2 more Yes needed.",
    );
    const [vote] = lighthouse.writes();
    expect(vote.method).toBe("POST");
    expect(vote.path).toBe(`${workItemPath("GR-051")}/votes`);
    expect(vote.body).toEqual({
      answer: "YesBut",
      comment: ONLY_IF_THE_PDF_EXPORT_MOVES_OUT,
      channel: "Cli",
      voterName: ANA_LIMA,
    });
    const minted = lighthouse.storedVoterKey();
    expect(minted?.length ?? 0).toBeGreaterThanOrEqual(32);
    expect(vote.headers[VOTER_KEY_HEADER]).toBe(minted);
  });

  it("tells Ana when her Yes is the one that made GR-073 Ready", async () => {
    const lighthouse = aLighthouse({
      voter: { name: ANA_LIMA },
      answers: {
        [`POST ${workItemPath("GR-073")}/votes`]: answering({
          ...bulkImport({
            split: { yes: 3, yesBut: 0, no: 0 },
            myVote: "Yes",
            readiness: "Ready",
            missingVotes: null,
          }),
          madeReady: true,
        }),
      },
    });

    const result = await runCliCommand(
      onGravity("vote", "--work-item", "GR-073", "--answer", "yes"),
      lighthouse.dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      "Recorded: Ana Lima — Yes on GR-073. That made GR-073 Ready.",
    );
  });

  it.each([
    { stored: null, as: ANA_LIMA, sends: ANA_LIMA },
    { stored: ANA_LIMA, as: undefined, sends: ANA_LIMA },
    { stored: "Ana", as: ANA_LIMA, sends: ANA_LIMA },
  ])(
    "votes as '$sends' when the stored name is '$stored' and --as is '$as'",
    async ({ stored, as, sends }) => {
      const lighthouse = aLighthouse({
        voter: { name: stored },
        answers: {
          [`POST ${workItemPath("GR-051")}/votes`]: answering({
            ...pdfExport({ split: { yes: 1, yesBut: 0, no: 0 }, myVote: "No" }),
            madeReady: false,
          }),
        },
      });

      const result = await runCliCommand(
        onGravity(
          "vote",
          "--work-item",
          "GR-051",
          "--answer",
          "no",
          ...(as === undefined ? [] : ["--as", as]),
        ),
        lighthouse.dependencies,
      );

      expect(result.exitCode).toBe(0);
      expect(lighthouse.writes()[0]?.body).toMatchObject({
        answer: "No",
        channel: "Cli",
        voterName: sends,
      });
      expect(result.stdout).toContain(`Recorded: ${sends} — No on GR-051.`);
    },
  );

  it("keeps the key it minted and votes with it again, and keeps another for another Lighthouse", async () => {
    const answers = {
      [`POST ${workItemPath("GR-051")}/votes`]: answering({
        ...pdfExport({ split: { yes: 1, yesBut: 0, no: 0 }, myVote: "Yes" }),
        madeReady: false,
      }),
    };
    const first = aLighthouse({ voter: { name: ANA_LIMA }, answers });
    const aVote = onGravity("vote", "--work-item", "GR-051", "--answer", "yes");

    await runCliCommand(aVote, first.dependencies);
    await runCliCommand(aVote, first.dependencies);
    const elsewhere = aLighthouse({
      voter: { name: ANA_LIMA },
      answers,
      connectedTo: OTHER_LIGHTHOUSE_URL,
    });
    await runCliCommand(aVote, elsewhere.dependencies);

    const [firstKey, secondKey] = first
      .writes()
      .map((vote) => vote.headers[VOTER_KEY_HEADER]);
    expect(firstKey).toBe(first.storedVoterKey());
    expect(secondKey).toBe(firstKey);
    expect(elsewhere.storedVoterKey(OTHER_LIGHTHOUSE_URL)).toBeDefined();
    expect(elsewhere.storedVoterKey(OTHER_LIGHTHOUSE_URL)).not.toBe(firstKey);
  });

  it("with sign-in on, votes as the account behind the key and sends no name", async () => {
    const lighthouse = aLighthouse({
      signIn: true,
      voter: { name: ANA_LIMA },
      answers: {
        [`POST ${workItemPath("GR-051")}/votes`]: answering({
          ...pdfExport({
            split: { yes: 2, yesBut: 0, no: 0 },
            myVote: "Yes",
            missingVotes: 1,
          }),
          madeReady: false,
        }),
      },
    });

    const result = await runCliCommand(
      onGravity("vote", "--work-item", "GR-051", "--answer", "yes"),
      lighthouse.dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      "Recorded: your Yes on GR-051. GR-051: 1 more Yes needed.",
    );
    const [vote] = lighthouse.writes();
    expect(vote.body).toEqual({ answer: "Yes", channel: "Cli" });
    expect(vote.headers["x-api-key"]).toBe("anas-personal-api-key");
  });

  // @error
  it.each([
    {
      case: "a vote",
      args: onGravity("vote", "--work-item", "GR-051", "--answer", "yes"),
    },
    {
      case: "a comment",
      args: onGravity(
        "comment",
        "--work-item",
        "GR-054",
        "--text",
        "Which API version?",
      ),
    },
  ])(
    "refuses $case without a name before asking Lighthouse, and never makes one up",
    async ({ args }) => {
      const lighthouse = aLighthouse({ voter: { name: null } });

      const result = await runCliCommand(args, lighthouse.dependencies);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(GIVE_YOUR_NAME);
      expect(lighthouse.asked).toEqual([]);
      expect(lighthouse.storedVoterKey()).toBeUndefined();
    },
  );

  // @error
  it.each([{ condition: [] as string[] }, { condition: ["--comment", "  "] }])(
    "refuses a Yes, if… without its condition ($condition) before asking Lighthouse",
    async ({ condition }) => {
      const lighthouse = aLighthouse({ voter: { name: ANA_LIMA } });

      const result = await runCliCommand(
        onGravity(
          "vote",
          "--work-item",
          "GR-051",
          "--answer",
          "yes-but",
          ...condition,
        ),
        lighthouse.dependencies,
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(A_YES_IF_NEEDS_ITS_CONDITION);
      expect(lighthouse.asked).toEqual([]);
    },
  );

  // @error
  it.each([
    {
      names: "--team-id",
      args: ["refinement", "vote", "--work-item", "GR-051", "--answer", "yes"],
    },
    {
      names: "--work-item",
      args: onGravity("vote", "--answer", "yes"),
    },
    {
      names: "--answer",
      args: onGravity("vote", "--work-item", "GR-051", "--answer", "maybe"),
    },
    {
      names: "--text",
      args: onGravity("comment", "--work-item", "GR-054"),
    },
    {
      names: "--work-item",
      args: onGravity("take-back"),
    },
  ])(
    "names $names when it is missing or wrong, without asking Lighthouse",
    async ({ names, args }) => {
      const lighthouse = aLighthouse({ voter: { name: ANA_LIMA } });

      const result = await runCliCommand(args, lighthouse.dependencies);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(names);
      expect(result.stderr).not.toContain("Unknown refinement subcommand");
      expect(lighthouse.asked).toEqual([]);
    },
  );

  it("records Ana's question on GR-054 as a comment from the command line", async () => {
    const lighthouse = aLighthouse({
      voter: { name: ANA_LIMA, keys: { [LIGHTHOUSE_URL]: ANAS_CLIENT_KEY } },
      answers: {
        [`POST ${workItemPath("GR-054")}/comments`]: answering(
          apiVersion({ hasOpenQuestion: true }),
        ),
      },
    });

    const result = await runCliCommand(
      onGravity(
        "comment",
        "--work-item",
        "GR-054",
        "--text",
        "Which API version?",
      ),
      lighthouse.dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      "Recorded: Ana Lima's comment on GR-054.",
    );
    const [comment] = lighthouse.writes();
    expect(comment.path).toBe(`${workItemPath("GR-054")}/comments`);
    expect(comment.body).toEqual({
      comment: "Which API version?",
      channel: "Cli",
      voterName: ANA_LIMA,
    });
    expect(comment.headers[VOTER_KEY_HEADER]).toBe(ANAS_CLIENT_KEY);
  });

  it("takes back the vote Ana cast from this client, and tells her where GR-051 stands now", async () => {
    const lighthouse = aLighthouse({
      voter: { name: ANA_LIMA, keys: { [LIGHTHOUSE_URL]: ANAS_CLIENT_KEY } },
      answers: {
        [`DELETE ${workItemPath("GR-051")}/votes/mine`]: answering(
          pdfExport({ split: { yes: 0, yesBut: 1, no: 0 }, missingVotes: 3 }),
        ),
      },
    });

    const result = await runCliCommand(
      onGravity("take-back", "--work-item", "GR-051"),
      lighthouse.dependencies,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(
      "Took back Ana Lima's vote on GR-051. GR-051: 3 more Yes needed.",
    );
    const [takeBack] = lighthouse.writes();
    expect(takeBack.method).toBe("DELETE");
    expect(new URL(takeBack.url).searchParams.get("channel")).toBe("Cli");
    expect(takeBack.headers[VOTER_KEY_HEADER]).toBe(ANAS_CLIENT_KEY);
    expect(takeBack.body).toBeUndefined();
  });

  // @error
  it.each([
    { situation: "this client has never voted here", keys: {} as KeptKeys },
    {
      situation: "this client's vote on GR-051 is already gone",
      keys: { [LIGHTHOUSE_URL]: ANAS_CLIENT_KEY } as KeptKeys,
    },
  ])(
    "says there is nothing to take back when $situation, and takes nothing back",
    async ({ keys }) => {
      const lighthouse = aLighthouse({
        voter: { name: ANA_LIMA, keys },
        answers: {
          [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering(
            gravitysRefinement([pdfExport({ myVote: null })]),
          ),
        },
      });

      const result = await runCliCommand(
        onGravity("take-back", "--work-item", "GR-051"),
        lighthouse.dependencies,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe(NOTHING_TO_TAKE_BACK);
      expect(lighthouse.writes()).toEqual([]);
      expect(lighthouse.storedVoterKey()).toBe(
        keys[LIGHTHOUSE_URL as keyof typeof keys],
      );
    },
  );

  // @error
  it.each([
    {
      refusal: refusing(
        409,
        "That Work Item is not in refinement.",
        "work-item-not-in-refinement",
      ),
      says: "This work item is no longer in refinement.",
    },
    {
      refusal: refusing(400, "A comment needs some text.", "comment-required"),
      says: "A comment needs some text.",
    },
    {
      refusal: refusing(
        400,
        "A comment is at most 2000 characters.",
        "comment-too-long",
      ),
      says: "A comment is at most 2000 characters.",
    },
    {
      refusal: refusing(
        400,
        "A vote or comment needs the name of whoever sends it.",
        "voter-name-required",
      ),
      says: GIVE_YOUR_NAME,
    },
    {
      refusal: refusing(400, "A name is at most 100 characters."),
      says: "A name is at most 100 characters.",
    },
    {
      refusal: refusing(
        403,
        "A vote or comment needs a person to send it.",
        "vote-needs-a-person",
      ),
      says: "This key belongs to no person, so it cannot vote. Use a personal API key.",
    },
    {
      refusal: answering("", 429),
      says: "Too many votes or comments from this client. Try again in a minute.",
    },
  ])(
    "puts Lighthouse's refusal into words: '$says'",
    async ({ refusal, says }) => {
      const lighthouse = aLighthouse({
        voter: { name: ANA_LIMA },
        answers: { [`POST ${workItemPath("GR-051")}/votes`]: refusal },
      });

      const result = await runCliCommand(
        onGravity("vote", "--work-item", "GR-051", "--answer", "yes"),
        lighthouse.dependencies,
      );

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(says);
    },
  );

  it.each([
    { flag: "--json", encodes: (facts: unknown) => JSON.stringify(facts) },
    { flag: "--toon", encodes: (facts: unknown) => encode(facts) },
  ])(
    "hands over the row as the vote left it, unchanged, with $flag",
    async ({ flag, encodes }) => {
      const asTheVoteLeftIt = {
        ...pdfExport({ split: { yes: 1, yesBut: 0, no: 0 }, myVote: "Yes" }),
        madeReady: false,
      };
      const lighthouse = aLighthouse({
        voter: { name: ANA_LIMA },
        answers: {
          [`POST ${workItemPath("GR-051")}/votes`]: answering(asTheVoteLeftIt),
        },
      });

      const result = await runCliCommand(
        onGravity("vote", "--work-item", "GR-051", "--answer", "yes", flag),
        lighthouse.dependencies,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe(encodes(asTheVoteLeftIt));
    },
  );
});

describe("lh config voter", () => {
  it("stores Ana's name once, shows it, and votes under it without --as", async () => {
    const lighthouse = aLighthouse({
      answers: {
        [`POST ${workItemPath("GR-051")}/votes`]: answering({
          ...pdfExport({ split: { yes: 1, yesBut: 0, no: 0 }, myVote: "Yes" }),
          madeReady: false,
        }),
      },
    });

    const stored = await runCliCommand(
      ["config", "voter", "set", "--name", ANA_LIMA],
      lighthouse.dependencies,
    );
    const shown = await runCliCommand(
      ["config", "voter"],
      lighthouse.dependencies,
    );
    const voted = await runCliCommand(
      onGravity("vote", "--work-item", "GR-051", "--answer", "yes"),
      lighthouse.dependencies,
    );

    expect(stored.exitCode).toBe(0);
    expect(stored.stdout.trim()).toBe("Voter name set to Ana Lima.");
    expect(lighthouse.storedVoterName()).toBe(ANA_LIMA);
    expect(shown.stdout.trim()).toBe("Voter name: Ana Lima");
    expect(voted.exitCode).toBe(0);
    expect(lighthouse.writes()[0]?.body).toMatchObject({ voterName: ANA_LIMA });
  });

  it("says how to store a name when none is stored", async () => {
    const lighthouse = aLighthouse({ voter: { name: null } });

    const shown = await runCliCommand(
      ["config", "voter"],
      lighthouse.dependencies,
    );

    expect(shown.exitCode).toBe(0);
    expect(shown.stdout.trim()).toBe(
      'No voter name stored. Store one with: lh config voter set --name "<name>"',
    );
  });

  // @error
  it.each([
    { name: [] as string[], says: "Missing --name" },
    { name: ["--name", "   "], says: "Missing --name" },
    {
      name: ["--name", "A".repeat(101)],
      says: "A name is at most 100 characters.",
    },
  ])(
    "refuses to store $says and keeps what was stored",
    async ({ name, says }) => {
      const lighthouse = aLighthouse({ voter: { name: ANA_LIMA } });

      const result = await runCliCommand(
        ["config", "voter", "set", ...name],
        lighthouse.dependencies,
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(says);
      expect(lighthouse.storedVoterName()).toBe(ANA_LIMA);
    },
  );

  it("lists the new commands in the refinement and config help", async () => {
    const lighthouse = aLighthouse();

    const refinementHelp = await runCliCommand(
      ["refinement"],
      lighthouse.dependencies,
    );
    const configHelp = await runCliCommand(["config"], lighthouse.dependencies);

    for (const usage of [
      "lh refinement vote --team-id <id> --work-item <ref> --answer yes|yes-but|no",
      "lh refinement comment --team-id <id> --work-item <ref> --text <text>",
      "lh refinement take-back --team-id <id> --work-item <ref>",
    ]) {
      expect(refinementHelp.stdout).toContain(usage);
    }
    expect(configHelp.stdout).toContain("lh config voter set --name <name>");
  });
});
