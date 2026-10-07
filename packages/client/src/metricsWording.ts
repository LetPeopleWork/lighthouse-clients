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
  MetricsDateRange,
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

const dayAfter = (day: string, offset: number): string =>
  new Date(utcOf(day) + offset * DAY_IN_MS).toISOString().slice(0, 10);

const readRunChartDay = (
  [offset, items]: readonly [string, unknown],
  startDate: string,
): DailyCount | null =>
  /^\d+$/u.test(offset) && Array.isArray(items)
    ? { date: dayAfter(startDate, Number(offset)), count: items.length }
    : null;

/**
 * A run chart as Lighthouse sends it, the Work Items counted on each day keyed by the day's offset from the
 * range's first day, read as the total and the count of each day. Without a total the days are summed.
 */
export const readRunChart = (
  value: unknown,
  range: MetricsDateRange,
): DailyCountChartView | null => {
  if (!isFacts(value) || !isFacts(value.workItemsPerUnitOfTime)) {
    return null;
  }
  const daily = readEvery(Object.entries(value.workItemsPerUnitOfTime), (day) =>
    readRunChartDay(day as [string, unknown], range.startDate),
  );
  if (daily === null) {
    return null;
  }
  const sorted = [...daily].sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  return readDailyCountChart({
    ...range,
    total: isNumber(value.total)
      ? value.total
      : sorted.reduce((sum, day) => sum + day.count, 0),
    daily: sorted,
  });
};

// A fact the view can do without: absent when Lighthouse did not send it, or sent it in another shape.
const optionalText = (value: unknown): string | undefined =>
  isText(value) ? value : undefined;

const optionalNumber = (value: unknown): number | undefined =>
  isNumber(value) ? value : undefined;

const optionalDay = (value: unknown): string | undefined =>
  isDay(value) ? value : undefined;

/** A Work Item in progress; an older Lighthouse does not say whether it is blocked. */
export type InProgressItem = {
  readonly isBlocked: boolean | undefined;
  readonly referenceId?: string;
  readonly name?: string;
  readonly state?: string;
  readonly workItemAge?: number;
  readonly blockedSince?: string;
};

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
    ? {
        isBlocked: value.isBlocked,
        referenceId: optionalText(value.referenceId),
        name: optionalText(value.name),
        state: optionalText(value.state),
        workItemAge: optionalNumber(value.workItemAge),
        blockedSince: optionalDay(value.blockedSince),
      }
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

export type ClosedItem = {
  readonly id: number;
  readonly name: string;
  readonly referenceId?: string;
  readonly closedDate?: string;
  readonly cycleTime?: number;
};

export type CycleTimeView = {
  readonly percentiles: MetricAnswer<readonly PercentileValue[]>;
  readonly closedItems: MetricAnswer<readonly ClosedItem[]>;
};

const readClosedItem = (value: unknown): ClosedItem | null =>
  isFacts(value) && isNumber(value.id) && isText(value.name)
    ? {
        id: value.id,
        name: value.name,
        referenceId: optionalText(value.referenceId),
        closedDate: optionalDay(value.closedDate),
        cycleTime: optionalNumber(value.cycleTime),
      }
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

export const readCycleTimePercentiles = readPercentileValues;

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

/** The percentiles' history and how many days back each day's percentiles look, when Lighthouse says. */
export type PercentilesOverTimeView =
  MetricHistoryView<PercentilesOverTimeSnapshot> & {
    readonly horizon: number | undefined;
  };

export const readPercentilesOverTime = (
  value: unknown,
): PercentilesOverTimeView | null => {
  const view = readHistory(value, readPercentilesSnapshot);
  return view === null || !isFacts(value)
    ? null
    : { ...view, horizon: isNumber(value.horizon) ? value.horizon : undefined };
};

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

/** The name of the Team's cycle time definition with this id; absent when the settings do not carry it. */
export const readCycleTimeDefinitionName = (
  settings: unknown,
  definitionId: number,
): string | undefined => {
  const definitions =
    isFacts(settings) && Array.isArray(settings.cycleTimeDefinitions)
      ? settings.cycleTimeDefinitions
      : [];
  const named: unknown = definitions.find(
    (definition: unknown) =>
      isFacts(definition) && definition.id === definitionId,
  );
  return isFacts(named) &&
    typeof named.name === "string" &&
    named.name.trim() !== ""
    ? named.name
    : undefined;
};

// ── Wording ──────────────────────────────────────────────────────────────────

/** One line of the headline: what it is, its number, and what the number is out of. */
export type MetricLine = {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
};

export const UNKNOWN_SHAPE_NOTE = "shown only with --json (unknown shape)";

/** What the dashboard says under its Predictability Score, word for word. */
export const PREDICTABILITY_SCORE_EXPLANATION =
  'The predictability score shows how "close" the 50% and 95% chance are. The closer they are, the more predictable you are. 100% means they are exactly the same value. The higher number, the better.';

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

const wipLimitOf = (
  systemWipLimit: number,
  scope: MetricsScope,
  terms: Terms,
): string =>
  `System ${terms.wip} Limit: ${countOf(systemWipLimit, countedOf(scope, terms))}`;

/** "Gravity · as of Tue 6 Oct 2026", for a metric that answers about the range's last day. */
export const describeAsOfHeading = (
  subject: Pick<MetricsSubject, "endDate">,
  wording: AnswerWording,
): string => `${wording.name} · as of ${dayOf(subject.endDate)}`;

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
      : wipLimitOf(systemWipLimit, scope, terms),
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

const scoreOf = (view: PredictabilityScoreView): string =>
  view.score === undefined ? "—" : `${(view.score * 100).toFixed(1)}%`;

/** "Predictability Score  63.4%", as the web shows it to one decimal. */
export const describePredictabilityScore = (
  view: PredictabilityScoreView,
  scope: MetricsScope,
  terms: Terms,
): MetricLine => ({
  label: metricsHeadlineLabel("predictabilityScore", scope, terms),
  value: scoreOf(view),
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

// ── One metric, every day ────────────────────────────────────────────────────

/**
 * One metric over its days: the sentence that answers it, its day table with the header row first, and
 * the web's empty-chart sentence in place of a table when Lighthouse has recorded no day. A metric the
 * dashboard shows as more than one table lists them in order, and one with only a sentence lists none.
 */
export type MetricDayView = { readonly sentence: string } & (
  | MetricDays
  | { readonly tables: readonly MetricDays[] }
);

/** A table, or the sentence that stands in for it, with the title the dashboard puts above it, if any. */
export type MetricDays = { readonly title?: string } & (
  | { readonly rows: readonly (readonly string[])[] }
  | { readonly note: string }
);

const dayTable = <T>(
  header: readonly string[],
  entries: readonly T[],
  row: (entry: T) => readonly string[],
): MetricDays =>
  entries.length === 0
    ? { note: OVER_TIME_EMPTY_SENTENCE }
    : { rows: [header, ...entries.map(row)] };

const dailyCountDays = (
  part: "throughput" | "arrivals",
  happened: string,
  chart: DailyCountChartView,
  scope: MetricsScope,
  terms: Terms,
): MetricDayView => {
  const counted = countedOf(scope, terms);
  return {
    sentence: `${metricsHeadlineLabel(part, scope, terms)}: ${countOf(chart.total, counted)}, ${perDay(chart)}`,
    ...dayTable(["Date", `${counted.many} ${happened}`], chart.daily, (day) => [
      dayOf(day.date),
      String(day.count),
    ]),
  };
};

/** "Total Throughput: 31 Work Items, 1.0 / day", then the count closed on each day. */
export const describeThroughputDays = (
  chart: DailyCountChartView,
  scope: MetricsScope,
  terms: Terms,
): MetricDayView => dailyCountDays("throughput", "closed", chart, scope, terms);

/** "Total Arrivals: 28 Work Items, 0.9 / day", then the count started on each day. */
export const describeArrivalsDays = (
  chart: DailyCountChartView,
  scope: MetricsScope,
  terms: Terms,
): MetricDayView => dailyCountDays("arrivals", "started", chart, scope, terms);

const ABSENT = "—";

const daysOrAbsent = (days: number | undefined): string =>
  days === undefined ? ABSENT : describeDays(days);

const blockedCell = (item: InProgressItem, terms: Terms): string => {
  if (item.isBlocked !== true) {
    return "";
  }
  return item.blockedSince === undefined
    ? terms.blocked
    : `since ${dayOf(item.blockedSince)}`;
};

// The dashboard lists the oldest Work Item in progress first.
const oldestFirst = (
  items: readonly InProgressItem[],
): readonly InProgressItem[] =>
  [...items].sort(
    (left, right) => (right.workItemAge ?? -1) - (left.workItemAge ?? -1),
  );

/**
 * "Work Items in Progress: 9 (System WIP Limit: 10 Work Items)", then each Work Item in progress, oldest
 * first, and the count in progress on each day.
 */
export const describeWipDays = (
  now: InProgressNowView,
  overTime: DailyCountsView,
  scope: MetricsScope,
  terms: Terms,
  systemWipLimit: number | undefined,
): MetricDayView => {
  const label = metricsHeadlineLabel("wip", scope, terms);
  const limit =
    systemWipLimit === undefined
      ? ""
      : ` (${wipLimitOf(systemWipLimit, scope, terms)})`;
  const items: MetricDays[] =
    now.items.length === 0
      ? []
      : [
          {
            rows: [
              ["ID", "Name", "State", terms.workItemAge, terms.blocked],
              ...oldestFirst(now.items).map((item) => [
                item.referenceId ?? ABSENT,
                item.name ?? ABSENT,
                item.state ?? ABSENT,
                daysOrAbsent(item.workItemAge),
                blockedCell(item, terms),
              ]),
            ],
          },
        ];
  return {
    sentence: `${label}: ${now.count}${limit}`,
    tables: [
      ...items,
      dayTable(["Date", label], overTime.daily, (day) => [
        dayOf(day.date),
        String(day.count),
      ]),
    ],
  };
};

const percentilesSentence = (
  label: string,
  values: readonly PercentileValue[],
): string =>
  values.length === 0
    ? label
    : `${label}: ${[...values]
        .sort((left, right) => left.percentile - right.percentile)
        .map(
          (entry) =>
            `${ordinalOf(entry.percentile)} ${describeDays(entry.value)}`,
        )
        .join(" · ")}`;

/** "Cycle Time Percentiles: 50th 5 days · … · 95th 21 days", then each closed Work Item and its Cycle Time. */
export const describeCycleTimeDays = (
  percentiles: readonly PercentileValue[],
  closedItems: readonly ClosedItem[],
  terms: Terms,
  definitionName?: string,
): MetricDayView => ({
  sentence: percentilesSentence(
    `${definitionName ?? terms.cycleTime} Percentiles`,
    percentiles,
  ),
  tables:
    closedItems.length === 0
      ? []
      : [
          {
            rows: [
              ["ID", "Name", "Closed", terms.cycleTime],
              ...closedItems.map((item) => [
                item.referenceId ?? ABSENT,
                item.name,
                item.closedDate === undefined ? ABSENT : dayOf(item.closedDate),
                daysOrAbsent(item.cycleTime),
              ]),
            ],
          },
        ],
});

const oldestOf = (day: DailyWorkItemAge): string => {
  const oldest = day.items.reduce<WorkItemAgeEntry | undefined>(
    (found, item) =>
      found === undefined || item.age > found.age ? item : found,
    undefined,
  );
  return oldest === undefined
    ? ABSENT
    : `${oldest.referenceId} ${describeDays(oldest.age)}`;
};

/** "Work Item Age Percentiles: 50th 3 days · 70th 6 days · 85th 11 days · 95th 18 days". */
export const describeWorkItemAgePercentiles = (
  percentiles: readonly PercentileValue[],
  terms: Terms,
): string =>
  percentilesSentence(`${terms.workItemAge} Percentiles`, percentiles);

/**
 * "Work Item Age Percentiles: 50th 3 days · … · 95th 18 days", then each day's oldest Work Item and how
 * many were in progress; every item of a day is in --json.
 */
export const describeWorkItemAgeDays = (
  percentiles: readonly PercentileValue[],
  overTime: WorkItemAgeOverTimeResult,
  scope: MetricsScope,
  terms: Terms,
): MetricDayView => ({
  sentence: describeWorkItemAgePercentiles(percentiles, terms),
  ...dayTable(
    ["Date", "Oldest", countedOf(scope, terms).many],
    overTime.daily,
    (day) => [dayOf(day.date), oldestOf(day), String(day.items.length)],
  ),
});

/**
 * "Predictability Score: 63.4%", then what the dashboard says the score means; no table, because the
 * chart's marks need facts --json does not carry.
 */
export const describePredictabilityScoreDays = (
  view: PredictabilityScoreView,
  scope: MetricsScope,
  terms: Terms,
): MetricDayView => ({
  sentence: `${metricsHeadlineLabel("predictabilityScore", scope, terms)}: ${scoreOf(view)}`,
  note: PREDICTABILITY_SCORE_EXPLANATION,
});

/** "Blocked Work Items: 1 on Mon 7 Sep → 2 on Tue 6 Oct", then each recorded day's count. */
export const describeBlockedDays = (
  view: MetricHistoryView<BlockedCountSnapshot>,
  scope: MetricsScope,
  terms: Terms,
): MetricDayView => {
  const label = metricsHeadlineLabel("blocked", scope, terms);
  const first = earliestBy(view.history, (entry) => entry.recordedAt);
  const last = latestBy(view.history, (entry) => entry.recordedAt);
  return {
    sentence:
      first === undefined || last === undefined
        ? label
        : `${label}: ${fromFirstToLast(first, last, (entry) => String(entry.blockedCount))}`,
    ...dayTable(["Date", label], view.history, (day) => [
      dayOf(day.recordedAt),
      String(day.blockedCount),
    ]),
  };
};

/** "Total Work Item Age: 84 days across 9 Work Items on Tue 6 Oct 2026", then each day's total. */
export const describeTotalWorkItemAgeDays = (
  view: TotalWorkItemAgeOverTimeResult,
  scope: MetricsScope,
  terms: Terms,
): MetricDayView => {
  const label = metricsHeadlineLabel("totalWorkItemAge", scope, terms);
  const counted = countedOf(scope, terms);
  const last = latestBy(view.daily, (day) => day.date);
  return {
    sentence:
      last === undefined
        ? label
        : `${label}: ${describeDays(last.totalAge)} across ${countOf(last.itemCount, counted)} on ${dayOf(last.date)}`,
    ...dayTable(["Date", label, counted.many], view.daily, (day) => [
      dayOf(day.date),
      describeDays(day.totalAge),
      String(day.itemCount),
    ]),
  };
};

/** "Cycle Time over the last 30 days, per recorded day", then each recorded day's percentiles. */
export const describePercentilesOverTimeDays = (
  view: PercentilesOverTimeView,
  terms: Terms,
): MetricDayView => ({
  sentence:
    view.horizon === undefined
      ? `${terms.cycleTime} per recorded day`
      : `${terms.cycleTime} over the last ${describeDays(view.horizon)}, per recorded day`,
  ...dayTable(["Date", "50th", "70th", "85th", "95th"], view.history, (day) => [
    dayOf(day.recordedAt),
    describeDays(day.p50),
    describeDays(day.p70),
    describeDays(day.p85),
    describeDays(day.p95),
  ]),
});

/** "Throughput natural process limits per recorded day", then each recorded day's limits. */
export const describeProcessBehaviorOverTimeDays = (
  view: MetricHistoryView<ProcessBehaviorSnapshot>,
  terms: Terms,
): MetricDayView => ({
  sentence: `${terms.throughput} natural process limits per recorded day`,
  ...dayTable(
    ["Date", "Lower limit", "Average", "Upper limit"],
    view.history,
    (day) => [
      dayOf(day.recordedAt),
      limitOf(day.lnpl),
      day.average.toFixed(1),
      limitOf(day.unpl),
    ],
  ),
});

/** What the web's Time in State chart says when it has no state to show. */
export const NO_DATA_YET = "No data yet.";

/**
 * How many Work Items Time in State is across: the ones picked with --item-ids, otherwise every one the web
 * offers to pick from; absent when Lighthouse refused that list and none were picked.
 */
export const timeInStateItemCount = (
  view: CumulativeStateTimeView,
  picked: number | undefined,
): number | undefined =>
  picked ??
  (isMetricRefusal(view.candidates) ? undefined : view.candidates.items.length);

const statesOf = (count: number): string =>
  count === 1 ? "1 state" : `${count} states`;

const acrossOf = (
  itemCount: number | undefined,
  scope: MetricsScope,
  terms: Terms,
): string =>
  itemCount === undefined
    ? ""
    : `across ${countOf(itemCount, countedOf(scope, terms))}`;

/** "Time in State  4 states  across 42 Work Items". */
export const describeTimeInState = (
  bar: CumulativeStateTimeResult,
  itemCount: number | undefined,
  scope: MetricsScope,
  terms: Terms,
): MetricLine => ({
  label: metricsHeadlineLabel("cumulativeStateTime", scope, terms),
  value: statesOf(bar.states.length),
  detail: acrossOf(itemCount, scope, terms),
});

const inWorkflowOrder = (
  states: readonly CumulativeStateTimeStateRow[],
): readonly CumulativeStateTimeStateRow[] =>
  [...states].sort((left, right) => left.workflowOrder - right.workflowOrder);

const contributorsOf = (
  contributors: CumulativeStateTimeItemsResult,
  scope: MetricsScope,
  terms: Terms,
): MetricDays => {
  const title = `${countedOf(scope, terms).many} contributing to ${contributors.state}`;
  return contributors.items.length === 0
    ? { title, note: NO_DATA_YET }
    : {
        title,
        rows: [
          ["ID", "Name", "Type", "State", "Days Contributed"],
          ...contributors.items.map((item) => [
            item.referenceId,
            item.title,
            item.type,
            item.state,
            String(item.daysContributed),
          ]),
        ],
      };
};

const stateRowOf = (state: CumulativeStateTimeStateRow): readonly string[] => [
  state.state,
  String(state.totalDays),
  String(state.itemCount),
  String(state.completedItemCount),
  String(state.ongoingItemCount),
  `${state.meanDays.toFixed(1)} days`,
  state.medianDays === null ? ABSENT : describeDays(state.medianDays),
];

/**
 * "Time in State across 42 Work Items", then one row per state in workflow order with the facts the web's
 * tooltip shows, and the Work Items contributing to a state when one was asked for. Mean and median are
 * printed as Lighthouse sent them, never worked out again.
 */
export const describeTimeInStateDays = (
  bar: CumulativeStateTimeResult,
  itemCount: number | undefined,
  contributors: CumulativeStateTimeItemsResult | undefined,
  scope: MetricsScope,
  terms: Terms,
): MetricDayView => {
  const label = metricsHeadlineLabel("cumulativeStateTime", scope, terms);
  const across = acrossOf(itemCount, scope, terms);
  const header = [
    "State",
    "Total days",
    countedOf(scope, terms).many,
    "Completed",
    "Ongoing",
    "Mean",
    "Median",
  ];
  const states: MetricDays =
    bar.states.length === 0
      ? { note: NO_DATA_YET }
      : { rows: [header, ...inWorkflowOrder(bar.states).map(stateRowOf)] };
  return {
    sentence: across === "" ? label : `${label} ${across}`,
    tables:
      contributors === undefined
        ? [states]
        : [states, contributorsOf(contributors, scope, terms)],
  };
};

const notesOf = (view: MetricDayView): readonly string[] =>
  ("tables" in view ? view.tables : [view]).flatMap((days) =>
    "note" in days ? [days.note] : [],
  );

/**
 * One metric as an assistant is told it: the heading and sentence lh prints above the metric's tables, and
 * the web's words where a note stands in for a table, such as a history with no recorded day. Never a table.
 */
export const describeMetricSummary = (
  heading: string,
  view: MetricDayView,
): string => [heading, view.sentence, ...notesOf(view)].join("\n");
