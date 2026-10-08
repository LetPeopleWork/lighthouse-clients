import {
  type AnswerWording,
  describeFeatureListCount,
  describeFeatureListHeadings,
  describeFeatureRow,
  describeFeatureWorkItemHeadings,
  describeFeatureWorkItemRow,
  describeFeatureWorkItemsHeading,
  readFeatureList,
  readFeatureWorkItems,
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
  if (features.length === 0) {
    return `${describeFeatureListCount(0, terms)}.`;
  }
  return toTableLines([
    describeFeatureListHeadings(terms),
    ...features.map((feature) => describeFeatureRow(feature, terms)),
  ]).join("\n");
};

/** A Feature's Work Items under its name, one row each, or null when the answer is not in a shape it knows. */
export const renderFeatureWorkItems = (
  value: unknown,
  wording: AnswerWording,
): string | null => {
  const items = readFeatureWorkItems(value);
  if (items === null) {
    return null;
  }
  return [
    describeFeatureWorkItemsHeading(wording.name, items.length, wording.terms),
    "",
    ...toTableLines([
      describeFeatureWorkItemHeadings(),
      ...items.map(describeFeatureWorkItemRow),
    ]),
  ].join("\n");
};
