import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  aBatchOf,
  aFakeLighthouse,
  BATCH_LH_SENDS_FOR_A_VOTE_THAT_MADE_READY,
  type FakeLighthouse,
  type RefinementFacts,
} from "../../../test-support/fakeLighthouse";
import {
  aMachine,
  anEarlierAnswer,
  aYesGiven,
  connectedTo,
  HOURS,
  lhOn,
  type Machine,
  NO_TERMINAL,
} from "../test-support/lhSession";

// With usage data on, lh reports the web's own event for each action the web
// reports, after Lighthouse answered it, from the answer it already holds, with source Cli; refused,
// failed and unmapped commands report nothing, and nothing lh prints changes. A vote's moment and the
// Refinement day's verdict follow the web's own rules, read from Lighthouse's answer, never from a clock.
// Driving port: `runCliSession`, with a yes kept an hour ago and no terminal (so nobody is asked).

const LENAS_TOKEN = "lenas-usage-data-token-5c1d0e9a7b36";

const lenaWhoSaidYes = async (lighthouse: FakeLighthouse): Promise<Machine> => {
  const lena = await connectedTo(aMachine(), lighthouse.url);
  await anEarlierAnswer(
    lena,
    lighthouse.url,
    aYesGiven(LENAS_TOKEN, 1 * HOURS),
  );
  return lena;
};

const lhAt = (machine: Machine, env: Readonly<Record<string, string>> = {}) =>
  lhOn(machine, { terminal: NO_TERMINAL, env });

const reported = (lighthouse: FakeLighthouse) =>
  lighthouse.handedIn().map(({ batch }) => batch);

const PAYLOAD_FILES = {
  team: { name: "Lightspeed" },
  portfolio: { name: "Apollo II" },
};

const VOTE_YES_ON_GR_061 = [
  "refinement",
  "vote",
  "--team-id",
  "3",
  "--work-item",
  "GR-061",
  "--answer",
  "yes",
];

const REFINEMENT_OF_GRAVITY = ["refinement", "get", "--team-id", "3"];

describe("each mapped command reports its web event once, after it succeeded", () => {
  // @US-04 @driving_port @real-io @kpi @contract-shape:bounded-change
  // Each is the web's own event, so lh's share of it can be counted beside the browser's. The eighth
  // mapped command, the forecast, is covered in usageDataQuestion.test.ts, where it is first reported.
  it.each<[string, string, readonly string[]]>([
    [
      "team create",
      "TeamCreated",
      ["team", "create", "--payload-file", "@team"],
    ],
    ["team delete", "TeamDeleted", ["team", "delete", "--id", "9"]],
    ["team refresh", "TeamRefreshTriggered", ["team", "refresh", "--id", "3"]],
    [
      "portfolio create",
      "PortfolioCreated",
      ["portfolio", "create", "--payload-file", "@portfolio"],
    ],
    [
      "portfolio delete",
      "PortfolioDeleted",
      ["portfolio", "delete", "--id", "6"],
    ],
    [
      "portfolio refresh",
      "PortfolioRefreshTriggered",
      ["portfolio", "refresh", "--id", "2"],
    ],
    [
      "forecast manual",
      "TeamManualForecastRun",
      ["forecast", "manual", "--team-id", "3", "--remaining", "25"],
    ],
  ])("lh %s reports %s from the command line", async (_command, name, args) => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaWhoSaidYes(lighthouse);
    const withFiles = await withPayloadFiles(lena, args);

    const run = await lhAt(lena).run(withFiles);

    expect(run.exitCode).toBe(0);
    expect(reported(lighthouse)).toEqual([aBatchOf("Cli", { name })]);
    expect(lighthouse.handedIn()[0]?.token).toBe(LENAS_TOKEN);
  });

  // Scripts read the forecast as --json or --toon; it counts the same as the forecast a person reads.
  it.each(["--json", "--toon"])(
    "lh forecast manual %s reports TeamManualForecastRun from the command line",
    async (format) => {
      const lighthouse = await aFakeLighthouse();
      const lena = await lenaWhoSaidYes(lighthouse);

      const run = await lhAt(lena).run([
        "forecast",
        "manual",
        "--team-id",
        "3",
        "--remaining",
        "25",
        format,
      ]);

      expect(run.exitCode).toBe(0);
      expect(reported(lighthouse)).toEqual([
        aBatchOf("Cli", { name: "TeamManualForecastRun" }),
      ]);
    },
  );

  // @US-04 @driving_port @real-io @adapter-integration @kpi @contract-shape:bounded-change
  // The cross-repository contract, consumer side: lh sends exactly the body Lighthouse's own test posts.
  it("reports a Refinement-day vote that made GR-061 Ready as exactly the batch Lighthouse's own test takes in", async () => {
    const lighthouse = await aFakeLighthouse({
      refinement: { isRefinementDay: true },
      voteMadeReady: true,
    });
    const priya = await lenaWhoSaidYes(lighthouse);

    const run = await lhAt(priya).run(VOTE_YES_ON_GR_061);

    expect(run.exitCode).toBe(0);
    expect(reported(lighthouse)).toEqual([
      JSON.parse(BATCH_LH_SENDS_FOR_A_VOTE_THAT_MADE_READY),
    ]);
  });

  // @US-04 @driving_port @real-io @property @contract-shape:pure-function
  // The web's rule, restated from Lighthouse's answer: no next Refinement date is no cadence; a Refinement day
  // is that; any other day is another day. One vote, so only TeamSizingVoteCast.
  it.each<[string, string, RefinementFacts]>([
    [
      "a Team with no Refinement cadence",
      "NoCadence",
      { nextRefinementDate: null },
    ],
    ["the Team's Refinement day", "OnRefinementDay", { isRefinementDay: true }],
    ["any other day", "OnOtherDay", { isRefinementDay: false }],
    [
      "no cadence, whatever the day says",
      "NoCadence",
      { nextRefinementDate: null, isRefinementDay: true },
    ],
  ])(
    "reports a vote cast on %s as cast %s",
    async (_day, sizingMoment, refinement) => {
      const lighthouse = await aFakeLighthouse({ refinement });
      const priya = await lenaWhoSaidYes(lighthouse);

      await lhAt(priya).run(VOTE_YES_ON_GR_061);

      expect(reported(lighthouse)).toEqual([
        aBatchOf("Cli", { name: "TeamSizingVoteCast", sizingMoment }),
      ]);
    },
  );

  // @US-04 @driving_port @real-io @contract-shape:unbounded-preservation
  // The moment comes from the read every vote already makes, so a vote whose read fails is not cast, as
  // today, and nothing is reported for it.
  it("reports nothing when the read before Priya's vote is refused, and the vote is refused as today", async () => {
    const lighthouse = await aFakeLighthouse({
      replies: {
        "GET /teams/3/refinement": {
          status: 503,
          body: { title: "Service unavailable", status: 503 },
        },
      },
    });
    const priya = await lenaWhoSaidYes(lighthouse);

    const run = await lhAt(priya).run(VOTE_YES_ON_GR_061);

    expect(run.exitCode).toBe(1);
    expect(lighthouse.operations()).not.toContain(
      "POST /teams/3/refinement/work-items/GR-061/votes",
    );
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-04 @driving_port @real-io @property @contract-shape:pure-function
  // On a Refinement day with Work Items listed, the verdict the Refinement shows; None when it shows no number.
  it.each<["Below" | "In" | "Above" | null, string]>([
    ["Below", "Below"],
    ["In", "In"],
    ["Above", "Above"],
    [null, "None"],
  ])(
    "reports the Refinement day's verdict %s as %s when lh refinement get shows it",
    async (verdict, refinementVerdict) => {
      const lighthouse = await aFakeLighthouse({
        refinement: { isRefinementDay: true, verdict },
      });
      const priya = await lenaWhoSaidYes(lighthouse);

      const run = await lhAt(priya).run(REFINEMENT_OF_GRAVITY);

      expect(run.exitCode).toBe(0);
      expect(reported(lighthouse)).toEqual([
        aBatchOf("Cli", {
          name: "TeamRefinementDayVerdictShown",
          refinementVerdict,
        }),
      ]);
    },
  );

  // @US-04 @driving_port @real-io @boundary @contract-shape:unbounded-preservation
  it.each<[string, RefinementFacts]>([
    [
      "on a day that is not the Team's Refinement day",
      { isRefinementDay: false },
    ],
    [
      "on a Refinement day with no Work Item listed",
      { isRefinementDay: true, workItemsListed: 0 },
    ],
  ])("reports no verdict %s", async (_when, refinement) => {
    const lighthouse = await aFakeLighthouse({ refinement });
    const priya = await lenaWhoSaidYes(lighthouse);

    await lhAt(priya).run(REFINEMENT_OF_GRAVITY);

    expect(lighthouse.handedIn()).toEqual([]);
  });
});

describe("refused, failed and unmapped commands report nothing", () => {
  // @US-04 @driving_port @real-io @error @contract-shape:unbounded-preservation
  it.each<
    [
      string,
      readonly string[],
      Readonly<Record<string, { status: number; body: unknown }>>,
    ]
  >([
    ["a delete Lighthouse refuses", ["team", "delete", "--id", "99"], {}],
    [
      "a forecast Lighthouse refuses",
      ["forecast", "manual", "--team-id", "3", "--remaining", "25"],
      {
        "POST /forecast/manual/3": {
          status: 400,
          body: { title: "Not enough data", status: 400 },
        },
      },
    ],
    [
      "a refresh Lighthouse fails",
      ["team", "refresh", "--id", "3"],
      {
        "POST /teams/3": {
          status: 500,
          body: { title: "Something went wrong.", status: 500 },
        },
      },
    ],
  ])("reports nothing for %s", async (_what, args, replies) => {
    const lighthouse = await aFakeLighthouse({ replies });
    const lena = await lenaWhoSaidYes(lighthouse);

    const run = await lhAt(lena).run(args);

    expect(run.exitCode).toBe(1);
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-04 @driving_port @real-io @error @kpi @contract-shape:unbounded-preservation
  // No client bar on an event the clients have no action for, and no new meaning under an old name
  // (backtest is not a reality check; a comment or a take-back is not a vote; an edit is not a first set-up).
  it.each<[string, readonly string[]]>([
    [
      "forecast backtest",
      [
        "forecast",
        "backtest",
        "--team-id",
        "3",
        "--start-date",
        "2026-09-01",
        "--end-date",
        "2026-09-30",
        "--hist-start-date",
        "2026-07-01",
        "--hist-end-date",
        "2026-08-31",
      ],
    ],
    [
      "refinement comment",
      [
        "refinement",
        "comment",
        "--team-id",
        "3",
        "--work-item",
        "GR-061",
        "--text",
        "Split the export out",
      ],
    ],
    [
      "refinement take-back",
      ["refinement", "take-back", "--team-id", "3", "--work-item", "GR-061"],
    ],
    ["team update", ["team", "update", "--id", "3", "--payload-file", "@team"]],
    [
      "portfolio update",
      ["portfolio", "update", "--id", "2", "--payload-file", "@portfolio"],
    ],
    ["team list", ["team", "list"]],
    ["team get", ["team", "get", "--id", "3"]],
    ["portfolio list", ["portfolio", "list"]],
    ["version get", ["version", "get"]],
  ])("reports nothing for lh %s", async (_command, args) => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaWhoSaidYes(lighthouse);
    const withFiles = await withPayloadFiles(lena, args);

    await lhAt(lena).run(withFiles);

    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-04 @driving_port @real-io @boundary @contract-shape:bounded-change
  it("reports one verdict for one lh refinement get, however many Work Items it lists", async () => {
    const lighthouse = await aFakeLighthouse({
      refinement: { isRefinementDay: true, workItemsListed: 3 },
    });
    const priya = await lenaWhoSaidYes(lighthouse);

    await lhAt(priya).run(REFINEMENT_OF_GRAVITY);

    expect(reported(lighthouse)).toEqual([
      {
        source: "Cli",
        events: [
          expect.objectContaining({ name: "TeamRefinementDayVerdictShown" }),
        ],
      },
    ]);
  });
});

describe("usage data changes nothing lh prints, and costs nothing when it is off", () => {
  const MAPPED: readonly (readonly string[])[] = [
    ["team", "create", "--payload-file", "@team"],
    ["team", "delete", "--id", "9"],
    ["team", "refresh", "--id", "3"],
    ["portfolio", "create", "--payload-file", "@portfolio"],
    ["portfolio", "delete", "--id", "6"],
    ["portfolio", "refresh", "--id", "2"],
    ["forecast", "manual", "--team-id", "3", "--remaining", "25"],
    VOTE_YES_ON_GR_061,
    REFINEMENT_OF_GRAVITY,
  ];
  const EVERY_FORMAT = ["--pretty", "--json", "--toon"];

  // @US-04 @driving_port @real-io @kpi @contract-shape:unbounded-preservation
  // Usage data must stay invisible: for every mapped command and format, what lh prints and its exit code
  // with usage data on are exactly those with it off.
  it.each(
    MAPPED.flatMap((args) =>
      EVERY_FORMAT.map(
        (format) => [args.slice(0, 2).join(" "), format, args] as const,
      ),
    ),
  )(
    "lh %s %s prints the same and exits the same with usage data on as off",
    async (_command, format, args) => {
      const lighthouse = await aFakeLighthouse({
        refinement: { isRefinementDay: true },
      });
      const lenaOff = await connectedTo(aMachine(), lighthouse.url);
      const lenaOn = await lenaWhoSaidYes(lighthouse);

      const off = await lhAt(lenaOff).run([
        ...(await withPayloadFiles(lenaOff, args)),
        format,
      ]);
      const on = await lhAt(lenaOn).run([
        ...(await withPayloadFiles(lenaOn, args)),
        format,
      ]);

      expect(on.stdout).toBe(off.stdout);
      expect(on.stderr).toBe(off.stderr);
      expect(on.exitCode).toBe(off.exitCode);
      expect(lighthouse.handedIn().length).toBeGreaterThan(0);
    },
  );

  // @US-04 @driving_port @real-io @kpi @contract-shape:unbounded-preservation
  // With usage data off nothing extra is read and nothing is posted; with it on, the only extra requests are
  // usage data ones (the vote's moment and the verdict come from reads the command makes anyway).
  it.each(MAPPED.map((args) => [args.slice(0, 2).join(" "), args] as const))(
    "lh %s reads from Lighthouse exactly what it reads with usage data off",
    async (_command, args) => {
      const offLighthouse = await aFakeLighthouse({
        refinement: { isRefinementDay: true },
      });
      const onLighthouse = await aFakeLighthouse({
        refinement: { isRefinementDay: true },
      });
      const lenaOff = await connectedTo(aMachine(), offLighthouse.url);
      const lenaOn = await lenaWhoSaidYes(onLighthouse);

      await lhAt(lenaOff).run(await withPayloadFiles(lenaOff, args));
      await lhAt(lenaOn).run(await withPayloadFiles(lenaOn, args));

      expect(offLighthouse.usageDataRequests()).toEqual([]);
      expect(onLighthouse.operations()).toEqual(offLighthouse.operations());
    },
  );
});

/** Writes the payload files a create or update names (`@team`, `@portfolio`) into the machine's home. */
const withPayloadFiles = async (
  machine: Machine,
  args: readonly string[],
): Promise<string[]> => {
  const written: string[] = [];
  for (const argument of args) {
    const kind = argument.startsWith("@")
      ? (argument.slice(1) as keyof typeof PAYLOAD_FILES)
      : undefined;
    if (kind === undefined) {
      written.push(argument);
      continue;
    }
    const path = join(machine.home, `${kind}.json`);
    await writeFile(path, JSON.stringify(PAYLOAD_FILES[kind]), "utf8");
    written.push(path);
  }
  return written;
};
