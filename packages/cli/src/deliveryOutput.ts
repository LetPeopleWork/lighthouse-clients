import {
  type DeliveryListOwner,
  type DeliveryMetricsHistoryPoint,
  describeDeliveryChanceHeadings,
  describeDeliveryChanceRow,
  describeDeliveryFeatureHeadings,
  describeDeliveryFeatureRow,
  describeDeliveryListHeadings,
  describeDeliveryListTitle,
  describeDeliveryMetricsHeading,
  describeDeliveryRow,
  describeNoDeliveries,
  describeRecordedDayHeadings,
  describeRecordedDayRow,
  describeRecordedDayTitle,
  latestRecordedDay,
  NO_DATA_YET,
  readDeliveryList,
  readDeliveryMetricsHistory,
  type Terms,
} from "@letpeoplework/lighthouse-client";
import { toTableLines } from "./table";

/** A Portfolio's Deliveries, one row per card, or null when the answer is not in a shape it knows. */
export const renderDeliveryList = (
  value: unknown,
  owner: DeliveryListOwner,
  terms: Terms,
): string | null => {
  const deliveries = readDeliveryList(value);
  if (deliveries === null) {
    return null;
  }
  const title = describeDeliveryListTitle(owner, terms);
  if (deliveries.length === 0) {
    return [title, describeNoDeliveries(terms)].join("\n");
  }
  return [
    title,
    ...toTableLines([
      describeDeliveryListHeadings(terms),
      ...deliveries.map((delivery) => describeDeliveryRow(delivery, terms)),
    ]),
  ].join("\n");
};

const dayInDetail = (day: DeliveryMetricsHistoryPoint, terms: Terms) => [
  "",
  describeRecordedDayTitle(day),
  ...toTableLines([
    describeDeliveryFeatureHeadings(terms),
    ...day.featureBreakdown.map(describeDeliveryFeatureRow),
  ]),
  ...(day.whenDistribution === null || day.whenDistribution.length === 0
    ? []
    : [
        "",
        ...toTableLines([
          describeDeliveryChanceHeadings(),
          ...day.whenDistribution.map(describeDeliveryChanceRow),
        ]),
      ]),
];

/**
 * A Delivery's recorded days, one row each, and with `inDetail` the latest day's Features and chances;
 * null when the answer is not in a shape it knows.
 */
export const renderDeliveryMetrics = (
  value: unknown,
  deliveryId: number,
  inDetail: boolean,
  terms: Terms,
): string | null => {
  const history = readDeliveryMetricsHistory(value);
  if (history === null) {
    return null;
  }
  const heading = describeDeliveryMetricsHeading(history, deliveryId, terms);
  const latest = latestRecordedDay(history);
  if (latest === undefined) {
    return [heading, NO_DATA_YET].join("\n");
  }
  return [
    heading,
    "",
    ...toTableLines([
      describeRecordedDayHeadings(terms),
      ...history.points.map(describeRecordedDayRow),
    ]),
    ...(inDetail ? dayInDetail(latest, terms) : []),
  ].join("\n");
};
