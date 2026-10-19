import { dayOf, isNumber, isRecord } from "./wireFacts";

/**
 * A forecast percentile as Lighthouse sends it. A percentile too few simulated runs reached carries
 * `beyondHorizon` and the horizon's length in `horizonYears`; its `expectedDate` is then only a stand-in
 * that nothing forecast, kept so an older client still reads a date. An older Lighthouse sends neither.
 */
export type ForecastPercentileDate = {
  readonly expectedDate: string;
  readonly beyondHorizon?: boolean;
  readonly horizonYears?: number | null;
};

/**
 * The years of the horizon a percentile lies beyond, or undefined when its date is the forecast. Keyed on
 * the flag itself, never on the server's version: an older Lighthouse never sends it.
 */
export const yearsBeyondHorizon = (percentile: unknown): number | undefined =>
  isRecord(percentile) &&
  percentile.beyondHorizon === true &&
  isNumber(percentile.horizonYears)
    ? percentile.horizonYears
    : undefined;

/** The words shown in place of a date for a percentile too few simulated runs reached. */
export const moreThanYearsText = (horizonYears: number): string =>
  `More than ${horizonYears} years`;

/** A percentile's day as a person reads it, or "More than 5 years" when it lies beyond that horizon. */
export const describePercentileDay = (
  expectedDate: string,
  horizonYearsBeyond: number | undefined,
): string =>
  horizonYearsBeyond === undefined
    ? dayOf(expectedDate)
    : moreThanYearsText(horizonYearsBeyond);

/** One percentile as text: its day, or the words when it lies beyond the horizon. */
export const describePercentileDate = (
  percentile: ForecastPercentileDate,
): string =>
  describePercentileDay(
    percentile.expectedDate,
    yearsBeyondHorizon(percentile),
  );
