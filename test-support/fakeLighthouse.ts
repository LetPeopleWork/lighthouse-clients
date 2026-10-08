// A Lighthouse on a real socket, for scenarios that run a client the way it runs in production: `lh` through
// its own HTTP client, the MCP servers through theirs. It answers the reads and writes the scenarios need,
// keeps the usage data endpoints the way the server does (a grant mints a token, a withdrawal forgets it,
// the state names the sources it labels), and records every request with its headers and body.
//
// Only Lighthouse is faked. The usage data answers follow the server's contract: the state a client reads
// after its grant is the backend's own fixture, served byte for byte.

import { readFileSync } from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { afterEach } from "vitest";
import {
  aPortfolio,
  aTeam,
  gravitysBacktest,
  gravitysForecast,
  terminology,
} from "./lighthouseAnswers";

const started: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const close of started.splice(0)) {
    await close();
  }
});

/** The header a usage data call carries its consent token in. */
export const USAGE_DATA_TOKEN_HEADER = "x-lighthouse-usagedata-token";

/** The body the backend serves a client that holds a live grant (its own fixture, copied). */
export const STATE_AFTER_A_GRANT = readFileSync(
  new URL(
    "./usageDataContract/state-a-client-reads-after-its-grant.json",
    import.meta.url,
  ),
  "utf8",
);

/** The body `lh` sends for a Refinement-day vote that made a Work Item Ready (the backend keeps a copy). */
export const BATCH_LH_SENDS_FOR_A_VOTE_THAT_MADE_READY = readFileSync(
  new URL(
    "./usageDataContract/batch-lh-sends-for-a-vote-that-made-ready.json",
    import.meta.url,
  ),
  "utf8",
);

export const EVERY_SOURCE = ["Browser", "Cli", "Mcp"] as const;

/** How this Lighthouse answers on its usage data endpoints. */
export type UsageDataSide = {
  /** The sources the state says this Lighthouse labels; `null` leaves the field out, as a server older than story 6193 does. */
  readonly acceptedSources?: readonly string[] | null;
  /** The System Admin's "Never send usage data". */
  readonly administratorDisabled?: boolean;
  /** Whether the server would let a client ask (false on an instance installed less than three days ago). */
  readonly mayAsk?: boolean;
  /**
   * `normally`; `not-at-all` (404 on every usage data route, a server with no usage data); `never` (takes the
   * request and never answers); `by-failing` (500 on every usage data route).
   */
  readonly answers?: "normally" | "not-at-all" | "never" | "by-failing";
  /** Every grant it minted has lapsed: tokens it handed out are no longer recognised. */
  readonly forgetsGrants?: boolean;
  /** How the consent endpoint alone answers a grant or a withdrawal, while the state reads normally. */
  readonly consentAnswers?: "normally" | "by-failing" | "never";
};

/** The Team's Refinement as `GET /teams/3/refinement` answers it. */
export type RefinementFacts = {
  readonly isRefinementDay?: boolean;
  readonly nextRefinementDate?: string | null;
  readonly verdict?: "Below" | "In" | "Above" | null;
  readonly workItemsListed?: number;
};

export type SeenRequest = {
  readonly method: string;
  /** The route below `/api/v1`, `/api/latest` or `/api`, without its query. */
  readonly route: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly body: string;
};

type Reply = {
  readonly status: number;
  readonly body?: unknown;
  readonly text?: string;
};

type Options = {
  readonly usageData?: UsageDataSide;
  readonly refinement?: RefinementFacts;
  /** The vote's answer says it made the Work Item Ready. */
  readonly voteMadeReady?: boolean;
  /** Replies for `"METHOD /route"`, ahead of the defaults. */
  readonly replies?: Readonly<Record<string, Reply>>;
  readonly version?: string;
};

const problem = (status: number, title: string): Reply => ({
  status,
  body: { type: "about:blank", title, status },
});

const aRefinementRow = (referenceId: string, name: string) => ({
  referenceId,
  name,
  url: null,
  state: "Refinement",
  parentReferenceId: "GR-010",
  voteCount: 2,
  myVote: null,
  split: { yes: 2, yesBut: 0, no: 0 },
  readiness: "MoreYesNeeded",
  missingVotes: 1,
  stage: null,
  signalsDisagree: false,
  hasComments: false,
  hasOpenQuestion: false,
});

const GRAVITYS_BACKLOG = [
  aRefinementRow("GR-061", "Offline mode"),
  aRefinementRow("GR-062", "Bulk import"),
  aRefinementRow("GR-063", "Audit trail"),
];

/** Gravity's Refinement, signed in (so a vote needs no name), on the day and with the need the scenario says. */
export const gravitysRefinement = (facts: RefinementFacts = {}) => {
  const isRefinementDay = facts.isRefinementDay ?? false;
  const nextRefinementDate =
    facts.nextRefinementDate === undefined
      ? "2026-10-13"
      : facts.nextRefinementDate;
  return {
    refinementConfigured: true,
    workItems: GRAVITYS_BACKLOG.slice(0, facts.workItemsListed ?? 3),
    yardstick: { source: "Sle", days: 7, probability: 85 },
    voterIdentity: "Account",
    readyByVotesCount: 4,
    stagesConfigured: false,
    readyCount: 4,
    readySource: "Votes",
    nextRefinementDate,
    isRefinementDay,
    daysUntilNextRefinement: isRefinementDay ? 0 : 5,
    need: {
      verdict: facts.verdict === undefined ? "Below" : facts.verdict,
      unavailableReason: facts.verdict === null ? "NoThroughput" : null,
      low: facts.verdict === null ? null : 5,
      high: facts.verdict === null ? null : 8,
      lowPercentile: 50,
      highPercentile: 85,
      horizonWorkingDays: 5,
      cycleStart: "2026-10-13",
      cycleEnd: "2026-10-20",
    },
  };
};

const routeOf = (url: string): string => {
  const path = url.split("?")[0] ?? "";
  return path.replace(/^\/api(\/v1|\/latest)?/u, "");
};

export const aFakeLighthouse = async (options: Options = {}) => {
  const seen: SeenRequest[] = [];
  const held: ServerResponse[] = [];
  const minted: string[] = [];
  const withdrawn = new Set<string>();
  let usageData: UsageDataSide = options.usageData ?? {};
  let refinement: RefinementFacts = options.refinement ?? {};

  const acceptedSourcesNow = () =>
    usageData.acceptedSources === undefined
      ? EVERY_SOURCE
      : usageData.acceptedSources;

  const isLiveGrant = (token: string | undefined) =>
    token !== undefined &&
    minted.includes(token) &&
    !withdrawn.has(token) &&
    usageData.forgetsGrants !== true;

  const stateFor = (token: string | undefined): Reply => {
    const vetoed = usageData.administratorDisabled === true;
    const accepted = acceptedSourcesNow();
    if (
      isLiveGrant(token) &&
      !vetoed &&
      usageData.acceptedSources === undefined
    ) {
      return { status: 200, text: STATE_AFTER_A_GRANT };
    }
    const granted = isLiveGrant(token);
    return {
      status: 200,
      body: {
        sending: granted && !vetoed,
        decision: granted ? "Granted" : null,
        mayAsk: !granted && !vetoed && (usageData.mayAsk ?? true),
        reAskAfterDays: 90,
        administratorDisabled: vetoed,
        ...(accepted === null ? {} : { acceptedSources: accepted }),
      },
    };
  };

  const usageDataReply = (
    method: string,
    route: string,
    token: string | undefined,
    body: string,
  ): Reply | "hold" => {
    const answers = usageData.answers ?? "normally";
    if (answers === "not-at-all") {
      return problem(404, "Not Found");
    }
    if (answers === "never") {
      return "hold";
    }
    if (answers === "by-failing") {
      return problem(500, "Something went wrong.");
    }
    if (method === "GET" && route === "/usagedata/state") {
      return stateFor(token);
    }
    if (
      route === "/usagedata/consent" &&
      usageData.consentAnswers === "never"
    ) {
      return "hold";
    }
    if (
      route === "/usagedata/consent" &&
      usageData.consentAnswers === "by-failing"
    ) {
      return problem(500, "Something went wrong.");
    }
    if (method === "POST" && route === "/usagedata/consent") {
      const decision = (JSON.parse(body) as { decision?: string }).decision;
      const token = `usage-data-token-${minted.length + 1}-7f3a9c2e41d8`;
      minted.push(token);
      if (decision !== "granted") {
        withdrawn.add(token);
      }
      return { status: 200, body: { token } };
    }
    if (method === "DELETE" && route === "/usagedata/consent") {
      if (token !== undefined) {
        withdrawn.add(token);
      }
      return { status: 204 };
    }
    return { status: 204 };
  };

  const operationReply = (method: string, route: string): Reply => {
    const scripted = options.replies?.[`${method} ${route}`];
    if (scripted !== undefined) {
      return scripted;
    }
    const key = `${method} ${route}`;
    if (key === "GET /version/current") {
      return { status: 200, text: options.version ?? "v26.10.8.1" };
    }
    if (key === "GET /auth/mode") {
      return { status: 200, body: { mode: "Disabled" } };
    }
    if (key === "GET /terminology/all") {
      return { status: 200, body: terminology() };
    }
    if (key === "POST /forecast/manual/3") {
      return { status: 200, body: gravitysForecast() };
    }
    if (key === "POST /forecast/backtest/3") {
      return { status: 200, body: gravitysBacktest() };
    }
    if (key === "GET /teams") {
      return { status: 200, body: [aTeam()] };
    }
    if (key === "POST /teams") {
      return { status: 200, body: aTeam({ id: 9, name: "Lightspeed" }) };
    }
    if (key === "GET /teams/3/refinement") {
      return { status: 200, body: gravitysRefinement(refinement) };
    }
    const vote =
      /^\/teams\/3\/refinement\/work-items\/([^/]+)\/(votes|comments)$/u.exec(
        route,
      );
    if (method === "POST" && vote !== null) {
      const referenceId = decodeURIComponent(vote[1] ?? "");
      return {
        status: 200,
        body: {
          ...aRefinementRow(referenceId, "Offline mode"),
          madeReady: vote[2] === "votes" && options.voteMadeReady === true,
        },
      };
    }
    if (
      method === "DELETE" &&
      /^\/teams\/3\/refinement\/work-items\/[^/]+\/votes\/mine$/u.test(route)
    ) {
      return {
        status: 200,
        body: { ...GRAVITYS_BACKLOG[0], madeReady: false },
      };
    }
    const team = /^\/teams\/(\d+)$/u.exec(route);
    if (team !== null) {
      const id = Number(team[1]);
      if (id === 99) {
        return problem(404, "Team not found");
      }
      if (method === "GET" || method === "PUT") {
        return { status: 200, body: aTeam({ id }) };
      }
      return { status: 204 };
    }
    if (key === "GET /portfolios") {
      return { status: 200, body: [aPortfolio()] };
    }
    if (key === "POST /portfolios") {
      return { status: 200, body: aPortfolio({ id: 6, name: "Apollo II" }) };
    }
    if (/^\/portfolios\/\d+\/refresh$/u.test(route)) {
      return { status: 204 };
    }
    const portfolio = /^\/portfolios\/(\d+)$/u.exec(route);
    if (portfolio !== null) {
      const id = Number(portfolio[1]);
      if (method === "GET" || method === "PUT") {
        return { status: 200, body: aPortfolio({ id }) };
      }
      return { status: 204 };
    }
    return problem(404, `${key} is not answered in this scenario`);
  };

  const send = (response: ServerResponse, reply: Reply) => {
    if (reply.text !== undefined) {
      response.writeHead(reply.status, { "content-type": "text/plain" });
      response.end(reply.text);
      return;
    }
    if (reply.body === undefined) {
      response.writeHead(reply.status);
      response.end();
      return;
    }
    response.writeHead(reply.status, {
      "content-type":
        reply.status >= 400 ? "application/problem+json" : "application/json",
    });
    response.end(JSON.stringify(reply.body));
  };

  const server: Server = createServer(
    (request: IncomingMessage, response: ServerResponse) => {
      let body = "";
      request.on("data", (chunk) => {
        body += String(chunk);
      });
      request.on("end", () => {
        const method = request.method ?? "GET";
        const route = routeOf(request.url ?? "");
        seen.push({ method, route, headers: request.headers, body });
        if (route.startsWith("/usagedata/")) {
          const header = request.headers[USAGE_DATA_TOKEN_HEADER];
          const token = typeof header === "string" ? header : undefined;
          const reply = usageDataReply(method, route, token, body);
          if (reply === "hold") {
            held.push(response);
            return;
          }
          send(response, reply);
          return;
        }
        send(response, operationReply(method, route));
      });
    },
  );

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

  const close = async () => {
    for (const response of held.splice(0)) {
      response.destroy();
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  };
  started.push(close);

  const usageDataRequests = () =>
    seen.filter((request) => request.route.startsWith("/usagedata/"));

  return {
    url: `http://127.0.0.1:${port}`,
    /** Every request, in the order it arrived. */
    requests: () => [...seen],
    /** The requests that were not about usage data, as `METHOD /route`. */
    operations: () =>
      seen
        .filter((request) => !request.route.startsWith("/usagedata/"))
        .map((request) => `${request.method} ${request.route}`),
    usageDataRequests,
    /** The state reads, with the token each presented (or undefined). */
    stateReads: () =>
      usageDataRequests()
        .filter((request) => request.route === "/usagedata/state")
        .map((request) => request.headers[USAGE_DATA_TOKEN_HEADER]),
    /** The decisions posted to the consent endpoint, in order. */
    decisionsPosted: () =>
      usageDataRequests()
        .filter(
          (request) =>
            request.method === "POST" && request.route === "/usagedata/consent",
        )
        .map(
          (request) =>
            (JSON.parse(request.body) as { decision?: string }).decision,
        ),
    /** The tokens this Lighthouse minted for a grant, in order. */
    mintedTokens: () => [...minted],
    /** The tokens a client withdrew with. */
    withdrawals: () =>
      usageDataRequests()
        .filter(
          (request) =>
            request.method === "DELETE" &&
            request.route === "/usagedata/consent",
        )
        .map((request) => request.headers[USAGE_DATA_TOKEN_HEADER]),
    /** Every batch handed in, parsed, with the token it came with and its raw body. */
    handedIn: () =>
      usageDataRequests()
        .filter(
          (request) =>
            request.method === "POST" && request.route === "/usagedata/events",
        )
        .map((request) => ({
          token: request.headers[USAGE_DATA_TOKEN_HEADER],
          batch: JSON.parse(request.body) as unknown,
          body: request.body,
        })),
    /** Changes how the usage data endpoints answer from now on. */
    changeUsageData: (side: UsageDataSide) => {
      usageData = { ...usageData, ...side };
    },
    changeRefinement: (facts: RefinementFacts) => {
      refinement = facts;
    },
    close,
  };
};

export type FakeLighthouse = Awaited<ReturnType<typeof aFakeLighthouse>>;

/** The batch a client hands in for one event, as the clients' wire contract writes it. */
export const aBatchOf = (
  source: "Cli" | "Mcp",
  ...events: readonly Readonly<Record<string, string>>[]
) => ({
  source,
  events: events.map((event, sequence) => ({
    ...event,
    offsetMs: 0,
    sequence,
  })),
});
