import { formatTimestamp } from "./calendarDates";
import type { Terms } from "./terminology";

/** What owns Features in Lighthouse: a Team or a Portfolio. */
export type OwnerKind = "team" | "portfolio";

/** One Team or Portfolio as a list row shows it. Fields Lighthouse did not send stay undefined. */
export type OwnerListItem = {
  readonly id: number;
  readonly name: string;
  readonly featureCount: number | undefined;
  readonly tags: readonly string[];
  readonly lastUpdated: string | undefined;
};

/** A mark for a cell Lighthouse sent nothing for. */
export const NOT_SENT = "—";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const tagsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string")
    : [];

const readOwnerListItem = (value: unknown): OwnerListItem | null => {
  if (!isRecord(value) || typeof value.id !== "number") {
    return null;
  }
  const name = textOf(value.name);
  if (name === undefined) {
    return null;
  }
  return {
    id: value.id,
    name,
    featureCount: Array.isArray(value.features)
      ? value.features.length
      : undefined,
    tags: tagsOf(value.tags),
    lastUpdated: textOf(value.lastUpdated),
  };
};

/**
 * Every Team or Portfolio in the list, or null when the answer is not a list or any one of them comes
 * without its id or name: a row that cannot say what it is would misname the whole list.
 */
export const readOwnerList = (value: unknown): OwnerListItem[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.map(readOwnerListItem);
  return items.every((item) => item !== null) ? items : null;
};

/** The list's title, as the Overview heads it: "Teams" or "Portfolios" in the instance's words. */
export const describeOwnerListTitle = (
  kind: OwnerKind,
  terms: Terms,
): string => (kind === "team" ? terms.teams : terms.portfolios);

/** The list's column headings, as the Overview's table has them. */
export const describeOwnerListHeadings = (terms: Terms): string[] => [
  "Name",
  terms.features,
  "Tags",
  "Last Updated",
];

/** A Team or Portfolio by name with its id beside it: "Gravity [id: 3]". */
export const describeOwnerName = ({
  id,
  name,
}: Pick<OwnerListItem, "id" | "name">): string => `${name} [id: ${id}]`;

/** How many Features it owns: "1 Feature", "6 Features", or the mark when Lighthouse sent none. */
export const describeFeatureCount = (
  count: number | undefined,
  terms: Terms,
): string => {
  if (count === undefined) {
    return NOT_SENT;
  }
  return `${count} ${count === 1 ? terms.feature : terms.features}`;
};

/** The tags as one cell, empty when there are none. */
export const describeTags = (tags: readonly string[]): string =>
  tags.join(", ");

/** When it was last updated, in the reader's local time; the mark when it never was. */
export const describeLastUpdated = (wire: string | undefined): string =>
  wire === undefined ? NOT_SENT : (formatTimestamp(wire) ?? wire);
