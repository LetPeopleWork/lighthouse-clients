import {
  type ArchivedDeliveryItem,
  type DeliveryListItem,
  type DeliveryListOwner,
  type DeliveryMetricsHistoryPoint,
  describeArchivedDeliveriesTitle,
  describeArchivedDeliveryHeadings,
  describeArchivedDeliveryRow,
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
  readDeliveryMetricsHistory,
  readPortfolioDeliveries,
  type Terms,
} from "@letpeoplework/lighthouse-client";
import { toTableLines } from "./table";

const activeDeliveryLines = (
  active: readonly DeliveryListItem[],
  terms: Terms,
): string[] =>
  active.length === 0
    ? [describeNoDeliveries(terms)]
    : toTableLines([
        describeDeliveryListHeadings(terms),
        ...active.map((delivery) => describeDeliveryRow(delivery, terms)),
      ]);

const archivedDeliveryLines = (
  archived: readonly ArchivedDeliveryItem[],
  terms: Terms,
): string[] =>
  archived.length === 0
    ? []
    : [
        "",
        describeArchivedDeliveriesTitle(terms),
        ...toTableLines([
          describeArchivedDeliveryHeadings(terms),
          ...archived.map((delivery) =>
            describeArchivedDeliveryRow(delivery, terms),
          ),
        ]),
      ];

/**
 * A Portfolio's active Deliveries, one row per card, then the archived ones under their own heading;
 * null when the answer is not in a shape it knows.
 */
export const renderDeliveryList = (
  value: unknown,
  owner: DeliveryListOwner,
  terms: Terms,
): string | null => {
  const deliveries = readPortfolioDeliveries(value);
  if (deliveries === null) {
    return null;
  }
  return [
    describeDeliveryListTitle(owner, terms),
    ...activeDeliveryLines(deliveries.active, terms),
    ...archivedDeliveryLines(deliveries.archived, terms),
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
