import { describe, expect, it } from "vitest";
import {
  aBlackoutRule,
  aConnection,
  aFeature,
  aPortfolio,
  aTeam,
  fivePortfolios,
  gravity,
  gravitysBacktest,
  gravitysForecast,
  oceanExplorer,
  oceanExplorersDeliveries,
  oe002sWorkItems,
  ok,
  q4ReleaseHistory,
  sevenTeams,
  threeConnections,
  threeOceanExplorerFeatures,
} from "../../../test-support/lighthouseAnswers";
import {
  GRAVITYS_RANGE,
  gravitysMetrics,
  OCEAN_EXPLORERS_RANGE,
  oceanExplorersMetrics,
} from "../../../test-support/metricsAnswers";
import { aLighthouse } from "../test-support/cliHarness";
import { formatPayload } from "./output";

// Story 6218, KPI-1 (DSN-10): every `lh` form that answers a question or confirms a change has its own view,
// and every form is accounted for. The list below is the contract: 42 forms change, 10 stay as they are on
// purpose, each with its reason. The first describe is a guard, green today: a new subcommand or metric that
// nobody placed on either list fails it. The second is pending until the slice that converts each form.

const METRICS = (metric: string) => [
  "metrics",
  "team",
  "--id",
  "3",
  ...GRAVITYS_RANGE,
  "--metrics",
  metric,
];

const CHANGING_FORMS: readonly {
  readonly slice: string;
  readonly args: readonly string[];
}[] = [
  {
    slice: "01",
    args: [
      "forecast",
      "manual",
      "--team-id",
      "3",
      "--remaining",
      "25",
      "--target-date",
      "2026-10-30",
    ],
  },
  {
    slice: "01",
    args: [
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
  },
  { slice: "02", args: ["metrics", "team", "--id", "3", ...GRAVITYS_RANGE] },
  {
    slice: "02",
    args: ["metrics", "portfolio", "--id", "2", ...OCEAN_EXPLORERS_RANGE],
  },
  ...[
    "throughput",
    "wip",
    "cycleTime",
    "workItemAge",
    "totalWorkItemAge",
    "arrivals",
    "predictabilityScore",
    "blocked",
    "percentilesOverTime",
    "processBehaviorOverTime",
  ].map((metric) => ({ slice: "03", args: METRICS(metric) })),
  { slice: "04", args: METRICS("cumulativeStateTime") },
  { slice: "05", args: ["team", "list"] },
  { slice: "05", args: ["team", "get", "--id", "3"] },
  { slice: "05", args: ["portfolio", "list"] },
  { slice: "05", args: ["portfolio", "get", "--id", "2"] },
  { slice: "06", args: ["delivery", "list", "--portfolio-id", "2"] },
  { slice: "06", args: ["delivery", "metrics", "--delivery-id", "11"] },
  {
    slice: "06",
    args: ["delivery", "metrics", "--delivery-id", "11", "--detail", "epics"],
  },
  { slice: "07", args: ["feature", "get", "--ids", "2"] },
  { slice: "07", args: ["feature", "get", "--refs", "OE-001,OE-002,OE-007"] },
  { slice: "07", args: ["feature", "workitems", "--id", "2"] },
  {
    slice: "08",
    args: ["team", "create", "--payload-json", '{"name":"Lightspeed"}'],
  },
  {
    slice: "08",
    args: [
      "team",
      "update",
      "--id",
      "3",
      "--payload-json",
      '{"name":"Gravity"}',
    ],
  },
  { slice: "08", args: ["team", "delete", "--id", "9"] },
  { slice: "08", args: ["team", "refresh", "--id", "3"] },
  {
    slice: "08",
    args: ["portfolio", "create", "--payload-json", '{"name":"Apollo II"}'],
  },
  {
    slice: "08",
    args: [
      "portfolio",
      "update",
      "--id",
      "2",
      "--payload-json",
      '{"name":"Ocean Explorer"}',
    ],
  },
  { slice: "08", args: ["portfolio", "delete", "--id", "6"] },
  { slice: "08", args: ["portfolio", "refresh", "--id", "2"] },
  {
    slice: "08",
    args: [
      "blackout",
      "create",
      "--payload-json",
      '{"description":"Focus Friday"}',
    ],
  },
  {
    slice: "08",
    args: [
      "blackout",
      "update",
      "--id",
      "5",
      "--payload-json",
      '{"description":"Focus Friday"}',
    ],
  },
  { slice: "08", args: ["blackout", "delete", "--id", "5"] },
  { slice: "09", args: ["blackout", "list"] },
  { slice: "09", args: ["worktracking", "list"] },
  { slice: "09", args: ["worktracking", "get", "--id", "1"] },
  { slice: "09", args: ["version", "get"] },
  { slice: "09", args: ["health", "check"] },
];

// The standalone health sentence is the 42nd form: same command, another connection.
const STANDALONE_HEALTH_CHECK = { slice: "09", args: ["health", "check"] };

const UNCHANGED_ON_PURPOSE: Readonly<Record<string, string>> = {
  "refinement get":
    "already the web's words; the precedent every other view follows (story 6147)",
  "refinement vote":
    "already a one-line confirmation (story 6156); the style the writes copy",
  "refinement comment": "already a one-line confirmation (story 6156)",
  "refinement take-back": "already a one-line confirmation (story 6156)",
  "connection connect": "a dialogue, not an answer",
  "connection disconnect": "already a sentence",
  "connection status": "already Label: value lines",
  "config output": "already sentences (show and set)",
  "config voter": "already sentences (show and set)",
  help: "usage text, not a Lighthouse answer",
};

const formOf = (args: readonly string[]): string =>
  args[0] === "help" ? "help" : `${args[0]} ${args[1]}`;

const everyRead = () => ({
  getTeam: ok(gravity()),
  getPortfolio: ok(oceanExplorer()),
  runManualForecast: ok(gravitysForecast()),
  runBacktest: ok(gravitysBacktest()),
  ...gravitysMetrics(),
  ...oceanExplorersMetrics(),
  listTeams: ok(sevenTeams()),
  listPortfolios: ok(fivePortfolios()),
  listDeliveries: ok(oceanExplorersDeliveries()),
  getDeliveryMetricsHistory: ok(q4ReleaseHistory()),
  getFeaturesByIds: ok([aFeature()]),
  getFeaturesByReferences: ok(threeOceanExplorerFeatures()),
  getFeatureWorkItems: ok(oe002sWorkItems()),
  createTeam: ok(aTeam({ name: "Lightspeed", id: 9 })),
  updateTeam: ok(gravity()),
  deleteTeam: ok(undefined),
  refreshTeam: ok(undefined),
  createPortfolio: ok(aPortfolio({ name: "Apollo II", id: 6 })),
  updatePortfolio: ok(oceanExplorer()),
  deletePortfolio: ok(undefined),
  refreshPortfolio: ok(undefined),
  getRecurringBlackoutRules: ok([aBlackoutRule()]),
  createRecurringBlackoutRule: ok(aBlackoutRule()),
  updateRecurringBlackoutRule: ok(aBlackoutRule()),
  deleteRecurringBlackoutRule: ok(undefined),
  listWorkTrackingConnections: ok(threeConnections()),
  getWorkTrackingConnection: ok(aConnection()),
  getVersion: ok("v26.10.3.6"),
});

// What the form printed before this story: the generic view of the facts `--json` hands over, or today's
// hand-written line for the forms whose `--json` is that line.
const genericViewOf = async (
  lighthouse: ReturnType<typeof aLighthouse>,
  args: readonly string[],
): Promise<string> => {
  const facts = await lighthouse.run([...args, "--json"]);
  try {
    const parsed = JSON.parse(facts.stdout) as unknown;
    const generic = formatPayload(parsed, "pretty");
    return generic.ok ? generic.value : facts.stdout;
  } catch {
    return facts.stdout;
  }
};

describe("every lh form is accounted for", () => {
  // @US-09 @kpi — KPI-1 completeness, guard: green today
  it("lists every subcommand the help offers as either converted or unchanged on purpose", async () => {
    const lighthouse = aLighthouse(everyRead());
    const overview = await lighthouse.run(["help"]);
    const groupList =
      overview.stdout.split("Top-level groups:")[1]?.split("\n\n")[0] ?? "";
    const groups = groupList
      .split("\n")
      .map((line) => line.trim())
      .filter((group) => group.length > 0 && group !== "help");
    const offered = new Set<string>();
    for (const group of groups) {
      const help = await lighthouse.run([group]);
      for (const match of help.stdout.matchAll(
        /^\s*lh ([a-z]+) ([a-z-]+)/gmu,
      )) {
        offered.add(`${match[1]} ${match[2]}`);
      }
    }

    const accountedFor = new Set([
      ...CHANGING_FORMS.map((form) => formOf(form.args)),
      ...Object.keys(UNCHANGED_ON_PURPOSE),
    ]);
    expect(offered.size).toBeGreaterThan(20);
    expect([...offered].filter((form) => !accountedFor.has(form))).toEqual([]);
    expect(CHANGING_FORMS.length + 1).toBe(42);
  });

  // @US-03 @kpi — KPI-1 completeness over METRIC_KEYS, guard: green today
  it("gives every metric name lh accepts its own form", async () => {
    const refusal = await aLighthouse({}).run(METRICS("no-such-metric"));
    const allowed = (refusal.stderr.split("Allowed: ")[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const listed = CHANGING_FORMS.filter((form) =>
      form.args.includes("--metrics"),
    ).map((form) => form.args[form.args.indexOf("--metrics") + 1]);
    expect(allowed).toHaveLength(11);
    expect([...listed].sort()).toEqual([...allowed].sort());
  });
});

// Later slices move their forms into the delivered set as they ship.
const DELIVERED_SLICES: ReadonlySet<string> = new Set([
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
]);
const DELIVERED_FORMS = CHANGING_FORMS.filter((form) =>
  DELIVERED_SLICES.has(form.slice),
);
const PENDING_FORMS = CHANGING_FORMS.filter(
  (form) => !DELIVERED_SLICES.has(form.slice),
);

describe("every converted lh form has a view of its own", () => {
  // @driving_port @US-01..@US-09 @kpi — KPI-1: 0 forms left on the generic view
  const noLongerTheGenericView = async ({
    args,
  }: {
    readonly args: readonly string[];
  }) => {
    const lighthouse = aLighthouse(everyRead());

    const pretty = await lighthouse.run(args);
    const generic = await genericViewOf(lighthouse, args);

    expect(pretty.exitCode).toBe(0);
    expect(pretty.stderr).toBe("");
    expect(pretty.stdout).not.toBe(generic);
    expect(pretty.stdout).not.toContain("undefined");
  };

  it.each(DELIVERED_FORMS)(
    "slice $slice: `lh $args` no longer prints the generic view",
    noLongerTheGenericView,
  );

  it.skip.each(PENDING_FORMS)(
    "slice $slice: `lh $args` no longer prints the generic view",
    noLongerTheGenericView,
  );

  // @driving_port @US-09 @kpi — the 42nd form
  it.skip("slice 09: `lh health check` on a standalone Lighthouse no longer prints today's line", async () => {
    const lighthouse = aLighthouse(everyRead(), {
      connection: { mode: "standalone" },
    });

    const pretty = await lighthouse.run(STANDALONE_HEALTH_CHECK.args);

    expect(pretty.exitCode).toBe(0);
    expect(pretty.stdout).not.toBe("success");
  });
});
