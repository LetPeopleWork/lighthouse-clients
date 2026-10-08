import type { ProcessBehaviorMetricType } from "./index";

// The Throughput chart's wire name is also a word an instance can rename, and the wording modules never
// spell such a word, so they compare against this constant instead of the literal.
export const THROUGHPUT_CHART =
  "Throughput" satisfies ProcessBehaviorMetricType;

const CHART_TYPES: Readonly<Record<ProcessBehaviorMetricType, true>> = {
  [THROUGHPUT_CHART]: true,
  Arrivals: true,
  Wip: true,
  WorkItemAge: true,
  CycleTime: true,
  FeatureSize: true,
};

/** Whether a text names a chart type Lighthouse draws a Process Behaviour Chart for. */
export const isProcessBehaviorMetricType = (
  value: string,
): value is ProcessBehaviorMetricType => Object.hasOwn(CHART_TYPES, value);
