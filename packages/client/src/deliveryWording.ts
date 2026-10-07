import { formatCalendarDay } from "./calendarDates";
import {
  deliveryLikelihoodAnswer,
  formatLikelihood,
  likelihoodAnswer,
} from "./forecastDisplayRules";
import type {
  DeliveryFeatureMetric,
  DeliveryMetricsHistory,
  DeliveryMetricsHistoryPoint,
  DeliveryWhenDistributionPoint,
} from "./index";
import { describeOwnerName, NOT_SENT } from "./ownerWording";
import type { Terms } from "./terminology";

/** One Delivery as its card's header states it. Facts an older Lighthouse may not send stay undefined. */
export type DeliveryListItem = {
  readonly id: number;
  readonly name: string;
  readonly date: string;
  readonly featureCount: number | undefined;
  readonly totalWork: number;
  readonly remainingWork: number;
  readonly likelihood: number | null;
  readonly cannotBeForecast: boolean;
  readonly hasSufficientData: boolean | undefined;
  readonly isOverdue: boolean | undefined;
  readonly likelyBy: string | undefined;
};

/** The Portfolio whose Deliveries are listed; its name stays undefined when it could not be read. */
export type DeliveryListOwner = {
  readonly id: number;
  readonly name: string | undefined;
};

// The one chance of the four the list has room for, named in its heading.
const LISTED_CHANCE = 85;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const flagOf = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const likelyByOf = (completionDates: unknown): string | undefined => {
  if (!Array.isArray(completionDates)) {
    return undefined;
  }
  const listed = completionDates.find(
    (entry) => isRecord(entry) && entry.probability === LISTED_CHANCE,
  );
  return isRecord(listed) ? textOf(listed.expectedDate) : undefined;
};

const readDeliveryListItem = (value: unknown): DeliveryListItem | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.totalWork !== "number" ||
    typeof value.remainingWork !== "number"
  ) {
    return null;
  }
  const name = textOf(value.name);
  const date = textOf(value.date);
  if (name === undefined || date === undefined) {
    return null;
  }
  return {
    id: value.id,
    name,
    date,
    featureCount: Array.isArray(value.features)
      ? value.features.length
      : undefined,
    totalWork: value.totalWork,
    remainingWork: value.remainingWork,
    likelihood:
      typeof value.likelihoodPercentage === "number"
        ? value.likelihoodPercentage
        : null,
    cannotBeForecast:
      Array.isArray(value.teamsWithoutForecast) &&
      value.teamsWithoutForecast.length > 0,
    hasSufficientData: flagOf(value.hasSufficientData),
    isOverdue: flagOf(value.isOverdue),
    likelyBy: likelyByOf(value.completionDates),
  };
};

/**
 * Every Delivery in the list, or null when the answer is not a list or any one of them comes without its
 * id, name, date or work: a row that cannot say what it is or when it is due would misstate the list.
 */
export const readDeliveryList = (value: unknown): DeliveryListItem[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.map(readDeliveryListItem);
  return items.every((item) => item !== null) ? items : null;
};

/** "Ocean Explorer · Deliveries", or the Portfolio by its id when its name could not be read. */
export const describeDeliveryListTitle = (
  owner: DeliveryListOwner,
  terms: Terms,
): string => {
  const heading =
    owner.name === undefined
      ? `${terms.portfolio} [id: ${owner.id}]`
      : owner.name;
  return `${heading} · ${terms.deliveries}`;
};

/** What a Portfolio without any Delivery shows instead of the table. */
export const describeNoDeliveries = (terms: Terms): string =>
  `No ${terms.deliveries}`;

/** How many Deliveries the list holds, in the instance's words: "No Deliveries", "1 Delivery", "4 Deliveries". */
export const describeDeliveryCount = (count: number, terms: Terms): string => {
  if (count === 0) {
    return describeNoDeliveries(terms);
  }
  return `${count} ${count === 1 ? terms.delivery : terms.deliveries}`;
};

/** The list's column headings: the card's header facts, its four forecast chances narrowed to the 85% one. */
export const describeDeliveryListHeadings = (terms: Terms): string[] => [
  "Name",
  `${terms.delivery} Date`,
  terms.features,
  "Done",
  "Likelihood",
  `Forecast ${LISTED_CHANCE}%`,
];

const dayOf = (wire: string): string => formatCalendarDay(wire) ?? wire;

/** How much of the Delivery's work is done: "34 of 55 Work Items". */
export const describeDeliveryDone = (
  delivery: Pick<DeliveryListItem, "totalWork" | "remainingWork">,
  terms: Terms,
): string =>
  `${delivery.totalWork - delivery.remainingWork} of ${delivery.totalWork} ${
    delivery.totalWork === 1 ? terms.workItem : terms.workItems
  }`;

/** The card's likelihood answer: "78%", ">95%", "Overdue", "Not enough data", "Cannot forecast". */
export const describeDeliveryLikelihood = (
  delivery: DeliveryListItem,
): string =>
  deliveryLikelihoodAnswer({
    likelihood: delivery.likelihood,
    cannotBeForecast: delivery.cannotBeForecast,
    hasRemainingWork: delivery.remainingWork > 0,
    hasSufficientData: delivery.hasSufficientData,
    isOverdue: delivery.isOverdue,
    precision: "round",
  });

/** One Delivery as a row of the list, in the order of its headings. */
export const describeDeliveryRow = (
  delivery: DeliveryListItem,
  terms: Terms,
): string[] => [
  describeOwnerName(delivery),
  dayOf(delivery.date),
  delivery.featureCount === undefined
    ? NOT_SENT
    : String(delivery.featureCount),
  describeDeliveryDone(delivery, terms),
  describeDeliveryLikelihood(delivery),
  delivery.likelyBy === undefined ? NOT_SENT : dayOf(delivery.likelyBy),
];

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || typeof value === "number";

const isFeatureMetric = (value: unknown): value is DeliveryFeatureMetric =>
  isRecord(value) &&
  typeof value.referenceId === "string" &&
  typeof value.name === "string" &&
  typeof value.completion === "number" &&
  isNullableNumber(value.likelihood);

const isChance = (value: unknown): value is DeliveryWhenDistributionPoint =>
  isRecord(value) &&
  typeof value.probability === "number" &&
  textOf(value.expectedDate) !== undefined;

const isRecordedDay = (value: unknown): value is DeliveryMetricsHistoryPoint =>
  isRecord(value) &&
  textOf(value.date) !== undefined &&
  typeof value.totalWork === "number" &&
  typeof value.doneWork === "number" &&
  typeof value.remainingWork === "number" &&
  isNullableNumber(value.likelihoodPercentage) &&
  Array.isArray(value.featureBreakdown) &&
  value.featureBreakdown.every(isFeatureMetric) &&
  (value.whenDistribution === null ||
    (Array.isArray(value.whenDistribution) &&
      value.whenDistribution.every(isChance)));

/**
 * A Delivery's recorded days, or null when the answer lacks its Delivery Date or any day lacks a fact its
 * row or detail states: a table with a hole in it would misstate the trend.
 */
export const readDeliveryMetricsHistory = (
  value: unknown,
): DeliveryMetricsHistory | null => {
  if (
    !isRecord(value) ||
    textOf(value.deliveryDate) === undefined ||
    !(
      value.firstSnapshotDate === null ||
      textOf(value.firstSnapshotDate) !== undefined
    ) ||
    !Array.isArray(value.points) ||
    !value.points.every(isRecordedDay)
  ) {
    return null;
  }
  return value as DeliveryMetricsHistory;
};

/** The most recent recorded day, whatever order the days arrive in; undefined when none is recorded. */
export const latestRecordedDay = (
  history: DeliveryMetricsHistory,
): DeliveryMetricsHistoryPoint | undefined =>
  history.points.reduce<DeliveryMetricsHistoryPoint | undefined>(
    (latest, day) =>
      latest === undefined || Date.parse(day.date) > Date.parse(latest.date)
        ? day
        : latest,
    undefined,
  );

/**
 * "Delivery [id: 11] · Delivery Date Tue 15 Dec 2026 · recorded since Tue 15 Sep 2026". The read carries no
 * Delivery name, so its id stands in; the last part is left out until a first day is recorded.
 */
export const describeDeliveryMetricsHeading = (
  history: DeliveryMetricsHistory,
  deliveryId: number,
  terms: Terms,
): string =>
  [
    `${terms.delivery} [id: ${deliveryId}]`,
    `${terms.delivery} Date ${dayOf(history.deliveryDate)}`,
    ...(history.firstSnapshotDate === null
      ? []
      : [`recorded since ${dayOf(history.firstSnapshotDate)}`]),
  ].join(" · ");

/** The day-by-day table's column headings. */
export const describeRecordedDayHeadings = (terms: Terms): string[] => [
  "Date",
  "Done",
  "Remaining",
  "Total",
  terms.features,
  "Likelihood",
];

/** One recorded day as a row, in the order of its headings. */
export const describeRecordedDayRow = (
  day: DeliveryMetricsHistoryPoint,
): string[] => [
  dayOf(day.date),
  String(day.doneWork),
  String(day.remainingWork),
  String(day.totalWork),
  String(day.featureBreakdown.length),
  likelihoodAnswer({
    likelihood: day.likelihoodPercentage,
    cannotBeForecast: false,
    hasRemainingWork: day.remainingWork > 0,
    precision: "round",
  }),
];

/** The title over one day's detail: "On Tue 6 Oct 2026". */
export const describeRecordedDayTitle = (
  day: DeliveryMetricsHistoryPoint,
): string => `On ${dayOf(day.date)}`;

/** The per-Feature table's column headings, as the web's Feature grid names them. */
export const describeDeliveryFeatureHeadings = (terms: Terms): string[] => [
  `${terms.feature} Name`,
  "Done",
  "Likelihood",
  "Size",
];

// Days recorded before Lighthouse kept sizes carry none; that is unknown, never zero.
const sizeOf = (feature: DeliveryFeatureMetric): string => {
  if (typeof feature.totalItems !== "number") {
    return NOT_SENT;
  }
  return feature.isUsingDefaultSize === true
    ? `${feature.totalItems} (default size)`
    : String(feature.totalItems);
};

/** One Feature as it stood that day, in the order of its headings. */
export const describeDeliveryFeatureRow = (
  feature: DeliveryFeatureMetric,
): string[] => [
  `${feature.referenceId} ${feature.name}`,
  `${Math.round(feature.completion)}%`,
  feature.likelihood === null
    ? NOT_SENT
    : formatLikelihood(feature.likelihood, {
        hasRemainingWork: feature.completion < 100,
        precision: "round",
      }),
  sizeOf(feature),
];

/** The forecast distribution's column headings. */
export const describeDeliveryChanceHeadings = (): string[] => [
  "Chance",
  "Done by",
];

/** One chance of the day's forecast: "85%" and the day it is that likely to be done by. */
export const describeDeliveryChanceRow = (
  chance: DeliveryWhenDistributionPoint,
): string[] => [`${chance.probability}%`, dayOf(chance.expectedDate)];
