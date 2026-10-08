import type { UsageDataQuestionAnswer } from "@letpeoplework/lighthouse-client";

/** The question lh asks once per Lighthouse, below a command's answer, on stderr. No is the default. */
export const USAGE_DATA_QUESTION = [
  "May Lighthouse send usage data?",
  "lh tells your Lighthouse which commands you use (never names, ids,",
  "URLs or anything you typed), so we can see what helps.",
  "Details: https://docs.lighthouse.letpeople.work/settings/usagedata.html",
  "Send usage data from lh? [y/N]",
].join("\n");

/** Shown once the answer is kept, so the person knows it is not final. */
export const USAGE_DATA_CHANGE_ANY_TIME =
  "(change any time: lh config usage-data on|off)";

/** Shown when a yes could not be recorded, naming the Lighthouse it was for. */
export const usageDataNotRecorded = (lighthouse: string): string =>
  `Could not record your answer at ${lighthouse}; nothing is sent. Try lh config usage-data on.`;

const YES = new Set(["y", "yes"]);

/** `y` or `yes` in any case is a yes; anything else, Enter included, is No; nothing typed at all is no answer. */
export const readUsageDataAnswer = (
  typed: string | null,
): UsageDataQuestionAnswer => {
  if (typed === null) {
    return null;
  }
  return YES.has(typed.trim().toLowerCase()) ? "yes" : "no";
};
