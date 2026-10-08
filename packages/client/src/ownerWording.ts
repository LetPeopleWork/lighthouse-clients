import { formatTimestamp } from "./calendarDates";
import type { Terms } from "./terminology";
import { dayOf, isRecord, textOf } from "./wireFacts";

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

/** How many Teams or Portfolios the list holds, in the instance's words: "No Teams", "1 Team", "7 Teams". */
export const describeOwnerCount = (
  kind: OwnerKind,
  count: number,
  terms: Terms,
): string => {
  const [one, many] =
    kind === "team"
      ? [terms.team, terms.teams]
      : [terms.portfolio, terms.portfolios];
  if (count === 0) {
    return `No ${many}`;
  }
  return `${count} ${count === 1 ? one : many}`;
};

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

/** A Team's Throughput dates, already resolved, and whether they roll forward or stay fixed. */
export type ThroughputDates = {
  readonly start: string;
  readonly end: string;
  readonly fixed: boolean | undefined;
};

/** Another Team or Portfolio by what it is called and its id. */
export type OwnerReference = Pick<OwnerListItem, "id" | "name">;

/**
 * A Team as its page states it. A setting left unset, which Lighthouse sends as 0, and a fact it did not
 * send both stay undefined.
 */
export type TeamSummary = {
  readonly id: number;
  readonly name: string;
  readonly lastUpdated: string | undefined;
  readonly sleProbability: number | undefined;
  readonly sleRange: number | undefined;
  readonly systemWipLimit: number | undefined;
  readonly featureWip: number | undefined;
  readonly throughput: ThroughputDates | undefined;
  readonly portfolios: readonly OwnerReference[];
  readonly featureCount: number | undefined;
  readonly tags: readonly string[];
  readonly workItemTypes: readonly string[];
};

/** What the Team page's quick settings say for a setting nobody gave a value. */
export const NOT_SET = "Not set";

const positiveOf = (value: unknown): number | undefined =>
  typeof value === "number" && value > 0 ? value : undefined;

const referencesOf = (value: unknown): OwnerReference[] =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        const reference = readOwnerListItem(entry);
        return reference === null
          ? []
          : [{ id: reference.id, name: reference.name }];
      })
    : [];

const throughputOf = (
  team: Record<string, unknown>,
): ThroughputDates | undefined => {
  const start = textOf(team.throughputStartDate);
  const end = textOf(team.throughputEndDate);
  if (start === undefined || end === undefined) {
    return undefined;
  }
  const fixed = team.useFixedDatesForThroughput;
  return { start, end, fixed: typeof fixed === "boolean" ? fixed : undefined };
};

/** The Team as its page states it, or null when the answer does not say which Team it is. */
export const readTeam = (value: unknown): TeamSummary | null => {
  const named = readOwnerListItem(value);
  if (named === null || !isRecord(value)) {
    return null;
  }
  return {
    id: named.id,
    name: named.name,
    lastUpdated: named.lastUpdated,
    sleProbability: positiveOf(value.serviceLevelExpectationProbability),
    sleRange: positiveOf(value.serviceLevelExpectationRange),
    systemWipLimit: positiveOf(value.systemWIPLimit),
    featureWip: positiveOf(value.featureWip),
    throughput: throughputOf(value),
    portfolios: referencesOf(value.portfolios),
    featureCount: named.featureCount,
    tags: named.tags,
    workItemTypes: tagsOf(value.workItemTypes),
  };
};

const countOf = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

type SleSettings = Pick<TeamSummary, "sleProbability" | "sleRange">;

const describeSle = (
  { sleProbability, sleRange }: SleSettings,
  items: string,
): string =>
  sleProbability === undefined || sleRange === undefined
    ? NOT_SET
    : `${Math.round(sleProbability)}% of ${items} within ${sleRange} days or less`;

const describeLimit = (
  limit: number | undefined,
  one: string,
  many: string,
): string => (limit === undefined ? NOT_SET : countOf(limit, one, many));

const describeThroughput = (dates: ThroughputDates | undefined): string => {
  if (dates === undefined) {
    return NOT_SENT;
  }
  const span = `${dayOf(dates.start)} to ${dayOf(dates.end)}`;
  if (dates.fixed === undefined) {
    return span;
  }
  return `${span} ${dates.fixed ? "(fixed dates)" : "(rolling)"}`;
};

const describeList = (entries: readonly string[]): string =>
  entries.length === 0 ? NOT_SENT : entries.join(", ");

/**
 * The Team page's heading and settings, one line each, in the instance's words. Tags get a line only
 * when there are some, because Lighthouse sends a Team without them.
 */
export const describeTeamSummary = (
  team: TeamSummary,
  terms: Terms,
): string[] => [
  describeOwnerName(team),
  `Last Updated on ${describeLastUpdated(team.lastUpdated)}`,
  `${terms.serviceLevelExpectation}: ${describeSle(team, terms.workItems)}`,
  `System ${terms.wip} Limit: ${describeLimit(team.systemWipLimit, terms.workItem, terms.workItems)}`,
  `${terms.feature} ${terms.wip}: ${describeLimit(team.featureWip, terms.feature, terms.features)}`,
  `${terms.throughput}: ${describeThroughput(team.throughput)}`,
  `${terms.portfolios}: ${describeList(team.portfolios.map(describeOwnerName))}`,
  `${terms.features}: ${team.featureCount ?? NOT_SENT}`,
  ...(team.tags.length === 0 ? [] : [`Tags: ${describeTags(team.tags)}`]),
  `${terms.workItem} Types: ${describeList(team.workItemTypes)}`,
];

/**
 * A Portfolio as its page states it. Its Feature WIP is the number of Teams working on it, so it has no
 * setting of its own.
 */
export type PortfolioSummary = {
  readonly id: number;
  readonly name: string;
  readonly lastUpdated: string | undefined;
  readonly sleProbability: number | undefined;
  readonly sleRange: number | undefined;
  readonly systemWipLimit: number | undefined;
  readonly teams: readonly OwnerReference[];
  readonly featureCount: number | undefined;
};

/** The Portfolio as its page states it, or null when the answer does not say which Portfolio it is. */
export const readPortfolio = (value: unknown): PortfolioSummary | null => {
  const named = readOwnerListItem(value);
  if (named === null || !isRecord(value)) {
    return null;
  }
  return {
    id: named.id,
    name: named.name,
    lastUpdated: named.lastUpdated,
    sleProbability: positiveOf(value.serviceLevelExpectationProbability),
    sleRange: positiveOf(value.serviceLevelExpectationRange),
    systemWipLimit: positiveOf(value.systemWIPLimit),
    teams: referencesOf(value.involvedTeams),
    featureCount: named.featureCount,
  };
};

/**
 * The Portfolio page's heading and settings, one line each, in the instance's words. Its Feature WIP
 * reads 'Not set' when no Team works on it, as the page's quick setting does.
 */
export const describePortfolioSummary = (
  portfolio: PortfolioSummary,
  terms: Terms,
): string[] => [
  describeOwnerName(portfolio),
  `Last Updated on ${describeLastUpdated(portfolio.lastUpdated)}`,
  `${terms.serviceLevelExpectation}: ${describeSle(portfolio, terms.features)}`,
  `System ${terms.wip} Limit: ${describeLimit(portfolio.systemWipLimit, terms.feature, terms.features)}`,
  `${terms.feature} ${terms.wip}: ${describeLimit(positiveOf(portfolio.teams.length), terms.team, terms.teams)}`,
  `${terms.teams}: ${describeList(portfolio.teams.map(describeOwnerName))}`,
  `${terms.features}: ${portfolio.featureCount ?? NOT_SENT}`,
];
