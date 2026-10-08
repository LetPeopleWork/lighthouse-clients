import {
  type CliConnection,
  describeMissingCondition,
  describeNothingToTakeBack,
  describeRecordedComment,
  describeRecordedVote,
  describeTakenBack,
  isMissingItsCondition,
  keepVoterKey,
  type LighthouseApiResult,
  type LighthouseClient,
  type LighthouseVoterKeyStore,
  myVoteOn,
  type RefinementAnswer,
  readNameOfMyVote,
  readRefinementWording,
  readVoteRefusal,
  refinementDayVerdictOf,
  STANDALONE_VOTER_KEY_SCOPE,
  sizingMomentOf,
  type TeamRefinement,
  type UsageDataOccurrence,
  type UsageDataSizingMoment,
  type VotedRow,
} from "@letpeoplework/lighthouse-client";
import {
  type CliCommandResult,
  getErrorResult,
  getOptionValue,
  getSuccessResult,
  isCliCommandResult,
  mapApiResultToCliResult,
  withUsage,
} from "./commandResult";
import type { OutputFormat } from "./output";
import { renderRefinement } from "./refinementOutput";

/** What `lh` keeps about the person voting, between runs. */
export type VoterDependencies = {
  /** The name votes and comments carry when Lighthouse runs without sign-in. */
  readonly loadVoterName?: () => Promise<string | null>;
  readonly saveVoterName?: (name: string | null) => Promise<void>;
  /** The voter key this client keeps for one Lighthouse, or null when it keeps none. */
  readonly loadVoterKey?: (lighthouse: string) => Promise<string | null>;
  readonly saveVoterKey?: (lighthouse: string, key: string) => Promise<void>;
};

type RefinementClient = Pick<
  LighthouseClient,
  | "getTeam"
  | "getTerminology"
  | "getTeamRefinement"
  | "castRefinementVote"
  | "addRefinementComment"
  | "takeBackRefinementVote"
  | "getRefinementLog"
>;

type RefinementCommandDependencies = VoterDependencies & {
  readonly createClient: (connection: CliConnection) => RefinementClient;
};

type RefinementCommand = (
  args: readonly string[],
  outputFormat: OutputFormat,
  connection: CliConnection,
  dependencies: RefinementCommandDependencies,
) => Promise<CliCommandResult>;

const CHANNEL = "Cli";

const GIVE_YOUR_NAME =
  'Give your name with --as "<name>", or store it once: lh config voter set --name "<name>".';

const CLI_ANSWERS = new Map<string, RefinementAnswer>([
  ["yes", "Yes"],
  ["yes-but", "YesBut"],
  ["no", "No"],
]);

const getNonBlankOption = (
  args: readonly string[],
  optionName: string,
): string | undefined => {
  const value = getOptionValue(args, optionName)?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
};

const parseTeamIdOption = (
  args: readonly string[],
  command: string,
): number | CliCommandResult => {
  const value = getOptionValue(args, "--team-id");
  if (value === undefined) {
    return getErrorResult(
      `Missing required --team-id for refinement ${command}.`,
    );
  }
  if (!/^\d+$/u.test(value)) {
    return getErrorResult(
      `Invalid --team-id "${value}": expected a numeric Team id.`,
    );
  }
  return Number(value);
};

type VoteTarget = {
  readonly teamId: number;
  readonly workItem: string;
};

const parseVoteTarget = (
  args: readonly string[],
  command: string,
): VoteTarget | CliCommandResult => {
  const teamId = parseTeamIdOption(args, command);
  if (isCliCommandResult(teamId)) {
    return teamId;
  }
  const workItem = getNonBlankOption(args, "--work-item");
  if (workItem === undefined) {
    return getErrorResult(
      `Missing required --work-item for refinement ${command}.`,
    );
  }
  return { teamId, workItem };
};

/** Which Lighthouse something kept belongs to: the server's URL, or the one standalone app on this machine. */
export const lighthouseOf = (connection: CliConnection): string =>
  connection.mode === "server"
    ? connection.endpointUrl
    : STANDALONE_VOTER_KEY_SCOPE;

const voterKeyStoreOf = (
  connection: CliConnection,
  dependencies: VoterDependencies,
): LighthouseVoterKeyStore => {
  const lighthouse = lighthouseOf(connection);
  return {
    load: async () => (await dependencies.loadVoterKey?.(lighthouse)) ?? null,
    save: async (key) => {
      await dependencies.saveVoterKey?.(lighthouse, key);
    },
  };
};

const loadKeptVoterKey = async (
  connection: CliConnection,
  dependencies: VoterDependencies,
): Promise<string | undefined> =>
  (await voterKeyStoreOf(connection, dependencies).load()) ?? undefined;

// With sign-in Lighthouse knows the voter from the credential, so the client sends neither name nor key.
// Lighthouse says which it is on every refinement it answers; what was answered when the connection was
// saved may be wrong, or out of date.
const isSignedIn = (refinement: Pick<TeamRefinement, "voterIdentity">) =>
  refinement.voterIdentity === "Account";

const readRefinement = async (
  client: RefinementClient,
  teamId: number,
  outputFormat: OutputFormat,
  voterKey?: string,
): Promise<TeamRefinement | CliCommandResult> => {
  const refinement = await client.getTeamRefinement(teamId, { voterKey });
  return refinement.ok
    ? refinement.value
    : mapApiResultToCliResult(refinement, outputFormat);
};

const keepCliVoterKey = async (
  connection: CliConnection,
  dependencies: VoterDependencies,
): Promise<string | CliCommandResult> => {
  try {
    return await keepVoterKey(voterKeyStoreOf(connection, dependencies));
  } catch (error: unknown) {
    return getErrorResult(
      error instanceof Error ? error.message : "The voter key was not kept.",
    );
  }
};

type WriteVoter = {
  readonly voterName?: string;
  readonly voterKey?: string;
};

/** Who writes, and the Refinement as Lighthouse answered it when asked who that is. */
type ResolvedWriter = {
  readonly voter: WriteVoter;
  readonly refinement: TeamRefinement;
};

const resolveVoterOf = async (
  refinement: TeamRefinement,
  args: readonly string[],
  connection: CliConnection,
  dependencies: RefinementCommandDependencies,
): Promise<WriteVoter | CliCommandResult> => {
  if (isSignedIn(refinement)) {
    return {};
  }
  const voterName =
    getNonBlankOption(args, "--as") ??
    (await dependencies.loadVoterName?.()) ??
    undefined;
  if (voterName === undefined) {
    return getErrorResult(GIVE_YOUR_NAME);
  }
  const voterKey = await keepCliVoterKey(connection, dependencies);
  return isCliCommandResult(voterKey) ? voterKey : { voterName, voterKey };
};

const resolveWriter = async (
  args: readonly string[],
  outputFormat: OutputFormat,
  connection: CliConnection,
  dependencies: RefinementCommandDependencies,
  teamId: number,
): Promise<ResolvedWriter | CliCommandResult> => {
  const refinement = await readRefinement(
    dependencies.createClient(connection),
    teamId,
    outputFormat,
  );
  if (isCliCommandResult(refinement)) {
    return refinement;
  }
  const voter = await resolveVoterOf(
    refinement,
    args,
    connection,
    dependencies,
  );
  return isCliCommandResult(voter) ? voter : { voter, refinement };
};

// Only Lighthouse's answer knows whether this vote is the one that made the Work Item Ready.
const occurrencesOfAVote = (
  sizingMoment: UsageDataSizingMoment,
  answered: LighthouseApiResult<VotedRow>,
): readonly UsageDataOccurrence[] => {
  const cast: UsageDataOccurrence = {
    name: "TeamSizingVoteCast",
    sizingMoment,
  };
  return answered.ok && answered.value.madeReady
    ? [cast, { name: "TeamSizingReadinessReached", sizingMoment }]
    : [cast];
};

const mapVoteResultToCliResult = async (
  result: LighthouseApiResult<VotedRow>,
  outputFormat: OutputFormat,
  client: RefinementClient,
  describe: (row: VotedRow) => string,
): Promise<CliCommandResult> =>
  result.ok
    ? mapApiResultToCliResult(result, outputFormat, describe)
    : getErrorResult(
        await readVoteRefusal(client, result.error, GIVE_YOUR_NAME),
      );

const occurrencesOfARead = (
  answered: LighthouseApiResult<TeamRefinement>,
): readonly UsageDataOccurrence[] => {
  if (!answered.ok) {
    return [];
  }
  const refinement = answered.value;
  const refinementVerdict = refinementDayVerdictOf({
    isRefinementDay: refinement.isRefinementDay,
    workItemsListed: refinement.workItems.length,
    verdict: refinement.need.verdict,
  });
  return refinementVerdict === null
    ? []
    : [{ name: "TeamRefinementDayVerdictShown", refinementVerdict }];
};

const withVerdictShown = (
  printed: CliCommandResult,
  answered: LighthouseApiResult<TeamRefinement>,
): CliCommandResult =>
  withUsage(printed, answered, occurrencesOfARead(answered));

const runRefinementGet: RefinementCommand = async (
  args,
  outputFormat,
  connection,
  dependencies,
) => {
  const teamId = parseTeamIdOption(args, "get");
  if (isCliCommandResult(teamId)) {
    return teamId;
  }

  const client = dependencies.createClient(connection);
  const readOptions = {
    voterKey: await loadKeptVoterKey(connection, dependencies),
  };
  if (outputFormat !== "pretty") {
    const answered = await client.getTeamRefinement(teamId, readOptions);
    return withVerdictShown(
      mapApiResultToCliResult(answered, outputFormat),
      answered,
    );
  }

  const [refinement, wording] = await Promise.all([
    client.getTeamRefinement(teamId, readOptions),
    readRefinementWording(client, teamId),
  ]);
  if (!refinement.ok) {
    return mapApiResultToCliResult(refinement, outputFormat);
  }
  if (!wording.ok) {
    return mapApiResultToCliResult(wording, outputFormat);
  }
  return withVerdictShown(
    mapApiResultToCliResult(refinement, outputFormat, (facts) =>
      renderRefinement(facts, wording.value),
    ),
    refinement,
  );
};

const runRefinementVote: RefinementCommand = async (
  args,
  outputFormat,
  connection,
  dependencies,
) => {
  const target = parseVoteTarget(args, "vote");
  if (isCliCommandResult(target)) {
    return target;
  }
  const answer = CLI_ANSWERS.get(getOptionValue(args, "--answer") ?? "");
  if (answer === undefined) {
    return getErrorResult(
      "Missing or invalid --answer. Use one of: yes, yes-but, no.",
    );
  }
  const comment = getNonBlankOption(args, "--comment");
  if (isMissingItsCondition(answer, comment)) {
    return getErrorResult(
      describeMissingCondition('add --comment "<what has to be true>"'),
    );
  }
  const writer = await resolveWriter(
    args,
    outputFormat,
    connection,
    dependencies,
    target.teamId,
  );
  if (isCliCommandResult(writer)) {
    return writer;
  }
  const { voter, refinement } = writer;

  const client = dependencies.createClient(connection);
  const result = await client.castRefinementVote(
    target.teamId,
    target.workItem,
    { answer, channel: CHANNEL, comment, ...voter },
  );
  const printed = await mapVoteResultToCliResult(
    result,
    outputFormat,
    client,
    (row) =>
      describeRecordedVote(
        { workItem: target.workItem, voterName: voter.voterName },
        answer,
        row,
      ),
  );
  return withUsage(
    printed,
    result,
    occurrencesOfAVote(sizingMomentOf(refinement), result),
  );
};

const runRefinementComment: RefinementCommand = async (
  args,
  outputFormat,
  connection,
  dependencies,
) => {
  const target = parseVoteTarget(args, "comment");
  if (isCliCommandResult(target)) {
    return target;
  }
  const comment = getNonBlankOption(args, "--text");
  if (comment === undefined) {
    return getErrorResult("Missing required --text for refinement comment.");
  }
  const writer = await resolveWriter(
    args,
    outputFormat,
    connection,
    dependencies,
    target.teamId,
  );
  if (isCliCommandResult(writer)) {
    return writer;
  }
  const { voter } = writer;

  const client = dependencies.createClient(connection);
  const result = await client.addRefinementComment(
    target.teamId,
    target.workItem,
    { comment, channel: CHANNEL, ...voter },
  );
  return mapVoteResultToCliResult(result, outputFormat, client, () =>
    describeRecordedComment({
      workItem: target.workItem,
      voterName: voter.voterName,
    }),
  );
};

const runRefinementTakeBack: RefinementCommand = async (
  args,
  outputFormat,
  connection,
  dependencies,
) => {
  const target = parseVoteTarget(args, "take-back");
  if (isCliCommandResult(target)) {
    return target;
  }
  const nothingToTakeBack = getSuccessResult(
    describeNothingToTakeBack(target.workItem),
  );
  const keptVoterKey = await loadKeptVoterKey(connection, dependencies);
  const client = dependencies.createClient(connection);
  const refinement = await readRefinement(
    client,
    target.teamId,
    outputFormat,
    keptVoterKey,
  );
  if (isCliCommandResult(refinement)) {
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
  return mapVoteResultToCliResult(result, outputFormat, client, (takenBack) =>
    describeTakenBack({ workItem: target.workItem, voterName }, takenBack),
  );
};

const REFINEMENT_COMMANDS: ReadonlyMap<string, RefinementCommand> = new Map([
  ["get", runRefinementGet],
  ["vote", runRefinementVote],
  ["comment", runRefinementComment],
  ["take-back", runRefinementTakeBack],
]);

/** The `lh refinement <subcommand>` handler, or undefined for a subcommand there is none for. */
export const findRefinementCommand = (
  subcommand: string,
): RefinementCommand | undefined => REFINEMENT_COMMANDS.get(subcommand);
