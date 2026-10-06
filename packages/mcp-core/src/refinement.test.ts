import { decode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { createMcpCoreRuntime, registerMcpTools } from "./index";

type Runtime = ReturnType<typeof createMcpCoreRuntime>;
type RuntimeClient = ReturnType<
  Parameters<typeof createMcpCoreRuntime>[0]["createClient"]
>;

type ApiResult =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly error: { readonly category: string; readonly reason: string };
    };

const TOOL = "lighthouse_team_refinement_get";
const GRAVITY_ID = 3;

const judgedNeed = {
  verdict: "Below",
  unavailableReason: null,
  low: 5,
  high: 8,
  lowPercentile: 50,
  highPercentile: 85,
  horizonWorkingDays: 5,
  cycleStart: "2026-10-08",
  cycleEnd: "2026-10-15",
};

const noCadence = {
  verdict: null,
  unavailableReason: "NoCadence",
  low: null,
  high: null,
  lowPercentile: null,
  highPercentile: null,
  horizonWorkingDays: null,
  cycleStart: null,
  cycleEnd: null,
};

// Tue 6 Oct: Team Gravity has 3 ready against the 5–8 it is likely to pull from Thu 8 Oct to the Refinement after.
const gravitysRefinement = (
  need: typeof judgedNeed | typeof noCadence = judgedNeed,
) => ({
  refinementConfigured: true,
  workItems: [
    {
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
    },
  ],
  yardstick: { source: "Sle", days: 7, probability: 85 },
  voterIdentity: "SelfDeclared",
  readyByVotesCount: 3,
  stagesConfigured: false,
  readyCount: 3,
  readySource: "Votes",
  nextRefinementDate: need.verdict === null ? null : "2026-10-08",
  isRefinementDay: false,
  daysUntilNextRefinement: need.verdict === null ? null : 2,
  need,
});

const seededTerminology = [
  ["workItem", "Work Item"],
  ["workItems", "Work Items"],
  ["team", "Team"],
  ["refinement", "Refinement"],
  ["refinements", "Refinements"],
].map(([key, defaultValue], index) => ({
  id: index + 1,
  key,
  description: "",
  defaultValue,
  value: defaultValue,
}));

const ok = (value: unknown): ApiResult => ({ ok: true, value });

const anAssistantOn = (
  refinement: ApiResult,
  others: {
    readonly team?: ApiResult;
    readonly terminology?: ApiResult;
    readonly beforeRefinementAnswers?: (
      asked: readonly string[],
    ) => Promise<void>;
  } = {},
) => {
  const asked: string[] = [];
  const client = {
    checkConnectivity: async () => ({ category: "success" }),
    getVersion: async () => ok("v26.10.7.1"),
    getTeam: async (teamId: number) => {
      asked.push(`team ${teamId}`);
      return others.team ?? ok({ id: teamId, name: "Team Gravity" });
    },
    getTeamRefinement: async (teamId: number) => {
      asked.push(`refinement ${teamId}`);
      await others.beforeRefinementAnswers?.(asked);
      return refinement;
    },
    getTerminology: async () => {
      asked.push("terminology");
      return others.terminology ?? ok(seededTerminology);
    },
  } as unknown as RuntimeClient;
  const runtime: Runtime = createMcpCoreRuntime({ createClient: () => client });
  return { runtime, asked };
};

const textOf = (result: Awaited<ReturnType<Runtime["callTool"]>>): string =>
  result.content.map((content) => content.text).join("\n");

const PAYLOAD_LABEL = "refinement: ";

// What an assistant reads back out of the tool's answer.
const factsOf = (result: Awaited<ReturnType<Runtime["callTool"]>>) => {
  const text = textOf(result);
  expect(text.startsWith(PAYLOAD_LABEL)).toBe(true);
  return decode(text.slice(PAYLOAD_LABEL.length)) as Record<string, unknown>;
};

describe("the refinement need tool", () => {
  it("is offered with a description that explains the verdict, the range and the cycle", () => {
    const { runtime } = anAssistantOn(ok(gravitysRefinement()));

    const tool = runtime.listTools().find((listed) => listed.name === TOOL);

    expect(tool).toBeDefined();
    const description = tool?.description ?? "";
    for (const explanation of [
      "`summary` is the sentence the web page states, in the instance's terminology.",
      "need.low and need.high are the range of work items the team is likely to pull over one cycle (need.cycleStart to need.cycleEnd: from the next Refinement to the one after, or from today on a Refinement day), read at need.lowPercentile and need.highPercentile.",
      "need.verdict says where readyCount sits against that range: Below, In or Above.",
      "Without a verdict, need.unavailableReason says why: NoCadence, InsufficientData or NoRefinementStates.",
      "isRefinementDay is true on a Refinement day, when the cycle starts today.",
      "daysUntilNextRefinement counts the days from the instance's today to nextRefinementDate.",
      "readySource says what readyCount counts: work items ready by Votes, or by Stages on a team with stage rules.",
    ]) {
      expect(description).toContain(explanation);
    }
    expect(tool?.inputSchema).toMatchObject({ required: ["id"] });
  });

  // @driving_port
  it("hands an assistant the facts together with the sentence the web page states", async () => {
    const { runtime, asked } = anAssistantOn(ok(gravitysRefinement()));

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(false);
    expect(asked).toContain(`refinement ${GRAVITY_ID}`);
    expect(factsOf(result)).toEqual({
      summary:
        "Team Gravity · Next Refinement: Thu 8 Oct · in 2 days\n3 ready — below the range of 5–8 Work Items Team Gravity is likely to pull until the Refinement after. Refine 2 to 5 more.",
      ...gravitysRefinement(),
    });
  });

  it("tells an assistant why there is no number for a Team without a cadence", async () => {
    const { runtime } = anAssistantOn(ok(gravitysRefinement(noCadence)));

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(false);
    const text = textOf(result);
    expect(text).toContain("unavailableReason: NoCadence");
    expect(text).toContain("Team Gravity · No Refinement cadence");
    expect(text).toContain(
      "A Team admin can set a Refinement cadence to see how many Work Items are needed",
    );
    expect(text).not.toContain(" ready — ");
  });

  it("says only that nothing is in refinement when the list is empty", async () => {
    const { runtime } = anAssistantOn(
      ok({ ...gravitysRefinement(), readyCount: 0, workItems: [] }),
    );

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(false);
    expect(factsOf(result).summary).toBe(
      "No Work Items in Refinement states right now",
    );
  });

  it("states no verdict when the facts come without a next Refinement", async () => {
    const { runtime } = anAssistantOn(
      ok({
        ...gravitysRefinement(),
        nextRefinementDate: null,
        daysUntilNextRefinement: null,
      }),
    );

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(false);
    expect(factsOf(result).summary).toBe(
      "Team Gravity · No Refinement cadence\nA Team admin can set a Refinement cadence to see how many Work Items are needed",
    );
  });

  it("passes a failed read of the Team straight through", async () => {
    const { runtime } = anAssistantOn(ok(gravitysRefinement()), {
      team: {
        ok: false,
        error: { category: "notFound", reason: "Team 3 does not exist" },
      },
    });

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe("refinement: notFound (Team 3 does not exist)");
  });

  it("names a Team that comes without a name by the instance's word for a Team", async () => {
    const { runtime } = anAssistantOn(ok(gravitysRefinement()), {
      team: ok({ id: GRAVITY_ID }),
      terminology: ok(
        seededTerminology.map((entry) =>
          entry.key === "team" ? { ...entry, value: "Squad" } : entry,
        ),
      ),
    });

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(false);
    expect(String(factsOf(result).summary).split("\n")[0]).toBe(
      "Squad 3 · Next Refinement: Thu 8 Oct · in 2 days",
    );
  });

  it("asks for the refinement, the Team and the terminology at once", async () => {
    let askedWhileRefinementIsRead: readonly string[] = [];
    const { runtime } = anAssistantOn(ok(gravitysRefinement()), {
      beforeRefinementAnswers: async (asked) => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        askedWhileRefinementIsRead = [...asked];
      },
    });

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(false);
    expect([...askedWhileRefinementIsRead].sort()).toEqual([
      `refinement ${GRAVITY_ID}`,
      `team ${GRAVITY_ID}`,
      "terminology",
    ]);
  });

  it("reports a failed refinement read over a failed Team read", async () => {
    const { runtime } = anAssistantOn(
      {
        ok: false,
        error: { category: "unexpected", reason: "refinement unavailable" },
      },
      {
        team: {
          ok: false,
          error: { category: "notFound", reason: "Team 3 does not exist" },
        },
      },
    );

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(
      "refinement: unexpected (refinement unavailable)",
    );
  });

  it.each([{ argumentsPayload: {} }, { argumentsPayload: { id: "gravity" } }])(
    "refuses $argumentsPayload without asking Lighthouse",
    async ({ argumentsPayload }) => {
      const { runtime, asked } = anAssistantOn(ok(gravitysRefinement()));

      const result = await runtime.callTool(TOOL, argumentsPayload);

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("invalid id");
      expect(asked).toEqual([]);
    },
  );

  it("passes a Lighthouse refusal straight through", async () => {
    const { runtime } = anAssistantOn({
      ok: false,
      error: {
        category: "misconfigured",
        reason:
          'This Lighthouse server (v26.10.3.6) does not support "teamRefinement". Upgrade Lighthouse to use this client feature.',
      },
    });

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Upgrade Lighthouse");
  });

  it("is registered with an MCP server as needing a whole-number Team id", () => {
    const inputSchemas = new Map<
      string,
      { readonly safeParse: (value: unknown) => { readonly success: boolean } }
    >();
    const server = {
      registerTool: (
        name: string,
        configuration: { readonly inputSchema: never },
      ) => {
        inputSchemas.set(name, configuration.inputSchema);
      },
    };

    registerMcpTools(server as never, {
      createClient: () => ({}) as never,
    });

    const inputSchema = inputSchemas.get(TOOL);
    expect(inputSchema?.safeParse({ id: GRAVITY_ID }).success).toBe(true);
    expect(inputSchema?.safeParse({}).success).toBe(false);
    expect(inputSchema?.safeParse({ id: 3.5 }).success).toBe(false);
  });
});
