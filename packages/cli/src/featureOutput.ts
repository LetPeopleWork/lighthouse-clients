import {
  describeFeatureListHeadings,
  describeFeatureRow,
  readFeatureList,
  type Terms,
} from "@letpeoplework/lighthouse-client";
import { toTableLines } from "./table";

/** Features as the Feature list shows them, one row each, or null when the answer is not in a shape it knows. */
export const renderFeatureList = (
  value: unknown,
  terms: Terms,
): string | null => {
  const features = readFeatureList(value);
  if (features === null) {
    return null;
  }
  return toTableLines([
    describeFeatureListHeadings(terms),
    ...features.map((feature) => describeFeatureRow(feature, terms)),
  ]).join("\n");
};
