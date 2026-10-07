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
  anAssistantOn,
  answerOf,
  factsBlockOf,
} from "../test-support/mcpHarness";

// Story 6218, slice 01: the forecast tools hand an assistant the facts plus the `summary` lh prints above its
// tables (ADR-224: an object answer gains a `summary` field, nothing else changes).

const MANUAL = "lighthouse_forecast_manual";
const BACKTEST = "lighthouse_forecast_backtest";
const FORECAST_LABEL = "forecast: ";

const manualArguments = { id: 3, remainingItems: 25, targetDate: "2026-10-30" };
const backtestArguments = {
  id: 3,
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  historicalStartDate: "2026-07-01",
  historicalEndDate: "2026-08-31",
};

const gravitysAssistant = (reads = {}) =>
  anAssistantOn({
    getTeam: ok(gravity()),
    runManualForecast: ok(gravitysForecast()),
    runBacktest: ok(gravitysBacktest()),
    ...reads,
  });

describe("the forecast tools' summary", () => {
  // @driving_port @US-01 @contract-shape:bounded-change
  it("hands an assistant the manual forecast's facts together with the heading and sentence lh prints", async () => {
    const assistant = gravitysAssistant();

    const result = await assistant.call(MANUAL, manualArguments);

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(answerOf(result, FORECAST_LABEL)).toEqual({
      summary:
        "Gravity · 25 Work Items · target Fri 30 Oct 2026\nLikelihood to close 25 Work Items by Fri 30 Oct 2026: 48.20%",
      ...gravitysForecast(),
    });
  });

  // @driving_port @US-01 @contract-shape:bounded-change
  it("hands an assistant the backtest's facts together with its heading and period", async () => {
    const assistant = gravitysAssistant();

    const result = await assistant.call(BACKTEST, backtestArguments);

    expect(result.isError).toBe(false);
    const { summary, ...facts } = answerOf(result, "backtest: ");
    expect(facts).toEqual(gravitysBacktest());
    expect(typeof summary).toBe("string");
    expect(summary).toContain("Gravity · Backtest Results");
    expect(summary).toContain(
      "Period: Tue 1 Sep 2026 to Wed 30 Sep 2026 (historical data: Wed 1 Jul 2026 to Mon 31 Aug 2026)",
    );
  });

  // @error @infrastructure-failure @US-01 — the summary's reads never fail the tool
  it("words the summary with the seeded words and the Team's id when neither can be read", async () => {
    const assistant = gravitysAssistant({
      getTeam: refused("forbidden", "You may not read this Team"),
      getTerminology: refused("unexpected", "Terminology is unavailable"),
    });

    const result = await assistant.call(MANUAL, manualArguments);

    expect(result.isError).toBe(false);
    expect(answerOf(result, FORECAST_LABEL).summary).toBe(
      "Team [id: 3] · 25 Work Items · target Fri 30 Oct 2026\nLikelihood to close 25 Work Items by Fri 30 Oct 2026: 48.20%",
    );
  });

  // @US-01 @kpi — KPI-5
  it("words the summary in the instance's renamed terms", async () => {
    const assistant = gravitysAssistant({
      getTerminology: ok(terminology(EVERY_TERM_RENAMED)),
    });

    const result = await assistant.call(MANUAL, manualArguments);

    const summary = String(answerOf(result, FORECAST_LABEL).summary);
    expect(summary).toContain("Likelihood to close 25 Tickets by");
    expect(seededWordsIn(summary)).toEqual([]);
  });

  // @error @version-skew @US-01 — ADR-224 rule 3: no recognised shape, no summary, today's answer exactly
  it("adds no summary to an answer it does not recognise, and hands the facts over as they came", async () => {
    const { whenForecasts, ...rest } = gravitysForecast();
    const reshaped = { ...rest, completionForecasts: whenForecasts };
    // The same tool states a summary while the answer has the shape it knows.
    const recognised = await gravitysAssistant().call(MANUAL, manualArguments);
    expect(answerOf(recognised, FORECAST_LABEL)).toHaveProperty("summary");
    const assistant = gravitysAssistant({ runManualForecast: ok(reshaped) });

    const result = await assistant.call(MANUAL, manualArguments);

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(factsBlockOf(result)).toBe(`${FORECAST_LABEL}${encode(reshaped)}`);
  });

  // @driving_port @US-01
  it.each([MANUAL, BACKTEST])(
    "tells an assistant in %s's description that `summary` states the answer as the web does",
    (tool) => {
      const assistant = gravitysAssistant();

      const description =
        assistant.runtime.listTools().find((listed) => listed.name === tool)
          ?.description ?? "";

      expect(description).toContain("`summary`");
    },
  );
});

describe("the forecast tools keep their errors as they are", () => {
  // @error @US-01 — guard, green today
  it("passes a Lighthouse refusal straight through, without a summary", async () => {
    const assistant = gravitysAssistant({
      runManualForecast: refused(
        "dependency-failure",
        "Team 3 has no throughput history",
      ),
    });

    const result = await assistant.call(MANUAL, manualArguments);

    expect(result.isError).toBe(true);
    expect(result.content).toEqual([
      {
        type: "text",
        text: "forecast: dependency-failure (Team 3 has no throughput history)",
      },
    ]);
  });
});
