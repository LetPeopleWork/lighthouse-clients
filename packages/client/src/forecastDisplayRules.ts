// The web's forecast display rules, restated once so the CLI and the MCP summaries read a forecast the way
// the browser does. The parity tests name the web file each rule mirrors; re-read it when that file changes.

export type ForecastLevelName = "Certain" | "Confident" | "Realistic" | "Risky";

export type LikelihoodPrecision = "round" | "fixed2";

export const CANNOT_FORECAST_SHORT = "Cannot forecast";

export const INSUFFICIENT_FORECAST_DATA_SHORT = "Not enough data";

const RISKY_UP_TO = 50;
const REALISTIC_UP_TO = 70;
const CONFIDENT_UP_TO = 85;
const CERTAINTY_CAP_THRESHOLD = 95;

export const levelOf = (chance: number | null): ForecastLevelName | null => {
  // No forecast is its own state, not a bad one: null must not read as "Risky".
  if (chance === null) {
    return null;
  }
  if (chance <= RISKY_UP_TO) {
    return "Risky";
  }
  if (chance <= REALISTIC_UP_TO) {
    return "Realistic";
  }
  if (chance <= CONFIDENT_UP_TO) {
    return "Confident";
  }
  return "Certain";
};

export const formatLikelihood = (
  value: number,
  options: {
    readonly hasRemainingWork: boolean;
    readonly precision: LikelihoodPrecision;
  },
): string => {
  // A finished piece of work is certain, so only an open one is capped below a promise of 100%.
  if (value > CERTAINTY_CAP_THRESHOLD && options.hasRemainingWork) {
    return `>${CERTAINTY_CAP_THRESHOLD}%`;
  }
  if (options.precision === "round") {
    return `${Math.round(value)}%`;
  }
  return `${value.toFixed(2)}%`;
};

export const likelihoodAnswer = (facts: {
  readonly likelihood: number | null;
  readonly cannotBeForecast: boolean;
  readonly hasRemainingWork: boolean;
  // An older Lighthouse does not say; then the history is not called thin.
  readonly hasSufficientData?: boolean;
  readonly precision: LikelihoodPrecision;
}): string => {
  if (facts.cannotBeForecast || facts.likelihood === null) {
    return CANNOT_FORECAST_SHORT;
  }
  // Thin history only matters while there is still work to forecast.
  if (facts.hasRemainingWork && facts.hasSufficientData === false) {
    return INSUFFICIENT_FORECAST_DATA_SHORT;
  }
  return formatLikelihood(facts.likelihood, facts);
};

export const OVERDUE_SHORT = "Overdue";

/**
 * A Delivery card's answer: its likelihood, or "Overdue" once its date has passed. Overdue says more than a
 * number for a date already gone, but not more than "Cannot forecast", so the web shows both of those.
 */
export const deliveryLikelihoodAnswer = (
  facts: Parameters<typeof likelihoodAnswer>[0] & {
    // Only the server knows the instance's today; an older Lighthouse that does not say is never overdue.
    readonly isOverdue?: boolean;
  },
): string => {
  const answer = likelihoodAnswer(facts);
  if (facts.isOverdue !== true) {
    return answer;
  }
  return answer === CANNOT_FORECAST_SHORT
    ? `${OVERDUE_SHORT} · ${CANNOT_FORECAST_SHORT}`
    : OVERDUE_SHORT;
};
