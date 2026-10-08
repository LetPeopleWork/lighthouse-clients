import type { LighthouseApiResult } from "@letpeoplework/lighthouse-client";
import { describe, expect, it } from "vitest";
import {
  getErrorResult,
  getSuccessResult,
  occurrencesOf,
  REPORTED_COMMANDS,
  type ReportedCommand,
  withUsage,
} from "./commandResult";

const ANSWERED: LighthouseApiResult<undefined> = { ok: true, value: undefined };

describe("which commands count, and what each counts", () => {
  it("counts exactly the seven commands the web counts too, each by the web's name", () => {
    expect(REPORTED_COMMANDS).toEqual({
      "team create": "TeamCreated",
      "team delete": "TeamDeleted",
      "team refresh": "TeamRefreshTriggered",
      "portfolio create": "PortfolioCreated",
      "portfolio delete": "PortfolioDeleted",
      "portfolio refresh": "PortfolioRefreshTriggered",
      "forecast manual": "TeamManualForecastRun",
    });
  });

  it.each(Object.entries(REPORTED_COMMANDS) as [ReportedCommand, string][])(
    "a successful lh %s counts one %s and nothing else",
    (command, name) => {
      const result = withUsage(
        getSuccessResult("ok"),
        ANSWERED,
        occurrencesOf(command),
      );

      expect(result.usage).toEqual({ reached: true, occurrences: [{ name }] });
    },
  );

  // Each of these has a web action it resembles, so mapping one would give an old event name a new meaning.
  it.each([
    "forecast backtest",
    "refinement comment",
    "refinement take-back",
    "team update",
    "portfolio update",
    "team list",
    "team get",
    "portfolio list",
    "version get",
  ])("lh %s is not among the commands that count", (command) => {
    expect(Object.keys(REPORTED_COMMANDS)).not.toContain(command);
  });

  it("counts nothing when the command did not succeed, however Lighthouse answered", () => {
    const refused = withUsage(
      getErrorResult("misconfigured: no such team"),
      {
        ok: false,
        error: { category: "misconfigured", reason: "no such team" },
      },
      occurrencesOf("team delete"),
    );
    const failedLocally = withUsage(
      getErrorResult("could not print it"),
      ANSWERED,
      occurrencesOf("team create"),
    );

    expect(refused.usage).toBeUndefined();
    expect(failedLocally.usage).toBeUndefined();
  });
});
