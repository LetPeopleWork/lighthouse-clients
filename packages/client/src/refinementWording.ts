import type { RefinementNeed, TeamRefinement, TerminologyEntry } from "./index";

/** The words an instance may rename that the refinement need is stated in. */
export type RefinementTerms = {
  readonly workItem: string;
  readonly workItems: string;
  readonly team: string;
  readonly refinement: string;
};

export const SEEDED_REFINEMENT_TERMS: RefinementTerms = {
  workItem: "Work Item",
  workItems: "Work Items",
  team: "Team",
  refinement: "Refinement",
};

const NOT_ENOUGH_DATA =
  "Not enough data yet — need at least 5 days with completed items to forecast.";

/** The instance's words, a blank or missing one falling back to the seeded word, as on the web. */
export const resolveRefinementTerms = (
  terminology: readonly TerminologyEntry[] | null,
): RefinementTerms => {
  const wordFor = (key: keyof RefinementTerms): string => {
    const entry = terminology?.find((candidate) => candidate.key === key);
    return entry?.value || entry?.defaultValue || SEEDED_REFINEMENT_TERMS[key];
  };
  return {
    workItem: wordFor("workItem"),
    workItems: wordFor("workItems"),
    team: wordFor("team"),
    refinement: wordFor("refinement"),
  };
};

type JudgedNeed = {
  readonly verdict: "Below" | "In" | "Above";
  readonly readyCount: number;
  readonly low: number;
  readonly high: number;
  readonly isRefinementDay: boolean;
  readonly teamName: string;
  readonly terms: RefinementTerms;
};

const isOneNumber = ({ low, high }: JudgedNeed): boolean => low === high;

const howManyMore = ({ readyCount, low, high }: JudgedNeed): string => {
  const fewest = low - readyCount;
  const most = high - readyCount;
  return fewest === most ? `${fewest}` : `${fewest} to ${most}`;
};

const theRange = (need: JudgedNeed): string =>
  isOneNumber(need)
    ? `the ${need.low}`
    : `the range of ${need.low}–${need.high}`;

const workItemsTermFor = (need: JudgedNeed): string =>
  isOneNumber(need) && need.low === 1
    ? need.terms.workItem
    : need.terms.workItems;

const whereTheCycleEnds = (need: JudgedNeed): string =>
  need.isRefinementDay
    ? `the next ${need.terms.refinement}`
    : `the ${need.terms.refinement} after`;

const describeBelow = (need: JudgedNeed): string =>
  `below ${theRange(need)} ${workItemsTermFor(need)} ${need.teamName} is likely to pull until ${whereTheCycleEnds(need)}. Refine ${howManyMore(need)} more.`;

const describeIn = (need: JudgedNeed): string => {
  const where = isOneNumber(need)
    ? `exactly the ${need.low} likely to be pulled`
    : `in ${theRange(need)}`;
  return `${where}. Nothing more needs refining by then.`;
};

const describeAbove = (need: JudgedNeed): string => {
  const where = isOneNumber(need)
    ? `above the ${need.high} likely to be pulled`
    : `above ${theRange(need)}`;
  return `${where}. Stop refining: nothing more is needed by then.`;
};

const VERDICT_WORDING = {
  Below: describeBelow,
  In: describeIn,
  Above: describeAbove,
} as const;

const describeJudgedNeed = (need: JudgedNeed): string =>
  `${need.readyCount} ready — ${VERDICT_WORDING[need.verdict](need)}`;

/** A calendar day sent as "2026-10-08", written as "Thu 8 Oct" whatever the reader's time zone. */
const formatDayAndDate = (isoDay: string): string => {
  const [year, month, day] = isoDay.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

const describeDistance = (days: number): string =>
  days === 1 ? "tomorrow" : `in ${days} days`;

const hasNoRefinementStates = (refinement: TeamRefinement): boolean =>
  !refinement.refinementConfigured ||
  refinement.need.unavailableReason === "NoRefinementStates";

const describeWhen = (
  refinement: TeamRefinement,
  terms: RefinementTerms,
): string => {
  if (hasNoRefinementStates(refinement)) {
    return `No ${terms.refinement} states`;
  }
  if (refinement.nextRefinementDate === null) {
    return `No ${terms.refinement} cadence`;
  }
  const named = `Next ${terms.refinement}: ${formatDayAndDate(refinement.nextRefinementDate)}`;
  return refinement.daysUntilNextRefinement === null
    ? named
    : `${named} · ${describeDistance(refinement.daysUntilNextRefinement)}`;
};

/** "Team Gravity · Next Refinement: Thu 8 Oct · in 2 days", or why there is no next Refinement to name. */
export const describeRefinementHeading = (
  teamName: string,
  refinement: TeamRefinement,
  terms: RefinementTerms,
): string => `${teamName} · ${describeWhen(refinement, terms)}`;

const judged = (
  teamName: string,
  refinement: TeamRefinement,
  terms: RefinementTerms,
): JudgedNeed | null => {
  const { verdict, low, high } = refinement.need;
  if (verdict === null || low === null || high === null) {
    return null;
  }
  return {
    verdict,
    readyCount: refinement.readyCount,
    low,
    high,
    isRefinementDay: refinement.isRefinementDay,
    teamName,
    terms,
  };
};

const describeNoNumber = (
  refinement: TeamRefinement,
  terms: RefinementTerms,
): string | null => {
  if (hasNoRefinementStates(refinement)) {
    return `A ${terms.team} admin needs to choose ${terms.refinement.toLowerCase()} states first`;
  }
  if (refinement.need.unavailableReason === "NoCadence") {
    return `A ${terms.team} admin can set a ${terms.refinement} cadence to see how many ${terms.workItems} are needed`;
  }
  if (refinement.need.unavailableReason === "InsufficientData") {
    return NOT_ENOUGH_DATA;
  }
  return null;
};

/**
 * "3 ready — below the range of 5–8 Work Items Team Gravity is likely to pull until the Refinement after.
 * Refine 2 to 5 more.", or, without a verdict, why there is no number.
 */
export const describeRefinementNeed = (
  teamName: string,
  refinement: TeamRefinement,
  terms: RefinementTerms,
): string | null => {
  const need = judged(teamName, refinement, terms);
  return need === null
    ? describeNoNumber(refinement, terms)
    : describeJudgedNeed(need);
};

/** Where the line goes among the listed Work Items: after this many rows, saying this. */
export type EnoughForLine = {
  readonly afterRows: number;
  readonly says: string;
};

const describeAllNeeded = (listed: number, terms: RefinementTerms): string => {
  const where = `in ${terms.refinement}`;
  const when = `before the next ${terms.refinement}.`;
  return listed === 1
    ? `The only ${terms.workItem} ${where} is needed ${when}`
    : `All ${listed} ${terms.workItems} ${where} are needed ${when}`;
};

const describeEnoughFor = (
  need: RefinementNeed,
  terms: RefinementTerms,
): string =>
  `enough for the next ${terms.refinement} (${need.highPercentile}%) · not needed before then`;

/**
 * The line follows the Work Item that makes up the number needed. When fewer are listed than that, it
 * follows the last one and says all of them are needed; when none are needed, it comes first. Without
 * a verdict there is no line.
 */
export const placeEnoughForLine = (
  refinement: TeamRefinement,
  terms: RefinementTerms,
): EnoughForLine | null => {
  const { need } = refinement;
  const listed = refinement.workItems.length;
  if (need.verdict === null || need.high === null || listed === 0) {
    return null;
  }
  if (listed < need.high) {
    return { afterRows: listed, says: describeAllNeeded(listed, terms) };
  }
  return { afterRows: need.high, says: describeEnoughFor(need, terms) };
};

/** How many of the listed Work Items carry a number: those needed, while a verdict is shown. */
export const countNumberedRows = (refinement: TeamRefinement): number => {
  const { need } = refinement;
  return need.verdict === null || need.high === null
    ? 0
    : Math.min(need.high, refinement.workItems.length);
};
