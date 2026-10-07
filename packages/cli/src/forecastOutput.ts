import {
  type AnswerWording,
  describeBacktestActual,
  describeBacktestPeriod,
  describeBacktestSummary,
  describeHowManyTitle,
  describeManualForecastLikelihood,
  describeManualForecastSummary,
  describeWhenTitle,
  type ForecastChanceOfCount,
  formatCalendarDay,
  levelOf,
  type ManualForecastView,
  placeActualAmongPercentiles,
  readBacktest,
  readManualForecast,
} from "@letpeoplework/lighthouse-client";
import { toTableLines } from "./table";

type ChanceRow = { readonly probability: number };

// The Forecast tab lists the highest chance first.
const highestChanceFirst = <T extends ChanceRow>(rows: readonly T[]): T[] =>
  [...rows].sort((left, right) => right.probability - left.probability);

const chanceCells = ({ probability }: ChanceRow): string[] => [
  `${probability}%`,
  levelOf(probability) ?? "",
];

const titledTable = (
  title: string | null,
  rows: readonly (readonly string[])[],
): string[] => (title === null ? [] : [title, ...toTableLines(rows)]);

const whenSection = (
  forecast: ManualForecastView,
  wording: AnswerWording,
): string[] =>
  titledTable(describeWhenTitle(forecast, wording), [
    ["Chance", "Level", "Date"],
    ...highestChanceFirst(forecast.whenForecasts).map((row) => [
      ...chanceCells(row),
      formatCalendarDay(row.expectedDate) ?? row.expectedDate,
    ]),
  ]);

const howManySection = (
  forecast: ManualForecastView,
  wording: AnswerWording,
): string[] =>
  titledTable(describeHowManyTitle(forecast, wording), [
    ["Chance", "Level", wording.terms.workItems],
    ...highestChanceFirst(forecast.howManyForecasts).map((row) => [
      ...chanceCells(row),
      String(row.value),
    ]),
  ]);

/** The manual forecast as the Forecast tab shows it, or null when the answer is not in a shape it knows. */
export const renderManualForecast = (
  value: unknown,
  wording: AnswerWording,
): string | null => {
  const forecast = readManualForecast(value);
  if (forecast === null) {
    return null;
  }
  const likelihood = describeManualForecastLikelihood(forecast, wording);
  return [
    [describeManualForecastSummary(forecast, wording)],
    whenSection(forecast, wording),
    howManySection(forecast, wording),
    likelihood === null ? [] : [likelihood],
  ]
    .filter((section) => section.length > 0)
    .map((section) => section.join("\n"))
    .join("\n\n");
};

const percentileCells = ({
  probability,
  value,
}: ForecastChanceOfCount): string[] => [`${probability}%`, String(value)];

/** Backtest Results as the web shows it, the actual drawn as a line among the percentiles, or null when the answer is not in a shape it knows. */
export const renderBacktest = (
  value: unknown,
  wording: AnswerWording,
): string | null => {
  const backtest = readBacktest(value);
  if (backtest === null) {
    return null;
  }
  const { above, below } = placeActualAmongPercentiles(backtest);
  const [header = "", ...rows] = toTableLines([
    ["Chance", wording.terms.workItems],
    ...above.map(percentileCells),
    ...below.map(percentileCells),
  ]);
  return [
    [describeBacktestSummary(wording), describeBacktestPeriod(backtest)],
    [
      "Forecast Percentiles",
      header,
      ...rows.slice(0, above.length),
      `── ${describeBacktestActual(backtest, wording)} ──`,
      ...rows.slice(above.length),
    ],
  ]
    .map((section) => section.join("\n"))
    .join("\n\n");
};
