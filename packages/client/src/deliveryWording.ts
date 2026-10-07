import { formatCalendarDay } from "./calendarDates";
import { deliveryLikelihoodAnswer } from "./forecastDisplayRules";
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
