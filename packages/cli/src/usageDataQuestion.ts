import type {
  LighthouseApiResult,
  StoredUsageDataAnswer,
  UsageDataQuestionAnswer,
  UsageDataState,
  UsageDataSwitchOn,
} from "@letpeoplework/lighthouse-client";

const USAGE_DATA_DETAILS =
  "Details: https://docs.lighthouse.letpeople.work/settings/usagedata.html";

/** The question lh asks once per Lighthouse, below a command's answer, on stderr. No is the default. */
export const USAGE_DATA_QUESTION = [
  "May Lighthouse send usage data?",
  "lh tells your Lighthouse which commands you use (never names, ids,",
  "URLs or anything you typed), so we can see what helps.",
  USAGE_DATA_DETAILS,
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
const COULD_NOT_ASK =
  "Could not ask this Lighthouse whether it allows usage data.";
const DO_NOT_TRACK_IS_SET =
  "DO_NOT_TRACK is set, so lh sends no usage data whatever is stored.";

const answerShown = (stored: StoredUsageDataAnswer | undefined): string => {
  if (stored === undefined) {
    return "not asked yet (off)";
  }
  return stored.answer === "yes" ? "on" : "off";
};

// A Lighthouse without the usage data routes answers 404, which the client reports as misconfigured.
const instanceLine = (state: LighthouseApiResult<UsageDataState>): string => {
  if (!state.ok) {
    return state.error.category === "misconfigured" ? PREDATES : COULD_NOT_ASK;
  }
  if (state.value.administratorDisabled) {
    return "This Lighthouse's administrator has stopped usage data, so nothing is sent.";
  }
  return state.value.acceptedSources?.includes("Cli") === true
    ? "This Lighthouse allows usage data."
    : PREDATES;
};

const answerLine = (lighthouse: string, answer: string): string =>
  `Usage data from lh to ${lighthouse}: ${answer}`;

/** The lines `lh config usage-data` prints: the answer, what the Lighthouse allows, and DO_NOT_TRACK when in force. */
export const describeUsageDataStatus = (
  status: UsageDataStatus,
): readonly string[] => {
  const lines = [
    answerLine(status.lighthouse, answerShown(status.stored)),
    instanceLine(status.state),
  ];
  return status.doNotTrack ? [...lines, DO_NOT_TRACK_IS_SET] : lines;
};

/** What `lh config usage-data off` did: off is kept, and the Lighthouse was told or could not be. */
export type UsageDataTurnedOff = {
  /** How the Lighthouse is named to the person. */
  readonly lighthouse: string;
  readonly toldLighthouse: boolean;
};

/** The lines `lh config usage-data off` prints, saying so when the Lighthouse could not be told. */
export const describeUsageDataOff = (
  turnedOff: UsageDataTurnedOff,
): readonly string[] => {
  const off = `${answerLine(turnedOff.lighthouse, "off")}. Nothing more is sent.`;
  return turnedOff.toldLighthouse
    ? [off]
    : [
        off,
        "Could not tell this Lighthouse; the yes it holds lapses by itself within 30 days.",
      ];
};

/** What `lh config usage-data on` did for one Lighthouse; an unreadable answers file is refused before this. */
export type UsageDataTurnedOn = {
  /** How the Lighthouse is named to the person. */
  readonly lighthouse: string;
  readonly outcome: Exclude<UsageDataSwitchOn, "unreadable">;
};

/** The lines `lh config usage-data on` prints, and whether they report a failure. */
export type UsageDataOnReport = {
  readonly lines: readonly string[];
  readonly failed: boolean;
};

/** The lines `lh config usage-data on` prints: on, or why nothing was changed. */
export const describeUsageDataOn = (
  turnedOn: UsageDataTurnedOn,
): UsageDataOnReport => {
  switch (turnedOn.outcome) {
    case "on":
      return {
        lines: [
          `${answerLine(turnedOn.lighthouse, "on")}.`,
          USAGE_DATA_DETAILS,
        ],
        failed: false,
      };
    case "do-not-track":
      return { lines: [DO_NOT_TRACK_IS_SET], failed: false };
    case "administrator-stopped":
      return {
        lines: [
          "This Lighthouse's administrator has stopped usage data; nothing was changed.",
        ],
        failed: false,
      };
    case "predates":
      return { lines: [PREDATES], failed: false };
    case "could-not-ask":
      return { lines: [COULD_NOT_ASK], failed: true };
    case "not-recorded":
      return {
        lines: [usageDataNotRecorded(turnedOn.lighthouse)],
        failed: true,
      };
  }
};

/** The refusal when the answers file is not one lh can read; it is left as it was. */
export const usageDataFileUnreadable = (path: string): string =>
  `The usage data file ${path} cannot be read; fix or remove it.`;
