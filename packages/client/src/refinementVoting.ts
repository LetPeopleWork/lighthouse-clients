import type {
  LighthouseClient,
  RefinementAnswer,
  SizingLog,
  TeamRefinement,
} from "./index";

/** A "Yes, if…" names the condition it holds under, so without a comment it is not a vote yet. */
export const isMissingItsCondition = (
  answer: RefinementAnswer,
  comment: string | undefined,
): boolean => answer === "YesBut" && comment === undefined;

/**
 * The reader's own vote on the Work Item, in a refinement read with this client's voter key or as the
 * signed-in account; null when there is none. Lighthouse answers a take-back that found nothing exactly
 * like one that did, so a client asks this first, sends nothing when there is no vote to take back, and
 * otherwise names the answer it saw, so a vote changed since in another session is left standing.
 */
export const myVoteOn = (
  refinement: Pick<TeamRefinement, "workItems">,
  workItem: string,
): RefinementAnswer | null =>
  refinement.workItems.find((row) => row.referenceId === workItem)?.myVote ??
  null;

/**
 * The name the reader's own latest vote was cast under, as a Work Item's log read with their key shows it;
 * null when the log shows no vote of theirs. A take-back is recorded under that name, not under whatever
 * name a client has stored since.
 */
const nameOfMyVote = (log: Pick<SizingLog, "entries">): string | null =>
  log.entries.filter((entry) => entry.kind === "Vote" && entry.isMine).at(-1)
    ?.voterName ?? null;

/** {@link nameOfMyVote}, read from Lighthouse; null when the log cannot be read either. */
export const readNameOfMyVote = async (
  client: Pick<LighthouseClient, "getRefinementLog">,
  teamId: number,
  workItem: string,
  voterKey: string | undefined,
): Promise<string | null> => {
  const log = await client.getRefinementLog(teamId, workItem, { voterKey });
  return log.ok ? nameOfMyVote(log.value) : null;
};
