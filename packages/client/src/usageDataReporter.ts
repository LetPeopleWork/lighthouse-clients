import type { LighthouseApiResult, LighthouseClient } from "./index";
import {
  type ClientUsageDataSource,
  isDoNotTrackSet,
  planUsageDataStep,
  type UsageDataBatch,
  type UsageDataOccurrence,
  type UsageDataPlan,
  type UsageDataState,
  type UsageDataStepFacts,
} from "./usageData";
import type { LighthouseUsageDataStore } from "./usageDataStore";

/** The Lighthouse calls a reporter makes, none of them with a credential. */
export type UsageDataLighthouse = Pick<
  LighthouseClient,
  "getUsageDataState" | "grantUsageData" | "revokeUsageData" | "handInUsageData"
>;

export type UsageDataReporterDependencies = {
  readonly lighthouse: UsageDataLighthouse;
  /** This Lighthouse's answer on this machine. */
  readonly store: LighthouseUsageDataStore;
  readonly source: ClientUsageDataSource;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly now: () => Date;
};

/** What a person answered to the question: null when they closed it without answering. */
export type UsageDataQuestionAnswer = "yes" | "no" | null;

/** What a command did, and how its person can be asked when nobody has answered yet. */
export type UsageDataStep = {
  /** Whether the command reached Lighthouse and succeeded. */
  readonly reached: boolean;
  readonly occurrences: readonly UsageDataOccurrence[];
  /** Asks the person; absent when nobody is there who could answer. */
  readonly ask?: () => Promise<UsageDataQuestionAnswer>;
};

/** How a step ended. Never carries the consent token. */
export type UsageDataOutcome =
  | "nothing"
  | "sent"
  | "kept-yes"
  | "kept-no"
  | "unanswered"
  | "not-recorded";

/** A command's own answer never waits on usage data for longer than this, whatever Lighthouse does. */
export const USAGE_DATA_BUDGET_MS = 1_000;
// The person has just said yes and is waiting to see it recorded, so the grant is given longer.
const GRANT_BUDGET_MS = 5_000;

const send = async (
  dependencies: UsageDataReporterDependencies,
  token: string,
  batch: UsageDataBatch,
  signal: AbortSignal,
): Promise<UsageDataOutcome> => {
  const handedIn = await dependencies.lighthouse.handInUsageData(batch, {
    token,
    signal,
  });
  return handedIn.ok ? "sent" : "nothing";
};

const yesGivenNow = (
  dependencies: Pick<UsageDataReporterDependencies, "now">,
  token: string,
) =>
  ({
    answer: "yes",
    token,
    confirmedAt: dependencies.now().toISOString(),
  }) as const;

const toldLighthouse = async (
  lighthouse: Pick<LighthouseClient, "revokeUsageData">,
  token: string,
  signal: AbortSignal = AbortSignal.timeout(USAGE_DATA_BUDGET_MS),
): Promise<boolean> => {
  try {
    const revoked = await lighthouse.revokeUsageData({ token, signal });
    return revoked.ok;
  } catch {
    return false;
  }
};

const regrantAndSend = async (
  dependencies: UsageDataReporterDependencies,
  formerToken: string,
  batch: UsageDataBatch,
  signal: AbortSignal,
): Promise<UsageDataOutcome> => {
  const granted = await dependencies.lighthouse.grantUsageData({ signal });
  if (!granted.ok) {
    return "nothing";
  }
  const kept = await dependencies.store.renew(
    formerToken,
    yesGivenNow(dependencies, granted.value),
    signal,
  );
  if (!kept) {
    // The yes was turned off while this grant was minted: it must neither carry events nor stay live.
    await toldLighthouse(dependencies.lighthouse, granted.value, signal);
    return "nothing";
  }
  return send(dependencies, granted.value, batch, signal);
};

const recordYes = async (
  dependencies: UsageDataReporterDependencies,
): Promise<UsageDataOutcome> => {
  const granted = await dependencies.lighthouse.grantUsageData({
    signal: AbortSignal.timeout(GRANT_BUDGET_MS),
  });
  if (!granted.ok) {
    return "not-recorded";
  }
  let kept: boolean;
  try {
    kept = await dependencies.store.answer(
      yesGivenNow(dependencies, granted.value),
    );
  } catch {
    await toldLighthouse(dependencies.lighthouse, granted.value);
    return "not-recorded";
  }
  if (!kept) {
    await toldLighthouse(dependencies.lighthouse, granted.value);
    return "nothing";
  }
  return "kept-yes";
};

const askAndRecord = async (
  dependencies: UsageDataReporterDependencies,
  step: UsageDataStep,
): Promise<UsageDataOutcome> => {
  const answer = await step.ask?.();
  if (answer === undefined || answer === null) {
    return "unanswered";
  }
  if (answer === "yes") {
    return recordYes(dependencies);
  }
  const kept = await dependencies.store.answer({
    answer: "no",
    decidedAt: dependencies.now().toISOString(),
  });
  return kept ? "kept-no" : "nothing";
};

const execute = async (
  dependencies: UsageDataReporterDependencies,
  step: UsageDataStep,
  plan: UsageDataPlan,
  signal: AbortSignal,
): Promise<UsageDataOutcome> => {
  switch (plan.kind) {
    case "ask":
      return askAndRecord(dependencies, step);
    case "send":
      if (plan.reconfirmed) {
        await dependencies.store.renew(
          plan.token,
          yesGivenNow(dependencies, plan.token),
          signal,
        );
      }
      return send(dependencies, plan.token, plan.batch, signal);
    case "re-grant-then-send":
      return regrantAndSend(dependencies, plan.formerToken, plan.batch, signal);
    default:
      return "nothing";
  }
};

const settle = async (
  dependencies: UsageDataReporterDependencies,
  step: UsageDataStep,
): Promise<UsageDataOutcome> => {
  const signal = AbortSignal.timeout(USAGE_DATA_BUDGET_MS);
  const doNotTrack = isDoNotTrackSet(dependencies.env);
  const facts: UsageDataStepFacts = {
    doNotTrack,
    stored:
      doNotTrack || !step.reached ? undefined : await dependencies.store.read(),
    state: "unread",
    source: dependencies.source,
    mayPrompt: step.ask !== undefined,
    reached: step.reached,
    occurrences: step.occurrences,
    now: dependencies.now(),
  };
  const plan = planUsageDataStep(facts);
  if (plan.kind !== "read-state") {
    return execute(dependencies, step, plan, signal);
  }
  const state = await dependencies.lighthouse.getUsageDataState({
    token: plan.token,
    signal,
  });
  return execute(
    dependencies,
    step,
    planUsageDataStep({
      ...facts,
      state: state.ok ? state.value : "unavailable",
    }),
    signal,
  );
};

/** How turning usage data off ended. Never carries the consent token. */
export type UsageDataWithdrawal =
  | "off"
  | "off-lighthouse-not-told"
  | "unreadable";

export type UsageDataWithdrawalDependencies = {
  readonly lighthouse: Pick<LighthouseClient, "revokeUsageData">;
  readonly store: LighthouseUsageDataStore;
  readonly now: () => Date;
};

/**
 * Turns usage data off for one Lighthouse: keeps a No in place of whatever was kept, then withdraws a yes
 * at Lighthouse with its token. Off is kept even when Lighthouse cannot be told; an unreadable answers file
 * is left as it was.
 */
export const withdrawUsageData = async (
  dependencies: UsageDataWithdrawalDependencies,
): Promise<UsageDataWithdrawal> => {
  const stored = await dependencies.store.read();
  if (stored === "unreadable") {
    return "unreadable";
  }
  await dependencies.store.replace({
    answer: "no",
    decidedAt: dependencies.now().toISOString(),
  });
  if (stored?.answer !== "yes") {
    return "off";
  }
  return (await toldLighthouse(dependencies.lighthouse, stored.token))
    ? "off"
    : "off-lighthouse-not-told";
};

/** How turning usage data on ended. Never carries the consent token. */
export type UsageDataSwitchOn =
  | "on"
  | "do-not-track"
  | "administrator-stopped"
  | "predates"
  | "could-not-ask"
  | "not-recorded"
  | "unreadable";

export type UsageDataSwitchOnDependencies = {
  readonly lighthouse: Pick<
    LighthouseClient,
    "getUsageDataState" | "grantUsageData" | "revokeUsageData"
  >;
  readonly store: LighthouseUsageDataStore;
  readonly source: ClientUsageDataSource;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly now: () => Date;
};

// A Lighthouse without the usage data routes answers 404, which the client reports as misconfigured.
const refusalOf = (
  state: LighthouseApiResult<UsageDataState>,
  source: ClientUsageDataSource,
): UsageDataSwitchOn | null => {
  if (!state.ok) {
    return state.error.category === "misconfigured"
      ? "predates"
      : "could-not-ask";
  }
  if (state.value.administratorDisabled) {
    return "administrator-stopped";
  }
  return state.value.acceptedSources?.includes(source) === true
    ? null
    : "predates";
};

/**
 * Turns usage data on for one Lighthouse without a question: a yes replaces whatever was kept. Nothing is
 * asked of Lighthouse under DO_NOT_TRACK, and nothing is kept when Lighthouse refuses, predates labelled
 * sources or cannot be asked; a yes already kept is left as it is, so no second grant is minted.
 */
export const switchUsageDataOn = async (
  dependencies: UsageDataSwitchOnDependencies,
): Promise<UsageDataSwitchOn> => {
  if (isDoNotTrackSet(dependencies.env)) {
    return "do-not-track";
  }
  const stored = await dependencies.store.read();
  if (stored === "unreadable") {
    return "unreadable";
  }
  const state = await dependencies.lighthouse.getUsageDataState({
    signal: AbortSignal.timeout(USAGE_DATA_BUDGET_MS),
  });
  const refusal = refusalOf(state, dependencies.source);
  if (refusal !== null) {
    return refusal;
  }
  if (stored?.answer === "yes") {
    return "on";
  }
  const granted = await dependencies.lighthouse.grantUsageData({
    signal: AbortSignal.timeout(GRANT_BUDGET_MS),
  });
  if (!granted.ok) {
    return "not-recorded";
  }
  try {
    await dependencies.store.replace(yesGivenNow(dependencies, granted.value));
  } catch (error: unknown) {
    await toldLighthouse(dependencies.lighthouse, granted.value);
    throw error;
  }
  return "on";
};

/**
 * Settles what a command did about usage data: asks when it should, records the answer, or sends the
 * command's events. It never prints and never throws; anything that goes wrong ends it quietly.
 */
export const settleUsageDataStep = async (
  dependencies: UsageDataReporterDependencies,
  step: UsageDataStep,
): Promise<UsageDataOutcome> => {
  try {
    return await settle(dependencies, step);
  } catch {
    return "nothing";
  }
};
