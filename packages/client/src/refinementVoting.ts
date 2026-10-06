import type { RefinementAnswer, TeamRefinement } from "./index";

/** A "Yes, if…" names the condition it holds under, so without a comment it is not a vote yet. */
export const isMissingItsCondition = (
  answer: RefinementAnswer,
  comment: string | undefined,
): boolean => answer === "YesBut" && comment === undefined;

/**
 * Whether a refinement, read with this client's voter key or as the signed-in account, shows a vote of
 * the reader's on the Work Item. Lighthouse answers a take-back that found nothing exactly like one that
 * did, so a client asks this first and sends nothing when there is no vote to take back.
 */
export const holdsMyVoteOn = (
  refinement: Pick<TeamRefinement, "workItems">,
  workItem: string,
): boolean =>
  refinement.workItems.find((row) => row.referenceId === workItem)?.myVote !=
  null;
