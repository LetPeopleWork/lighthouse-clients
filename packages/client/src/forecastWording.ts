import type { AnswerWording } from "./answerWording";
import {
  INSUFFICIENT_FORECAST_DATA_SENTENCE,
  INSUFFICIENT_FORECAST_DATA_SHORT,
  likelihoodAnswer,
} from "./forecastDisplayRules";
import { dayOf, isDay, isNumber, isRecord } from "./wireFacts";

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

const optionalBoolean = (value: unknown): boolean | undefined | null => {
  if (value === undefined || typeof value === "boolean") {
    return value;
  }
  return null;
};

const readChanceByDay = (value: unknown): ForecastChanceByDay | null =>
  isRecord(value) && isNumber(value.probability) && isDay(value.expectedDate)
    ? { probability: value.probability, expectedDate: value.expectedDate }
    : null;

const readChanceOfCount = (value: unknown): ForecastChanceOfCount | null =>
  isRecord(value) && isNumber(value.probability) && isNumber(value.value)
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
  if (!isRecord(value)) {
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
  const answer = likelihoodAnswer({
    likelihood: forecast.likelihood,
    cannotBeForecast: false,
    hasRemainingWork: true,
    hasSufficientData: forecast.hasSufficientData,
    precision: "fixed2",
  });
  // The Forecast tab spells thin history out in full in place of the whole sentence.
  if (answer === INSUFFICIENT_FORECAST_DATA_SHORT) {
    return INSUFFICIENT_FORECAST_DATA_SENTENCE;
  }
  return `Likelihood to close ${countOf(forecast, wording)} by ${dayOf(forecast.targetDate)}: ${answer}`;
};

/** The backtest as Backtest Results states it: the forecast percentiles for a past period and what was actually done. */
export type BacktestView = {
  readonly startDate: string;
  readonly endDate: string;
  readonly historicalStartDate: string;
  readonly historicalEndDate: string;
  readonly percentiles: readonly ForecastChanceOfCount[];
  readonly actualThroughput: number;
};

/** The backtest's facts, or null when one it cannot be stated without is missing or mistyped. */
export const readBacktest = (value: unknown): BacktestView | null => {
  if (!isRecord(value)) {
    return null;
  }
  const { startDate, endDate, historicalStartDate, historicalEndDate } = value;
  const percentiles = readEvery(value.percentiles, readChanceOfCount);
  if (
    !isDay(startDate) ||
    !isDay(endDate) ||
    !isDay(historicalStartDate) ||
    !isDay(historicalEndDate) ||
    percentiles === null ||
    !isNumber(value.actualThroughput)
  ) {
    return null;
  }
  return {
    startDate,
    endDate,
    historicalStartDate,
    historicalEndDate,
    percentiles,
    actualThroughput: value.actualThroughput,
  };
};

/**
 * The percentiles lowest chance first, split where the actual falls, as the chart's dashed line sits
 * among the bars. An actual equal to a percentile goes after it: that percentile was reached.
 */
export const placeActualAmongPercentiles = ({
  percentiles,
  actualThroughput,
}: Pick<BacktestView, "percentiles" | "actualThroughput">): {
  readonly above: ForecastChanceOfCount[];
  readonly below: ForecastChanceOfCount[];
} => {
  const ordered = [...percentiles].sort(
    (left, right) => left.probability - right.probability,
  );
  const firstMissed = ordered.findIndex((row) => row.value < actualThroughput);
  const split = firstMissed === -1 ? ordered.length : firstMissed;
  return { above: ordered.slice(0, split), below: ordered.slice(split) };
};

/** "Gravity · Backtest Results". */
export const describeBacktestSummary = (wording: AnswerWording): string =>
  `${wording.name} · Backtest Results`;

/** "Period: Tue 1 Sep 2026 to Wed 30 Sep 2026 (historical data: Wed 1 Jul 2026 to Mon 31 Aug 2026)". */
export const describeBacktestPeriod = (backtest: BacktestView): string =>
  `Period: ${dayOf(backtest.startDate)} to ${dayOf(backtest.endDate)} (historical data: ${dayOf(backtest.historicalStartDate)} to ${dayOf(backtest.historicalEndDate)})`;

/** "Actual Throughput: 21 Work Items". */
export const describeBacktestActual = (
  backtest: BacktestView,
  wording: AnswerWording,
): string =>
  `Actual ${wording.terms.throughput}: ${backtest.actualThroughput} ${wording.terms.workItems}`;
