import { describe, expect, it } from "vitest";
import { createLighthouseClient } from "./index";

// Team Gravity (id 3) refines GR-051 "PDF export". Ana Lima votes on it from the command line, with
// sign-in off, so the vote carries the name she gives and the key her client keeps.
const GRAVITY_ID = 3;
const ANAS_CLIENT_KEY = "k3y-ana-0123456789abcdef0123456789abcdef";
const PDF_EXPORT = "GR-051";
const ONLY_IF_THE_PDF_EXPORT_MOVES_OUT =
  "only if the PDF export moves to its own Work Item";

const VERSION_PATH = "/v1/version/current";
const VOTER_KEY_HEADER = "x-lighthouse-voter-key";

// The last released Lighthouse whose refinement has no votes to cast; every server newer than it has them.
const LAST_SERVER_WITHOUT_VOTES = "v26.10.3.6";
const FIRST_SERVER_WITH_VOTES = "v26.10.7.1";

const pdfExportAsTheVoteLeftIt = {
  referenceId: PDF_EXPORT,
  name: "PDF export",
  url: null,
  state: "Refinement",
  parentReferenceId: "GR-010",
  voteCount: 2,
  myVote: "YesBut",
  split: { yes: 1, yesBut: 1, no: 0 },
  readiness: "MoreYesNeeded",
  missingVotes: 2,
  stage: null,
  signalsDisagree: false,
  hasComments: true,
  hasOpenQuestion: false,
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

type Asked = {
  readonly method: string;
  readonly url: string;
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

// One instance answering by method and path, so the test does not depend on the order the client asks in.
const aLighthouseAnswering = (
  serverVersion: string,
  answers: Readonly<Record<string, MockResponse>>,
) => {
  const asked: Asked[] = [];
  const fetch = async (
    url: string,
    init?: RequestInit,
  ): Promise<MockResponse> => {
    const method = init?.method ?? "GET";
    asked.push({ method, url, headers: headersOf(init), body: bodyOf(init) });
    const path = new URL(url).pathname.replace(/^\/api/u, "");
    if (path === VERSION_PATH) {
      return answering(serverVersion);
    }
    return answers[`${method} ${path}`] ?? answering("not found", 404);
  };
  const client = createLighthouseClient(
    {
      connection: { kind: "explicit", lighthouseUrl: "http://localhost:5000" },
    },
    { fetch },
  );
  const askedOtherThanTheVersion = () =>
    asked.filter((request) => !request.url.endsWith(VERSION_PATH));
  return { client, askedOtherThanTheVersion };
};

const PDF_EXPORT_PATH = `/v1/teams/${GRAVITY_ID}/refinement/work-items/${PDF_EXPORT}`;

describe("votes on Work Items in refinement through the client", () => {
  it.each([
    { voterKey: ANAS_CLIENT_KEY, sends: ANAS_CLIENT_KEY },
    { voterKey: undefined, sends: undefined },
  ])(
    "reads the refinement with the client's voter key ($voterKey) so the caller's own vote is marked",
    async ({ voterKey, sends }) => {
      const lighthouse = aLighthouseAnswering(FIRST_SERVER_WITH_VOTES, {
        [`GET /v1/teams/${GRAVITY_ID}/refinement`]: answering({
          workItems: [],
        }),
      });

      const result = await lighthouse.client.getTeamRefinement(
        GRAVITY_ID,
        voterKey === undefined ? undefined : { voterKey },
      );

      expect(result.ok).toBe(true);
      const [read] = lighthouse.askedOtherThanTheVersion();
      expect(read.headers[VOTER_KEY_HEADER]).toBe(sends);
    },
  );

  // @driving_port
  it("casts Ana's Yes, if… with its condition, from the command line, and hands back the row as the vote left it", async () => {
    const lighthouse = aLighthouseAnswering(FIRST_SERVER_WITH_VOTES, {
      [`POST ${PDF_EXPORT_PATH}/votes`]: answering(pdfExportAsTheVoteLeftIt),
    });

    const result = await lighthouse.client.castRefinementVote(
      GRAVITY_ID,
      PDF_EXPORT,
      {
        answer: "YesBut",
        comment: ONLY_IF_THE_PDF_EXPORT_MOVES_OUT,
        channel: "Cli",
        voterName: "Ana Lima",
        voterKey: ANAS_CLIENT_KEY,
      },
    );

    expect(result).toEqual({ ok: true, value: pdfExportAsTheVoteLeftIt });
    expect(lighthouse.askedOtherThanTheVersion()).toEqual([
      {
        method: "POST",
        url: `http://localhost:5000/api${PDF_EXPORT_PATH}/votes`,
        headers: expect.objectContaining({
          [VOTER_KEY_HEADER]: ANAS_CLIENT_KEY,
        }),
        body: {
          answer: "YesBut",
          comment: ONLY_IF_THE_PDF_EXPORT_MOVES_OUT,
          channel: "Cli",
          voterName: "Ana Lima",
        },
      },
    ]);
  });

  it("adds a comment without a vote, from an assistant", async () => {
    const lighthouse = aLighthouseAnswering(FIRST_SERVER_WITH_VOTES, {
      [`POST ${PDF_EXPORT_PATH}/comments`]: answering(pdfExportAsTheVoteLeftIt),
    });

    const result = await lighthouse.client.addRefinementComment(
      GRAVITY_ID,
      PDF_EXPORT,
      {
        comment: "Which export formats?",
        channel: "Assistant",
        voterName: "Ana Lima",
        voterKey: ANAS_CLIENT_KEY,
      },
    );

    expect(result).toEqual({ ok: true, value: pdfExportAsTheVoteLeftIt });
    const [comment] = lighthouse.askedOtherThanTheVersion();
    expect(comment.method).toBe("POST");
    expect(comment.headers[VOTER_KEY_HEADER]).toBe(ANAS_CLIENT_KEY);
    expect(comment.body).toEqual({
      comment: "Which export formats?",
      channel: "Assistant",
      voterName: "Ana Lima",
    });
  });

  it("takes back the vote this client cast, naming the channel it takes it back from and no name", async () => {
    const lighthouse = aLighthouseAnswering(FIRST_SERVER_WITH_VOTES, {
      [`DELETE ${PDF_EXPORT_PATH}/votes/mine`]: answering({
        ...pdfExportAsTheVoteLeftIt,
        voteCount: 1,
        myVote: null,
        split: { yes: 1, yesBut: 0, no: 0 },
        missingVotes: 3,
      }),
    });

    const result = await lighthouse.client.takeBackRefinementVote(
      GRAVITY_ID,
      PDF_EXPORT,
      { channel: "Cli", voterKey: ANAS_CLIENT_KEY },
    );

    expect(result.ok).toBe(true);
    const [takeBack] = lighthouse.askedOtherThanTheVersion();
    expect(takeBack.method).toBe("DELETE");
    expect(new URL(takeBack.url).searchParams.get("channel")).toBe("Cli");
    expect(takeBack.headers[VOTER_KEY_HEADER]).toBe(ANAS_CLIENT_KEY);
    expect(takeBack.body).toBeUndefined();
  });

  it.each([
    {
      write: "a vote",
      send: (client: ReturnType<typeof createLighthouseClient>) =>
        client.castRefinementVote(GRAVITY_ID, PDF_EXPORT, {
          answer: "Yes",
          channel: "Cli",
          voterName: "Ana Lima",
          voterKey: ANAS_CLIENT_KEY,
        }),
    },
    {
      write: "a comment",
      send: (client: ReturnType<typeof createLighthouseClient>) =>
        client.addRefinementComment(GRAVITY_ID, PDF_EXPORT, {
          comment: "Which export formats?",
          channel: "Cli",
          voterName: "Ana Lima",
          voterKey: ANAS_CLIENT_KEY,
        }),
    },
    {
      write: "a take-back",
      send: (client: ReturnType<typeof createLighthouseClient>) =>
        client.takeBackRefinementVote(GRAVITY_ID, PDF_EXPORT, {
          channel: "Cli",
          voterKey: ANAS_CLIENT_KEY,
        }),
    },
  ])(
    "tells the caller to upgrade a Lighthouse that takes no votes yet, without sending $write",
    async ({ send }) => {
      const lighthouse = aLighthouseAnswering(LAST_SERVER_WITHOUT_VOTES, {});

      const result = await send(lighthouse.client);

      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("Expected the client to refuse an older Lighthouse");
      }
      expect(result.error.category).toBe("misconfigured");
      expect(result.error.reason.toLowerCase()).toContain("upgrade lighthouse");
      expect(lighthouse.askedOtherThanTheVersion()).toEqual([]);
    },
  );
});
