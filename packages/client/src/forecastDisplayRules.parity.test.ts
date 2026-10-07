import { describe, expect, it } from "vitest";
import {
  formatLikelihood,
  levelOf,
  likelihoodAnswer,
} from "./forecastDisplayRules";

// The web decides a forecast's level and how a likelihood reads in the browser;
// the clients restate those rules. Each row is a case the web's own tests pin, naming the file it mirrors, so
// the two cannot drift apart unnoticed on this side. A change on the web does not fail this suite: re-read
// the named file when it changes.

describe("the web's forecast display rules, restated for the clients", () => {
  // @boundary @US-01 @contract-shape:pure-function — ForecastLevel.ts: ≤50 Risky, ≤70 Realistic, ≤85 Confident
  it.each([
    { chance: 0, level: "Risky" },
    { chance: 50, level: "Risky" },
    { chance: 50.01, level: "Realistic" },
    { chance: 70, level: "Realistic" },
    { chance: 70.01, level: "Confident" },
    { chance: 85, level: "Confident" },
    { chance: 85.01, level: "Certain" },
    { chance: 95, level: "Certain" },
    { chance: 100, level: "Certain" },
    { chance: null, level: null },
  ])(
    "names a chance of $chance '$level' (ForecastLevel.ts)",
    ({ chance, level }) => {
      expect(levelOf(chance)).toBe(level);
    },
  );

  // @boundary @US-01 @US-06 @contract-shape:pure-function — formatLikelihood.ts, CERTAINTY_CAP_THRESHOLD = 95
  it.each([
    { value: 95, hasRemainingWork: true, precision: "fixed2", reads: "95.00%" },
    {
      value: 95.01,
      hasRemainingWork: true,
      precision: "fixed2",
      reads: ">95%",
    },
    {
      value: 95.01,
      hasRemainingWork: false,
      precision: "fixed2",
      reads: "95.01%",
    },
    { value: 98.6, hasRemainingWork: true, precision: "round", reads: ">95%" },
    { value: 100, hasRemainingWork: false, precision: "round", reads: "100%" },
    { value: 78.2, hasRemainingWork: true, precision: "round", reads: "78%" },
    { value: 78.5, hasRemainingWork: true, precision: "round", reads: "79%" },
    {
      value: 48.2034,
      hasRemainingWork: true,
      precision: "fixed2",
      reads: "48.20%",
    },
    { value: 0, hasRemainingWork: true, precision: "round", reads: "0%" },
  ] as const)(
    "reads $value ($precision, work remaining: $hasRemainingWork) as '$reads' (formatLikelihood.ts)",
    ({ value, hasRemainingWork, precision, reads }) => {
      expect(formatLikelihood(value, { hasRemainingWork, precision })).toBe(
        reads,
      );
    },
  );
});

describe("the one answer a likelihood gives, in the web's order", () => {
  const forecastable = {
    likelihood: 78.2,
    cannotBeForecast: false,
    hasRemainingWork: true,
    hasSufficientData: true,
    precision: "round",
  } as const;

  it.each([
    {
      why: "the forecast cannot be made, even on thin history",
      facts: { cannotBeForecast: true, hasSufficientData: false },
      reads: "Cannot forecast",
    },
    {
      why: "Lighthouse gives no likelihood",
      facts: { likelihood: null },
      reads: "Cannot forecast",
    },
    {
      why: "history is thin while work remains",
      facts: { hasSufficientData: false },
      reads: "Not enough data",
    },
    {
      why: "history is thin but the work is done",
      facts: {
        hasSufficientData: false,
        hasRemainingWork: false,
        likelihood: 100,
      },
      reads: "100%",
    },
    {
      why: "an older Lighthouse does not say whether history is thin",
      facts: { hasSufficientData: undefined },
      reads: "78%",
    },
    {
      why: "the likelihood is above the cap while work remains",
      facts: { likelihood: 98.6 },
      reads: ">95%",
    },
    {
      why: "two decimals are asked for",
      facts: { likelihood: 48.2034, precision: "fixed2" },
      reads: "48.20%",
    },
  ] as const)("reads '$reads' when $why", ({ facts, reads }) => {
    expect(likelihoodAnswer({ ...forecastable, ...facts })).toBe(reads);
  });
});
