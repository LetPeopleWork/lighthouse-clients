import type {
  LighthouseApiError,
  RefinementAnswer,
  RefinementRow,
  VotedRow,
} from "./index";
import {
  type RefinementTerms,
  type RefinementTermsSource,
  readRefinementTerms,
} from "./refinementWording";

const ANSWER_WORDS: Readonly<Record<RefinementAnswer, string>> = {
  Yes: "Yes",
  YesBut: "Yes, if…",
  No: "No",
};

/** An answer as the web's buttons name it: "Yes", "Yes, if…" or "No". */
export const describeAnswer = (answer: RefinementAnswer): string =>
  ANSWER_WORDS[answer];

const moreVoters = (missing: number): string =>
  `${missing} more ${missing === 1 ? "voter" : "voters"} needed`;

const READINESS_WORDS: Readonly<
  Record<RefinementRow["readiness"], (missing: number) => string>
> = {
  Ready: () => "Ready",
  MoreYesNeeded: (missing) => `${missing} more Yes needed`,
  MoreVotersNeeded: moreVoters,
  NeedsDiscussion: () => "Needs discussion",
};

/** Where a Work Item stands by its votes, in the web's words: "Ready", "2 more Yes needed", … */
export const describeReadiness = (
  row: Pick<RefinementRow, "readiness" | "missingVotes">,
): string => READINESS_WORDS[row.readiness](row.missingVotes ?? 0);

/**
 * How the votes split, parts in the order Yes · Yes, if… · No and zero parts left out, with a `*` when
 * the caller has voted; "No votes" when nobody has.
 */
export const describeVotes = (
  row: Pick<RefinementRow, "split" | "myVote">,
): string => {
  const counts: readonly (readonly [number, RefinementAnswer])[] = [
    [row.split.yes, "Yes"],
    [row.split.yesBut, "YesBut"],
    [row.split.no, "No"],
  ];
  const parts = counts
    .filter(([count]) => count > 0)
    .map(([count, answer]) => `${count} ${describeAnswer(answer)}`);
  if (parts.length === 0) {
    return "No votes";
  }
  return `${parts.join(" · ")}${row.myVote == null ? "" : "*"}`;
};

/** What to look at on a Work Item: "open question", "stage disagrees", both, or nothing. */
export const describeWarnings = (
  row: Pick<RefinementRow, "hasOpenQuestion" | "signalsDisagree">,
): string =>
  [
    row.hasOpenQuestion ? "open question" : null,
    row.signalsDisagree ? "stage disagrees" : null,
  ]
    .filter((warning) => warning !== null)
    .join(", ");

/** What a vote, comment or take-back is said about: the Work Item and, without sign-in, whose it is. */
export type RecordedFor = {
  readonly workItem: string;
  readonly voterName?: string | null;
};

const whereItStands = (workItem: string, row: VotedRow): string =>
  row.madeReady
    ? `That made ${workItem} Ready.`
    : `${workItem}: ${describeReadiness(row)}.`;

const whose = (voterName: string | null | undefined): string =>
  voterName == null ? "your" : `${voterName}'s`;

/** "Recorded: Ana Lima — Yes, if… on GR-051. GR-051: 2 more Yes needed.", or "your Yes" with sign-in. */
export const describeRecordedVote = (
  { workItem, voterName }: RecordedFor,
  answer: RefinementAnswer,
  row: VotedRow,
): string => {
  const what =
    voterName == null
      ? `your ${describeAnswer(answer)}`
      : `${voterName} — ${describeAnswer(answer)}`;
  return `Recorded: ${what} on ${workItem}. ${whereItStands(workItem, row)}`;
};

/** "Recorded: Ana Lima's comment on GR-054." */
export const describeRecordedComment = ({
  workItem,
  voterName,
}: RecordedFor): string =>
  `Recorded: ${whose(voterName)} comment on ${workItem}.`;

/** "Took back Ana Lima's vote on GR-051. GR-051: 3 more Yes needed." */
export const describeTakenBack = (
  { workItem, voterName }: RecordedFor,
  row: VotedRow,
): string =>
  `Took back ${whose(voterName)} vote on ${workItem}. ${whereItStands(workItem, row)}`;

/** Why a "Yes, if…" without its condition is not sent, ending in how this surface adds one. */
export const describeMissingCondition = (howToAddIt: string): string =>
  `A "${describeAnswer("YesBut")}" needs its condition: ${howToAddIt}`;

/** Said instead of taking back when this client has no vote on the Work Item to take back. */
export const describeNothingToTakeBack = (workItem: string): string =>
  `No vote of yours on ${workItem} to take back from this client.`;

const TOO_MANY_REQUESTS = 429;
const BAD_REQUEST = 400;

// Lighthouse sends its one vote refusal without a code, a name over the length limit, with a title that
// already says what to do. Only that title is passed on; any other bare title is not the voter's to act on.
const NAME_TOO_LONG = /^A name is at most \d+ characters\.$/u;

const isNameTooLong = (error: LighthouseApiError): boolean =>
  error.statusCode === BAD_REQUEST &&
  error.problemCode === undefined &&
  NAME_TOO_LONG.test(error.problemTitle ?? "");

const LONGEST_COMMENT = 2000;

const REFUSALS_IN_WORDS: Readonly<Record<string, string>> = {
  "comment-required": "A comment needs some text.",
  "comment-too-long": `A comment is at most ${LONGEST_COMMENT} characters.`,
  "vote-needs-a-person":
    "This key belongs to no person, so it cannot vote. Use a personal API key.",
};

export type VoteRefusalWording = {
  /** The instance's words for the Work Item and the refinement. */
  readonly terms: Pick<RefinementTerms, "workItem" | "refinement">;
  /** What to say when Lighthouse needs a name, which each surface asks for its own way. */
  readonly nameRequired: string;
};

/**
 * Why Lighthouse would not take a vote, comment or take-back, in words the voter can act on: the web's
 * sentence where it has one, the title of a name that is too long, otherwise its category and reason as
 * every other command says a refusal.
 */
export const describeVoteRefusal = (
  error: LighthouseApiError,
  { terms, nameRequired }: VoteRefusalWording,
): string => {
  if (error.statusCode === TOO_MANY_REQUESTS) {
    return "Too many votes or comments from this client. Try again in a minute.";
  }
  if (error.problemCode === "work-item-not-in-refinement") {
    return `This ${terms.workItem.toLowerCase()} is no longer in ${terms.refinement.toLowerCase()}.`;
  }
  if (error.problemCode === "voter-name-required") {
    return nameRequired;
  }
  if (isNameTooLong(error)) {
    return error.problemTitle ?? "";
  }
  return (
    REFUSALS_IN_WORDS[error.problemCode ?? ""] ??
    `${error.category}: ${error.reason}`
  );
};

/** {@link describeVoteRefusal} in the instance's own words, read from the instance first. */
export const readVoteRefusal = async (
  source: RefinementTermsSource,
  error: LighthouseApiError,
  nameRequired: string,
): Promise<string> =>
  describeVoteRefusal(error, {
    terms: await readRefinementTerms(source),
    nameRequired,
  });
