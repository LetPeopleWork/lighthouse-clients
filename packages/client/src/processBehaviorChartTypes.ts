import type { ProcessBehaviorMetricType } from "./index";

// The Throughput chart's wire name is also a word an instance can rename, and the wording modules never
// spell such a word, so they compare against this constant instead of the literal.
export const THROUGHPUT_CHART =
  "Throughput" satisfies ProcessBehaviorMetricType;
