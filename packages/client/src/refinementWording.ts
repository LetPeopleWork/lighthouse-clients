import type {
  LighthouseClient,
  RefinementNeed,
  TeamRefinement,
  TerminologyEntry,
} from "./index";

/** The words an instance may rename that the refinement need is stated in. */
export type RefinementTerms = {
  readonly workItem: string;
  readonly workItems: string;
  readonly team: string;
  readonly refinement: string;
};

/** What the refinement need is stated with: the Team's name and the instance's words. */
export type RefinementWording = {
  readonly teamName: string;
  readonly terms: RefinementTerms;
};

const SEEDED_REFINEMENT_TERMS: RefinementTerms = {
  workItem: "Work Item",
  workItems: "Work Items",
  team: "Team",
  refinement: "Refinement",
};

const NOT_ENOUGH_DATA =
  "Not enough data yet — need at least 5 days with completed items to forecast.";

/** The instance's words, a blank or missing one falling back to the seeded word, as on the web. */
const resolveRefinementTerms = (
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

const nameTheTeam = (
  team: unknown,
  teamId: number,
  terms: RefinementTerms,
): string =>
  typeof team === "object" &&
  team !== null &&
  "name" in team &&
  typeof team.name === "string"
    ? team.name
    : `${terms.team} ${teamId}`;

type Read<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

/** The two reads the wording comes from; each surface passes its own client. */
export type RefinementWordingSource<TError> = {
  readonly getTeam: (teamId: number) => Promise<Read<unknown, TError>>;
  readonly getTerminology: LighthouseClient["getTerminology"];
};

/**
 * Reads the Team's name and the instance's terminology. Terminology that cannot be read leaves the
 * seeded words standing rather than failing the answer; a Team that cannot be read fails it.
 */
export const readRefinementWording = async <TError>(
  source: RefinementWordingSource<TError>,
  teamId: number,
): Promise<Read<RefinementWording, TError>> => {
  const [team, terminology] = await Promise.all([
    source.getTeam(teamId),
    source.getTerminology(),
  ]);
  if (!team.ok) {
    return team;
  }
  const terms = resolveRefinementTerms(
    terminology.ok ? terminology.value : null,
  );
  return {
    ok: true,
    value: { teamName: nameTheTeam(team.value, teamId, terms), terms },
  };
};

type JudgedNeed = {
  readonly verdict: "Below" | "In" | "Above";
  readonly readyCount: number;
  readonly low: number;
  readonly high: number;
  readonly isRefinementDay: boolean;
  readonly wording: RefinementWording;
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
    ? need.wording.terms.workItem
    : need.wording.terms.workItems;

const whereTheCycleEnds = ({ isRefinementDay, wording }: JudgedNeed): string =>
  isRefinementDay
    ? `the next ${wording.terms.refinement}`
    : `the ${wording.terms.refinement} after`;

const describeBelow = (need: JudgedNeed): string =>
  `below ${theRange(need)} ${workItemsTermFor(need)} ${need.wording.teamName} is likely to pull until ${whereTheCycleEnds(need)}. Refine ${howManyMore(need)} more.`;

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

const describeNextRefinement = (
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
const describeHeading = (
  refinement: TeamRefinement,
  wording: RefinementWording,
): string =>
  `${wording.teamName} · ${describeNextRefinement(refinement, wording.terms)}`;

const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/u;

// Rejects a day the calendar does not have, such as 2026-02-30, which Date would roll into March.
const isCalendarDay = (value: string | null): boolean => {
  if (value === null || !CALENDAR_DAY.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
};

/** A verdict with every fact it is said with. */
type ShownVerdict = {
  readonly verdict: "Below" | "In" | "Above";
  readonly low: number;
  readonly high: number;
  readonly highPercentile: number;
};

type JudgedFacts = RefinementNeed & ShownVerdict;

const isJudged = (need: RefinementNeed): need is JudgedFacts =>
  need.verdict !== null &&
  need.low !== null &&
  need.high !== null &&
  need.lowPercentile !== null &&
  need.highPercentile !== null &&
  need.horizonWorkingDays !== null &&
  isCalendarDay(need.cycleStart) &&
  isCalendarDay(need.cycleEnd);

/** The verdict the web tab shows, or null when one of the facts it is said with is missing. */
const shownVerdictOf = (refinement: TeamRefinement): ShownVerdict | null => {
  const { need } = refinement;
  if (
    !isJudged(need) ||
    refinement.readyCount === undefined ||
    refinement.nextRefinementDate == null
  ) {
    return null;
  }
  const { verdict, low, high, highPercentile } = need;
  return { verdict, low, high, highPercentile };
};

const describeWhyNoNumber = (
  refinement: TeamRefinement,
  terms: RefinementTerms,
): string | null => {
  if (hasNoRefinementStates(refinement)) {
    return `A ${terms.team} admin needs to choose ${terms.refinement.toLowerCase()} states first`;
  }
  if (refinement.need.unavailableReason === "InsufficientData") {
    return NOT_ENOUGH_DATA;
  }
  if (
    refinement.need.unavailableReason === "NoCadence" ||
    refinement.nextRefinementDate === null
  ) {
    return `A ${terms.team} admin can set a ${terms.refinement} cadence to see how many ${terms.workItems} are needed`;
  }
  return null;
};

/**
 * "3 ready — below the range of 5–8 Work Items Team Gravity is likely to pull until the Refinement after.
 * Refine 2 to 5 more.", or, without a verdict to show, why there is no number.
 */
const describeNeed = (
  refinement: TeamRefinement,
  wording: RefinementWording,
): string | null => {
  const shown = shownVerdictOf(refinement);
  if (
    shown === null ||
    hasNoRefinementStates(refinement) ||
    refinement.need.unavailableReason !== null
  ) {
    return describeWhyNoNumber(refinement, wording.terms);
  }
  return describeJudgedNeed({
    ...shown,
    readyCount: refinement.readyCount,
    isRefinementDay: refinement.isRefinementDay,
    wording,
  });
};

// A Team with refinement states but nothing in them gets this one sentence, without heading or need.
const isNothingInRefinement = (refinement: TeamRefinement): boolean =>
  !hasNoRefinementStates(refinement) && refinement.workItems.length === 0;

/**
 * The heading and the need sentence together, as the web page states them, or that nothing is in
 * refinement right now.
 */
export const describeRefinementSummary = (
  refinement: TeamRefinement,
  wording: RefinementWording,
): string => {
  if (isNothingInRefinement(refinement)) {
    return `No ${wording.terms.workItems} in ${wording.terms.refinement} states right now`;
  }
  const heading = describeHeading(refinement, wording);
  const need = describeNeed(refinement, wording);
  return need === null ? heading : `${heading}\n${need}`;
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
  verdict: ShownVerdict,
  terms: RefinementTerms,
): string =>
  `enough for the next ${terms.refinement} (${verdict.highPercentile}%) · not needed before then`;

/**
 * The line follows the Work Item that makes up the number needed. When fewer are listed than that, it
 * follows the last one and says all of them are needed; when none are needed, it comes first. Without
 * a verdict to show there is no line.
 */
export const placeEnoughForLine = (
  refinement: TeamRefinement,
  terms: RefinementTerms,
): EnoughForLine | null => {
  const verdict = shownVerdictOf(refinement);
  const listed = refinement.workItems.length;
  if (verdict === null || listed === 0) {
    return null;
  }
  if (listed < verdict.high) {
    return { afterRows: listed, says: describeAllNeeded(listed, terms) };
  }
  return { afterRows: verdict.high, says: describeEnoughFor(verdict, terms) };
};

/** How many of the listed Work Items carry a number: those needed, while a verdict is shown. */
export const countNumberedRows = (refinement: TeamRefinement): number => {
  const verdict = shownVerdictOf(refinement);
  return verdict === null
    ? 0
    : Math.min(verdict.high, refinement.workItems.length);
};

/** The instance's words alone, the seeded ones standing in when terminology cannot be read. */
export const readRefinementTerms = async (
  source: Pick<LighthouseClient, "getTerminology">,
): Promise<RefinementTerms> => {
  const terminology = await source.getTerminology();
  return resolveRefinementTerms(terminology.ok ? terminology.value : null);
};
