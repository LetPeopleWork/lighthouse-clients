import {
  type DeliveryListOwner,
  describeDeliveryListHeadings,
  describeDeliveryListTitle,
  describeDeliveryRow,
  describeNoDeliveries,
  readDeliveryList,
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
