import type {
  PlainUsageDataEventName,
  UsageDataOccurrence,
  UsageDataQuestionAnswer,
  UsageDataStep,
} from "@letpeoplework/lighthouse-client";
import type {
  ElicitRequestFormParams,
  ElicitResult,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Where a tool call's usage data goes once its result is in hand. The promise resolves when the result may
 * be returned: after the question, when this call puts it, and never after a send.
 */
export type McpUsageDataPort = (step: UsageDataStep) => Promise<void>;

export const USAGE_DATA_ELICITATION_MESSAGE = [
  "May Lighthouse send usage data?",
  "The Lighthouse MCP server tells your Lighthouse which tools you use (never names, ids, URLs or anything you typed), so we can see what helps.",
  "Details: https://docs.lighthouse.letpeople.work/settings/usagedata.html",
  "(change any time: lh config usage-data on|off)",
].join("\n");

// An assistant times a tool call out after 60 seconds by default; giving up on the question earlier keeps
// the tool's own answer from being lost to it.
export const USAGE_DATA_QUESTION_TIMEOUT_MS = 50_000;

/** Sends one elicitation to the assistant, as part of the tool call being answered. */
export type SendElicitation = (
  params: ElicitRequestFormParams,
  options: { readonly timeout: number },
) => Promise<Pick<ElicitResult, "action">>;

const ANSWERS: Readonly<
  Record<ElicitResult["action"], UsageDataQuestionAnswer>
> = { accept: "yes", decline: "no", cancel: null };

/**
 * Puts the usage data question through the assistant. Accepting is a yes and declining a No; a cancel, a
 * closed question, an error or no answer in time is no answer at all.
 */
export const askThroughTheAssistant =
  (send: SendElicitation) => async (): Promise<UsageDataQuestionAnswer> => {
    try {
      const { action } = await send(
        {
          message: USAGE_DATA_ELICITATION_MESSAGE,
          requestedSchema: { type: "object", properties: {} },
        },
        { timeout: USAGE_DATA_QUESTION_TIMEOUT_MS },
      );
      return ANSWERS[action] ?? null;
    } catch {
      return null;
    }
  };

export type AskingOnceDependencies = {
  /** Whether a question could still be due: nothing kept for this Lighthouse and nothing forbids asking. */
  readonly mightAsk: () => Promise<boolean>;
  /** Settles one call's usage data; never expected to throw. */
  readonly settle: (step: UsageDataStep) => Promise<unknown>;
};

/**
 * A port that puts the question at most once in this process. Only a call that might ask waits for its
 * step; every other call, and every call once the question has been put, hands its step over and returns.
 * Calls that reach the question while it is being put get no answer at once rather than a second question.
 */
export const askingOnceInThisProcess = (
  dependencies: AskingOnceDependencies,
): McpUsageDataPort => {
  let asked = false;
  const once =
    (ask: NonNullable<UsageDataStep["ask"]>) =>
    async (): Promise<UsageDataQuestionAnswer> => {
      if (asked) {
        return null;
      }
      asked = true;
      return ask();
    };
  const settleQuietly = async (step: UsageDataStep): Promise<void> => {
    try {
      await dependencies.settle(step);
    } catch {
      // Usage data never fails a tool call.
    }
  };
  const mightAskQuietly = async (): Promise<boolean> => {
    try {
      return await dependencies.mightAsk();
    } catch {
      return false;
    }
  };
  return async (step) => {
    const { ask, ...withoutAsk } = step;
    if (ask === undefined || asked || !(await mightAskQuietly())) {
      void settleQuietly(withoutAsk);
      return;
    }
    await settleQuietly({ ...withoutAsk, ask: once(ask) });
  };
};

const TOOL_EVENTS: Readonly<Partial<Record<string, PlainUsageDataEventName>>> =
  {
    lighthouse_forecast_manual: "TeamManualForecastRun",
    lighthouse_team_refresh: "TeamRefreshTriggered",
    lighthouse_portfolio_refresh: "PortfolioRefreshTriggered",
  };

/** What a tool call that succeeded did that the web counts too. */
export const usageDataOccurrencesOf = (
  toolName: string,
): readonly UsageDataOccurrence[] => {
  const name = TOOL_EVENTS[toolName];
  return name === undefined ? [] : [{ name }];
};
