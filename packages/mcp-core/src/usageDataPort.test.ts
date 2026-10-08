import type {
  UsageDataOccurrence,
  UsageDataQuestionAnswer,
  UsageDataStep,
} from "@letpeoplework/lighthouse-client";
import { describe, expect, it } from "vitest";
import {
  askingOnceInThisProcess,
  askThroughTheAssistant,
  countedToolResult,
  type SendElicitation,
  USAGE_DATA_ELICITATION_MESSAGE,
  USAGE_DATA_QUESTION_TIMEOUT_MS,
  usageDataOccurrencesOf,
  usageDataOccurrencesOfARead,
  usageDataOccurrencesOfAVote,
} from "./usageDataPort";

const never = <T>() => new Promise<T>(() => undefined);

/** A port whose settle asks whenever it is handed an ask, as the reporter does for an undecided Lighthouse. */
const aPort = (options: { readonly mightAsk?: boolean } = {}) => {
  const settled: UsageDataStep[] = [];
  const answers: UsageDataQuestionAnswer[] = [];
  const port = askingOnceInThisProcess({
    mightAsk: async () => options.mightAsk ?? true,
    settle: async (step) => {
      settled.push(step);
      if (step.ask !== undefined) {
        answers.push(await step.ask());
      }
    },
  });
  return { port, settled, answers };
};

const aStep = (
  ask?: () => Promise<UsageDataQuestionAnswer>,
): UsageDataStep => ({
  reached: true,
  occurrences: [{ name: "TeamRefreshTriggered" }],
  ...(ask === undefined ? {} : { ask }),
});

const countingAsk = (answer: UsageDataQuestionAnswer) => {
  const asked = { times: 0 };
  return {
    asked,
    ask: async () => {
      asked.times += 1;
      return answer;
    },
  };
};

describe("the usage data port asks at most once in a process", () => {
  it("puts the question to the first call that might ask, and to no later call", async () => {
    const { port, settled, answers } = aPort();
    const { asked, ask } = countingAsk("yes");

    await port(aStep(ask));
    await port(aStep(ask));

    expect(asked.times).toBe(1);
    expect(answers).toEqual(["yes"]);
    expect(settled.map((step) => step.ask === undefined)).toEqual([
      false,
      true,
    ]);
  });

  it("asks once for calls that arrive together, and the others get no answer at once", async () => {
    const { port, answers } = aPort();
    const { asked, ask } = countingAsk("yes");

    await Promise.all([port(aStep(ask)), port(aStep(ask)), port(aStep(ask))]);

    expect(asked.times).toBe(1);
    expect(answers.filter((answer) => answer === "yes")).toHaveLength(1);
    expect(answers.filter((answer) => answer === null)).toHaveLength(2);
  });

  it("counts a question that got no answer as asked", async () => {
    const { port } = aPort();
    const closed = countingAsk(null);

    await port(aStep(closed.ask));
    await port(aStep(closed.ask));

    expect(closed.asked.times).toBe(1);
  });

  it.each<[string, { readonly mightAsk?: boolean }, boolean]>([
    ["the assistant cannot ask", {}, false],
    ["an answer is already kept", { mightAsk: false }, true],
  ])(
    "returns without waiting for its step when %s",
    async (_why, options, withAsk) => {
      const settled: UsageDataStep[] = [];
      const port = askingOnceInThisProcess({
        mightAsk: async () => options.mightAsk ?? true,
        settle: (step) => {
          settled.push(step);
          return never();
        },
      });

      await port(aStep(withAsk ? countingAsk("yes").ask : undefined));

      expect(settled).toEqual([aStep()]);
    },
  );

  it("never fails the call when settling or deciding goes wrong", async () => {
    const failing = askingOnceInThisProcess({
      mightAsk: async () => {
        throw new Error("unreadable");
      },
      settle: async () => {
        throw new Error("broken");
      },
    });
    const throwing = askingOnceInThisProcess({
      mightAsk: async () => true,
      settle: async () => {
        throw new Error("broken");
      },
    });

    await expect(failing(aStep(countingAsk("yes").ask))).resolves.toBe(
      undefined,
    );
    await expect(throwing(aStep(countingAsk("yes").ask))).resolves.toBe(
      undefined,
    );
  });
});

describe("a Lighthouse that will not let the question be put", () => {
  const aMoment = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  /** A port whose settle reads the state before a question, as the reporter does, and is never allowed to ask. */
  const aPortNeverAllowedToAsk = (readMs: number) => {
    let clock = new Date("2026-10-08T09:00:00Z");
    const stateReads = { count: 0 };
    const port = askingOnceInThisProcess({
      mightAsk: async () => true,
      settle: async (step) => {
        if (step.ask !== undefined) {
          stateReads.count += 1;
          await aMoment(readMs);
        }
      },
      now: () => clock,
    });
    const minutesPass = (minutes: number) => {
      clock = new Date(clock.getTime() + minutes * 60_000);
    };
    return { port, stateReads, minutesPass };
  };

  it.each<[string, number]>([
    ["refuses it", 20],
    ["takes the whole usage data budget to answer", 1_000],
  ])(
    "lets the next call return at once, without reading the state again, when Lighthouse %s",
    async (_why, readMs) => {
      const { port, stateReads } = aPortNeverAllowedToAsk(readMs);
      await port(aStep(countingAsk("yes").ask));
      const started = performance.now();

      await port(aStep(countingAsk("yes").ask));

      expect(performance.now() - started).toBeLessThan(100);
      expect(stateReads.count).toBe(1);
    },
  );

  it.each<[string, number, number]>([
    ["a minute short of an hour", 59, 1],
    ["a full hour", 60, 2],
  ])(
    "reads the state again only once %s has passed",
    async (_after, minutesLater, readsExpected) => {
      const { port, stateReads, minutesPass } = aPortNeverAllowedToAsk(20);
      await port(aStep(countingAsk("yes").ask));
      minutesPass(minutesLater);

      await port(aStep(countingAsk("yes").ask));

      expect(stateReads.count).toBe(readsExpected);
    },
  );

  it("is not judged on a call that did not reach Lighthouse", async () => {
    const port = askingOnceInThisProcess({
      mightAsk: async () => true,
      settle: async (step) => {
        if (step.reached && step.ask !== undefined) {
          await step.ask();
        }
      },
    });
    const { asked, ask } = countingAsk("yes");

    await port({ ...aStep(ask), reached: false });
    await port(aStep(ask));

    expect(asked.times).toBe(1);
  });
});

describe("the question through the assistant", () => {
  it.each([
    ["accept", "yes"],
    ["decline", "no"],
    ["cancel", null],
  ] as const)("reads %s as %s", async (action, answer) => {
    const sent: Parameters<SendElicitation>[] = [];
    const ask = askThroughTheAssistant(async (...request) => {
      sent.push(request);
      return { action };
    });

    expect(await ask()).toBe(answer);
    expect(sent).toEqual([
      [
        {
          message: USAGE_DATA_ELICITATION_MESSAGE,
          requestedSchema: { type: "object", properties: {} },
        },
        { timeout: USAGE_DATA_QUESTION_TIMEOUT_MS },
      ],
    ]);
  });

  it("reads an error or a timed-out question as no answer", async () => {
    const ask = askThroughTheAssistant(async () => {
      throw new Error("Request timed out");
    });

    expect(await ask()).toBeNull();
  });

  it("gives up before an assistant's default 60 second tool timeout", () => {
    expect(USAGE_DATA_QUESTION_TIMEOUT_MS).toBe(50_000);
  });
});

describe("what a tool reports", () => {
  it.each([
    ["lighthouse_forecast_manual", [{ name: "TeamManualForecastRun" }]],
    ["lighthouse_team_refresh", [{ name: "TeamRefreshTriggered" }]],
    ["lighthouse_portfolio_refresh", [{ name: "PortfolioRefreshTriggered" }]],
    ["lighthouse_team_list", []],
    ["lighthouse_forecast_backtest", []],
  ])("%s reports %j", (tool, occurrences) => {
    expect(usageDataOccurrencesOf(tool)).toEqual(occurrences);
  });

  const refused = {
    ok: false,
    error: { category: "unexpected", reason: "500", statusCode: 500 },
  } as const;
  const aRefinementDay = {
    nextRefinementDate: "2026-10-08",
    isRefinementDay: true,
  };

  it.each<[string, () => readonly UsageDataOccurrence[], boolean]>([
    [
      "a vote that made the Work Item Ready",
      () =>
        usageDataOccurrencesOfAVote(aRefinementDay, {
          ok: true,
          value: { madeReady: true },
        }),
      true,
    ],
    [
      "a vote Lighthouse refused",
      () => usageDataOccurrencesOfAVote(aRefinementDay, refused),
      false,
    ],
    [
      "a Refinement day's verdict",
      () =>
        usageDataOccurrencesOfARead({
          ok: true,
          value: {
            isRefinementDay: true,
            workItems: [{}],
            need: { verdict: "In" },
          } as never,
        }),
      true,
    ],
    [
      "a Refinement Lighthouse refused",
      () => usageDataOccurrencesOfARead(refused),
      false,
    ],
    [
      "a counted result that is an error",
      () =>
        countedToolResult({ isError: true, content: [] }, [
          { name: "TeamRefreshTriggered" },
        ]).occurrences,
      false,
    ],
    [
      "a counted result that succeeded",
      () =>
        countedToolResult({ isError: false, content: [] }, [
          { name: "TeamRefreshTriggered" },
        ]).occurrences,
      true,
    ],
  ])(
    "counts something for %s only when Lighthouse answered it",
    (_what, occurrencesOf, countsSomething) => {
      expect(occurrencesOf().length > 0).toBe(countsSomething);
    },
  );
});
