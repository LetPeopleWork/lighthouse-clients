import type { RefinementAnswer, RefinementRow } from "./index";

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
  return `${parts.join(" · ")}${row.myVote === null ? "" : "*"}`;
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
