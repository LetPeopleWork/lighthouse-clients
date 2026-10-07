import type { AnswerWording } from "./answerWording";
import { formatCalendarDay } from "./calendarDates";
import type {
  BlockedCountSnapshot,
  CumulativeStateTimeCandidateRow,
  CumulativeStateTimeCandidatesResult,
  CumulativeStateTimeItemRow,
  CumulativeStateTimeItemsResult,
  CumulativeStateTimeResult,
  CumulativeStateTimeStateRow,
  DailyTotalWorkItemAge,
  DailyWorkItemAge,
  PercentilesOverTimeMetricType,
  PercentilesOverTimeSnapshot,
  ProcessBehaviorSnapshot,
  TotalWorkItemAgeOverTimeResult,
  WorkItemAgeEntry,
  WorkItemAgeOverTimeResult,
} from "./index";
import type { Terms } from "./terminology";

type Facts = Readonly<Record<string, unknown>>;

const isFacts = (value: unknown): value is Facts =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isText = (value: unknown): value is string => typeof value === "string";

const isDay = (value: unknown): value is string =>
  isText(value) && formatCalendarDay(value) !== null;

const readEvery = <T>(
  value: unknown,
  readOne: (item: unknown) => T | null,
): T[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const read = value.map(readOne);
  return read.every((item) => item !== null) ? (read as T[]) : null;
};

/** A metric Lighthouse would not answer, in the words the command reports it with. */
export type MetricRefusal = { readonly refused: string };

/** A metric's view, or why Lighthouse would not give it. */
export type MetricAnswer<T> = T | MetricRefusal;

export const isMetricRefusal = (value: unknown): value is MetricRefusal =>
  isFacts(value) && isText(value.refused);

// The metrics command marks a refused or skipped read in place of its facts.
const readRefusal = (value: unknown): MetricRefusal | null => {
  if (!isFacts(value) || !isText(value.status) || !isText(value.reason)) {
    return null;
  }
  return {
    refused: isText(value.category)
      ? `${value.category}: ${value.reason}`
      : value.reason,
  };
};

/** The metric's view, its refusal, or null when it is in a shape no reader knows. */
export const readMetricAnswer = <T>(
  value: unknown,
  read: (value: unknown) => T | null,
): MetricAnswer<T> | null => readRefusal(value) ?? read(value);

export type MetricsScope = "team" | "portfolio";

/** What the metrics composite is about: whose metrics, and over which days. */
export type MetricsSubject = {
  readonly scope: MetricsScope;
  readonly id: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly sections: Facts;
};

export const readMetricsSubject = (value: unknown): MetricsSubject | null => {
  if (
    !isFacts(value) ||
    !(value.scope === "team" || value.scope === "portfolio") ||
    !isNumber(value.id) ||
    !isFacts(value.dateRange) ||
    !isDay(value.dateRange.startDate) ||
    !isDay(value.dateRange.endDate)
  ) {
    return null;
  }
  return {
    scope: value.scope,
    id: value.id,
    startDate: value.dateRange.startDate,
    endDate: value.dateRange.endDate,
    sections: value,
  };
};

export type DailyCount = { readonly date: string; readonly count: number };

/** Throughput or Arrivals: the total over the range and the count of each day. */
export type DailyCountChartView = {
  readonly startDate: string;
  readonly endDate: string;
  readonly total: number;
  readonly daily: readonly DailyCount[];
};

const readDailyCount = (value: unknown): DailyCount | null =>
  isFacts(value) && isDay(value.date) && isNumber(value.count)
    ? { date: value.date, count: value.count }
    : null;

type DailyCountsView = Omit<DailyCountChartView, "total">;

const readDailyCounts = (value: unknown): DailyCountsView | null => {
  if (!isFacts(value) || !isDay(value.startDate) || !isDay(value.endDate)) {
    return null;
  }
  const daily = readEvery(value.daily, readDailyCount);
  return daily === null
    ? null
    : { startDate: value.startDate, endDate: value.endDate, daily };
};

const readDailyCountChart = (value: unknown): DailyCountChartView | null => {
  const counts = readDailyCounts(value);
  return counts === null || !isFacts(value) || !isNumber(value.total)
    ? null
    : { ...counts, total: value.total };
};

export const readThroughput = readDailyCountChart;

export const readArrivals = readDailyCountChart;

/** A Work Item in progress, as far as the headline counts it; an older Lighthouse does not say whether it is blocked. */
export type InProgressItem = { readonly isBlocked: boolean | undefined };

export type InProgressNowView = {
  readonly asOfDate: string;
  readonly count: number;
  readonly items: readonly InProgressItem[];
};

export type WipView = {
  readonly current: MetricAnswer<InProgressNowView>;
  readonly overTime: MetricAnswer<DailyCountsView>;
};

const readInProgressItem = (value: unknown): InProgressItem | null =>
  isFacts(value) &&
  (value.isBlocked === undefined || typeof value.isBlocked === "boolean")
    ? { isBlocked: value.isBlocked }
    : null;

const readInProgressNow = (value: unknown): InProgressNowView | null => {
  if (!isFacts(value) || !isDay(value.asOfDate) || !isNumber(value.count)) {
    return null;
  }
  const items = readEvery(value.items, readInProgressItem);
  return items === null
    ? null
    : { asOfDate: value.asOfDate, count: value.count, items };
};

export const readWip = (value: unknown): WipView | null => {
  if (!isFacts(value)) {
    return null;
  }
  const current = readMetricAnswer(value.current, readInProgressNow);
  const overTime = readMetricAnswer(value.overTime, readDailyCounts);
  return current === null || overTime === null ? null : { current, overTime };
};

export type PercentileValue = {
  readonly percentile: number;
  readonly value: number;
};

const readPercentileValue = (value: unknown): PercentileValue | null =>
  isFacts(value) && isNumber(value.percentile) && isNumber(value.value)
    ? { percentile: value.percentile, value: value.value }
    : null;

const readPercentileValues = (
  value: unknown,
): readonly PercentileValue[] | null =>
  isFacts(value) ? readEvery(value.values, readPercentileValue) : null;

export type ClosedItem = { readonly id: number; readonly name: string };

export type CycleTimeView = {
  readonly percentiles: MetricAnswer<readonly PercentileValue[]>;
  readonly closedItems: MetricAnswer<readonly ClosedItem[]>;
};

const readClosedItem = (value: unknown): ClosedItem | null =>
  isFacts(value) && isNumber(value.id) && isText(value.name)
    ? { id: value.id, name: value.name }
    : null;

const readClosedItems = (value: unknown): readonly ClosedItem[] | null =>
  isFacts(value) ? readEvery(value.items, readClosedItem) : null;

export const readCycleTime = (value: unknown): CycleTimeView | null => {
  if (!isFacts(value)) {
    return null;
  }
  const percentiles = readMetricAnswer(value.percentiles, readPercentileValues);
  const closedItems = readMetricAnswer(value.closedItems, readClosedItems);
  return percentiles === null || closedItems === null
    ? null
    : { percentiles, closedItems };
};

export const readWorkItemAgePercentiles = readPercentileValues;

const readWorkItemAgeEntry = (value: unknown): WorkItemAgeEntry | null =>
  isFacts(value) &&
  isNumber(value.id) &&
  isText(value.name) &&
  isText(value.referenceId) &&
  isNumber(value.age)
    ? {
        id: value.id,
        name: value.name,
        referenceId: value.referenceId,
        age: value.age,
      }
    : null;

const readDailyWorkItemAge = (value: unknown): DailyWorkItemAge | null => {
  if (!isFacts(value) || !isDay(value.date)) {
    return null;
  }
  const items = readEvery(value.items, readWorkItemAgeEntry);
  return items === null ? null : { date: value.date, items };
};

const readDailyTotalWorkItemAge = (
  value: unknown,
): DailyTotalWorkItemAge | null =>
  isFacts(value) &&
  isDay(value.date) &&
  isNumber(value.totalAge) &&
  isNumber(value.itemCount)
    ? { date: value.date, totalAge: value.totalAge, itemCount: value.itemCount }
    : null;

const readDailySeries = <T>(
  value: unknown,
  readDay: (day: unknown) => T | null,
): {
  readonly startDate: string;
  readonly endDate: string;
  readonly daily: readonly T[];
} | null => {
  if (!isFacts(value) || !isDay(value.startDate) || !isDay(value.endDate)) {
    return null;
  }
  const daily = readEvery(value.daily, readDay);
  return daily === null
    ? null
    : { startDate: value.startDate, endDate: value.endDate, daily };
};

export const readWorkItemAge = (
  value: unknown,
): WorkItemAgeOverTimeResult | null =>
  readDailySeries(value, readDailyWorkItemAge);

export const readTotalWorkItemAge = (
  value: unknown,
): TotalWorkItemAgeOverTimeResult | null =>
  readDailySeries(value, readDailyTotalWorkItemAge);

/** The score, absent when Lighthouse sent none. */
export type PredictabilityScoreView = { readonly score: number | undefined };

export const readPredictabilityScore = (
  value: unknown,
): PredictabilityScoreView | null => {
  if (!isFacts(value)) {
    return null;
  }
  if (value.score === undefined || value.score === null) {
    return { score: undefined };
  }
  return isNumber(value.score) ? { score: value.score } : null;
};

/** A recorded history over the range, one entry per recorded day. */
export type MetricHistoryView<T> = {
  readonly startDate: string;
  readonly endDate: string;
  readonly history: readonly T[];
};

const readHistory = <T>(
  value: unknown,
  readEntry: (entry: unknown) => T | null,
): MetricHistoryView<T> | null => {
  if (!isFacts(value) || !isDay(value.startDate) || !isDay(value.endDate)) {
    return null;
  }
  const history = readEvery(value.history, readEntry);
  return history === null
    ? null
    : { startDate: value.startDate, endDate: value.endDate, history };
};

const readBlockedCount = (value: unknown): BlockedCountSnapshot | null =>
  isFacts(value) && isDay(value.recordedAt) && isNumber(value.blockedCount)
    ? { recordedAt: value.recordedAt, blockedCount: value.blockedCount }
    : null;

const isPercentilesMetricType = (
  value: unknown,
): value is PercentilesOverTimeMetricType =>
  value === "CycleTime" || value === "WorkItemAge";

const readPercentilesSnapshot = (
  value: unknown,
): PercentilesOverTimeSnapshot | null =>
  isFacts(value) &&
  isDay(value.recordedAt) &&
  isPercentilesMetricType(value.metricType) &&
  isNumber(value.p50) &&
  isNumber(value.p70) &&
  isNumber(value.p85) &&
  isNumber(value.p95)
    ? {
        recordedAt: value.recordedAt,
        metricType: value.metricType,
        p50: value.p50,
        p70: value.p70,
        p85: value.p85,
        p95: value.p95,
      }
    : null;

const readProcessBehaviorSnapshot = (
  value: unknown,
): ProcessBehaviorSnapshot | null =>
  isFacts(value) &&
  isDay(value.recordedAt) &&
  isNumber(value.unpl) &&
  isNumber(value.average) &&
  isNumber(value.lnpl)
    ? {
        recordedAt: value.recordedAt,
        unpl: value.unpl,
        average: value.average,
        lnpl: value.lnpl,
      }
    : null;

export const readBlocked = (
  value: unknown,
): MetricHistoryView<BlockedCountSnapshot> | null =>
  readHistory(value, readBlockedCount);

export const readPercentilesOverTime = (
  value: unknown,
): MetricHistoryView<PercentilesOverTimeSnapshot> | null =>
  readHistory(value, readPercentilesSnapshot);

export const readProcessBehaviorOverTime = (
  value: unknown,
): MetricHistoryView<ProcessBehaviorSnapshot> | null =>
  readHistory(value, readProcessBehaviorSnapshot);

const STATE_ROW_COUNTS = [
  "workflowOrder",
  "totalDays",
  "completedContributionDays",
  "ongoingContributionDays",
  "itemCount",
  "completedItemCount",
  "ongoingItemCount",
  "meanDays",
] as const;

const readStateRow = (value: unknown): CumulativeStateTimeStateRow | null =>
  isFacts(value) &&
  isText(value.state) &&
  STATE_ROW_COUNTS.every((field) => isNumber(value[field])) &&
  (value.medianDays === null || isNumber(value.medianDays))
    ? (value as CumulativeStateTimeStateRow)
    : null;

const readCandidateRow = (
  value: unknown,
): CumulativeStateTimeCandidateRow | null =>
  isFacts(value) &&
  isNumber(value.workItemId) &&
  isText(value.referenceId) &&
  isText(value.title) &&
  isText(value.workItemType)
    ? (value as CumulativeStateTimeCandidateRow)
    : null;

const readContributorRow = (
  value: unknown,
): CumulativeStateTimeItemRow | null =>
  isFacts(value) &&
  isNumber(value.workItemId) &&
  isText(value.referenceId) &&
  isText(value.title) &&
  isText(value.type) &&
  isText(value.state) &&
  isText(value.stateCategory) &&
  (value.url === null || isText(value.url)) &&
  isNumber(value.daysContributed)
    ? (value as CumulativeStateTimeItemRow)
    : null;

const readStates = (value: unknown): CumulativeStateTimeResult | null => {
  const states = isFacts(value) ? readEvery(value.states, readStateRow) : null;
  return states === null ? null : { states };
};

const readCandidates = (
  value: unknown,
): CumulativeStateTimeCandidatesResult | null => {
  const items = isFacts(value)
    ? readEvery(value.items, readCandidateRow)
    : null;
  return items === null ? null : { items };
};

const readContributors = (
  value: unknown,
): CumulativeStateTimeItemsResult | null => {
  if (!isFacts(value) || !isText(value.state)) {
    return null;
  }
  const items = readEvery(value.items, readContributorRow);
  return items === null ? null : { state: value.state, items };
};

/** Time in State: the bar, the Work Items it can be narrowed to, and one state's contributors when one was asked for. */
export type CumulativeStateTimeView = {
  readonly bar: MetricAnswer<CumulativeStateTimeResult>;
  readonly candidates: MetricAnswer<CumulativeStateTimeCandidatesResult>;
  readonly items: MetricAnswer<CumulativeStateTimeItemsResult> | undefined;
};

export const readCumulativeStateTime = (
  value: unknown,
): CumulativeStateTimeView | null => {
  if (!isFacts(value)) {
    return null;
  }
  const bar = readMetricAnswer(value.bar, readStates);
  const candidates = readMetricAnswer(value.candidates, readCandidates);
  const items =
    value.items === undefined
      ? undefined
      : readMetricAnswer(value.items, readContributors);
  return bar === null || candidates === null || items === null
    ? null
    : { bar, candidates, items };
};

/** The Team's or Portfolio's System WIP Limit; absent when none is set, as the web leaves it out. */
export const readSystemWipLimit = (value: unknown): number | undefined =>
  isFacts(value) && isNumber(value.systemWIPLimit) && value.systemWIPLimit >= 1
    ? value.systemWIPLimit
    : undefined;

// ── Wording ──────────────────────────────────────────────────────────────────

/** One line of the headline: what it is, its number, and what the number is out of. */
export type MetricLine = {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
};

export const UNKNOWN_SHAPE_NOTE = "shown only with --json (unknown shape)";

/** What an empty over-time chart says on the web. */
export const OVER_TIME_EMPTY_SENTENCE =
  "Nothing to show for the selected range. Days appear here as Lighthouse records them.";

/** Every part of the headline that can be refused or unreadable on its own. */
export type MetricsHeadlinePart =
  | "wip"
  | "throughput"
  | "arrivals"
  | "blocked"
  | "totalWorkItemAge"
  | "predictabilityScore"
  | "cycleTimePercentiles"
  | "workItemAgePercentiles"
  | "workItemAge"
  | "cumulativeStateTime"
  | "percentilesOverTime"
  | "processBehaviorOverTime";

type Counted = { readonly one: string; readonly many: string };

// A Portfolio's metrics count Features, a Team's count Work Items.
const countedOf = (scope: MetricsScope, terms: Terms): Counted =>
  scope === "team"
    ? { one: terms.workItem, many: terms.workItems }
    : { one: terms.feature, many: terms.features };

const countOf = (count: number, counted: Counted): string =>
  `${count} ${count === 1 ? counted.one : counted.many}`;

/** "1 day", "12 days". */
export const describeDays = (days: number): string =>
  days === 1 ? "1 day" : `${days} days`;

/** The label each part of the headline goes by, in the instance's words. */
export const metricsHeadlineLabel = (
  part: MetricsHeadlinePart,
  scope: MetricsScope,
  terms: Terms,
): string => {
  const counted = countedOf(scope, terms);
  const labels: Readonly<Record<MetricsHeadlinePart, string>> = {
    wip: `${counted.many} in Progress`,
    throughput: `Total ${terms.throughput}`,
    arrivals: "Total Arrivals",
    blocked: `${terms.blocked} ${counted.many}`,
    totalWorkItemAge: `Total ${terms.workItemAge}`,
    predictabilityScore: "Predictability Score",
    cycleTimePercentiles: `${terms.cycleTime} percentiles`,
    workItemAgePercentiles: `${terms.workItemAge} percentiles`,
    workItemAge: `${terms.workItemAge} over time`,
    cumulativeStateTime: "Time in State",
    percentilesOverTime: `${terms.cycleTime} 85th percentile`,
    processBehaviorOverTime: `${terms.throughput} process limits`,
  };
  return labels[part];
};

/** A part Lighthouse refused, its reason in the number's place. */
export const describeRefusedMetric = (
  label: string,
  refusal: MetricRefusal,
): MetricLine => ({ label, value: "", detail: refusal.refused });

/** A part in a shape this version cannot read: the facts are still in --json. */
export const describeUnknownMetric = (label: string): MetricLine => ({
  label,
  value: "",
  detail: UNKNOWN_SHAPE_NOTE,
});

const dayOf = (wire: string): string => formatCalendarDay(wire) ?? wire;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const utcOf = (day: string): number => {
  const [year, month, date] = day.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, date);
};

/** How many days a range covers, both ends included. */
export const daysInRange = (startDate: string, endDate: string): number =>
  Math.round((utcOf(endDate) - utcOf(startDate)) / DAY_IN_MS) + 1;

/** "Gravity · Mon 7 Sep 2026 – Tue 6 Oct 2026 (30 days)". */
export const describeMetricsHeading = (
  subject: Pick<MetricsSubject, "startDate" | "endDate">,
  wording: AnswerWording,
): string => {
  const days = daysInRange(subject.startDate, subject.endDate);
  return `${wording.name} · ${dayOf(subject.startDate)} – ${dayOf(subject.endDate)} (${describeDays(days)})`;
};

/** "Work Items in Progress  9  System WIP Limit: 10 Work Items", the limit left out when none is set. */
export const describeInProgressNow = (
  now: InProgressNowView,
  scope: MetricsScope,
  terms: Terms,
  systemWipLimit: number | undefined,
): MetricLine => ({
  label: metricsHeadlineLabel("wip", scope, terms),
  value: String(now.count),
  detail:
    systemWipLimit === undefined
      ? ""
      : `System ${terms.wip} Limit: ${countOf(systemWipLimit, countedOf(scope, terms))}`,
});

/** "Blocked Work Items  2", or null when Lighthouse does not say which items are blocked. */
export const describeBlockedNow = (
  now: InProgressNowView,
  scope: MetricsScope,
  terms: Terms,
): MetricLine | null => {
  if (!now.items.some((item) => item.isBlocked !== undefined)) {
    return null;
  }
  const blocked = now.items.filter((item) => item.isBlocked === true).length;
  return {
    label: metricsHeadlineLabel("blocked", scope, terms),
    value: String(blocked),
    detail: "",
  };
};

// The dashboard's widgets average the total over every day of the range, to one decimal.
const perDay = (chart: DailyCountChartView): string =>
  `${(chart.total / daysInRange(chart.startDate, chart.endDate)).toFixed(1)} / day`;

/** "Total Throughput  31  1.0 / day". */
export const describeTotalThroughput = (
  chart: DailyCountChartView,
  scope: MetricsScope,
  terms: Terms,
): MetricLine => ({
  label: metricsHeadlineLabel("throughput", scope, terms),
  value: String(chart.total),
  detail: perDay(chart),
});

/** "Total Arrivals  28  0.9 / day". */
export const describeTotalArrivals = (
  chart: DailyCountChartView,
  scope: MetricsScope,
  terms: Terms,
): MetricLine => ({
  label: metricsHeadlineLabel("arrivals", scope, terms),
  value: String(chart.total),
  detail: perDay(chart),
});

const latestBy = <T>(entries: readonly T[], dayKey: (entry: T) => string) =>
  entries.reduce<T | undefined>(
    (latest, entry) =>
      latest === undefined || dayKey(entry) >= dayKey(latest) ? entry : latest,
    undefined,
  );

const earliestBy = <T>(entries: readonly T[], dayKey: (entry: T) => string) =>
  entries.reduce<T | undefined>(
    (earliest, entry) =>
      earliest === undefined || dayKey(entry) < dayKey(earliest)
        ? entry
        : earliest,
    undefined,
  );

/** "Total Work Item Age  84 days  across 9 Work Items", as on the last recorded day. */
export const describeTotalWorkItemAge = (
  view: TotalWorkItemAgeOverTimeResult,
  scope: MetricsScope,
  terms: Terms,
): MetricLine => {
  const label = metricsHeadlineLabel("totalWorkItemAge", scope, terms);
  const last = latestBy(view.daily, (day) => day.date);
  return last === undefined
    ? { label, value: "—", detail: "" }
    : {
        label,
        value: describeDays(last.totalAge),
        detail: `across ${countOf(last.itemCount, countedOf(scope, terms))}`,
      };
};

/** "Predictability Score  63.4%", as the web shows it to one decimal. */
export const describePredictabilityScore = (
  view: PredictabilityScoreView,
  scope: MetricsScope,
  terms: Terms,
): MetricLine => ({
  label: metricsHeadlineLabel("predictabilityScore", scope, terms),
  value: view.score === undefined ? "—" : `${(view.score * 100).toFixed(1)}%`,
  detail: "",
});

/** "95th", "1st", "22nd". */
export const ordinalOf = (value: number): string => {
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${value}th`;
  }
  const suffixes: Readonly<Record<number, string>> = {
    1: "st",
    2: "nd",
    3: "rd",
  };
  return `${value}${suffixes[last] ?? "th"}`;
};

const percentileCell = (
  values: readonly PercentileValue[] | undefined,
  percentile: number,
): string => {
  const found = values?.find((entry) => entry.percentile === percentile);
  return found === undefined ? "—" : describeDays(found.value);
};

/**
 * The percentile table's rows, header first and the highest percentile next, Cycle Time beside Work Item
 * Age; a side that has no value for a percentile reads "—". Empty when neither side can be shown.
 */
export const describePercentileRows = (
  cycleTime: readonly PercentileValue[] | undefined,
  workItemAge: readonly PercentileValue[] | undefined,
  terms: Terms,
): readonly (readonly string[])[] => {
  const percentiles = [
    ...new Set(
      [...(cycleTime ?? []), ...(workItemAge ?? [])].map(
        (entry) => entry.percentile,
      ),
    ),
  ].sort((left, right) => right - left);
  if (percentiles.length === 0) {
    return [];
  }
  return [
    ["Percentile", terms.cycleTime, terms.workItemAge],
    ...percentiles.map((percentile) => [
      ordinalOf(percentile),
      percentileCell(cycleTime, percentile),
      percentileCell(workItemAge, percentile),
    ]),
  ];
};

/** "Over time (one row per recorded day: lh metrics team --id 3 --metrics <name>)". */
export const describeOverTimeHeading = (
  subject: Pick<MetricsSubject, "scope" | "id">,
): string =>
  `Over time (one row per recorded day: lh metrics ${subject.scope} --id ${subject.id} --metrics <name>)`;

// The over-time lines name a day without its year: the heading already says which range they are in.
const shortDayOf = (wire: string): string => dayOf(wire).replace(/ \d+$/u, "");

const recorded = (days: number): string => `${describeDays(days)} recorded`;

const overTimeLine = <T extends { readonly recordedAt: string }>(
  label: string,
  history: readonly T[],
  describe: (first: T, last: T) => string,
): MetricLine => {
  const first = earliestBy(history, (entry) => entry.recordedAt);
  const last = latestBy(history, (entry) => entry.recordedAt);
  return first === undefined || last === undefined
    ? { label, value: OVER_TIME_EMPTY_SENTENCE, detail: "" }
    : { label, value: describe(first, last), detail: recorded(history.length) };
};

const fromFirstToLast = <T extends { readonly recordedAt: string }>(
  first: T,
  last: T,
  say: (entry: T) => string,
): string =>
  first === last
    ? `${say(last)} on ${shortDayOf(last.recordedAt)}`
    : `${say(first)} on ${shortDayOf(first.recordedAt)} → ${say(last)} on ${shortDayOf(last.recordedAt)}`;

/** "Cycle Time 85th percentile  14 days on Mon 7 Sep → 12 days on Tue 6 Oct  29 days recorded". */
export const describePercentilesOverTime = (
  view: MetricHistoryView<PercentilesOverTimeSnapshot>,
  scope: MetricsScope,
  terms: Terms,
): MetricLine =>
  overTimeLine(
    metricsHeadlineLabel("percentilesOverTime", scope, terms),
    view.history,
    (first, last) =>
      fromFirstToLast(first, last, (entry) => describeDays(entry.p85)),
  );

const limitOf = (value: number): string => String(Number(value.toFixed(1)));

/** "Throughput process limits  0 – 3.1 / day, average 1.0, on Tue 6 Oct  29 days recorded", as on the last recorded day. */
export const describeProcessBehaviorOverTime = (
  view: MetricHistoryView<ProcessBehaviorSnapshot>,
  scope: MetricsScope,
  terms: Terms,
): MetricLine =>
  overTimeLine(
    metricsHeadlineLabel("processBehaviorOverTime", scope, terms),
    view.history,
    (_first, last) =>
      `${limitOf(last.lnpl)} – ${limitOf(last.unpl)} / day, average ${last.average.toFixed(1)}, on ${shortDayOf(last.recordedAt)}`,
  );

/** "Blocked Work Items  1 on Mon 7 Sep → 2 on Tue 6 Oct  30 days recorded". */
export const describeBlockedOverTime = (
  view: MetricHistoryView<BlockedCountSnapshot>,
  scope: MetricsScope,
  terms: Terms,
): MetricLine =>
  overTimeLine(
    metricsHeadlineLabel("blocked", scope, terms),
    view.history,
    (first, last) =>
      fromFirstToLast(first, last, (entry) => String(entry.blockedCount)),
  );
