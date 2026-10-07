import { encode } from "@toon-format/toon";
import { describe, expect, it } from "vitest";
import {
  EVERY_TERM_RENAMED,
  gravity,
  gravitysBacktest,
  gravitysForecast,
  ok,
  refused,
  seededWordsIn,
  terminology,
} from "../../../test-support/lighthouseAnswers";
import {
  aLighthouse,
  inTimeZone,
  looksLikeTheGenericView,
  NEVER_PRINTED,
  shownLines,
} from "../test-support/cliHarness";

// Story 6218, slice 01 (US-01): the forecast reads like the Forecast tab and Backtest Results.
// Every scenario but the format guards is pending until DELIVER slice 01 un-skips it.

const forecastOfGravity = (...flags: string[]) => [
  "forecast",
  "manual",
  "--team-id",
  "3",
  ...flags,
];

const forTwentyFiveByEndOfOctober = forecastOfGravity(
  "--remaining",
  "25",
  "--target-date",
  "2026-10-30",
);

const backtestOfGravity = (...flags: string[]) => [
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
  ...flags,
];

const gravitysLighthouse = (reads = {}) =>
  aLighthouse({
    getTeam: ok(gravity()),
    runManualForecast: ok(gravitysForecast()),
    runBacktest: ok(gravitysBacktest()),
    ...reads,
  });

const LIKELIHOOD_FOR_25 =
  "Likelihood to close 25 Work Items by Fri 30 Oct 2026";

describe("lh forecast manual --pretty", () => {
  // @driving_port @US-01 @contract-shape:pure-function
  it("tells Lena when Gravity's 25 Work Items will be done, in the Forecast tab's words and levels", async () => {
    const lighthouse = gravitysLighthouse();

    const result = await lighthouse.run(forTwentyFiveByEndOfOctober);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(shownLines(result.stdout)).toEqual([
      "Gravity · 25 Work Items · target Fri 30 Oct 2026",
      "When will 25 Work Items be done?",
      "Chance Level Date",
      "95% Certain Fri 13 Nov 2026",
      "85% Confident Mon 9 Nov 2026",
      "70% Realistic Wed 4 Nov 2026",
      "50% Risky Fri 30 Oct 2026",
      "How Many Work Items will you get done till Fri 30 Oct 2026?",
      "Chance Level Work Items",
      "95% Certain 16",
      "85% Confident 19",
      "70% Realistic 22",
      "50% Risky 25",
      `${LIKELIHOOD_FOR_25}: 48.20%`,
    ]);
    // KPI: the answer fits in 15 lines (from ~40 in the generic view).
    expect(shownLines(result.stdout).length).toBeLessThanOrEqual(15);
    expect(lighthouse.asked().sort()).toEqual([
      "getTeam",
      "getTerminology",
      "runManualForecast",
    ]);
  });

  // @boundary @US-01 — the web's thresholds (ForecastLevel.ts): ≤50 Risky, ≤70 Realistic, ≤85 Confident, else Certain
  it.each([
    { chance: 30, level: "Risky" },
    { chance: 50, level: "Risky" },
    { chance: 51, level: "Realistic" },
    { chance: 70, level: "Realistic" },
    { chance: 71, level: "Confident" },
    { chance: 85, level: "Confident" },
    { chance: 86, level: "Certain" },
    { chance: 95, level: "Certain" },
  ])(
    "names a $chance% chance $level, as the Forecast tab's icon does",
    async ({ chance, level }) => {
      const lighthouse = gravitysLighthouse({
        runManualForecast: ok(
          gravitysForecast({
            whenForecasts: [
              {
                probability: chance,
                expectedDate: "2026-11-09T00:00:00Z",
                filterApplied: false,
                excludedSummary: null,
              },
            ],
          }),
        ),
      });

      const result = await lighthouse.run(forTwentyFiveByEndOfOctober);

      expect(shownLines(result.stdout)).toContain(
        `${chance}% ${level} Mon 9 Nov 2026`,
      );
    },
  );

  // @boundary @US-01 — formatLikelihood.ts: >95% while work remains, two decimals otherwise
  it.each([
    { likelihood: 48.2034, remaining: 25, reads: "48.20%" },
    { likelihood: 95, remaining: 25, reads: "95.00%" },
    { likelihood: 95.01, remaining: 25, reads: ">95%" },
    { likelihood: 98.71, remaining: 6, reads: ">95%" },
    { likelihood: 0, remaining: 25, reads: "0.00%" },
  ])(
    "reads a likelihood of $likelihood with $remaining Work Items left as '$reads'",
    async ({ likelihood, remaining, reads }) => {
      const lighthouse = gravitysLighthouse({
        runManualForecast: ok(
          gravitysForecast({ likelihood, remainingItems: remaining }),
        ),
      });

      const result = await lighthouse.run(
        forecastOfGravity(
          "--remaining",
          String(remaining),
          "--target-date",
          "2026-10-30",
        ),
      );

      expect(shownLines(result.stdout)).toContain(
        `Likelihood to close ${remaining} Work Items by Fri 30 Oct 2026: ${reads}`,
      );
    },
  );

  // @error @US-01 — cannotForecast.ts
  it("says it cannot forecast when Lighthouse has no likelihood to give", async () => {
    const lighthouse = gravitysLighthouse({
      runManualForecast: ok(gravitysForecast({ likelihood: null })),
    });

    const result = await lighthouse.run(forTwentyFiveByEndOfOctober);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toContain(
      `${LIKELIHOOD_FOR_25}: Cannot forecast`,
    );
  });

  // @error @US-01 — insufficientForecastData.ts
  it("says a Team with too little history needs more days instead of giving a number", async () => {
    const lighthouse = gravitysLighthouse({
      getTeam: ok(gravity({ id: 2, name: "Lightspeed" })),
      runManualForecast: ok(
        gravitysForecast({ remainingItems: 10, hasSufficientData: false }),
      ),
    });

    const result = await lighthouse.run([
      "forecast",
      "manual",
      "--team-id",
      "2",
      "--remaining",
      "10",
      "--target-date",
      "2026-10-30",
    ]);

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toContain(
      "Not enough data yet — need at least 5 days with completed items to forecast.",
    );
    expect(result.stdout).not.toContain("Likelihood to close");
  });

  // @error @US-01 @version-skew — an older Lighthouse sends no hasSufficientData; absent is not "insufficient"
  it("states the likelihood as usual when an older Lighthouse does not say whether the history is enough", async () => {
    const { hasSufficientData: _notSent, ...olderAnswer } = gravitysForecast();
    const lighthouse = gravitysLighthouse({
      runManualForecast: ok(olderAnswer),
    });

    const result = await lighthouse.run(forTwentyFiveByEndOfOctober);

    expect(shownLines(result.stdout)).toContain(`${LIKELIHOOD_FOR_25}: 48.20%`);
    expect(result.stdout).not.toContain("Not enough data");
  });

  // @boundary @US-01 — AC-01.3
  it("shows only the When table when Lena asks only how long 25 Work Items take", async () => {
    const lighthouse = gravitysLighthouse({
      runManualForecast: ok(
        gravitysForecast({
          targetDate: null,
          likelihood: null,
          howManyForecasts: [],
        }),
      ),
    });

    const result = await lighthouse.run(forecastOfGravity("--remaining", "25"));

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines).toContain("When will 25 Work Items be done?");
    expect(lines).toContain("85% Confident Mon 9 Nov 2026");
    expect(result.stdout).not.toContain("How Many");
    expect(result.stdout).not.toContain("Likelihood to close");
  });

  // @boundary @US-01 — AC-01.3
  it("shows only the How Many table when Lena asks only what fits by a date", async () => {
    const lighthouse = gravitysLighthouse({
      runManualForecast: ok(
        gravitysForecast({
          remainingItems: 0,
          likelihood: null,
          whenForecasts: [],
        }),
      ),
    });

    const result = await lighthouse.run(
      forecastOfGravity("--target-date", "2026-10-30"),
    );

    expect(result.exitCode).toBe(0);
    const lines = shownLines(result.stdout);
    expect(lines).toContain(
      "How Many Work Items will you get done till Fri 30 Oct 2026?",
    );
    expect(lines).toContain("85% Confident 19");
    expect(result.stdout).not.toContain("When will");
    expect(result.stdout).not.toContain("Likelihood to close");
  });

  // @US-01 — ManualForecaster.tsx toggle label
  it("says in the heading when the forecast used the Team's filtered Throughput", async () => {
    const lighthouse = gravitysLighthouse({
      runManualForecast: ok(gravitysForecast({ filterApplied: true })),
    });

    const result = await lighthouse.run(
      forecastOfGravity(
        "--remaining",
        "25",
        "--target-date",
        "2026-10-30",
        "--filter",
        "filtered",
      ),
    );

    expect(shownLines(result.stdout)[0]).toBe(
      "Gravity · 25 Work Items · target Fri 30 Oct 2026 · Use filtered Throughput",
    );
  });

  // @US-01 @kpi — KPI-5: every configurable word is the instance's
  it("says it in the words an instance has renamed every term to", async () => {
    const lighthouse = gravitysLighthouse({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
      runManualForecast: ok(gravitysForecast({ filterApplied: true })),
    });

    const result = await lighthouse.run(forTwentyFiveByEndOfOctober);

    const lines = shownLines(result.stdout);
    expect(lines).toContain("When will 25 Tickets be done?");
    expect(lines).toContain(
      "How Many Tickets will you get done till Fri 30 Oct 2026?",
    );
    expect(lines).toContain(
      "Likelihood to close 25 Tickets by Fri 30 Oct 2026: 48.20%",
    );
    expect(lines[0]).toContain("Use filtered Flow Rate");
    expect(seededWordsIn(result.stdout)).toEqual([]);
  });

  // @error @infrastructure-failure @US-01 — D4: a failed Terminology read leaves the seeded words
  it("falls back to the seeded words when the instance's terms cannot be read", async () => {
    const lighthouse = gravitysLighthouse({
      getTerminology: refused("unexpected", "Terminology is unavailable"),
    });

    const result = await lighthouse.run(forTwentyFiveByEndOfOctober);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(shownLines(result.stdout)).toContain(
      "When will 25 Work Items be done?",
    );
  });

  // @error @infrastructure-failure @US-01 — C14: a heading is never worth an error
  it("heads the forecast with the Team's id when its name cannot be read", async () => {
    const lighthouse = gravitysLighthouse({
      getTeam: refused("forbidden", "You may not read this Team"),
    });

    const result = await lighthouse.run(forTwentyFiveByEndOfOctober);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(shownLines(result.stdout)[0]).toBe(
      "Team [id: 3] · 25 Work Items · target Fri 30 Oct 2026",
    );
  });

  // @error @version-skew @US-01 — D5 + M1: an answer lh does not recognise prints the generic view, silently
  it.each([
    {
      reshaped: "the dates are under another name",
      answer: (() => {
        const { whenForecasts, ...rest } = gravitysForecast();
        return { ...rest, completionForecasts: whenForecasts };
      })(),
    },
    {
      reshaped: "a date is not a date",
      answer: gravitysForecast({
        whenForecasts: [
          {
            probability: 85,
            expectedDate: "soon",
            filterApplied: false,
            excludedSummary: null,
          },
        ],
      }),
    },
  ])("shows the facts as they came when $reshaped", async ({ answer }) => {
    // The same command reads as the Forecast tab while the answer has the shape lh knows.
    const recognised = await gravitysLighthouse().run(
      forTwentyFiveByEndOfOctober,
    );
    expect(shownLines(recognised.stdout)).toContain(
      "When will 25 Work Items be done?",
    );
    const lighthouse = gravitysLighthouse({ runManualForecast: ok(answer) });

    const result = await lighthouse.run(forTwentyFiveByEndOfOctober);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(looksLikeTheGenericView(result.stdout)).toBe(true);
    expect(result.stdout).not.toContain("When will");
    for (const leak of ["undefined", "NaN", "[object Object]"]) {
      expect(result.stdout).not.toContain(leak);
    }
  });

  // @boundary @US-01 @reader-time-zone — D15: a calendar day is never shifted by the reader's zone
  it.each(["America/Adak", "Pacific/Kiritimati"])(
    "prints Lighthouse's days unshifted for a reader in %s",
    async (zone) => {
      const result = await inTimeZone(zone, () =>
        gravitysLighthouse().run(forTwentyFiveByEndOfOctober),
      );

      const lines = shownLines(result.stdout);
      expect(lines[0]).toBe("Gravity · 25 Work Items · target Fri 30 Oct 2026");
      expect(lines).toContain("95% Certain Fri 13 Nov 2026");
    },
  );
});

describe("lh forecast backtest --pretty", () => {
  // @driving_port @US-01 @contract-shape:pure-function
  it("shows Lena where September's actual landed among the forecast percentiles", async () => {
    const lighthouse = gravitysLighthouse();

    const result = await lighthouse.run(backtestOfGravity());

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)).toEqual([
      "Gravity · Backtest Results",
      "Period: Tue 1 Sep 2026 to Wed 30 Sep 2026 (historical data: Wed 1 Jul 2026 to Mon 31 Aug 2026)",
      "Forecast Percentiles",
      "Chance Work Items",
      "50% 24",
      "70% 21",
      "── Actual Throughput: 21 Work Items ──",
      "85% 18",
      "95% 15",
    ]);
  });

  // @boundary @US-01 — the chart's dashed line, in text (D9 / CHOSEN WORDING)
  it.each([
    { actual: 30, after: "Chance Work Items", before: "50% 24" },
    { actual: 19, after: "70% 21", before: "85% 18" },
    { actual: 10, after: "95% 15", before: undefined },
  ])(
    "draws an actual of $actual between '$after' and '$before'",
    async ({ actual, after, before }) => {
      const lighthouse = gravitysLighthouse({
        runBacktest: ok(gravitysBacktest({ actualThroughput: actual })),
      });

      const lines = shownLines(
        (await lighthouse.run(backtestOfGravity())).stdout,
      );

      const line = lines.indexOf(
        `── Actual Throughput: ${actual} Work Items ──`,
      );
      expect(line).toBeGreaterThan(0);
      expect(lines[line - 1]).toBe(after);
      expect(lines[line + 1]).toBe(before);
    },
  );

  // @error @infrastructure-failure @US-01
  it("heads the backtest with the Team's id when its name cannot be read", async () => {
    const lighthouse = gravitysLighthouse({
      getTeam: refused("unexpected", "Lighthouse did not answer"),
    });

    const result = await lighthouse.run(backtestOfGravity());

    expect(result.exitCode).toBe(0);
    expect(shownLines(result.stdout)[0]).toBe(
      "Team [id: 3] · Backtest Results",
    );
  });
});

// Guards, green today and on every slice after: the facts formats and the error form do not move (D4, KPI-2).
// The expected bytes are a fresh fixture serialised as today's code serialises it, never the CLI's own output.
describe("lh forecast keeps the facts formats and errors as they are", () => {
  // @driving_port @US-01 @contract-shape:unbounded-preservation
  it.each([
    { flag: "--json", serialise: (value: unknown) => JSON.stringify(value) },
    { flag: "--toon", serialise: (value: unknown) => encode(value as never) },
  ])(
    "hands scripts the manual forecast unchanged with $flag, and asks Lighthouse nothing more",
    async ({ flag, serialise }) => {
      const lighthouse = gravitysLighthouse();

      const result = await lighthouse.run([
        ...forTwentyFiveByEndOfOctober,
        flag,
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(serialise(gravitysForecast()));
      expect(lighthouse.asked()).toEqual(["runManualForecast"]);
    },
  );

  // @driving_port @US-01 @contract-shape:unbounded-preservation
  it.each([
    { flag: "--json", serialise: (value: unknown) => JSON.stringify(value) },
    { flag: "--toon", serialise: (value: unknown) => encode(value as never) },
  ])(
    "hands scripts the backtest unchanged with $flag, and asks Lighthouse nothing more",
    async ({ flag, serialise }) => {
      const lighthouse = gravitysLighthouse();

      const result = await lighthouse.run([...backtestOfGravity(), flag]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe(serialise(gravitysBacktest()));
      expect(lighthouse.asked()).toEqual(["runBacktest"]);
    },
  );

  // @error @US-01 — errors keep today's form (System Constraint 5)
  it("passes a Lighthouse refusal straight through, as today", async () => {
    const lighthouse = gravitysLighthouse({
      runManualForecast: refused(
        "dependency-failure",
        "Team 3 has no throughput history",
      ),
    });

    const result = await lighthouse.run(forTwentyFiveByEndOfOctober);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "dependency-failure: Team 3 has no throughput history",
    );
    for (const leak of NEVER_PRINTED) {
      expect(result.stderr).not.toContain(leak);
    }
  });
});
