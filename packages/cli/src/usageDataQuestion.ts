import type {
  LighthouseApiResult,
  StoredUsageDataAnswer,
  UsageDataQuestionAnswer,
  UsageDataState,
} from "@letpeoplework/lighthouse-client";

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

/** What `lh config usage-data` knows: the answer kept for one Lighthouse, what that Lighthouse said, and DO_NOT_TRACK. */
export type UsageDataStatus = {
  /** How the Lighthouse is named to the person. */
  readonly lighthouse: string;
  /** The answer kept for this Lighthouse: undefined when never asked there. */
  readonly stored: StoredUsageDataAnswer | undefined;
  readonly state: LighthouseApiResult<UsageDataState>;
  readonly doNotTrack: boolean;
};

const PREDATES =
  "This Lighthouse does not take usage data from lh (it predates it).";

const answerShown = (stored: StoredUsageDataAnswer | undefined): string => {
  if (stored === undefined) {
    return "not asked yet (off)";
  }
  return stored.answer === "yes" ? "on" : "off";
};

// A Lighthouse without the usage data routes answers 404, which the client reports as misconfigured.
const instanceLine = (state: LighthouseApiResult<UsageDataState>): string => {
  if (!state.ok) {
    return state.error.category === "misconfigured"
      ? PREDATES
      : "Could not ask this Lighthouse whether it allows usage data.";
  }
  if (state.value.administratorDisabled) {
    return "This Lighthouse's administrator has stopped usage data, so nothing is sent.";
  }
  return state.value.acceptedSources?.includes("Cli") === true
    ? "This Lighthouse allows usage data."
    : PREDATES;
};

/** The lines `lh config usage-data` prints: the answer, what the Lighthouse allows, and DO_NOT_TRACK when in force. */
export const describeUsageDataStatus = (
  status: UsageDataStatus,
): readonly string[] => {
  const lines = [
    `Usage data from lh to ${status.lighthouse}: ${answerShown(status.stored)}`,
    instanceLine(status.state),
  ];
  return status.doNotTrack
    ? [
        ...lines,
        "DO_NOT_TRACK is set, so lh sends no usage data whatever is stored.",
      ]
    : lines;
};

/** The refusal when the answers file is not one lh can read; it is left as it was. */
export const usageDataFileUnreadable = (path: string): string =>
  `The usage data file ${path} cannot be read; fix or remove it.`;
