import {
  type AnswerWording,
  describeArrivalsDays,
  describeAsOfHeading,
  describeBlockedDays,
  describeBlockedNow,
  describeBlockedOverTime,
  describeCycleTimeDays,
  describeInProgressNow,
  describeMetricsHeading,
  describeOverTimeHeading,
  describePercentileRows,
  describePercentilesOverTime,
  describePercentilesOverTimeDays,
  describePredictabilityScore,
  describePredictabilityScoreDays,
  describeProcessBehaviorChart,
  describeProcessBehaviorOverTime,
  describeProcessBehaviorOverTimeDays,
  describeRefusedMetric,
  describeSleRiskNow,
  describeThroughputDays,
  describeTimeInState,
  describeTimeInStateDays,
  describeTotalArrivals,
  describeTotalThroughput,
  describeTotalWorkItemAge,
  describeTotalWorkItemAgeDays,
  describeUnknownMetric,
  describeWhatWipLeavesUnsaid,
  describeWipDays,
  describeWorkItemAgeDays,
  type InProgressItem,
  isMetricRefusal,
  type MetricAnswer,
  type MetricDays,
  type MetricDayView,
  type MetricLine,
  type MetricsHeadlinePart,
  type MetricsSubject,
  metricsHeadlineLabel,
  type PercentileValue,
  type ProcessBehaviorMetricType,
  processBehaviorChartTitle,
  readArrivals,
  readBlocked,
  readCumulativeStateTime,
  readCycleTime,
  readMetricAnswer,
  readMetricsSubject,
  readPercentilesOverTime,
  readPredictabilityScore,
  readProcessBehaviorChart,
  readProcessBehaviorOverTime,
  readSleRisk,
  readThroughput,
  readTotalWorkItemAge,
  readWip,
  readWorkItemAge,
  readWorkItemAgePercentiles,
  type ServiceLevelExpectation,
  type Terms,
  timeInStateItemCount,
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
  pickedItemCount: number | undefined,
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
    ...walk.section(
      "cumulativeStateTime",
      "cumulativeStateTime",
      readCumulativeStateTime,
      (view) =>
        nested(walk, "cumulativeStateTime", view.bar, (bar) => [
          describeTimeInState(
            bar,
            timeInStateItemCount(view, pickedItemCount),
            scope,
            terms,
          ),
        ]),
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
  pickedItemCount?: number,
): string | null => {
  const subject = readMetricsSubject(value);
  if (subject === null) {
    return null;
  }
  const walk = walkOf(subject, wording);
  const headline = headlineLines(walk, systemWipLimit, pickedItemCount);
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

type DayFacts = {
  readonly subject: MetricsSubject;
  readonly wording: AnswerWording;
  readonly systemWipLimit: number | undefined;
  readonly cycleTimeDefinitionName: string | undefined;
  readonly pickedItemCount: number | undefined;
  readonly serviceLevelExpectation: ServiceLevelExpectation | undefined;
  readonly inProgress: readonly InProgressItem[] | undefined;
};

// A metric's day view, or null when a section it needs is refused or in a shape this version cannot read.
type DayViewRenderer = (facts: DayFacts) => MetricDayView | null;

// Which heading a metric's day view sits under: the range, or the range's last day for a metric that
// answers about now.
type DayView = { readonly asOf: boolean; readonly render: DayViewRenderer };

const answered = <T>(answer: MetricAnswer<T> | null | undefined): answer is T =>
  answer !== null && answer !== undefined && !isMetricRefusal(answer);

const sectionOf = <T>(
  subject: MetricsSubject,
  key: string,
  read: Reader<T>,
): T | null => {
  const answer = readMetricAnswer(subject.sections[key], read);
  return answered(answer) ? answer : null;
};

const overTheRange = (render: DayViewRenderer): DayView => ({
  asOf: false,
  render,
});

const dayViewOf = <T>(
  key: string,
  read: Reader<T>,
  describe: (
    view: T,
    subject: MetricsSubject,
    wording: AnswerWording,
  ) => MetricDayView,
): DayView =>
  overTheRange(({ subject, wording }) => {
    const view = sectionOf(subject, key, read);
    return view === null ? null : describe(view, subject, wording);
  });

const wipDays: DayView = {
  asOf: true,
  render: ({ subject, wording, systemWipLimit }) => {
    const wip = sectionOf(subject, "wip", readWip);
    if (wip === null || !answered(wip.current) || !answered(wip.overTime)) {
      return null;
    }
    const view = describeWipDays(
      wip.current,
      wip.overTime,
      subject.scope,
      wording.terms,
      systemWipLimit,
    );
    const unsaid = describeWhatWipLeavesUnsaid(
      wip.current,
      subject.scope,
      wording.terms,
      systemWipLimit,
    );
    return { ...view, sentence: [view.sentence, ...unsaid].join("\n") };
  },
};

const cycleTimeDays = overTheRange(
  ({ subject, wording, cycleTimeDefinitionName }) => {
    const cycleTime = sectionOf(subject, "cycleTime", readCycleTime);
    return cycleTime !== null &&
      answered(cycleTime.percentiles) &&
      answered(cycleTime.closedItems)
      ? describeCycleTimeDays(
          cycleTime.percentiles,
          cycleTime.closedItems,
          wording.terms,
          cycleTimeDefinitionName,
        )
      : null;
  },
);

const workItemAgeDays: DayView = {
  asOf: true,
  render: ({ subject, wording }) => {
    const percentiles = sectionOf(
      subject,
      "workItemAgePercentiles",
      readWorkItemAgePercentiles,
    );
    const overTime = sectionOf(subject, "workItemAge", readWorkItemAge);
    return percentiles === null || overTime === null
      ? null
      : describeWorkItemAgeDays(
          percentiles,
          overTime,
          subject.scope,
          wording.terms,
        );
  },
};

const timeInStateDays = overTheRange(
  ({ subject, wording, pickedItemCount }) => {
    const view = sectionOf(
      subject,
      "cumulativeStateTime",
      readCumulativeStateTime,
    );
    if (view === null || !answered(view.bar)) {
      return null;
    }
    // A drill-down asked for and refused leaves the whole view to the generic one, as any refused part does.
    if (view.items !== undefined && !answered(view.items)) {
      return null;
    }
    return describeTimeInStateDays(
      view.bar,
      timeInStateItemCount(view, pickedItemCount),
      view.items,
      subject.scope,
      wording.terms,
    );
  },
);

// The title, then the sentence and one line per Work Item beneath it, as the SLE Risk widget lists them.
const sleRiskDays: DayView = {
  asOf: true,
  render: ({ subject, wording, serviceLevelExpectation, inProgress }) => {
    const entries = sectionOf(subject, "sleRisk", readSleRisk);
    if (entries === null) {
      return null;
    }
    const view = describeSleRiskNow(
      entries,
      wording,
      serviceLevelExpectation,
      inProgress,
    );
    const body = [
      view.sentence,
      ...(view.rows.length === 0 ? [] : toTableLines(view.rows)),
    ];
    return {
      sentence: [view.title, ...body.map((line) => `  ${line}`)].join("\n"),
      tables: [],
    };
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// A chart that could not be read still carries its title, so the reader sees which one is missing.
const chartRow = (
  chartType: ProcessBehaviorMetricType,
  value: unknown,
  terms: Terms,
): readonly string[] => {
  const answer = readMetricAnswer(value, readProcessBehaviorChart);
  if (answer === null || isMetricRefusal(answer)) {
    const title = processBehaviorChartTitle(chartType, terms);
    const line =
      answer === null
        ? describeUnknownMetric(title)
        : describeRefusedMetric(title, answer);
    return [title, line.detail];
  }
  const { title, sentence } = describeProcessBehaviorChart(
    answer,
    chartType,
    terms,
  );
  return [title, sentence];
};

// One line per chart, its title as the web titles it, then what Lighthouse found on it. The charts are keyed
// by the chart types lh itself asked for, in the order it asked.
const processBehaviorChartDays = overTheRange(({ subject, wording }) => {
  const section = subject.sections.processBehaviorChart;
  if (!isRecord(section) || !isRecord(section.charts)) {
    return null;
  }
  const rows = Object.entries(section.charts).map(([chartType, chart]) =>
    chartRow(chartType as ProcessBehaviorMetricType, chart, wording.terms),
  );
  return rows.length === 0
    ? null
    : { sentence: toTableLines(rows).join("\n"), tables: [] };
});

// One entry per metric name `--metrics` accepts; a name without one prints the generic view.
const DAY_VIEWS: Readonly<Partial<Record<string, DayView>>> = {
  throughput: dayViewOf(
    "throughput",
    readThroughput,
    (chart, subject, wording) =>
      describeThroughputDays(chart, subject.scope, wording.terms),
  ),
  arrivals: dayViewOf("arrivals", readArrivals, (chart, subject, wording) =>
    describeArrivalsDays(chart, subject.scope, wording.terms),
  ),
  wip: wipDays,
  cycleTime: cycleTimeDays,
  cumulativeStateTime: timeInStateDays,
  workItemAge: workItemAgeDays,
  predictabilityScore: dayViewOf(
    "predictabilityScore",
    readPredictabilityScore,
    (view, subject, wording) =>
      describePredictabilityScoreDays(view, subject.scope, wording.terms),
  ),
  blocked: dayViewOf("blocked", readBlocked, (view, subject, wording) =>
    describeBlockedDays(view, subject.scope, wording.terms),
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
  sleRisk: sleRiskDays,
  processBehaviorChart: processBehaviorChartDays,
};

const tableLines = (days: MetricDays): string[] => [
  ...(days.title === undefined ? [] : [days.title]),
  ...("rows" in days ? toTableLines(days.rows) : [days.note]),
];

const dayViewLines = (view: MetricDayView): string[] => [
  view.sentence,
  ...("tables" in view ? view.tables : [view]).flatMap((days) => [
    "",
    ...tableLines(days),
  ]),
];

/**
 * The metrics asked for by name, in the order asked: the heading, then each one's sentence and every
 * day it has; the heading names only the range's last day when every metric asked for answers about now.
 * Null when any of them has no day view yet, is refused or comes in a shape it does not know, so the
 * command prints the generic view exactly as before.
 */
export const renderMetricDays = (
  value: unknown,
  wording: AnswerWording,
  names: readonly string[],
  owner: {
    readonly systemWipLimit?: number;
    readonly cycleTimeDefinitionName?: string;
    readonly pickedItemCount?: number;
    readonly serviceLevelExpectation?: ServiceLevelExpectation;
    readonly inProgress?: readonly InProgressItem[];
  } = {},
): string | null => {
  const subject = readMetricsSubject(value);
  if (subject === null || names.length === 0) {
    return null;
  }
  const facts: DayFacts = {
    subject,
    wording,
    systemWipLimit: owner.systemWipLimit,
    cycleTimeDefinitionName: owner.cycleTimeDefinitionName,
    pickedItemCount: owner.pickedItemCount,
    serviceLevelExpectation: owner.serviceLevelExpectation,
    inProgress: owner.inProgress,
  };
  const views: MetricDayView[] = [];
  let asOf = true;
  for (const name of names) {
    const entry = DAY_VIEWS[name];
    const view = entry?.render(facts) ?? null;
    if (entry === undefined || view === null) {
      return null;
    }
    asOf &&= entry.asOf;
    views.push(view);
  }
  return [
    asOf
      ? describeAsOfHeading(subject, wording)
      : describeMetricsHeading(subject, wording),
    ...views.flatMap((view, index) => [
      ...(index === 0 ? [] : [""]),
      ...dayViewLines(view),
    ]),
  ].join("\n");
};
