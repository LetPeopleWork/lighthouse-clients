import {
  type AnswerWording,
  describeHowManyTitle,
  describeManualForecastLikelihood,
  describeManualForecastSummary,
  describeWhenTitle,
  formatCalendarDay,
  levelOf,
  type ManualForecastView,
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
