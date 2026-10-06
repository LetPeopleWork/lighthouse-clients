import {
  describeMissingCondition,
  describeNothingToTakeBack,
  describeRecordedComment,
  describeRecordedVote,
  describeRefinementSummary,
  describeTakenBack,
  isMissingItsCondition,
  isRefinementAnswer,
  keepVoterKey,
  type LighthouseApiError,
  type LighthouseApiResult,
  type LighthouseClient,
  type LighthouseVoterKeyStore,
  myVoteOn,
  REFINEMENT_ANSWERS,
  type RefinementWordingSource,
  readNameOfMyVote,
  readRefinementWording,
  readVoteRefusal,
  type TeamRefinement,
  type VotedRow,
} from "@letpeoplework/lighthouse-client";
import { z } from "zod";
import {
  encodePayload,
  getErrorToolResult,
  getNumericId,
  getSuccessToolResult,
  isToolResult,
  type McpToolResult,
} from "./toolResult";

/** The voter key one MCP server keeps for the one Lighthouse it talks to. */
export type McpVoterKeyStore = LighthouseVoterKeyStore;

export type RefinementToolDependencies = {
  /** Where a local server keeps its voter key; a server shared by many people keeps none. */
  readonly voterKeyStore?: McpVoterKeyStore;
  /** Why this server may not vote, comment or take back right now, or null when it may. */
  readonly refuseVoting?: () => Promise<string | null>;
};

type ToolError = { readonly category: string; readonly reason: string };

export type RefinementToolClient = RefinementWordingSource<ToolError> &
  Pick<
    LighthouseClient,
    | "getTeamRefinement"
    | "castRefinementVote"
    | "addRefinementComment"
    | "takeBackRefinementVote"
    | "getRefinementLog"
    | "getTerminology"
  >;

type RefinementTool = (
  argumentsPayload: unknown,
  client: RefinementToolClient,
  dependencies: RefinementToolDependencies,
) => Promise<McpToolResult>;

const CHANNEL = "Assistant";

const ASK_FOR_THE_NAME =
  "Ask the user for their name and send it as voterName; never guess it.";

const workItemProperty = {
  type: "string",
  description:
    "The work item's reference, as referenceId shows it in lighthouse_team_refinement_get (for example GR-051).",
} as const;

const voterNameProperty = {
  type: "string",
  description:
    "The user's own name, needed when Lighthouse runs without sign-in. Ask the user for their name and never infer it, not from the system, an account or earlier messages. Leave it out with sign-in.",
} as const;

const teamIdProperty = {
  type: "integer",
  description: "The team's numeric id.",
} as const;

export const refinementWriteToolDefinitions = [
  {
    name: "lighthouse_team_refinement_vote",
    description:
      "Records the USER's own sizing judgement under their name. Never call this on your own initiative or on someone else's behalf: show the user the Work Item, the answer and any comment you intend to send, and call only after they explicitly confirm. answer is Yes (ready to be pulled), YesBut (\"Yes, if…\": ready under a condition, which goes in comment) or No; voting again replaces the user's earlier vote. Returns the work item as the vote left it, with `summary` stating where it now stands. Lighthouse newer than v26.10.3.6.",
    inputSchema: {
      type: "object",
      properties: {
        id: teamIdProperty,
        workItem: workItemProperty,
        answer: {
          type: "string",
          enum: [...REFINEMENT_ANSWERS],
          description:
            'The user\'s answer: Yes, YesBut ("Yes, if…") or No, as myVote and split name them.',
        },
        comment: {
          type: "string",
          description:
            "Optional; required with YesBut, where it says what has to be true.",
        },
        voterName: voterNameProperty,
      },
      required: ["id", "workItem", "answer"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_refinement_comment",
    description:
      "Records a comment or question of the USER's on a work item in refinement, under their name, without a vote. Never call this on your own initiative or on someone else's behalf: show the user the work item and the comment you intend to send, and call only after they explicitly confirm. Returns the work item as the comment left it, with a `summary`. Lighthouse newer than v26.10.3.6.",
    inputSchema: {
      type: "object",
      properties: {
        id: teamIdProperty,
        workItem: workItemProperty,
        comment: { type: "string", description: "The user's comment." },
        voterName: voterNameProperty,
      },
      required: ["id", "workItem", "comment"],
      additionalProperties: false,
    },
  },
  {
    name: "lighthouse_team_refinement_voteTakeBack",
    description:
      "Takes back the vote the USER cast on a work item from this assistant. Call only when the user asks for it. When this assistant holds no vote of theirs on the work item it says so and takes nothing back. Returns the work item as the take-back left it, with `summary` stating where it now stands. Lighthouse newer than v26.10.3.6.",
    inputSchema: {
      type: "object",
      properties: {
        id: teamIdProperty,
        workItem: workItemProperty,
      },
      required: ["id", "workItem"],
      additionalProperties: false,
    },
  },
] as const;

export const refinementWriteInputSchemas = {
  lighthouse_team_refinement_vote: z.object({
    id: z.number().int(),
    workItem: z.string(),
    answer: z.enum(REFINEMENT_ANSWERS),
    comment: z.string().optional(),
    voterName: z.string().optional(),
  }),
  lighthouse_team_refinement_comment: z.object({
    id: z.number().int(),
    workItem: z.string(),
    comment: z.string(),
    voterName: z.string().optional(),
  }),
  lighthouse_team_refinement_voteTakeBack: z.object({
    id: z.number().int(),
    workItem: z.string(),
  }),
};

const getArgument = (argumentsPayload: unknown, key: string): unknown =>
  typeof argumentsPayload === "object" &&
  argumentsPayload !== null &&
  !Array.isArray(argumentsPayload)
    ? (argumentsPayload as Readonly<Record<string, unknown>>)[key]
    : undefined;

const getNonBlankArgument = (
  argumentsPayload: unknown,
  key: string,
): string | undefined => {
  const value = getArgument(argumentsPayload, key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
};

type RefinementWriteTarget = {
  readonly teamId: number;
  readonly workItem: string;
};

/** The team and work item a write names, or the house "invalid …" refusal under its label. */
const getRefinementWriteTarget = (
  argumentsPayload: unknown,
  label: string,
): RefinementWriteTarget | McpToolResult => {
  const teamId = getNumericId(argumentsPayload);
  if (teamId === null) {
    return getErrorToolResult(`${label}: invalid id`);
  }
  const workItem = getNonBlankArgument(argumentsPayload, "workItem");
  if (workItem === undefined) {
    return getErrorToolResult(`${label}: invalid workItem`);
  }
  return { teamId, workItem };
};

/**
 * The key this server keeps, minted and kept on its first write; none on a server that keeps none; or why
 * it could not be kept.
 */
const keepServerVoterKey = async (
  label: string,
  store: McpVoterKeyStore | undefined,
): Promise<string | undefined | McpToolResult> => {
  if (store === undefined) {
    return undefined;
  }
  try {
    return await keepVoterKey(store);
  } catch (error: unknown) {
    return getErrorToolResult(
      `${label}: ${error instanceof Error ? error.message : "the voter key was not kept."}`,
    );
  }
};

const loadServerVoterKey = async (
  dependencies: RefinementToolDependencies,
): Promise<string | undefined> =>
  (await dependencies.voterKeyStore?.load()) ?? undefined;

const getVoteRefusalToolResult = async (
  label: string,
  error: LighthouseApiError,
  client: RefinementToolClient,
): Promise<McpToolResult> =>
  getErrorToolResult(
    `${label}: ${await readVoteRefusal(client, error, ASK_FOR_THE_NAME)}`,
  );

// With sign-in Lighthouse knows the voter from the credential, so the server sends neither name nor key.
// Lighthouse says which it is on every refinement it answers.
const isSignedIn = (refinement: Pick<TeamRefinement, "voterIdentity">) =>
  refinement.voterIdentity === "Account";

const readRefinementFor = async (
  label: string,
  client: RefinementToolClient,
  teamId: number,
  voterKey?: string,
): Promise<TeamRefinement | McpToolResult> => {
  const refinement = await client.getTeamRefinement(teamId, { voterKey });
  return refinement.ok
    ? refinement.value
    : getVoteRefusalToolResult(label, refinement.error, client);
};

type WriteVoter = {
  readonly voterName?: string;
  readonly voterKey?: string;
};

// The name is checked before a key is minted, so a refused call leaves nothing behind.
const resolveWriteVoter = async (
  label: string,
  argumentsPayload: unknown,
  client: RefinementToolClient,
  dependencies: RefinementToolDependencies,
  teamId: number,
): Promise<WriteVoter | McpToolResult> => {
  const refinement = await readRefinementFor(label, client, teamId);
  if (isToolResult(refinement)) {
    return refinement;
  }
  if (isSignedIn(refinement)) {
    return {};
  }
  const voterName = getNonBlankArgument(argumentsPayload, "voterName");
  if (voterName === undefined) {
    return getErrorToolResult(`${label}: ${ASK_FOR_THE_NAME}`);
  }
  const voterKey = await keepServerVoterKey(label, dependencies.voterKeyStore);
  return isToolResult(voterKey) ? voterKey : { voterName, voterKey };
};

const getRefinementWriteToolResult = async (
  label: string,
  result: LighthouseApiResult<VotedRow>,
  client: RefinementToolClient,
  describe: (row: VotedRow) => string,
): Promise<McpToolResult> => {
  if (!result.ok) {
    return getVoteRefusalToolResult(label, result.error, client);
  }
  const written = { summary: describe(result.value), ...result.value };
  return getSuccessToolResult(`${label}: ${encodePayload(written)}`);
};

const refusedVoting = async (
  label: string,
  dependencies: RefinementToolDependencies,
): Promise<McpToolResult | null> => {
  const refusal = (await dependencies.refuseVoting?.()) ?? null;
  return refusal === null ? null : getErrorToolResult(`${label}: ${refusal}`);
};

const getRefinementErrorToolResult = (error: ToolError): McpToolResult =>
  getErrorToolResult(`refinement: ${error.category} (${error.reason})`);

const getRefinement: RefinementTool = async (
  argumentsPayload,
  client,
  dependencies,
) => {
  const teamId = getNumericId(argumentsPayload);
  if (teamId === null) {
    return getErrorToolResult("refinement: invalid id");
  }

  const voterKey = await loadServerVoterKey(dependencies);
  const [refinement, wording] = await Promise.all([
    client.getTeamRefinement(teamId, { voterKey }),
    readRefinementWording(client, teamId),
  ]);
  if (!refinement.ok) {
    return getRefinementErrorToolResult(refinement.error);
  }
  if (!wording.ok) {
    return getRefinementErrorToolResult(wording.error);
  }

  const summary = describeRefinementSummary(refinement.value, wording.value);
  return getSuccessToolResult(
    `refinement: ${encodePayload({ summary, ...refinement.value })}`,
  );
};

const castVote: RefinementTool = async (
  argumentsPayload,
  client,
  dependencies,
) => {
  const target = getRefinementWriteTarget(argumentsPayload, "vote");
  if (isToolResult(target)) {
    return target;
  }
  const answer = getArgument(argumentsPayload, "answer");
  if (!isRefinementAnswer(answer)) {
    return getErrorToolResult("vote: invalid answer");
  }
  const comment = getNonBlankArgument(argumentsPayload, "comment");
  if (isMissingItsCondition(answer, comment)) {
    return getErrorToolResult(
      `vote: ${describeMissingCondition("add a comment saying what has to be true.")}`,
    );
  }
  const refused = await refusedVoting("vote", dependencies);
  if (refused !== null) {
    return refused;
  }

  const voter = await resolveWriteVoter(
    "vote",
    argumentsPayload,
    client,
    dependencies,
    target.teamId,
  );
  if (isToolResult(voter)) {
    return voter;
  }

  const result = await client.castRefinementVote(
    target.teamId,
    target.workItem,
    { answer, channel: CHANNEL, comment, ...voter },
  );
  return getRefinementWriteToolResult("vote", result, client, (row) =>
    describeRecordedVote(
      { workItem: target.workItem, voterName: voter.voterName },
      answer,
      row,
    ),
  );
};

const addComment: RefinementTool = async (
  argumentsPayload,
  client,
  dependencies,
) => {
  const target = getRefinementWriteTarget(argumentsPayload, "comment");
  if (isToolResult(target)) {
    return target;
  }
  const comment = getNonBlankArgument(argumentsPayload, "comment");
  if (comment === undefined) {
    return getErrorToolResult("comment: invalid comment");
  }
  const refused = await refusedVoting("comment", dependencies);
  if (refused !== null) {
    return refused;
  }

  const voter = await resolveWriteVoter(
    "comment",
    argumentsPayload,
    client,
    dependencies,
    target.teamId,
  );
  if (isToolResult(voter)) {
    return voter;
  }

  const result = await client.addRefinementComment(
    target.teamId,
    target.workItem,
    { comment, channel: CHANNEL, ...voter },
  );
  return getRefinementWriteToolResult("comment", result, client, () =>
    describeRecordedComment({
      workItem: target.workItem,
      voterName: voter.voterName,
    }),
  );
};

const takeBackVote: RefinementTool = async (
  argumentsPayload,
  client,
  dependencies,
) => {
  const target = getRefinementWriteTarget(argumentsPayload, "takeBack");
  if (isToolResult(target)) {
    return target;
  }
  const refused = await refusedVoting("takeBack", dependencies);
  if (refused !== null) {
    return refused;
  }
  const nothingToTakeBack = getSuccessToolResult(
    `takeBack: ${encodePayload({ summary: describeNothingToTakeBack(target.workItem) })}`,
  );
  const keptVoterKey = await loadServerVoterKey(dependencies);
  const refinement = await readRefinementFor(
    "takeBack",
    client,
    target.teamId,
    keptVoterKey,
  );
  if (isToolResult(refinement)) {
    return refinement;
  }
  const myVote = myVoteOn(refinement, target.workItem);
  if (myVote === null) {
    return nothingToTakeBack;
  }

  const signedIn = isSignedIn(refinement);
  const voterName = signedIn
    ? null
    : await readNameOfMyVote(
        client,
        target.teamId,
        target.workItem,
        keptVoterKey,
      );
  const result = await client.takeBackRefinementVote(
    target.teamId,
    target.workItem,
    {
      channel: CHANNEL,
      voterKey: signedIn ? undefined : keptVoterKey,
      answer: myVote,
    },
  );
  return getRefinementWriteToolResult("takeBack", result, client, (takenBack) =>
    describeTakenBack({ workItem: target.workItem, voterName }, takenBack),
  );
};

const REFINEMENT_TOOLS: ReadonlyMap<string, RefinementTool> = new Map([
  ["lighthouse_team_refinement_get", getRefinement],
  ["lighthouse_team_refinement_vote", castVote],
  ["lighthouse_team_refinement_comment", addComment],
  ["lighthouse_team_refinement_voteTakeBack", takeBackVote],
]);

/** The handler of a refinement tool, or undefined for a tool that is not one. */
export const findRefinementTool = (name: string): RefinementTool | undefined =>
  REFINEMENT_TOOLS.get(name);
