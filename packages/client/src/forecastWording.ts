import type { AnswerWording } from "./answerWording";
import { formatCalendarDay } from "./calendarDates";
import { likelihoodAnswer } from "./forecastDisplayRules";

/** One row of the When table: the chance of being done by a calendar day. */
export type ForecastChanceByDay = {
  readonly probability: number;
  readonly expectedDate: string;
};

/** One row of the How Many table: the chance of getting this many done. */
export type ForecastChanceOfCount = {
  readonly probability: number;
  readonly value: number;
};

/** The manual forecast as the Forecast tab states it. */
export type ManualForecastView = {
  readonly remainingItems: number;
  readonly targetDate: string | null;
  readonly likelihood: number | null;
  readonly whenForecasts: readonly ForecastChanceByDay[];
  readonly howManyForecasts: readonly ForecastChanceOfCount[];
  readonly filterApplied: boolean | undefined;
  // An older Lighthouse does not send it; absent is not "too little history".
  readonly hasSufficientData: boolean | undefined;
};

export const INSUFFICIENT_FORECAST_DATA_SENTENCE =
  "Not enough data yet — need at least 5 days with completed items to forecast.";

type Facts = Readonly<Record<string, unknown>>;

const isFacts = (value: unknown): value is Facts =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isDay = (value: unknown): value is string =>
  typeof value === "string" && formatCalendarDay(value) !== null;

const optionalBoolean = (value: unknown): boolean | undefined | null => {
  if (value === undefined || typeof value === "boolean") {
    return value;
  }
  return null;
};

const readChanceByDay = (value: unknown): ForecastChanceByDay | null =>
  isFacts(value) && isNumber(value.probability) && isDay(value.expectedDate)
    ? { probability: value.probability, expectedDate: value.expectedDate }
    : null;

const readChanceOfCount = (value: unknown): ForecastChanceOfCount | null =>
  isFacts(value) && isNumber(value.probability) && isNumber(value.value)
    ? { probability: value.probability, value: value.value }
    : null;

const readEvery = <T>(
  value: unknown,
  readOne: (item: unknown) => T | null,
): T[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const read = value.map(readOne);
  return read.every((item) => item !== null) ? (read as T[]) : null;
};

/** The manual forecast's facts, or null when one it cannot be stated without is missing or mistyped. */
export const readManualForecast = (
  value: unknown,
): ManualForecastView | null => {
  if (!isFacts(value)) {
    return null;
  }
  const { remainingItems, targetDate, likelihood } = value;
  const whenForecasts = readEvery(value.whenForecasts, readChanceByDay);
  const howManyForecasts = readEvery(value.howManyForecasts, readChanceOfCount);
  const filterApplied = optionalBoolean(value.filterApplied);
  const hasSufficientData = optionalBoolean(value.hasSufficientData);
  if (
    !isNumber(remainingItems) ||
    !(targetDate === null || isDay(targetDate)) ||
    !(likelihood === null || isNumber(likelihood)) ||
    whenForecasts === null ||
    howManyForecasts === null ||
    filterApplied === null ||
    hasSufficientData === null
  ) {
    return null;
  }
  return {
    remainingItems,
    targetDate,
    likelihood,
    whenForecasts,
    howManyForecasts,
    filterApplied,
    hasSufficientData,
  };
};

const dayOf = (wire: string): string => formatCalendarDay(wire) ?? wire;

const countOf = (forecast: ManualForecastView, wording: AnswerWording) =>
  `${forecast.remainingItems} ${wording.terms.workItems}`;

/** "Gravity · 25 Work Items · target Fri 30 Oct 2026", naming the filtered Throughput when it was used. */
export const describeManualForecastSummary = (
  forecast: ManualForecastView,
  wording: AnswerWording,
): string =>
  [
    wording.name,
    forecast.remainingItems > 0 ? countOf(forecast, wording) : null,
    forecast.targetDate === null
      ? null
      : `target ${dayOf(forecast.targetDate)}`,
    forecast.filterApplied === true
      ? `Use filtered ${wording.terms.throughput}`
      : null,
  ]
    .filter((part) => part !== null)
    .join(" · ");

/** The When table's title, or null when there is no When table to show. */
export const describeWhenTitle = (
  forecast: ManualForecastView,
  wording: AnswerWording,
): string | null =>
  forecast.whenForecasts.length === 0
    ? null
    : `When will ${countOf(forecast, wording)} be done?`;

/** The How Many table's title, or null when there is no How Many table to show. */
export const describeHowManyTitle = (
  forecast: ManualForecastView,
  wording: AnswerWording,
): string | null =>
  forecast.howManyForecasts.length === 0 || forecast.targetDate === null
    ? null
    : `How Many ${wording.terms.workItems} will you get done till ${dayOf(forecast.targetDate)}?`;

/**
 * "Likelihood to close 25 Work Items by Fri 30 Oct 2026: 48.20%", or why there is no number. Only a
 * forecast asked both how many and by when has a likelihood to state.
 */
export const describeManualForecastLikelihood = (
  forecast: ManualForecastView,
  wording: AnswerWording,
): string | null => {
  if (forecast.remainingItems <= 0 || forecast.targetDate === null) {
    return null;
  }
  if (forecast.hasSufficientData === false) {
    return INSUFFICIENT_FORECAST_DATA_SENTENCE;
  }
  const answer = likelihoodAnswer({
    likelihood: forecast.likelihood,
    cannotBeForecast: false,
    hasRemainingWork: true,
    hasSufficientData: forecast.hasSufficientData,
    precision: "fixed2",
  });
  return `Likelihood to close ${countOf(forecast, wording)} by ${dayOf(forecast.targetDate)}: ${answer}`;
};
