import type { ProcessBehaviorMetricType } from "./index";

// The Throughput chart's wire name is also a word an instance can rename, and the wording modules never
// spell such a word, so they compare against this constant instead of the literal.
export const THROUGHPUT_CHART =
  "Throughput" satisfies ProcessBehaviorMetricType;

/** Where each chart is read, under a Team's or a Portfolio's metrics. */
export const PROCESS_BEHAVIOR_CHART_ROUTES: Readonly<
  Record<ProcessBehaviorMetricType, string>
> = {
  [THROUGHPUT_CHART]: "throughput/pbc",
  Arrivals: "arrivals/pbc",
  Wip: "wipOverTime/pbc",
  WorkItemAge: "totalWorkItemAge/pbc",
  CycleTime: "cycleTime/pbc",
  FeatureSize: "featureSize/pbc",
};

/** Whether a text names a chart type Lighthouse draws a Process Behaviour Chart for. */
export const isProcessBehaviorMetricType = (
  value: string,
): value is ProcessBehaviorMetricType =>
  Object.hasOwn(PROCESS_BEHAVIOR_CHART_ROUTES, value);
