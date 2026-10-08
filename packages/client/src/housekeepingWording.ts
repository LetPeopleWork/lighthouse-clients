import type { CliConnection, DayOfWeek, RecurringBlackoutRule } from "./index";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStringList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const readBlackoutRule = (value: unknown): RecurringBlackoutRule | null => {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !isStringList(value.weekdays) ||
    typeof value.intervalWeeks !== "number" ||
    typeof value.start !== "string" ||
    (value.end !== null && typeof value.end !== "string") ||
    typeof value.description !== "string" ||
    typeof value.summary !== "string" ||
    value.summary.length === 0
  ) {
    return null;
  }
  return {
    id: value.id,
    weekdays: value.weekdays as readonly DayOfWeek[],
    intervalWeeks: value.intervalWeeks,
    start: value.start,
    end: value.end,
    description: value.description,
    summary: value.summary,
  };
};

/**
 * Every recurring blackout rule in the list, or null when the answer is not a list or any one of them
 * lacks the schedule Lighthouse words for it.
 */
export const readBlackoutRules = (
  value: unknown,
): RecurringBlackoutRule[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const rules = value.map(readBlackoutRule);
  return rules.every((rule) => rule !== null) ? rules : null;
};

/** The list's title, as the settings page heads it. */
export const BLACKOUT_RULE_LIST_TITLE = "Recurring blackout rules";

/** The list's column headings, as the settings page heads them. */
export const BLACKOUT_RULE_LIST_HEADINGS = ["Schedule", "Description"] as const;

/** How many rules there are: "No recurring blackout rules", "1 recurring blackout rule", "2 recurring blackout rules". */
export const describeBlackoutRuleCount = (count: number): string => {
  if (count === 0) {
    return "No recurring blackout rules";
  }
  return `${count} recurring blackout ${count === 1 ? "rule" : "rules"}`;
};

/** What the list says when there is nothing in it. */
export const describeNoBlackoutRules = (): string =>
  `${describeBlackoutRuleCount(0)}.`;

/** A rule's schedule cell: its id, then Lighthouse's own summary of the schedule, word for word. */
export const describeBlackoutRuleSchedule = ({
  id,
  summary,
}: Pick<RecurringBlackoutRule, "id" | "summary">): string =>
  `[id: ${id}] ${summary}`;

/** "Lighthouse v26.10.3.6", as the footer shows it, or null when the answer is not a version. */
export const describeVersion = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? `Lighthouse ${value}` : null;

/** The sentence a successful health check answers with, naming the Lighthouse it reached. */
export const describeReachable = (connection: CliConnection): string =>
  connection.mode === "server"
    ? `Lighthouse at ${connection.endpointUrl} is reachable.`
    : "The standalone Lighthouse is reachable.";
