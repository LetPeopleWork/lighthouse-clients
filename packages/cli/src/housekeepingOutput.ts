import {
  BLACKOUT_RULE_LIST_HEADINGS,
  BLACKOUT_RULE_LIST_TITLE,
  describeBlackoutRuleSchedule,
  describeConnectionName,
  describeConnectionType,
  describeNoBlackoutRules,
  describeOptionValue,
  readBlackoutRules,
  readWorkTrackingConnection,
  readWorkTrackingConnections,
  type Terms,
  WORK_TRACKING_CONNECTION_LIST_HEADINGS,
  WORK_TRACKING_OPTION_HEADINGS,
} from "@letpeoplework/lighthouse-client";
import { toTableLines } from "./table";

/** The recurring blackout rules as the settings page lists them, or null when the answer is not in a shape it knows. */
export const renderBlackoutRuleList = (value: unknown): string | null => {
  const rules = readBlackoutRules(value);
  if (rules === null) {
    return null;
  }
  if (rules.length === 0) {
    return describeNoBlackoutRules();
  }
  return [
    BLACKOUT_RULE_LIST_TITLE,
    ...toTableLines([
      [...BLACKOUT_RULE_LIST_HEADINGS],
      ...rules.map((rule) => [
        describeBlackoutRuleSchedule(rule),
        rule.description,
      ]),
    ]),
  ].join("\n");
};

/** The Work Tracking Systems as the Overview lists them, or null when the answer is not in a shape it knows. */
export const renderWorkTrackingConnectionList = (
  value: unknown,
  terms: Terms,
): string | null => {
  const connections = readWorkTrackingConnections(value);
  if (connections === null) {
    return null;
  }
  return [
    terms.workTrackingSystems,
    ...toTableLines([
      [...WORK_TRACKING_CONNECTION_LIST_HEADINGS],
      ...connections.map((connection) => [
        describeConnectionName(connection),
        connection.workTrackingSystem,
      ]),
    ]),
  ].join("\n");
};

/** One connection with its options as the editor labels them, or null when the answer is not in a shape it knows. */
export const renderWorkTrackingConnection = (value: unknown): string | null => {
  const connection = readWorkTrackingConnection(value);
  if (connection === null) {
    return null;
  }
  return [
    describeConnectionName(connection),
    describeConnectionType(connection),
    ...toTableLines([
      [...WORK_TRACKING_OPTION_HEADINGS],
      ...connection.options.map((option) => [
        option.label,
        describeOptionValue(option),
      ]),
    ]),
  ].join("\n");
};
