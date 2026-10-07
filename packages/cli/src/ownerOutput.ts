import {
  describeFeatureCount,
  describeLastUpdated,
  describeOwnerListHeadings,
  describeOwnerListTitle,
  describeOwnerName,
  describeTags,
  describeTeamSummary,
  type OwnerKind,
  readOwnerList,
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
  const [name, lastUpdated, ...settings] = describeTeamSummary(team, terms);
  return [name, lastUpdated, "", ...settings].join("\n");
};
