import { describe, expect, it } from "vitest";
import {
  isAtRiskOfMissingTheSle,
  SLE_RISK_AT_RISK_FROM,
} from "./metricsWording";

// The web decides which Work Items its SLE Risk widget counts as at risk; the clients restate that line. Each
// row is a case the web's own tests pin in Lighthouse.Frontend/src/utils/charts/sleRisk.test.ts
// (sleRiskAtRiskSummary), so the two cannot drift apart unnoticed on this side. A change on the web does not
// fail this suite: re-read that file when it changes.

const countedAtRisk = (risks: readonly number[]): number =>
  risks.filter(isAtRiskOfMissingTheSle).length;

describe("the web's SLE Risk line, restated for the clients", () => {
  it("draws the line at seventy", () => {
    expect(SLE_RISK_AT_RISK_FROM).toBe(70);
  });

  it.each([
    {
      case: "counts the items seventy percent or worse",
      risks: [86, 70, 69, 12],
      count: 2,
    },
    {
      case: "leaves an item that is merely more likely than not out",
      risks: [55],
      count: 0,
    },
    {
      case: "counts an item that has already outlasted its target",
      risks: [100],
      count: 1,
    },
    {
      case: "does not count an item whose history gives it a zero",
      risks: [0],
      count: 0,
    },
    {
      case: "counts nothing for a team that published no target",
      risks: [],
      count: 0,
    },
  ])("$case (sleRisk.test.ts)", ({ risks, count }) => {
    expect(countedAtRisk(risks)).toBe(count);
  });
});
