import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import { type RunCliCommandDependencies, runCliCommand } from "./index";

type CliClient = ReturnType<RunCliCommandDependencies["createClient"]>;

type ApiResult =
  | { readonly ok: true; readonly value: unknown }
  | {
      readonly ok: false;
      readonly error: { readonly category: string; readonly reason: string };
    };

const GRAVITY_ID = 3;
const GRAVITY = "Team Gravity";
const IN_REFINEMENT = "Refinement";

const row = (referenceId: string, name: string, parentReferenceId: string) => ({
  referenceId,
  name,
  url: null,
  state: IN_REFINEMENT,
  parentReferenceId,
  // Vote facts travel with every row; this list does not show them.
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

const gravitysBacklog = [
  row("GR-051", "PDF export", "GR-010"),
  row("GR-052", "Saved filters", "GR-010"),
  row("GR-055", "Audit trail", "GR-011"),
  row("GR-058", "Team invites", "GR-011"),
  row("GR-061", "CSV import", "GR-012"),
  row("GR-064", "Webhooks", "GR-012"),
  row("GR-070", "Offline mode", "GR-013"),
  row("GR-073", "Bulk import", "GR-012"),
  row("GR-080", "Dark mode", ""),
];

type NeedFacts = {
  readonly verdict: string | null;
  readonly unavailableReason: string | null;
  readonly low: number | null;
  readonly high: number | null;
};

type RefinementFacts = {
  readonly readyCount?: number;
  readonly nextRefinementDate?: string | null;
  readonly isRefinementDay?: boolean;
  readonly daysUntilNextRefinement?: number | null;
  readonly refinementConfigured?: boolean;
  readonly workItems?: readonly ReturnType<typeof row>[];
  readonly need?: NeedFacts;
};

// Tue 6 Oct: Team Gravity has 3 ready against the 5–8 it is likely to pull from Thu 8 Oct to the Refinement after.
const gravitysRefinement = (facts: RefinementFacts = {}) => {
  const need = facts.need ?? {
    verdict: "Below",
    unavailableReason: null,
    low: 5,
    high: 8,
  };
  const judged = need.verdict !== null;
  return {
    refinementConfigured: facts.refinementConfigured ?? true,
    workItems: facts.workItems ?? gravitysBacklog,
    yardstick: { source: "Sle", days: 7, probability: 85 },
    voterIdentity: "SelfDeclared",
    readyByVotesCount: facts.readyCount ?? 3,
    stagesConfigured: false,
    readyCount: facts.readyCount ?? 3,
    readySource: "Votes",
    nextRefinementDate:
      facts.nextRefinementDate === undefined
        ? "2026-10-08"
        : facts.nextRefinementDate,
    isRefinementDay: facts.isRefinementDay ?? false,
    daysUntilNextRefinement:
      facts.daysUntilNextRefinement === undefined
        ? 2
        : facts.daysUntilNextRefinement,
    need: {
      ...need,
      lowPercentile: judged ? 50 : null,
      highPercentile: judged ? 85 : null,
      horizonWorkingDays: judged ? 5 : null,
      cycleStart: judged ? "2026-10-08" : null,
      cycleEnd: judged ? "2026-10-15" : null,
    },
  };
};

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

const terminologyRenaming = (renamed: Readonly<Record<string, string>>) =>
  seededTerminology.map((entry) => ({
    ...entry,
    value: renamed[entry.key] ?? entry.value,
  }));

const ok = (value: unknown): ApiResult => ({ ok: true, value });

const aLighthouse = (overrides: {
  readonly refinement?: ApiResult;
  readonly terminology?: ApiResult;
}) => {
  const asked: string[] = [];
  const client = {
    checkConnectivity: async () => ({ category: "success" }),
    getVersion: async () => ok("v26.10.7.1"),
    getTeam: async (teamId: number) => {
      asked.push(`team ${teamId}`);
      return ok({ id: teamId, name: GRAVITY });
    },
    getTeamRefinement: async (teamId: number) => {
      asked.push(`refinement ${teamId}`);
      return overrides.refinement ?? ok(gravitysRefinement());
    },
    getTerminology: async () => {
      asked.push("terminology");
      return overrides.terminology ?? ok(seededTerminology);
    },
  } as unknown as CliClient;

  const dependencies: RunCliCommandDependencies = {
    loadConnection: async () => ({
      mode: "server",
      endpointUrl: "http://localhost:5000",
      authMode: "disabled",
    }),
    saveConnection: async () => undefined,
    loadOutputFormat: async () => null,
    saveOutputFormat: async () => undefined,
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
    createClient: () => client,
  };
  return { dependencies, asked };
};

const refinementOfGravity = (...flags: string[]) => [
  "refinement",
  "get",
  "--team-id",
  String(GRAVITY_ID),
  ...flags,
];

// The output as a reader sees it: one entry per printed line, runs of spaces read as one.
const shownLines = (stdout: string): string[] =>
  stdout
    .split("\n")
    .map((line) => line.replaceAll(/\s+/gu, " ").trim())
    .filter((line) => line.length > 0);

// The output as prose, so a sentence wrapped over two lines still reads as one sentence.
const prose = (stdout: string): string =>
  stdout.replaceAll(/\s+/gu, " ").trim();

const ENOUGH_FOR_THE_NEXT_REFINEMENT =
  "enough for the next Refinement (85%) · not needed before then";

describe("lh refinement get", () => {
  // @walking_skeleton @driving_port
  it.skip("tells Priya in the web's words that Team Gravity is below its range, and marks the Work Items needed", async () => {
    const { dependencies } = aLighthouse({});

    const result = await runCliCommand(refinementOfGravity(), dependencies);

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines[0]).toBe(
      "Team Gravity · Next Refinement: Thu 8 Oct · in 2 days",
    );
    expect(prose(result.stdout)).toContain(
      "3 ready — below the range of 5–8 Work Items Team Gravity is likely to pull until the Refinement after. Refine 2 to 5 more.",
    );
    expect(lines).toContain("# Work Item Parent State");
    const eighth = lines.indexOf("8 GR-073 Bulk import GR-012 Refinement");
    expect(lines.slice(eighth - 7, eighth + 1)).toEqual([
      "1 GR-051 PDF export GR-010 Refinement",
      "2 GR-052 Saved filters GR-010 Refinement",
      "3 GR-055 Audit trail GR-011 Refinement",
      "4 GR-058 Team invites GR-011 Refinement",
      "5 GR-061 CSV import GR-012 Refinement",
      "6 GR-064 Webhooks GR-012 Refinement",
      "7 GR-070 Offline mode GR-013 Refinement",
      "8 GR-073 Bulk import GR-012 Refinement",
    ]);
    expect(lines[eighth + 1]).toContain(ENOUGH_FOR_THE_NEXT_REFINEMENT);
    expect(lines[eighth + 2]).toBe("GR-080 Dark mode - Refinement");
    // How the votes stand is a later list's to show.
    expect(result.stdout).not.toContain("MoreYesNeeded");
    expect(result.stdout).not.toContain("voteCount");
  });

  it.skip.each([
    {
      verdict: "Below",
      readyCount: 3,
      low: 5,
      high: 8,
      isRefinementDay: false,
      says: "3 ready — below the range of 5–8 Work Items Team Gravity is likely to pull until the Refinement after. Refine 2 to 5 more.",
    },
    {
      verdict: "In",
      readyCount: 6,
      low: 5,
      high: 8,
      isRefinementDay: false,
      says: "6 ready — in the range of 5–8. Nothing more needs refining by then.",
    },
    {
      verdict: "Above",
      readyCount: 10,
      low: 5,
      high: 8,
      isRefinementDay: false,
      says: "10 ready — above the range of 5–8. Stop refining: nothing more is needed by then.",
    },
    {
      verdict: "Below",
      readyCount: 0,
      low: 1,
      high: 1,
      isRefinementDay: false,
      says: "0 ready — below the 1 Work Item Team Gravity is likely to pull until the Refinement after. Refine 1 more.",
    },
    {
      verdict: "Below",
      readyCount: 3,
      low: 5,
      high: 8,
      isRefinementDay: true,
      says: "3 ready — below the range of 5–8 Work Items Team Gravity is likely to pull until the next Refinement. Refine 2 to 5 more.",
    },
  ])(
    "says '$says' for $readyCount ready against $low–$high ($verdict, Refinement day: $isRefinementDay)",
    async ({ verdict, readyCount, low, high, isRefinementDay, says }) => {
      const { dependencies } = aLighthouse({
        refinement: ok(
          gravitysRefinement({
            readyCount,
            isRefinementDay,
            need: { verdict, unavailableReason: null, low, high },
          }),
        ),
      });

      const result = await runCliCommand(refinementOfGravity(), dependencies);

      expect(result.exitCode).toBe(0);
      expect(prose(result.stdout)).toContain(says);
    },
  );

  it.skip.each([
    {
      listed: 9,
      high: 8,
      numbered: 8,
      lineFollows: "8 GR-073 Bulk import GR-012 Refinement",
      lineSays: ENOUGH_FOR_THE_NEXT_REFINEMENT,
    },
    {
      listed: 3,
      high: 8,
      numbered: 3,
      lineFollows: "3 GR-055 Audit trail GR-011 Refinement",
      lineSays:
        "All 3 Work Items in Refinement are needed before the next Refinement.",
    },
    {
      listed: 1,
      high: 8,
      numbered: 1,
      lineFollows: "1 GR-051 PDF export GR-010 Refinement",
      lineSays:
        "The only Work Item in Refinement is needed before the next Refinement.",
    },
    {
      listed: 2,
      high: 0,
      numbered: 0,
      lineFollows: "# Work Item Parent State",
      lineSays: ENOUGH_FOR_THE_NEXT_REFINEMENT,
    },
  ])(
    "with $listed listed and $high needed, numbers $numbered and draws the line after '$lineFollows'",
    async ({ listed, high, numbered, lineFollows, lineSays }) => {
      const { dependencies } = aLighthouse({
        refinement: ok(
          gravitysRefinement({
            readyCount: 2,
            workItems: gravitysBacklog.slice(0, listed),
            need: {
              verdict: high === 0 ? "Above" : "In",
              unavailableReason: null,
              low: 0,
              high,
            },
          }),
        ),
      });

      const result = await runCliCommand(refinementOfGravity(), dependencies);

      expect(result.exitCode).toBe(0);
      const lines = shownLines(result.stdout);
      const line = lines.indexOf(lineFollows) + 1;
      expect(line).toBeGreaterThan(0);
      expect(lines[line]).toContain(lineSays);
      const numberedRows = lines.filter((shown) => /^\d+ GR-/u.test(shown));
      expect(numberedRows).toHaveLength(numbered);
    },
  );

  it.skip.each([
    {
      unavailableReason: "NoCadence",
      refinementConfigured: true,
      nextRefinementDate: null,
      heading: "Team Gravity · No Refinement cadence",
      hint: "A Team admin can set a Refinement cadence to see how many Work Items are needed",
    },
    {
      unavailableReason: "InsufficientData",
      refinementConfigured: true,
      nextRefinementDate: "2026-10-08",
      heading: "Team Gravity · Next Refinement: Thu 8 Oct · in 2 days",
      hint: "Not enough data yet — need at least 5 days with completed items to forecast.",
    },
    {
      unavailableReason: "NoRefinementStates",
      refinementConfigured: false,
      nextRefinementDate: "2026-10-08",
      heading: "Team Gravity · No Refinement states",
      hint: "A Team admin needs to choose refinement states first",
    },
  ])(
    "says why there is no number when the reason is $unavailableReason, and lists the Work Items without a line",
    async ({
      unavailableReason,
      refinementConfigured,
      nextRefinementDate,
      heading,
      hint,
    }) => {
      const workItems = refinementConfigured ? gravitysBacklog.slice(0, 2) : [];
      const { dependencies } = aLighthouse({
        refinement: ok(
          gravitysRefinement({
            refinementConfigured,
            nextRefinementDate,
            daysUntilNextRefinement: nextRefinementDate === null ? null : 2,
            workItems,
            need: { verdict: null, unavailableReason, low: null, high: null },
          }),
        ),
      });

      const result = await runCliCommand(refinementOfGravity(), dependencies);

      expect(result.exitCode).toBe(0);
      const lines = shownLines(result.stdout);
      expect(lines[0]).toBe(heading);
      expect(prose(result.stdout)).toContain(hint);
      expect(result.stdout).not.toContain(" ready — ");
      expect(result.stdout).not.toContain("needed before the next");
      expect(lines.filter((shown) => /^\d+ GR-/u.test(shown))).toEqual([]);
      for (const listed of workItems) {
        expect(result.stdout).toContain(listed.referenceId);
      }
    },
  );

  it.skip("says it in the words the instance has renamed its terms to", async () => {
    const { dependencies } = aLighthouse({
      terminology: ok(
        terminologyRenaming({
          workItem: "Story",
          workItems: "Stories",
          refinement: "Grooming",
          // Left blank, the seeded word stands.
          refinements: "",
        }),
      ),
    });

    const result = await runCliCommand(refinementOfGravity(), dependencies);

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines[0]).toBe(
      "Team Gravity · Next Grooming: Thu 8 Oct · in 2 days",
    );
    expect(prose(result.stdout)).toContain(
      "3 ready — below the range of 5–8 Stories Team Gravity is likely to pull until the Grooming after. Refine 2 to 5 more.",
    );
    expect(lines).toContain("# Story Parent State");
    expect(prose(result.stdout)).toContain(
      "enough for the next Grooming (85%) · not needed before then",
    );
  });

  it.skip("falls back to the seeded words when the instance's terms cannot be read", async () => {
    const { dependencies } = aLighthouse({
      terminology: {
        ok: false,
        error: { category: "unexpected", reason: "terminology unavailable" },
      },
    });

    const result = await runCliCommand(refinementOfGravity(), dependencies);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)[0]).toBe(
      "Team Gravity · Next Refinement: Thu 8 Oct · in 2 days",
    );
    expect(prose(result.stdout)).toContain(
      "3 ready — below the range of 5–8 Work Items Team Gravity is likely to pull until the Refinement after. Refine 2 to 5 more.",
    );
    expect(result.stderr).toBe("");
  });

  it.skip.each([
    { flag: "--json", rendered: JSON.stringify(gravitysRefinement()) },
    { flag: "--toon", rendered: encode(gravitysRefinement() as never) },
  ])(
    "hands over the facts unchanged with $flag",
    async ({ flag, rendered }) => {
      const { dependencies } = aLighthouse({});

      const result = await runCliCommand(
        refinementOfGravity(flag),
        dependencies,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(rendered);
    },
  );

  it.skip.each([
    { args: ["refinement", "get"], says: "Missing required --team-id" },
    {
      args: ["refinement", "get", "--team-id", "gravity"],
      says: "Invalid --team-id",
    },
  ])("refuses $args without asking Lighthouse", async ({ args, says }) => {
    const { dependencies, asked } = aLighthouse({});

    const result = await runCliCommand(args, dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(says);
    expect(asked).toEqual([]);
  });

  it.skip("passes a Lighthouse refusal straight through", async () => {
    const { dependencies } = aLighthouse({
      refinement: {
        ok: false,
        error: {
          category: "misconfigured",
          reason:
            'This Lighthouse server (v26.10.3.6) does not support "teamRefinement". Upgrade Lighthouse to use this client feature.',
        },
      },
    });

    const result = await runCliCommand(refinementOfGravity(), dependencies);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Upgrade Lighthouse");
  });

  it.skip("lists the command in the refinement group help and the group in the overview", async () => {
    const { dependencies } = aLighthouse({});

    const group = await runCliCommand(["refinement"], dependencies);
    const overview = await runCliCommand(["help"], dependencies);

    expect(group.exitCode).toBe(0);
    expect(group.stdout).toContain("lh refinement get --team-id <id>");
    expect(shownLines(overview.stdout)).toContain("refinement");
  });
});
