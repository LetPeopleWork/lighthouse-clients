import {
  type AnswerWording,
  describeBlockedNow,
  describeBlockedOverTime,
  describeInProgressNow,
  describeMetricsHeading,
  describeOverTimeHeading,
  describePercentileRows,
  describePercentilesOverTime,
  describePercentilesOverTimeDays,
  describePredictabilityScore,
  describeProcessBehaviorOverTime,
  describeProcessBehaviorOverTimeDays,
  describeRefusedMetric,
  describeThroughputDays,
  describeTotalArrivals,
  describeTotalThroughput,
  describeTotalWorkItemAge,
  describeTotalWorkItemAgeDays,
  describeUnknownMetric,
  isMetricRefusal,
  type MetricAnswer,
  type MetricDayView,
  type MetricLine,
  type MetricsHeadlinePart,
  type MetricsSubject,
  metricsHeadlineLabel,
  type PercentileValue,
  readArrivals,
  readBlocked,
  readCumulativeStateTime,
  readCycleTime,
  readMetricAnswer,
  readMetricsSubject,
  readPercentilesOverTime,
  readPredictabilityScore,
  readProcessBehaviorOverTime,
  readThroughput,
  readTotalWorkItemAge,
  readWip,
  readWorkItemAge,
  readWorkItemAgePercentiles,
} from "@letpeoplework/lighthouse-client";
import { toTableLines } from "./table";

type Reader<T> = (value: unknown) => T | null;

// One part of the headline, walked the same way for every section: left out when the composite has no
// such section, its refusal or unknown shape stated in place, otherwise the lines its facts give.
type Walk = {
  readonly subject: MetricsSubject;
  readonly wording: AnswerWording;
  readonly section: <T>(
    part: MetricsHeadlinePart,
    key: string,
    read: Reader<T>,
    describe: (view: T) => readonly MetricLine[],
  ) => MetricLine[];
};

const walkOf = (subject: MetricsSubject, wording: AnswerWording): Walk => {
  const labelOf = (part: MetricsHeadlinePart) =>
    metricsHeadlineLabel(part, subject.scope, wording.terms);
  return {
    subject,
    wording,
    section: (part, key, read, describe) => {
      const value = subject.sections[key];
      if (value === undefined) {
        return [];
      }
      const answer = readMetricAnswer(value, read);
      if (answer === null) {
        return [describeUnknownMetric(labelOf(part))];
      }
      if (isMetricRefusal(answer)) {
        return [describeRefusedMetric(labelOf(part), answer)];
      }
      return [...describe(answer)];
    },
  };
};

// A part nested inside a section, such as the WIP of today inside the wip section.
const nested = <T>(
  walk: Walk,
  part: MetricsHeadlinePart,
  answer: MetricAnswer<T>,
  describe: (view: T) => readonly MetricLine[],
): readonly MetricLine[] =>
  isMetricRefusal(answer)
    ? [
        describeRefusedMetric(
          metricsHeadlineLabel(part, walk.subject.scope, walk.wording.terms),
          answer,
        ),
      ]
    : describe(answer);

const lineCells = (line: MetricLine): string[] => [
  line.label,
  line.value,
  line.detail,
];

// The dashboard shows the blocked count after Arrivals, though it is counted from the wip section.
const headlineLines = (
  walk: Walk,
  systemWipLimit: number | undefined,
): MetricLine[] => {
  const { scope } = walk.subject;
  const { terms } = walk.wording;
  let blockedNow: MetricLine[] = [];
  const inProgress = walk.section("wip", "wip", readWip, (wip) =>
    nested(walk, "wip", wip.current, (now) => {
      const blocked = describeBlockedNow(now, scope, terms);
      blockedNow = blocked === null ? [] : [blocked];
      return [describeInProgressNow(now, scope, terms, systemWipLimit)];
    }),
  );
  return [
    ...inProgress,
    ...walk.section("throughput", "throughput", readThroughput, (chart) => [
      describeTotalThroughput(chart, scope, terms),
    ]),
    ...walk.section("arrivals", "arrivals", readArrivals, (chart) => [
      describeTotalArrivals(chart, scope, terms),
    ]),
    ...blockedNow,
    ...walk.section(
      "totalWorkItemAge",
      "totalWorkItemAge",
      readTotalWorkItemAge,
      (view) => [describeTotalWorkItemAge(view, scope, terms)],
    ),
    ...walk.section(
      "predictabilityScore",
      "predictabilityScore",
      readPredictabilityScore,
      (view) => [describePredictabilityScore(view, scope, terms)],
    ),
  ];
};

const percentilesSection = (walk: Walk): string[] => {
  let cycleTime: readonly PercentileValue[] | undefined;
  let workItemAge: readonly PercentileValue[] | undefined;
  const notes = [
    ...walk.section(
      "cycleTimePercentiles",
      "cycleTime",
      readCycleTime,
      (view) =>
        nested(walk, "cycleTimePercentiles", view.percentiles, (values) => {
          cycleTime = values;
          return [];
        }),
    ),
    ...walk.section(
      "workItemAgePercentiles",
      "workItemAgePercentiles",
      readWorkItemAgePercentiles,
      (values) => {
        workItemAge = values;
        return [];
      },
    ),
  ];
  const rows = describePercentileRows(
    cycleTime,
    workItemAge,
    walk.wording.terms,
  );
  return [
    ...(rows.length === 0 ? [] : toTableLines(rows)),
    ...(notes.length === 0 ? [] : toTableLines(notes.map(lineCells))),
  ];
};

const overTimeSection = (walk: Walk): string[] => {
  const { scope } = walk.subject;
  const { terms } = walk.wording;
  const lines = [
    ...walk.section(
      "percentilesOverTime",
      "percentilesOverTime",
      readPercentilesOverTime,
      (view) => [describePercentilesOverTime(view, scope, terms)],
    ),
    ...walk.section(
      "processBehaviorOverTime",
      "processBehaviorOverTime",
      readProcessBehaviorOverTime,
      (view) => [describeProcessBehaviorOverTime(view, scope, terms)],
    ),
    ...walk.section("blocked", "blocked", readBlocked, (view) => [
      describeBlockedOverTime(view, scope, terms),
    ]),
    // Not on the headline yet; read so a shape this version does not know is still named.
    ...walk.section("workItemAge", "workItemAge", readWorkItemAge, () => []),
    ...walk.section(
      "cumulativeStateTime",
      "cumulativeStateTime",
      readCumulativeStateTime,
      () => [],
    ),
  ];
  return lines.length === 0
    ? []
    : [
        describeOverTimeHeading(walk.subject),
        ...toTableLines(lines.map(lineCells)),
      ];
};

/**
 * The dashboard's headline: its numbers, the percentile table and one line per over-time metric, or null
 * when the composite itself is not in a shape it knows. The work distribution is the CLI's own placeholder,
 * not an answer, so it is never shown.
 */
export const renderMetricsHeadline = (
  value: unknown,
  wording: AnswerWording,
  systemWipLimit: number | undefined,
): string | null => {
  const subject = readMetricsSubject(value);
  if (subject === null) {
    return null;
  }
  const walk = walkOf(subject, wording);
  const headline = headlineLines(walk, systemWipLimit);
  return [
    [describeMetricsHeading(subject, wording)],
    headline.length === 0 ? [] : toTableLines(headline.map(lineCells)),
    percentilesSection(walk),
    overTimeSection(walk),
  ]
    .filter((section) => section.length > 0)
    .map((section) => section.join("\n"))
    .join("\n\n");
};

// A metric's day view, or null when its section is refused or in a shape this version cannot read.
type DayViewRenderer = (
  subject: MetricsSubject,
  wording: AnswerWording,
) => MetricDayView | null;

const dayViewOf =
  <T>(
    key: string,
    read: Reader<T>,
    describe: (
      view: T,
      subject: MetricsSubject,
      wording: AnswerWording,
    ) => MetricDayView,
  ): DayViewRenderer =>
  (subject, wording) => {
    const answer = readMetricAnswer(subject.sections[key], read);
    return answer === null || isMetricRefusal(answer)
      ? null
      : describe(answer, subject, wording);
  };

// One entry per metric name `--metrics` accepts; a name without one prints the generic view.
const DAY_VIEWS: Readonly<Partial<Record<string, DayViewRenderer>>> = {
  throughput: dayViewOf(
    "throughput",
    readThroughput,
    (chart, subject, wording) =>
      describeThroughputDays(chart, subject.scope, wording.terms),
  ),
  totalWorkItemAge: dayViewOf(
    "totalWorkItemAge",
    readTotalWorkItemAge,
    (view, subject, wording) =>
      describeTotalWorkItemAgeDays(view, subject.scope, wording.terms),
  ),
  percentilesOverTime: dayViewOf(
    "percentilesOverTime",
    readPercentilesOverTime,
    (view, _subject, wording) =>
      describePercentilesOverTimeDays(view, wording.terms),
  ),
  processBehaviorOverTime: dayViewOf(
    "processBehaviorOverTime",
    readProcessBehaviorOverTime,
    (view, _subject, wording) =>
      describeProcessBehaviorOverTimeDays(view, wording.terms),
  ),
};

const dayViewLines = (view: MetricDayView): string[] => [
  view.sentence,
  "",
  ...("rows" in view ? toTableLines(view.rows) : [view.note]),
];

/**
 * The metrics asked for by name, in the order asked: the heading, then each one's sentence and every
 * day it has. Null when any of them has no day view yet, is refused or comes in a shape it does not know,
 * so the command prints the generic view exactly as before.
 */
export const renderMetricDays = (
  value: unknown,
  wording: AnswerWording,
  names: readonly string[],
): string | null => {
  const subject = readMetricsSubject(value);
  if (subject === null || names.length === 0) {
    return null;
  }
  const views: MetricDayView[] = [];
  for (const name of names) {
    const view = DAY_VIEWS[name]?.(subject, wording) ?? null;
    if (view === null) {
      return null;
    }
    views.push(view);
  }
  return [
    describeMetricsHeading(subject, wording),
    ...views.flatMap((view, index) => [
      ...(index === 0 ? [] : [""]),
      ...dayViewLines(view),
    ]),
  ].join("\n");
};
