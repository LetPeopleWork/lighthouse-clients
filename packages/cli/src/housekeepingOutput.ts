import {
  BLACKOUT_RULE_LIST_HEADINGS,
  BLACKOUT_RULE_LIST_TITLE,
  describeBlackoutRuleSchedule,
  describeConnectionName,
  describeConnectionType,
  describeNoBlackoutRules,
  describeOptionValue,
  describeWorkTrackingSystemCount,
  hideConnectionSecrets,
  readBlackoutRules,
  readWorkTrackingConnection,
  readWorkTrackingConnections,
  type Terms,
  WORK_TRACKING_CONNECTION_LIST_HEADINGS,
  WORK_TRACKING_OPTION_HEADINGS,
} from "@letpeoplework/lighthouse-client";
import { formatPretty } from "./output";
import { toTableLines } from "./table";

// An answer the view does not recognise still goes to the generic view, but never with a secret in it.
const asGenericViewWithSecretsHidden = (value: unknown): string =>
  formatPretty(hideConnectionSecrets(value));

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

/** The Work Tracking Systems as the Overview lists them, or the generic view with every secret hidden. */
export const renderWorkTrackingConnectionList = (
  value: unknown,
  terms: Terms,
): string => {
  const connections = readWorkTrackingConnections(value);
  if (connections === null) {
    return asGenericViewWithSecretsHidden(value);
  }
  if (connections.length === 0) {
    return `${describeWorkTrackingSystemCount(0, terms)}.`;
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

/** One connection with its options as the editor labels them, or the generic view with every secret hidden. */
export const renderWorkTrackingConnection = (value: unknown): string => {
  const connection = readWorkTrackingConnection(value);
  if (connection === null) {
    return asGenericViewWithSecretsHidden(value);
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
