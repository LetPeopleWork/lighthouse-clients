import { formatCalendarDay } from "./calendarDates";
import { CANNOT_FORECAST_SHORT } from "./forecastDisplayRules";
import { NOT_SENT } from "./ownerWording";
import type { Terms } from "./terminology";

/** When work on a Feature begins, as the server decided it: observed, forecast, or not known. */
export type FeatureStart = {
  readonly observedOn: string | undefined;
  readonly likelyBy: string | undefined;
};

/** One Feature as a row of the Feature list states it. */
export type FeatureListItem = {
  readonly referenceId: string;
  readonly name: string;
  readonly state: string;
  readonly totalWork: number;
  readonly remainingWork: number;
  readonly cannotBeForecast: boolean;
  readonly start: FeatureStart;
  readonly likelyBy: string | undefined;
};

// The one chance of the four the list has room for, named in its heading.
const LISTED_CHANCE = 85;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textOf = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

// The work arrives per Team; the Feature's own work is the sum. Null when any Team's share is not a number.
const workOf = (value: unknown): number | null => {
  if (!isRecord(value)) {
    return null;
  }
  const shares = Object.values(value);
  if (!shares.every((share) => typeof share === "number")) {
    return null;
  }
  return (shares as number[]).reduce((sum, share) => sum + share, 0);
};

const listedDateOf = (chances: unknown): string | undefined => {
  if (!Array.isArray(chances)) {
    return undefined;
  }
  const listed = chances.find(
    (entry) => isRecord(entry) && entry.probability === LISTED_CHANCE,
  );
  return isRecord(listed) ? textOf(listed.expectedDate) : undefined;
};

const startOf = (value: unknown): FeatureStart => {
  if (!isRecord(value)) {
    return { observedOn: undefined, likelyBy: undefined };
  }
  return {
    observedOn:
      value.source === "Observed" ? textOf(value.observedDate) : undefined,
    likelyBy: listedDateOf(value.percentiles),
  };
};

const readFeatureListItem = (value: unknown): FeatureListItem | null => {
  if (!isRecord(value)) {
    return null;
  }
  const referenceId = textOf(value.referenceId);
  const name = textOf(value.name);
  const state = textOf(value.state);
  const totalWork = workOf(value.totalWork);
  const remainingWork = workOf(value.remainingWork);
  if (
    referenceId === undefined ||
    name === undefined ||
    state === undefined ||
    totalWork === null ||
    remainingWork === null
  ) {
    return null;
  }
  return {
    referenceId,
    name,
    state,
    totalWork,
    remainingWork,
    cannotBeForecast:
      Array.isArray(value.teamsWithoutForecast) &&
      value.teamsWithoutForecast.length > 0,
    start: startOf(value.startForecast),
    likelyBy: listedDateOf(value.forecasts),
  };
};

/**
 * Every Feature in the answer, or null when it is not a list or any one of them comes without its
 * reference, name, state or per-Team work: a row that cannot say how far along it is would misstate the list.
 */
export const readFeatureList = (value: unknown): FeatureListItem[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.map(readFeatureListItem);
  return items.every((item) => item !== null) ? items : null;
};

/** How many Features the answer holds, in the instance's words: "No Features", "1 Feature", "3 Features". */
export const describeFeatureListCount = (
  count: number,
  terms: Terms,
): string => {
  if (count === 0) {
    return `No ${terms.features}`;
  }
  return `${count} ${count === 1 ? terms.feature : terms.features}`;
};

/** The Feature list's column headings, narrowed to the 85% chance of its completion forecast. */
export const describeFeatureListHeadings = (terms: Terms): string[] => [
  terms.feature,
  "Name",
  "Progress",
  "Forecasted Start",
  `Forecasted Completion (${LISTED_CHANCE}%)`,
  "State",
];

const dayOf = (wire: string): string => formatCalendarDay(wire) ?? wire;

const countOfWorkItems = (count: number, terms: Terms): string =>
  `${count} ${count === 1 ? terms.workItem : terms.workItems}`;

/** How much of the Feature's work is done, over every Team: "8 of 13 Work Items". */
export const describeFeatureProgress = (
  feature: Pick<FeatureListItem, "totalWork" | "remainingWork">,
  terms: Terms,
): string =>
  `${feature.totalWork - feature.remainingWork} of ${countOfWorkItems(feature.totalWork, terms)}`;

/**
 * When work begins, as the web's Feature list says it. A day work already began is a fact, so it outranks a
 * Team without history; that Team only stops anyone saying when work will begin.
 */
export const describeFeatureStart = (
  feature: Pick<FeatureListItem, "start" | "cannotBeForecast">,
): string => {
  if (feature.start.observedOn !== undefined) {
    return dayOf(feature.start.observedOn);
  }
  if (feature.cannotBeForecast) {
    return CANNOT_FORECAST_SHORT;
  }
  return feature.start.likelyBy === undefined
    ? NOT_SENT
    : dayOf(feature.start.likelyBy);
};

/** The day the Feature is 85% likely to be done by, "Cannot forecast", or the mark when none was sent. */
export const describeFeatureCompletion = (
  feature: Pick<FeatureListItem, "likelyBy" | "cannotBeForecast">,
): string => {
  if (feature.cannotBeForecast) {
    return CANNOT_FORECAST_SHORT;
  }
  return feature.likelyBy === undefined ? NOT_SENT : dayOf(feature.likelyBy);
};

/** One Feature as a row of the list, in the order of its headings. */
export const describeFeatureRow = (
  feature: FeatureListItem,
  terms: Terms,
): string[] => [
  feature.referenceId,
  feature.name,
  describeFeatureProgress(feature, terms),
  describeFeatureStart(feature),
  describeFeatureCompletion(feature),
  feature.state,
];

/** One Work Item of a Feature as the Feature's Work Items list states it. */
export type FeatureWorkItem = {
  readonly referenceId: string;
  readonly name: string;
  readonly type: string;
  readonly state: string;
};

const readFeatureWorkItem = (value: unknown): FeatureWorkItem | null => {
  if (!isRecord(value)) {
    return null;
  }
  const referenceId = textOf(value.referenceId);
  const name = textOf(value.name);
  const type = textOf(value.type);
  const state = textOf(value.state);
  if (
    referenceId === undefined ||
    name === undefined ||
    type === undefined ||
    state === undefined
  ) {
    return null;
  }
  return { referenceId, name, type, state };
};

/** Every Work Item in the answer, or null when it is not a list or any one lacks its reference, name, type or state. */
export const readFeatureWorkItems = (
  value: unknown,
): FeatureWorkItem[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.map(readFeatureWorkItem);
  return items.every((item) => item !== null) ? items : null;
};

/**
 * The first Feature of an answer as a heading names it, its reference before its name:
 * "OE-002 Deep-sea camera stream". Undefined when the answer holds no named Feature.
 */
export const describeFeatureTitle = (value: unknown): string | undefined => {
  const feature: unknown = Array.isArray(value) ? value[0] : undefined;
  if (!isRecord(feature)) {
    return undefined;
  }
  const name = textOf(feature.name);
  if (name === undefined) {
    return undefined;
  }
  const referenceId = textOf(feature.referenceId);
  return referenceId === undefined ? name : `${referenceId} ${name}`;
};

/** "OE-002 Deep-sea camera stream · 3 Work Items", named by whatever stands in for the Feature. */
export const describeFeatureWorkItemsHeading = (
  featureName: string,
  count: number,
  terms: Terms,
): string => `${featureName} · ${countOfWorkItems(count, terms)}`;

/** The column headings of a Feature's Work Items. */
export const describeFeatureWorkItemHeadings = (): string[] => [
  "ID",
  "Name",
  "Type",
  "State",
];

/** One Work Item as a row of the list, in the order of its headings. */
export const describeFeatureWorkItemRow = (item: FeatureWorkItem): string[] => [
  item.referenceId,
  item.name,
  item.type,
  item.state,
];
