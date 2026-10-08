import {
  describeFeatureCount,
  describeLastUpdated,
  describeOwnerCount,
  describeOwnerListHeadings,
  describeOwnerListTitle,
  describeOwnerName,
  describePortfolioSummary,
  describeTags,
  describeTeamSummary,
  type OwnerKind,
  readOwnerList,
  readPortfolio,
  readTeam,
  type Terms,
} from "@letpeoplework/lighthouse-client";
import { toTableLines } from "./table";

/** The Teams or Portfolios as the Overview's table lists them, or null when the answer is not in a shape it knows. */
export const renderOwnerList = (
  value: unknown,
  kind: OwnerKind,
  terms: Terms,
): string | null => {
  const owners = readOwnerList(value);
  if (owners === null) {
    return null;
  }
  if (owners.length === 0) {
    return `${describeOwnerCount(kind, 0, terms)}.`;
  }
  return [
    describeOwnerListTitle(kind, terms),
    ...toTableLines([
      describeOwnerListHeadings(terms),
      ...owners.map((owner) => [
        describeOwnerName(owner),
        describeFeatureCount(owner.featureCount, terms),
        describeTags(owner.tags),
        describeLastUpdated(owner.lastUpdated),
      ]),
    ]),
  ].join("\n");
};

/** The Team as its page states it, heading then settings, or null when the answer does not say which Team it is. */
export const renderTeam = (value: unknown, terms: Terms): string | null => {
  const team = readTeam(value);
  if (team === null) {
    return null;
  }
  return asPage(describeTeamSummary(team, terms));
};

/** The Portfolio as its page states it, heading then settings, or null when the answer does not say which Portfolio it is. */
export const renderPortfolio = (
  value: unknown,
  terms: Terms,
): string | null => {
  const portfolio = readPortfolio(value);
  if (portfolio === null) {
    return null;
  }
  return asPage(describePortfolioSummary(portfolio, terms));
};

/**
 * The Portfolios as the Overview lists them. Where the web shows each Portfolio's Deliveries, this points
 * at the command that lists them, so the list costs one read instead of one more per Portfolio.
 */
export const renderPortfolioList = (
  value: unknown,
  terms: Terms,
): string | null => {
  const table = renderOwnerList(value, "portfolio", terms);
  if (table === null || readOwnerList(value)?.length === 0) {
    return table;
  }
  return [
    table,
    "",
    `${terms.deliveries} per ${terms.portfolio}: lh delivery list --portfolio-id <id>`,
  ].join("\n");
};

// The heading and when it was last updated stand apart from the settings beneath them, as on the page.
const asPage = ([name, lastUpdated, ...settings]: string[]): string =>
  [name, lastUpdated, "", ...settings].join("\n");
