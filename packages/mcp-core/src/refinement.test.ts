import { describe, expect, it } from "vitest";
import { createMcpCoreRuntime } from "./index";

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

const anAssistantOn = (refinement: ApiResult) => {
  const asked: string[] = [];
  const client = {
    checkConnectivity: async () => ({ category: "success" }),
    getVersion: async () => ok("v26.10.7.1"),
    getTeam: async (teamId: number) => {
      asked.push(`team ${teamId}`);
      return ok({ id: teamId, name: "Team Gravity" });
    },
    getTeamRefinement: async (teamId: number) => {
      asked.push(`refinement ${teamId}`);
      return refinement;
    },
    getTerminology: async () => ok(seededTerminology),
  } as unknown as RuntimeClient;
  const runtime: Runtime = createMcpCoreRuntime({ createClient: () => client });
  return { runtime, asked };
};

const textOf = (result: Awaited<ReturnType<Runtime["callTool"]>>): string =>
  result.content.map((content) => content.text).join("\n");

describe("the refinement need tool", () => {
  it("is offered with a description that explains the verdict, the range and the cycle", () => {
    const { runtime } = anAssistantOn(ok(gravitysRefinement()));

    const tool = runtime.listTools().find((listed) => listed.name === TOOL);

    expect(tool).toBeDefined();
    const description = tool?.description ?? "";
    for (const explained of ["verdict", "low", "high", "cycle", "summary"]) {
      expect(description).toContain(explained);
    }
    expect(tool?.inputSchema).toMatchObject({ required: ["id"] });
  });

  // @driving_port
  it("hands an assistant the facts together with the sentence the web page states", async () => {
    const { runtime, asked } = anAssistantOn(ok(gravitysRefinement()));

    const result = await runtime.callTool(TOOL, { id: GRAVITY_ID });

    expect(result.isError).toBe(false);
    const text = textOf(result);
    expect(asked).toContain(`refinement ${GRAVITY_ID}`);
    expect(text).toContain("readyCount: 3");
    expect(text).toContain("verdict: Below");
    expect(text).toContain("summary");
    expect(text).toContain(
      "Team Gravity · Next Refinement: Thu 8 Oct · in 2 days",
    );
    expect(text).toContain(
      "3 ready — below the range of 5–8 Work Items Team Gravity is likely to pull until the Refinement after. Refine 2 to 5 more.",
    );
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
});
