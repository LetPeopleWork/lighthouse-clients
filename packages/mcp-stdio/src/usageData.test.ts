import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  type ElicitRequest,
  ElicitRequestSchema,
  type ElicitResult,
} from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aBatchOf,
  aFakeLighthouse,
  type FakeLighthouse,
  type RefinementFacts,
  type UsageDataSide,
} from "../../../test-support/fakeLighthouse";
import {
  aMachine,
  aNo,
  anEarlierAnswer,
  aYesGiven,
  connectedTo,
  HOURS,
  lhOn,
  type Machine,
  theStoredAnswerFor,
} from "../../cli/test-support/lhSession";
import { createLocalLighthouseMcpServer } from "./localServer";

// Story 6193, slice 04 (US-05). Priya Raman uses Claude Desktop with the local Lighthouse MCP server. The
// first tool call that succeeds against a Lighthouse nobody on her laptop has answered for asks her once,
// through the assistant (MCP elicitation), in the approved words; the tool's answer reaches her unchanged
// either way. Her answer is the one lh reads, so either surface answering stops both asking. With a yes,
// the six mapped tools report their web events with source Mcp.
// Driving port: the server `runMcpStdioRuntime` connects to stdio, here connected to an in-process MCP
// client instead; only Lighthouse and the assistant are outside it. Pending until DELIVER slice 04.

const THE_QUESTION_LINES = [
  "May Lighthouse send usage data?",
  "Details: https://docs.lighthouse.letpeople.work/settings/usagedata.html",
  "(change any time: lh config usage-data on|off)",
];
const WHAT_IT_SENDS =
  "The Lighthouse MCP server tells your Lighthouse which tools you use (never names, ids, URLs or anything you typed), so we can see what helps.";

const FORECAST = "lighthouse_forecast_manual";
const GRAVITYS_FORECAST = { id: 3, remainingItems: 25 };

type Answering = (request: ElicitRequest) => Promise<ElicitResult>;

const accepts: Answering = async () => ({ action: "accept", content: {} });
const declines: Answering = async () => ({ action: "decline" });
const cancels: Answering = async () => ({ action: "cancel" });
const neverAnswers: Answering = () =>
  new Promise<ElicitResult>(() => undefined);

const closers: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0)) {
    await close();
  }
  vi.useRealTimers();
});

const aMoment = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Longer than any send may take, so "nothing was sent" is not merely "not sent yet". */
const pastTheSendBudget = () => aMoment(1100);

const priyasLaptop = async (lighthouse: FakeLighthouse): Promise<Machine> =>
  connectedTo(aMachine(), lighthouse.url);

/**
 * Priya's assistant, connected to the local server on her laptop. With `answering`, the assistant declares
 * the elicitation capability and answers each question so; without it, it declares none.
 */
const priyasAssistant = async (
  lighthouse: FakeLighthouse,
  laptop: Machine,
  options: {
    readonly answering?: Answering;
    readonly env?: Readonly<Record<string, string>>;
  } = {},
) => {
  const server = await createLocalLighthouseMcpServer({
    HOME: laptop.home,
    LIGHTHOUSE_CLI_CONFIG_PATH: laptop.configPath,
    LIGHTHOUSE_URL: lighthouse.url,
    ...options.env,
  });
  if (server === null) {
    throw new Error("the local server resolved no Lighthouse");
  }
  const questions: ElicitRequest["params"][] = [];
  const client = new Client(
    { name: "claude-desktop", version: "0.0.0" },
    {
      capabilities: options.answering === undefined ? {} : { elicitation: {} },
    },
  );
  const answering = options.answering;
  if (answering !== undefined) {
    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      questions.push(request.params);
      return answering(request);
    });
  }
  const [clientEnd, serverEnd] = InMemoryTransport.createLinkedPair();
  await server.connect(serverEnd);
  await client.connect(clientEnd);
  closers.push(async () => {
    await client.close();
    await server.close();
  });
  return {
    call: (name: string, args: Record<string, unknown>) =>
      client.callTool({ name, arguments: args }),
    questions,
  };
};

const reported = (lighthouse: FakeLighthouse) =>
  lighthouse.handedIn().map(({ batch }) => batch);

describe("the local MCP server asks once, through the assistant", () => {
  // @US-05 @driving_port @real-io @kpi @contract-shape:bounded-change
  it("asks Priya once in her assistant, in the approved words, while her forecast reaches her unchanged", async () => {
    const lighthouse = await aFakeLighthouse();
    const laptop = await priyasLaptop(lighthouse);
    const untouched = await (
      await priyasAssistant(lighthouse, laptop, { env: { DO_NOT_TRACK: "1" } })
    ).call(FORECAST, GRAVITYS_FORECAST);
    const assistant = await priyasAssistant(lighthouse, laptop, {
      answering: accepts,
    });

    const result = await assistant.call(FORECAST, GRAVITYS_FORECAST);

    expect(result).toEqual(untouched);
    expect(assistant.questions).toHaveLength(1);
    const question = assistant.questions[0];
    const message = (question?.message ?? "").replaceAll(/\s+/gu, " ");
    expect(message).toContain(WHAT_IT_SENDS);
    for (const line of THE_QUESTION_LINES) {
      expect(question?.message).toContain(line);
    }
    expect(question).toMatchObject({
      requestedSchema: { type: "object", properties: {} },
    });
    expect(lighthouse.decisionsPosted()).toEqual(["granted"]);
    expect(await theStoredAnswerFor(laptop, lighthouse.url)).toMatchObject({
      answer: "yes",
      token: lighthouse.mintedTokens()[0],
    });
    await pastTheSendBudget();
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-05 @driving_port @real-io @kpi @contract-shape:bounded-change
  it("reports Priya's later tool calls with source Mcp and never asks her again", async () => {
    const lighthouse = await aFakeLighthouse();
    const laptop = await priyasLaptop(lighthouse);
    const assistant = await priyasAssistant(lighthouse, laptop, {
      answering: accepts,
    });
    await assistant.call(FORECAST, GRAVITYS_FORECAST);

    await assistant.call("lighthouse_team_refresh", { id: 3 });
    const nextSession = await priyasAssistant(lighthouse, laptop, {
      answering: accepts,
    });
    await nextSession.call(FORECAST, GRAVITYS_FORECAST);

    await vi.waitFor(
      () =>
        expect(reported(lighthouse)).toEqual([
          aBatchOf("Mcp", { name: "TeamRefreshTriggered" }),
          aBatchOf("Mcp", { name: "TeamManualForecastRun" }),
        ]),
      { timeout: 3000 },
    );
    expect(assistant.questions).toHaveLength(1);
    expect(nextSession.questions).toEqual([]);
    expect(lighthouse.handedIn().map(({ token }) => token)).toEqual([
      lighthouse.mintedTokens()[0],
      lighthouse.mintedTokens()[0],
    ]);
  });

  // @US-05 @driving_port @real-io @error @kpi @contract-shape:bounded-change
  // A decline is final, and lh on the same laptop honours it: one answer per Lighthouse per machine.
  it("keeps Marco's decline, and his lh asks nothing afterwards", async () => {
    const lighthouse = await aFakeLighthouse();
    const laptop = await priyasLaptop(lighthouse);
    const assistant = await priyasAssistant(lighthouse, laptop, {
      answering: declines,
    });

    await assistant.call(FORECAST, GRAVITYS_FORECAST);
    await assistant.call("lighthouse_team_refresh", { id: 3 });
    const inHisTerminal = await lhOn(laptop, { typing: ["y"] }).run([
      "team",
      "list",
    ]);

    expect(await theStoredAnswerFor(laptop, lighthouse.url)).toMatchObject({
      answer: "no",
    });
    expect(inHisTerminal.questions).toEqual([]);
    expect(lighthouse.decisionsPosted()).toEqual([]);
    await pastTheSendBudget();
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-05 @driving_port @real-io @error @contract-shape:unbounded-preservation
  // Cancel, close or an error is no answer: nothing kept, not asked again this session, asked next session.
  it("keeps nothing when Priya closes the question, does not ask again this session, and asks in the next", async () => {
    const lighthouse = await aFakeLighthouse();
    const laptop = await priyasLaptop(lighthouse);
    const assistant = await priyasAssistant(lighthouse, laptop, {
      answering: cancels,
    });

    const result = await assistant.call(FORECAST, GRAVITYS_FORECAST);
    await assistant.call(FORECAST, GRAVITYS_FORECAST);
    const nextSession = await priyasAssistant(lighthouse, laptop, {
      answering: declines,
    });
    await nextSession.call(FORECAST, GRAVITYS_FORECAST);

    expect(result.isError).toBeFalsy();
    expect(assistant.questions).toHaveLength(1);
    expect(nextSession.questions).toHaveLength(1);
    expect(lighthouse.decisionsPosted()).toEqual([]);
  });

  // @US-05 @driving_port @real-io @error @infrastructure-failure @contract-shape:unbounded-preservation
  // An assistant times a tool call out at 60 seconds by default; the question gives up at 50, so the
  // forecast is never lost to it.
  it("hands Priya her forecast after 50 seconds of silence, and keeps nothing", async () => {
    const lighthouse = await aFakeLighthouse();
    const laptop = await priyasLaptop(lighthouse);
    const assistant = await priyasAssistant(lighthouse, laptop, {
      answering: neverAnswers,
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    const pending = assistant.call(FORECAST, GRAVITYS_FORECAST);
    await vi.waitFor(() => expect(assistant.questions).toHaveLength(1), {
      timeout: 3000,
    });
    await vi.advanceTimersByTimeAsync(50_000);
    const result = await pending;

    expect(result.isError).toBeFalsy();
    expect(lighthouse.decisionsPosted()).toEqual([]);
    expect(await theStoredAnswerFor(laptop, lighthouse.url)).toBe(undefined);
  });

  // @US-05 @driving_port @real-io @boundary @contract-shape:bounded-change
  it("asks once when Priya's assistant makes three calls at once", async () => {
    const lighthouse = await aFakeLighthouse();
    const laptop = await priyasLaptop(lighthouse);
    const assistant = await priyasAssistant(lighthouse, laptop, {
      answering: accepts,
    });

    const results = await Promise.all([
      assistant.call(FORECAST, GRAVITYS_FORECAST),
      assistant.call("lighthouse_team_refresh", { id: 3 }),
      assistant.call("lighthouse_portfolio_refresh", { id: 2 }),
    ]);

    expect(results.every((result) => !result.isError)).toBe(true);
    expect(assistant.questions).toHaveLength(1);
    expect(lighthouse.decisionsPosted()).toEqual(["granted"]);
  });
});

describe("the stored answer decides, wherever it was given", () => {
  // @US-05 @driving_port @real-io @contract-shape:bounded-change
  // An assistant that cannot ask: Lena switches it on with lh, against the same Lighthouse.
  it("reports Lena's refresh with source Mcp after she ran lh config usage-data on, though her assistant cannot ask", async () => {
    const lighthouse = await aFakeLighthouse();
    const laptop = await priyasLaptop(lighthouse);
    await lhOn(laptop).run(["config", "usage-data", "on"]);
    const assistant = await priyasAssistant(lighthouse, laptop);

    await assistant.call("lighthouse_team_refresh", { id: 3 });

    await vi.waitFor(
      () =>
        expect(lighthouse.handedIn()).toEqual([
          expect.objectContaining({
            token: lighthouse.mintedTokens()[0],
            batch: aBatchOf("Mcp", { name: "TeamRefreshTriggered" }),
          }),
        ]),
      { timeout: 3000 },
    );
  });

  // @US-05 @driving_port @real-io @error @contract-shape:unbounded-preservation
  it("asks nothing and sends nothing when the assistant cannot ask and nobody has answered", async () => {
    const lighthouse = await aFakeLighthouse();
    const assistant = await priyasAssistant(
      lighthouse,
      await priyasLaptop(lighthouse),
    );

    await assistant.call(FORECAST, GRAVITYS_FORECAST);
    await pastTheSendBudget();

    expect(lighthouse.decisionsPosted()).toEqual([]);
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-05 @driving_port @real-io @kpi @contract-shape:bounded-change
  // KPI-5: 0 repeat questions across the two surfaces.
  it.each<[string, Parameters<typeof anEarlierAnswer>[2], number]>([
    ["a yes", aYesGiven("lenas-token", 1 * HOURS), 1],
    ["a No", aNo(), 0],
  ])(
    "asks nothing in the assistant once lh holds %s for that Lighthouse",
    async (_answer, answer, batches) => {
      const lighthouse = await aFakeLighthouse();
      const laptop = await priyasLaptop(lighthouse);
      await anEarlierAnswer(laptop, lighthouse.url, answer);
      const assistant = await priyasAssistant(lighthouse, laptop, {
        answering: accepts,
      });

      await assistant.call(FORECAST, GRAVITYS_FORECAST);
      await pastTheSendBudget();

      expect(assistant.questions).toEqual([]);
      expect(lighthouse.handedIn()).toHaveLength(batches);
    },
  );

  // @US-05 @driving_port @real-io @boundary @contract-shape:bounded-change
  // The server outlives many lh runs, so it reads the answer again just before it would ask.
  it("does not ask when lh answered since the server started", async () => {
    const lighthouse = await aFakeLighthouse({ usageData: { mayAsk: false } });
    const laptop = await priyasLaptop(lighthouse);
    const assistant = await priyasAssistant(lighthouse, laptop, {
      answering: accepts,
    });
    await assistant.call(FORECAST, GRAVITYS_FORECAST);

    await lhOn(laptop).run(["config", "usage-data", "off"]);
    lighthouse.changeUsageData({ mayAsk: true });
    await assistant.call(FORECAST, GRAVITYS_FORECAST);

    expect(assistant.questions).toEqual([]);
  });

  // @US-05 @driving_port @real-io @error @version-skew @kpi @contract-shape:unbounded-preservation
  it.each<[string, UsageDataSide, Readonly<Record<string, string>>]>([
    [
      "its administrator has stopped usage data",
      { administratorDisabled: true },
      {},
    ],
    ["it was installed less than three days ago", { mayAsk: false }, {}],
    ["it predates labelled sources", { acceptedSources: null }, {}],
    ["it labels no MCP source", { acceptedSources: ["Browser", "Cli"] }, {}],
    ["it has no usage data at all", { answers: "not-at-all" }, {}],
    ["DO_NOT_TRACK is set", {}, { DO_NOT_TRACK: "1" }],
  ])("asks nothing and sends nothing when %s", async (_why, side, env) => {
    const lighthouse = await aFakeLighthouse({ usageData: side });
    const assistant = await priyasAssistant(
      lighthouse,
      await priyasLaptop(lighthouse),
      { answering: accepts, env },
    );

    await assistant.call(FORECAST, GRAVITYS_FORECAST);
    await pastTheSendBudget();

    expect(assistant.questions).toEqual([]);
    expect(lighthouse.decisionsPosted()).toEqual([]);
    expect(lighthouse.handedIn()).toEqual([]);
  });
});

describe("the six mapped tools report the web's events with source Mcp", () => {
  const priyaWhoSaidYes = async (
    options: {
      readonly refinement?: RefinementFacts;
      readonly voteMadeReady?: boolean;
    } = {},
  ) => {
    const lighthouse = await aFakeLighthouse(options);
    const laptop = await priyasLaptop(lighthouse);
    await anEarlierAnswer(
      laptop,
      lighthouse.url,
      aYesGiven("priyas-token", 1 * HOURS),
    );
    return { lighthouse, assistant: await priyasAssistant(lighthouse, laptop) };
  };

  // @US-05 @driving_port @real-io @kpi @contract-shape:bounded-change
  it.each<
    [
      string,
      Record<string, unknown>,
      RefinementFacts,
      boolean,
      readonly Readonly<Record<string, string>>[],
    ]
  >([
    [
      FORECAST,
      GRAVITYS_FORECAST,
      {},
      false,
      [{ name: "TeamManualForecastRun" }],
    ],
    [
      "lighthouse_team_refresh",
      { id: 3 },
      {},
      false,
      [{ name: "TeamRefreshTriggered" }],
    ],
    [
      "lighthouse_portfolio_refresh",
      { id: 2 },
      {},
      false,
      [{ name: "PortfolioRefreshTriggered" }],
    ],
    [
      "lighthouse_team_refinement_vote",
      { id: 3, workItem: "GR-061", answer: "Yes" },
      { isRefinementDay: false },
      false,
      [{ name: "TeamSizingVoteCast", sizingMoment: "OnOtherDay" }],
    ],
    [
      "lighthouse_team_refinement_vote",
      { id: 3, workItem: "GR-061", answer: "Yes" },
      { isRefinementDay: true },
      true,
      [
        { name: "TeamSizingVoteCast", sizingMoment: "OnRefinementDay" },
        { name: "TeamSizingReadinessReached", sizingMoment: "OnRefinementDay" },
      ],
    ],
    [
      "lighthouse_team_refinement_get",
      { id: 3 },
      { isRefinementDay: true, verdict: "In" },
      false,
      [{ name: "TeamRefinementDayVerdictShown", refinementVerdict: "In" }],
    ],
  ])(
    "%s reports its events once, after Lighthouse answered",
    async (tool, args, refinement, voteMadeReady, events) => {
      const { lighthouse, assistant } = await priyaWhoSaidYes({
        refinement,
        voteMadeReady,
      });

      const result = await assistant.call(tool, args);

      expect(result.isError).toBeFalsy();
      await vi.waitFor(
        () =>
          expect(reported(lighthouse)).toEqual([aBatchOf("Mcp", ...events)]),
        { timeout: 3000 },
      );
    },
  );

  // @US-05 @driving_port @real-io @error @kpi @contract-shape:unbounded-preservation
  it.each<[string, Record<string, unknown>]>([
    [
      "lighthouse_forecast_backtest",
      {
        id: 3,
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        historicalStartDate: "2026-07-01",
        historicalEndDate: "2026-08-31",
      },
    ],
    [
      "lighthouse_team_refinement_comment",
      { id: 3, workItem: "GR-061", comment: "Split the export out" },
    ],
    ["lighthouse_team_refinement_voteTakeBack", { id: 3, workItem: "GR-061" }],
    ["lighthouse_team_list", {}],
    ["lighthouse_team_refinement_get", { id: 3 }],
  ])(
    "%s reports nothing (no web event to mirror, or not a Refinement day)",
    async (tool, args) => {
      const { lighthouse, assistant } = await priyaWhoSaidYes({
        refinement: { isRefinementDay: false },
      });

      await assistant.call(tool, args);
      await pastTheSendBudget();

      expect(lighthouse.handedIn()).toEqual([]);
    },
  );

  // @US-05 @driving_port @real-io @error @contract-shape:unbounded-preservation
  it("reports nothing for a refresh Lighthouse refused", async () => {
    const lighthouse = await aFakeLighthouse({
      replies: {
        "POST /teams/3": {
          status: 500,
          body: { title: "Something went wrong.", status: 500 },
        },
      },
    });
    const laptop = await priyasLaptop(lighthouse);
    await anEarlierAnswer(
      laptop,
      lighthouse.url,
      aYesGiven("priyas-token", 1 * HOURS),
    );
    const assistant = await priyasAssistant(lighthouse, laptop);

    const result = await assistant.call("lighthouse_team_refresh", { id: 3 });
    await pastTheSendBudget();

    expect(result.isError).toBe(true);
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-05 @driving_port @real-io @infrastructure-failure @kpi @contract-shape:unbounded-preservation
  // KPI-7: the send happens after the result is returned, so a Lighthouse that never takes events delays
  // no tool result.
  it("returns Priya's refresh at once though her Lighthouse never takes the event", async () => {
    const { lighthouse, assistant } = await priyaWhoSaidYes();
    lighthouse.changeUsageData({ answers: "never" });

    const startedAt = performance.now();
    const result = await assistant.call("lighthouse_team_refresh", { id: 3 });

    expect(result.isError).toBeFalsy();
    expect(performance.now() - startedAt).toBeLessThan(900);
  });
});
