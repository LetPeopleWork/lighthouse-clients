import {
  BLACKOUT_RULE_LIST_HEADINGS,
  BLACKOUT_RULE_LIST_TITLE,
  describeBlackoutRuleSchedule,
  describeNoBlackoutRules,
  readBlackoutRules,
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
