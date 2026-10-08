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

/** One Work Tracking System connection as the Overview lists it. */
export type WorkTrackingConnectionListItem = {
  readonly id: number;
  readonly name: string;
  readonly workTrackingSystem: string;
};

/** One option of a connection, labelled as the editor labels it; a secret carries no value at all. */
export type WorkTrackingConnectionOption =
  | { readonly label: string; readonly isSecret: true }
  | {
      readonly label: string;
      readonly isSecret: false;
      readonly value: string;
    };

export type WorkTrackingConnectionDetails = WorkTrackingConnectionListItem & {
  readonly options: readonly WorkTrackingConnectionOption[];
};

const readConnectionListItem = (
  value: unknown,
): WorkTrackingConnectionListItem | null =>
  isRecord(value) &&
  typeof value.id === "number" &&
  typeof value.name === "string" &&
  typeof value.workTrackingSystem === "string"
    ? {
        id: value.id,
        name: value.name,
        workTrackingSystem: value.workTrackingSystem,
      }
    : null;

/** Every connection in the list, or null when the answer is not a list or any one of them lacks its name or type. */
export const readWorkTrackingConnections = (
  value: unknown,
): WorkTrackingConnectionListItem[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }
  const connections = value.map(readConnectionListItem);
  return connections.every((connection) => connection !== null)
    ? connections
    : null;
};

// The options the connection's own authentication method declares, which is where the editor finds its labels.
const declaredOptionsOf = (
  connection: Record<string, unknown>,
): Record<string, unknown>[] => {
  const methods = Array.isArray(connection.availableAuthenticationMethods)
    ? connection.availableAuthenticationMethods
    : [];
  const method = methods.find(
    (candidate) =>
      isRecord(candidate) &&
      candidate.key === connection.authenticationMethodKey,
  );
  return isRecord(method) && Array.isArray(method.options)
    ? method.options.filter(isRecord)
    : [];
};

const readConnectionOption = (
  value: unknown,
  declared: readonly Record<string, unknown>[],
): WorkTrackingConnectionOption | null => {
  if (
    !isRecord(value) ||
    typeof value.key !== "string" ||
    typeof value.isSecret !== "boolean"
  ) {
    return null;
  }
  const declaration = declared.find((option) => option.key === value.key);
  const label =
    typeof declaration?.displayName === "string"
      ? declaration.displayName
      : value.key;
  // Only the flags decide: a secret stays hidden even when Lighthouse wrongly sends its value along.
  if (value.isSecret || declaration?.isSecret === true) {
    return { label, isSecret: true };
  }
  if (value.value !== null && typeof value.value !== "string") {
    return null;
  }
  return { label, isSecret: false, value: value.value ?? "" };
};

/**
 * One connection with its options labelled as the editor labels them, or null when it arrives without its
 * options or any option lacks its key or its secret flag.
 */
export const readWorkTrackingConnection = (
  value: unknown,
): WorkTrackingConnectionDetails | null => {
  const connection = readConnectionListItem(value);
  if (
    connection === null ||
    !isRecord(value) ||
    !Array.isArray(value.options)
  ) {
    return null;
  }
  const declared = declaredOptionsOf(value);
  const options = value.options.map((option) =>
    readConnectionOption(option, declared),
  );
  return options.every((option) => option !== null)
    ? { ...connection, options }
    : null;
};

/** The list's column headings, as the Overview heads them. */
export const WORK_TRACKING_CONNECTION_LIST_HEADINGS = ["Name", "Type"] as const;

/** The option table's column headings. */
export const WORK_TRACKING_OPTION_HEADINGS = ["Option", "Value"] as const;

/** What stands in for a secret's value, which is never shown. */
export const SECRET_NOT_SHOWN = "(secret, not shown)";

/** A connection by name with its id beside it: "Letpeoplework Jira [id: 1]". */
export const describeConnectionName = ({
  id,
  name,
}: Pick<WorkTrackingConnectionListItem, "id" | "name">): string =>
  `${name} [id: ${id}]`;

/** "Type: Jira". */
export const describeConnectionType = ({
  workTrackingSystem,
}: Pick<WorkTrackingConnectionListItem, "workTrackingSystem">): string =>
  `Type: ${workTrackingSystem}`;

/** An option's value cell; a secret's reads the same whatever Lighthouse sent. */
export const describeOptionValue = (
  option: WorkTrackingConnectionOption,
): string => (option.isSecret ? SECRET_NOT_SHOWN : option.value);
