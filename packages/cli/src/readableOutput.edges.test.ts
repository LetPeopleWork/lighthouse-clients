import {
  type AnswerWording,
  SEEDED_TERMS,
  UNKNOWN_SHAPE_NOTE,
} from "@letpeoplework/lighthouse-client";
import { beforeAll, describe, expect, it } from "vitest";
import {
  fivePortfolios,
  gravity,
  gravitysForecast,
  oceanExplorer,
  oceanExplorersDeliveries,
  ok,
  q4ReleaseHistory,
} from "../../../test-support/lighthouseAnswers";
import {
  GRAVITYS_RANGE,
  gravitysMetrics,
} from "../../../test-support/metricsAnswers";
import { aLighthouse, shownLines } from "../test-support/cliHarness";
import { renderDeliveryList, renderDeliveryMetrics } from "./deliveryOutput";
import { renderFeatureList, renderFeatureWorkItems } from "./featureOutput";
import { renderBacktest, renderManualForecast } from "./forecastOutput";
import { renderBlackoutRuleList } from "./housekeepingOutput";
import { renderMetricDays, renderMetricsHeadline } from "./metricsOutput";
import {
  renderOwnerList,
  renderPortfolio,
  renderPortfolioList,
  renderTeam,
} from "./ownerOutput";
import { renderBlackoutRuleWritten, renderOwnerWritten } from "./writeOutput";

const GRAVITY: AnswerWording = { terms: SEEDED_TERMS, name: "Gravity" };

// Every line as printed, blank ones kept, with the column padding collapsed.
const printedLines = (text: string | null): string[] =>
  (text ?? "").split("\n").map((line) => line.replaceAll(/\s+/gu, " ").trim());

describe("a pretty view handed an answer it does not know", () => {
  it.each([
    ["the Feature list", () => renderFeatureList(null, SEEDED_TERMS)],
    ["a Feature's Work Items", () => renderFeatureWorkItems(null, GRAVITY)],
    ["the blackout rules", () => renderBlackoutRuleList(null)],
    [
      "the Deliveries",
      () => renderDeliveryList(null, { id: 2, name: undefined }, SEEDED_TERMS),
    ],
    [
      "a Delivery's recorded days",
      () => renderDeliveryMetrics(null, 11, false, SEEDED_TERMS),
    ],
    ["the Team list", () => renderOwnerList(null, "team", SEEDED_TERMS)],
    ["the Portfolio list", () => renderPortfolioList(null, SEEDED_TERMS)],
    ["a Team", () => renderTeam(null, SEEDED_TERMS)],
    ["a Portfolio", () => renderPortfolio(null, SEEDED_TERMS)],
    ["a manual forecast", () => renderManualForecast(null, GRAVITY)],
    ["a backtest", () => renderBacktest(null, GRAVITY)],
    [
      "a written blackout rule",
      () => renderBlackoutRuleWritten("Created")(null),
    ],
    ["the metrics headline", () => renderMetricsHeadline(null, GRAVITY, 10)],
    [
      "a written Team",
      () => renderOwnerWritten("Created", "team", SEEDED_TERMS)(null),
    ],
  ])("leaves %s to the generic view", (_view, render) => {
    expect(render()).toBeNull();
  });
});

describe("the blank lines between a view's parts", () => {
  const withLatestDay = (facts: Record<string, unknown>) => {
    const history = q4ReleaseHistory();
    return {
      ...history,
      points: history.points.map((day, index) =>
        index === history.points.length - 1 ? { ...day, ...facts } : day,
      ),
    };
  };

  it.each([
    ["no chances", []],
    ["chances never recorded", null],
  ])(
    "sets the latest day apart, and leaves out a chance table with %s",
    (_case, whenDistribution) => {
      expect(
        printedLines(
          renderDeliveryMetrics(
            withLatestDay({ whenDistribution }),
            11,
            true,
            SEEDED_TERMS,
          ),
        ).slice(5),
      ).toEqual([
        "Tue 6 Oct 2026 34 21 55 3 78%",
        "",
        "On Tue 6 Oct 2026",
        "Feature Name Done Likelihood Size",
        "OE-001 Sonar mapping 100% — 12",
        "OE-002 Deep-sea camera stream 62% 81% 13",
        "OE-007 Pressure alarms 40% 74% 10 (default size)",
      ]);
    },
  );

  it("leaves out the How Many table and the likelihood a forecast without a target date cannot give", () => {
    expect(
      printedLines(
        renderManualForecast(
          gravitysForecast({ targetDate: null, howManyForecasts: [] }),
          GRAVITY,
        ),
      ),
    ).toEqual([
      "Gravity · 25 Work Items",
      "",
      "When will 25 Work Items be done?",
      "Chance Level Date",
      "95% Certain Fri 13 Nov 2026",
      "85% Confident Mon 9 Nov 2026",
      "70% Realistic Wed 4 Nov 2026",
      "50% Risky Fri 30 Oct 2026",
    ]);
  });

  it("sets the pointer to each Portfolio's Deliveries apart from the list", () => {
    expect(
      printedLines(renderPortfolioList(fivePortfolios(), SEEDED_TERMS)).slice(
        -2,
      ),
    ).toEqual([
      "",
      "Deliveries per Portfolio: lh delivery list --portfolio-id <id>",
    ]);
  });
});

describe("the metrics views at their edges", () => {
  const REFUSAL = {
    status: "error",
    category: "forbidden",
    reason: "No access",
  };
  const SECTION_KEYS = [
    "wip",
    "throughput",
    "arrivals",
    "blocked",
    "cycleTime",
    "workItemAge",
    "workItemAgePercentiles",
    "totalWorkItemAge",
    "predictabilityScore",
    "cumulativeStateTime",
    "percentilesOverTime",
    "processBehaviorOverTime",
  ];
  let composite: Record<string, unknown>;

  beforeAll(async () => {
    const result = await aLighthouse({
      getTeam: ok(gravity()),
      ...gravitysMetrics(),
    }).run(["metrics", "team", "--id", "3", ...GRAVITYS_RANGE, "--json"]);
    composite = JSON.parse(result.stdout);
  });

  const compositeWith = (facts: Record<string, unknown>) => ({
    ...structuredClone(composite),
    ...facts,
  });

  const withNested = (section: string, part: string, value: unknown) => ({
    [section]: {
      ...(composite[section] as Record<string, unknown>),
      [part]: value,
    },
  });

  it("prints the headline's parts one blank line apart, with nothing after the last", () => {
    expect(renderMetricsHeadline(composite, GRAVITY, 10)).toBe(
      [
        "Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)",
        "",
        "Work Items in Progress  9         System WIP Limit: 10 Work Items",
        "Total Throughput        31        1.0 / day",
        "Total Arrivals          28        0.9 / day",
        "Blocked Work Items      2",
        "Total Work Item Age     84 days   across 9 Work Items",
        "Predictability Score    63.4%",
        "Time in State           4 states  across 42 Work Items",
        "",
        "Percentile  Cycle Time  Work Item Age",
        "95th        21 days     18 days",
        "85th        12 days     11 days",
        "70th        8 days      6 days",
        "50th        5 days      3 days",
        "",
        "Over time (one row per recorded day: lh metrics team --id 3 --metrics <name>)",
        "Cycle Time 85th percentile  14 days on Mon 7 Sep → 12 days on Tue 6 Oct  29 days recorded",
        "Throughput process limits   0 – 3.1 / day, average 1.0, on Tue 6 Oct     29 days recorded",
        "Blocked Work Items          1 on Mon 7 Sep → 2 on Tue 6 Oct              30 days recorded",
      ].join("\n"),
    );
  });

  it("prints only the heading for a composite that holds no section", () => {
    const bare = compositeWith({});
    for (const key of SECTION_KEYS) {
      delete bare[key];
    }

    expect(renderMetricsHeadline(bare, GRAVITY, 10)).toBe(
      "Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)",
    );
  });

  it.each([
    ["wip", "Work Items in Progress"],
    ["throughput", "Total Throughput"],
    ["arrivals", "Total Arrivals"],
    ["cumulativeStateTime", "Time in State"],
    ["cycleTime", "Cycle Time percentiles"],
    ["workItemAgePercentiles", "Work Item Age percentiles"],
    ["blocked", "Blocked Work Items"],
    ["workItemAge", "Work Item Age over time"],
    ["percentilesOverTime", "Cycle Time 85th percentile"],
    ["processBehaviorOverTime", "Throughput process limits"],
  ])("names a %s section in a shape it does not know as '%s'", (key, label) => {
    const lines = shownLines(
      renderMetricsHeadline(compositeWith({ [key]: "unknown" }), GRAVITY, 10) ??
        "",
    );

    expect(lines).toContain(`${label} ${UNKNOWN_SHAPE_NOTE}`);
  });

  it.each([
    ["wip", "current", "Work Items in Progress"],
    ["cumulativeStateTime", "bar", "Time in State"],
    ["cycleTime", "percentiles", "Cycle Time percentiles"],
  ])("states a refused %s.%s in its place as '%s'", (section, part, label) => {
    const lines = shownLines(
      renderMetricsHeadline(
        compositeWith(withNested(section, part, REFUSAL)),
        GRAVITY,
        10,
      ) ?? "",
    );

    expect(lines).toContain(`${label} forbidden: No access`);
  });

  it("counts no blocked Work Items when today's Work Items in progress were refused", () => {
    const lines = shownLines(
      renderMetricsHeadline(
        compositeWith(withNested("wip", "current", REFUSAL)),
        GRAVITY,
        10,
      ) ?? "",
    );

    expect(
      lines.filter((line) => line.startsWith("Blocked Work Items ")),
    ).toEqual([
      "Blocked Work Items 1 on Mon 7 Sep → 2 on Tue 6 Oct 30 days recorded",
    ]);
  });

  it("prints no percentile table when neither percentile was answered", () => {
    const lines = shownLines(
      renderMetricsHeadline(
        compositeWith({
          ...withNested("cycleTime", "percentiles", REFUSAL),
          workItemAgePercentiles: REFUSAL,
        }),
        GRAVITY,
        10,
      ) ?? "",
    );

    expect(lines).not.toContain("Percentile Cycle Time Work Item Age");
    expect(lines).toContain("Work Item Age percentiles forbidden: No access");
  });

  it("prints each metric asked for one blank line apart, its table one blank line under its sentence", () => {
    const lines = printedLines(
      renderMetricDays(composite, GRAVITY, [
        "throughput",
        "predictabilityScore",
      ]),
    );

    expect(lines.slice(0, 4)).toEqual([
      "Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)",
      "Total Throughput: 31 Work Items, 1.0 / day",
      "",
      "Date Work Items closed",
    ]);
    const score = lines.indexOf("Predictability Score: 63.4%");
    expect(lines.slice(score - 2, score)).toEqual(["Tue 6 Oct 2026 3", ""]);
  });

  it.each([
    ["no metric", ["throughput"], null],
    ["a metric it has no day view for", ["nonsense"], undefined],
    ["no names", [], undefined],
  ])("prints no day view for %s", (_case, names, value) => {
    expect(
      renderMetricDays(value === null ? null : composite, GRAVITY, names),
    ).toBeNull();
  });

  it.each([
    ["throughput", ["throughput"], { throughput: REFUSAL }],
    ["wip", ["wip"], { wip: REFUSAL }],
    ["cycleTime", ["cycleTime"], { cycleTime: REFUSAL }],
    ["wip", ["wip"], "wip.current"],
    ["wip", ["wip"], "wip.overTime"],
    ["cycleTime", ["cycleTime"], "cycleTime.percentiles"],
    ["cycleTime", ["cycleTime"], "cycleTime.closedItems"],
    ["workItemAge", ["workItemAge"], { workItemAgePercentiles: REFUSAL }],
    ["workItemAge", ["workItemAge"], { workItemAge: REFUSAL }],
    [
      "cumulativeStateTime",
      ["cumulativeStateTime"],
      { cumulativeStateTime: REFUSAL },
    ],
    ["cumulativeStateTime", ["cumulativeStateTime"], "cumulativeStateTime.bar"],
    [
      "cumulativeStateTime",
      ["cumulativeStateTime"],
      "cumulativeStateTime.items",
    ],
  ])(
    "leaves a refused %s to the generic view (%j)",
    (_metric, names, refusedPart) => {
      const facts =
        typeof refusedPart === "string"
          ? withNested(
              refusedPart.split(".")[0],
              refusedPart.split(".")[1],
              REFUSAL,
            )
          : refusedPart;

      expect(renderMetricDays(compositeWith(facts), GRAVITY, names)).toBeNull();
    },
  );
});

describe("lh reads it needs only for its words", () => {
  it("asks for the forecast by the target date it was given", async () => {
    const lighthouse = aLighthouse({
      getTeam: ok(gravity()),
      runManualForecast: ok(gravitysForecast()),
    });

    await lighthouse.run([
      "forecast",
      "manual",
      "--team-id",
      "3",
      "--remaining",
      "25",
      "--target-date",
      "2026-10-30",
    ]);

    const forecast = lighthouse
      .calls()
      .find((call) => call.read === "runManualForecast");
    expect(forecast?.args[1]).toMatchObject({ targetDate: "2026-10-30" });
  });

  it.each([
    ["no cycle time definition is asked for", ["--metrics", "cycleTime"]],
    [
      "the cycle time view is not asked for",
      ["--metrics", "throughput", "--definition-id", "4"],
    ],
    ["no metric is named", ["--definition-id", "4"]],
  ])("reads no Team settings when %s", async (_case, flags) => {
    const lighthouse = aLighthouse({
      getTeam: ok(gravity()),
      ...gravitysMetrics(),
    });

    const result = await lighthouse.run([
      "metrics",
      "team",
      "--id",
      "3",
      ...GRAVITYS_RANGE,
      ...flags,
    ]);

    expect(result.exitCode).toBe(0);
    expect(lighthouse.asked()).not.toContain("getTeamSettings");
  });

  it("reads no Team settings for a Portfolio's cycle time", async () => {
    const lighthouse = aLighthouse({
      getPortfolio: ok(oceanExplorer()),
      ...gravitysMetrics(),
    });

    await lighthouse.run([
      "metrics",
      "portfolio",
      "--id",
      "2",
      ...GRAVITYS_RANGE,
      "--metrics",
      "cycleTime",
      "--definition-id",
      "4",
    ]);

    expect(lighthouse.asked()).not.toContain("getTeamSettings");
  });

  it("says Cycle Time when the Team's settings cannot be read at all", async () => {
    const lighthouse = aLighthouse({
      getTeam: ok(gravity()),
      ...gravitysMetrics(),
      getTeamSettings: () => {
        throw new Error("connection reset");
      },
    });

    const result = await lighthouse.run([
      "metrics",
      "team",
      "--id",
      "3",
      ...GRAVITYS_RANGE,
      "--metrics",
      "cycleTime",
      "--definition-id",
      "4",
    ]);

    expect(shownLines(result.stdout)[1]).toBe(
      "Cycle Time Percentiles: 50th 5 days · 70th 8 days · 85th 12 days · 95th 21 days",
    );
  });

  it("still prints the headline when the Team cannot be read at all", async () => {
    const lighthouse = aLighthouse({
      ...gravitysMetrics(),
      getTeam: () => {
        throw new Error("connection reset");
      },
    });

    const result = await lighthouse.run([
      "metrics",
      "team",
      "--id",
      "3",
      ...GRAVITYS_RANGE,
    ]);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)[0]).toBe(
      "Team [id: 3] · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)",
    );
  });

  it.each([
    [
      "cannot be read at all",
      () => {
        throw new Error("connection reset");
      },
    ],
    ["answers in a shape it does not know", ok({ id: 2 })],
  ])(
    "heads the Deliveries with the Portfolio's term and id when the Portfolio %s",
    async (_case, answer) => {
      const lighthouse = aLighthouse({
        listDeliveries: ok(oceanExplorersDeliveries()),
        getPortfolio: answer,
      });

      const result = await lighthouse.run([
        "delivery",
        "list",
        "--portfolio-id",
        "2",
      ]);

      expect(shownLines(result.stdout)[0]).toBe(
        "Portfolio [id: 2] · Deliveries",
      );
    },
  );
});
