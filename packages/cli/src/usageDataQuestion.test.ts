import { readFile, stat, writeFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  aBatchOf,
  aFakeLighthouse,
  type FakeLighthouse,
  type UsageDataSide,
} from "../../../test-support/fakeLighthouse";
import {
  A_FULL_TERMINAL,
  aMachine,
  aNo,
  anEarlierAnswer,
  aYesGiven,
  connectedTo,
  DAYS,
  HOURS,
  lhOn,
  type Machine,
  NO_TERMINAL,
  showsTogether,
  type TerminalShape,
  THURSDAY_MORNING,
  theStoredAnswerFor,
  usageDataFileOf,
  voterKeysFileOf,
  whereShown,
} from "../test-support/lhSession";

// Story 6193, slice 02 (US-02). The first time Lena Fischer uses lh against a Lighthouse in a terminal, it
// asks once, after the command's answer, in the maintainer's approved words, defaulting to No. A yes grants
// and is kept for that Lighthouse beside the voter keys; a No is kept and never posted; Ctrl-C is no
// answer. From then on her forecasts are reported as TeamManualForecastRun from the command line.
// Driving port: `runCliSession` (lh as one run of the process); only Lighthouse, the terminal and the clock
// are outside it. Every scenario is pending until DELIVER slice 02.

const THE_QUESTION = [
  "May Lighthouse send usage data?",
  "lh tells your Lighthouse which commands you use (never names, ids,",
  "URLs or anything you typed), so we can see what helps.",
  "Details: https://docs.lighthouse.letpeople.work/settings/usagedata.html",
  "Send usage data from lh? [y/N]",
];

const CHANGE_ANY_TIME = "(change any time: lh config usage-data on|off)";

const LENAS_FORECAST = [
  "forecast",
  "manual",
  "--team-id",
  "3",
  "--remaining",
  "25",
];

const A_FORECAST_RUN = aBatchOf("Cli", { name: "TeamManualForecastRun" });

const lenaAt = async (lighthouse: FakeLighthouse): Promise<Machine> =>
  connectedTo(aMachine(), lighthouse.url);

/** Lena's first forecast against this Lighthouse, answered with `typed`. */
const lenaAnswers = async (
  lighthouse: FakeLighthouse,
  typed: string | null,
  machine?: Machine,
) => {
  const lena = machine ?? (await lenaAt(lighthouse));
  const run = await lhOn(lena, { typing: [typed] }).run(LENAS_FORECAST);
  return { lena, run };
};

const batchesHandedIn = (lighthouse: FakeLighthouse) =>
  lighthouse.handedIn().map(({ token, batch }) => ({ token, batch }));

describe("lh asks once, after the answer, in the approved words", () => {
  // @US-02 @driving_port @real-io @kpi @contract-shape:bounded-change
  // The thinnest end-to-end client path: question, grant, kept answer. KPI-5: at most one question.
  it.skip("asks Lena once, after her forecast, and keeps her yes for that Lighthouse", async () => {
    const lighthouse = await aFakeLighthouse();

    const { lena, run } = await lenaAnswers(lighthouse, "y");

    expect(run.exitCode).toBe(0);
    expect(run.questions).toHaveLength(1);
    expect(showsTogether(run.shownLines, THE_QUESTION)).toBe(true);
    const firstForecastLine = run.stdout.split("\n")[0] ?? "";
    expect(firstForecastLine.length).toBeGreaterThan(0);
    expect(whereShown(run.shownLines, firstForecastLine)).toBeLessThan(
      whereShown(run.shownLines, THE_QUESTION[0] ?? ""),
    );
    expect(whereShown(run.shownLines, CHANGE_ANY_TIME)).toBeGreaterThan(
      whereShown(run.shownLines, THE_QUESTION[4] ?? ""),
    );
    expect(run.stdout).not.toContain(THE_QUESTION[0]);
    expect(run.stdout).not.toContain(CHANGE_ANY_TIME);
    expect(lighthouse.decisionsPosted()).toEqual(["granted"]);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toEqual({
      answer: "yes",
      token: lighthouse.mintedTokens()[0],
      confirmedAt: THURSDAY_MORNING.toISOString(),
    });
    // The command that prompted is not reported: nothing done before a yes is sent.
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-02 @driving_port @real-io @kpi @contract-shape:bounded-change
  it.skip("reports Lena's next forecast as TeamManualForecastRun from the command line, and never asks her again there", async () => {
    const lighthouse = await aFakeLighthouse();
    const { lena } = await lenaAnswers(lighthouse, "y");

    const next = await lhOn(lena).run(LENAS_FORECAST);

    expect(next.exitCode).toBe(0);
    expect(next.questions).toEqual([]);
    expect(batchesHandedIn(lighthouse)).toEqual([
      { token: lighthouse.mintedTokens()[0], batch: A_FORECAST_RUN },
    ]);
  });

  // @US-02 @driving_port @real-io @boundary @contract-shape:pure-function
  it.skip.each(["y", "Y", "yes", "YES", "Yes", " y "])(
    "takes %j as a yes",
    async (typed) => {
      const lighthouse = await aFakeLighthouse();

      const { lena } = await lenaAnswers(lighthouse, typed);

      expect(lighthouse.decisionsPosted()).toEqual(["granted"]);
      expect((await theStoredAnswerFor(lena, lighthouse.url))?.answer).toBe(
        "yes",
      );
    },
  );

  // @US-02 @driving_port @real-io @boundary @error @kpi @contract-shape:bounded-change
  // Enter, or anything that is not a yes, is the default: No, final for that Lighthouse, and never posted.
  it.skip.each(["", "n", "no", "N", "nope", "sure", "yep", "ja"])(
    "takes %j as a final No that is kept and never posted",
    async (typed) => {
      const lighthouse = await aFakeLighthouse();

      const { lena, run } = await lenaAnswers(lighthouse, typed);
      const aWeekLater = await lhOn(lena, {
        now: new Date(THURSDAY_MORNING.getTime() + 7 * DAYS),
      }).run(["team", "list"]);

      expect(run.exitCode).toBe(0);
      expect(whereShown(run.shownLines, CHANGE_ANY_TIME)).toBeGreaterThan(-1);
      expect(await theStoredAnswerFor(lena, lighthouse.url)).toEqual({
        answer: "no",
        decidedAt: THURSDAY_MORNING.toISOString(),
      });
      expect(aWeekLater.questions).toEqual([]);
      expect(lighthouse.decisionsPosted()).toEqual([]);
      expect(lighthouse.handedIn()).toEqual([]);
    },
  );

  // @US-02 @driving_port @real-io @error @contract-shape:unbounded-preservation
  // Ctrl-C or end of input is no answer: nothing recorded, nothing sent, the exit code is the command's own.
  it.skip("leaves a question Tomás closed with Ctrl-C unanswered, and asks again on his next command", async () => {
    const lighthouse = await aFakeLighthouse();

    const { lena: tomas, run } = await lenaAnswers(lighthouse, null);
    const next = await lhOn(tomas, { typing: ["n"] }).run(LENAS_FORECAST);

    expect(run.exitCode).toBe(0);
    expect(lighthouse.decisionsPosted()).toEqual([]);
    expect(next.questions).toHaveLength(1);
    expect(lighthouse.handedIn()).toEqual([]);
  });

  // @US-02 @driving_port @real-io @contract-shape:unbounded-preservation
  // stdout is the command's answer and nothing else, so a terminal recording or a pipe after the fact holds
  // exactly what a script would get.
  it.skip("prints on stdout exactly what the same forecast prints when nobody is asked", async () => {
    const lighthouse = await aFakeLighthouse();
    const scripted = await lhOn(await lenaAt(lighthouse), {
      terminal: NO_TERMINAL,
    }).run(LENAS_FORECAST);

    const { run: asked } = await lenaAnswers(lighthouse, "y");

    expect(asked.questions).toHaveLength(1);
    expect(asked.stdout).toBe(scripted.stdout);
    expect(asked.exitCode).toBe(scripted.exitCode);
  });

  // @US-02 @driving_port @real-io @security @contract-shape:unbounded-preservation
  it.skip("never shows the consent token, in the run that granted it or in the next", async () => {
    const lighthouse = await aFakeLighthouse();
    const { lena, run } = await lenaAnswers(lighthouse, "yes");

    const next = await lhOn(lena).run(LENAS_FORECAST);

    const token = lighthouse.mintedTokens()[0] ?? "no token was minted";
    expect(lighthouse.mintedTokens()).toHaveLength(1);
    for (const shown of [run.stdout, run.stderr, next.stdout, next.stderr]) {
      expect(shown).not.toContain(token);
    }
  });
});

describe("lh asks only where a person can answer, and only where it may", () => {
  // @US-02 @driving_port @real-io @error @kpi @contract-shape:unbounded-preservation
  // KPI-5: no question without a full terminal. A script with no stored yes pays nothing: not one usage
  // data request.
  it.skip.each<[string, TerminalShape, Readonly<Record<string, string>>]>([
    ["no terminal at all", NO_TERMINAL, {}],
    [
      "stdin a terminal and nothing else (docker run -i)",
      { stdinIsTTY: true, stdoutIsTTY: false, stderrIsTTY: false },
      {},
    ],
    ["stdout piped", { ...A_FULL_TERMINAL, stdoutIsTTY: false }, {}],
    ["stderr redirected", { ...A_FULL_TERMINAL, stderrIsTTY: false }, {}],
    ["stdin piped", { ...A_FULL_TERMINAL, stdinIsTTY: false }, {}],
    ["a full terminal under CI=true", A_FULL_TERMINAL, { CI: "true" }],
    ["a full terminal under CI=1", A_FULL_TERMINAL, { CI: "1" }],
  ])(
    "asks nothing and makes no usage data request with %s",
    async (_shape, terminal, env) => {
      const lighthouse = await aFakeLighthouse();
      const sofiasAgent = await lenaAt(lighthouse);

      const run = await lhOn(sofiasAgent, { terminal, env }).run([
        "team",
        "refresh",
        "--id",
        "3",
      ]);

      expect(run.exitCode).toBe(0);
      expect(run.questions).toEqual([]);
      expect(lighthouse.usageDataRequests()).toEqual([]);
      expect(await theStoredAnswerFor(sofiasAgent, lighthouse.url)).toBe(
        undefined,
      );
    },
  );

  // @US-02 @driving_port @real-io @error @kpi @contract-shape:unbounded-preservation
  // DO_NOT_TRACK is honoured when set to anything but 0 or false, and is read before anything else.
  it.skip.each(["1", "true", "TRUE", "yes"])(
    "asks nothing and makes no usage data request under DO_NOT_TRACK=%s",
    async (doNotTrack) => {
      const lighthouse = await aFakeLighthouse();

      const run = await lhOn(await lenaAt(lighthouse), {
        typing: ["y"],
        env: { DO_NOT_TRACK: doNotTrack },
      }).run(LENAS_FORECAST);

      expect(run.questions).toEqual([]);
      expect(lighthouse.usageDataRequests()).toEqual([]);
    },
  );

  // @US-02 @driving_port @real-io @boundary @contract-shape:pure-function
  it.skip.each(["0", "false", "FALSE", ""])(
    "asks as usual when DO_NOT_TRACK=%j, which is not a request to stop",
    async (doNotTrack) => {
      const lighthouse = await aFakeLighthouse();

      const run = await lhOn(await lenaAt(lighthouse), {
        typing: ["n"],
        env: { DO_NOT_TRACK: doNotTrack },
      }).run(LENAS_FORECAST);

      expect(run.questions).toHaveLength(1);
    },
  );

  // @US-02 @driving_port @real-io @error @version-skew @kpi @contract-shape:unbounded-preservation
  // KPI-4: a client never sends to a Lighthouse that would count it as a browser. Nothing is printed either.
  it.skip.each<[string, UsageDataSide]>([
    [
      "has stopped usage data (its administrator's switch)",
      { administratorDisabled: true },
    ],
    ["was installed less than three days ago", { mayAsk: false }],
    ["predates labelled sources", { acceptedSources: null }],
    ["labels no command line source", { acceptedSources: ["Browser", "Mcp"] }],
    ["has no usage data at all", { answers: "not-at-all" }],
    ["fails when asked about usage data", { answers: "by-failing" }],
  ])(
    "asks nothing, sends nothing and prints nothing extra when the Lighthouse %s",
    async (_why, side) => {
      const lighthouse = await aFakeLighthouse({ usageData: side });
      const lena = await lenaAt(lighthouse);
      const scripted = await lhOn(lena, { terminal: NO_TERMINAL }).run(
        LENAS_FORECAST,
      );

      const run = await lhOn(lena, { typing: ["y"] }).run(LENAS_FORECAST);

      expect(run.questions).toEqual([]);
      expect(run.stderr).toBe(scripted.stderr);
      expect(lighthouse.decisionsPosted()).toEqual([]);
      expect(lighthouse.handedIn()).toEqual([]);
      expect(await theStoredAnswerFor(lena, lighthouse.url)).toBe(undefined);
    },
  );

  // @US-02 @driving_port @real-io @infrastructure-failure @kpi @contract-shape:unbounded-preservation
  // KPI-7: a Lighthouse that takes the connection and never answers about usage data costs at most a second;
  // the question waits for a day it can be asked properly.
  it.skip("asks nothing this time when the Lighthouse never answers about usage data, and asks the next time", async () => {
    const lighthouse = await aFakeLighthouse({
      usageData: { answers: "never" },
    });
    const lena = await lenaAt(lighthouse);

    const slow = await lhOn(lena, { typing: ["y"] }).run(LENAS_FORECAST);
    lighthouse.changeUsageData({ answers: "normally" });
    const later = await lhOn(lena, { typing: ["n"] }).run(LENAS_FORECAST);

    expect(slow.exitCode).toBe(0);
    expect(slow.questions).toEqual([]);
    expect(slow.tookMs).toBeLessThan(2500);
    expect(later.questions).toHaveLength(1);
  });

  // @US-02 @driving_port @real-io @boundary @contract-shape:unbounded-preservation
  // lh asks after a command that reached Lighthouse and succeeded; never inside help, config or connection.
  it.skip.each<[string, readonly string[]]>([
    ["help", ["help"]],
    ["the output format setting", ["config", "output", "get"]],
    ["the config group", ["config"]],
    ["the connection status", ["connection", "status"]],
    ["a refused command", ["team", "delete", "--id", "99"]],
  ])("asks nothing after %s", async (_what, args) => {
    const lighthouse = await aFakeLighthouse();

    const run = await lhOn(await lenaAt(lighthouse), {
      typing: ["y"],
    }).run(args);

    expect(run.questions).toEqual([]);
    expect(lighthouse.decisionsPosted()).toEqual([]);
  });

  // @US-02 @driving_port @real-io @contract-shape:bounded-change
  it.skip("asks again for a second Lighthouse, and leaves the first one's answer as it was", async () => {
    const northwind = await aFakeLighthouse();
    const devInstance = await aFakeLighthouse();
    const { lena } = await lenaAnswers(northwind, "y");
    const northwindsAnswer = await theStoredAnswerFor(lena, northwind.url);

    await connectedTo(lena, devInstance.url);
    const run = await lhOn(lena, { typing: ["n"] }).run(LENAS_FORECAST);

    expect(run.questions).toHaveLength(1);
    expect(await theStoredAnswerFor(lena, devInstance.url)).toMatchObject({
      answer: "no",
    });
    expect(await theStoredAnswerFor(lena, northwind.url)).toEqual(
      northwindsAnswer,
    );
  });
});

describe("a yes Lighthouse could not record", () => {
  // @US-02 @driving_port @real-io @error @infrastructure-failure @contract-shape:unbounded-preservation
  it.skip("tells Lena her answer was not recorded, keeps nothing, and leaves the forecast's exit code alone", async () => {
    const lighthouse = await aFakeLighthouse({
      usageData: { consentAnswers: "by-failing" },
    });

    const { lena, run } = await lenaAnswers(lighthouse, "y");

    expect(run.exitCode).toBe(0);
    expect(run.questions).toHaveLength(1);
    expect(run.shownLines).toContain(
      `Could not record your answer at ${lighthouse.url}; nothing is sent. Try lh config usage-data on.`,
    );
    expect(run.stdout).not.toContain("Could not record your answer");
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toBe(undefined);
    expect(lighthouse.handedIn()).toEqual([]);
  });
});

describe("two answers at once: the first one given is the one kept", () => {
  // @US-02 @driving_port @real-io @boundary @contract-shape:bounded-change
  it.skip("keeps the yes Lena gave in one terminal over the no she gave a moment later in another", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaAt(lighthouse);
    let releaseTheSecond: () => void = () => undefined;
    const secondAnswersLater = new Promise<void>((resolve) => {
      releaseTheSecond = resolve;
    });

    const second = lhOn(lena, {
      typing: ["n"],
      answerOnlyAfter: secondAnswersLater,
    }).run(LENAS_FORECAST);
    const first = await lhOn(lena, { typing: ["y"] }).run(LENAS_FORECAST);
    releaseTheSecond();
    const secondRun = await second;

    expect(first.questions).toHaveLength(1);
    expect(secondRun.questions).toHaveLength(1);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toMatchObject({
      answer: "yes",
      token: lighthouse.mintedTokens()[0],
    });
  });
});

describe("the answers file", () => {
  // @US-02 @driving_port @real-io @adapter-integration @security @contract-shape:bounded-change
  // POSIX permissions: un-skip as it.skipIf(process.platform === "win32"), as the voter key test does.
  it.skip("is readable by its owner only, beside the command line's config, and leaves the voter keys alone", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaAt(lighthouse);
    const voterKeys = '{"version":1,"keys":{"standalone":"anas-key"}}';
    await writeFile(voterKeysFileOf(lena), voterKeys, "utf8");

    await lenaAnswers(lighthouse, "y", lena);

    expect((await stat(usageDataFileOf(lena))).mode & 0o777).toBe(0o600);
    expect(await readFile(voterKeysFileOf(lena), "utf8")).toBe(voterKeys);
  });

  // @US-02 @driving_port @real-io @error @contract-shape:unbounded-preservation
  // A file lh cannot read may hold a person's answers; it is never written over, and nobody is asked.
  it.skip.each([
    "not json",
    '{"version":2,"answers":{}}',
    '{"version":1,"answers":["a list"]}',
  ])(
    "asks nothing, sends nothing and leaves an answers file it cannot read (%s) as it was",
    async (content) => {
      const lighthouse = await aFakeLighthouse();
      const lena = await lenaAt(lighthouse);
      await writeFile(usageDataFileOf(lena), content, "utf8");

      const run = await lhOn(lena, { typing: ["y"] }).run(LENAS_FORECAST);

      expect(run.exitCode).toBe(0);
      expect(run.questions).toEqual([]);
      expect(lighthouse.usageDataRequests()).toEqual([]);
      expect(await readFile(usageDataFileOf(lena), "utf8")).toBe(content);
    },
  );
});

describe("a yes outlives a long gap without a new question", () => {
  // @US-02 @driving_port @real-io @contract-shape:bounded-change
  // A grant confirmed within the day is used as it is: no state read, the event goes.
  it.skip("sends with a yes confirmed 23 hours ago without asking Lighthouse anything first", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await lenaAt(lighthouse);
    await anEarlierAnswer(
      lena,
      lighthouse.url,
      aYesGiven("an-earlier-token", 23 * HOURS),
    );

    await lhOn(lena, { terminal: NO_TERMINAL }).run(LENAS_FORECAST);

    expect(lighthouse.stateReads()).toEqual([]);
    expect(batchesHandedIn(lighthouse)).toEqual([
      { token: "an-earlier-token", batch: A_FORECAST_RUN },
    ]);
  });

  // @US-02 @driving_port @real-io @contract-shape:bounded-change
  it.skip("checks a day-old yes with Lighthouse, then sends and notes it as confirmed now", async () => {
    const lighthouse = await aFakeLighthouse();
    const { lena } = await lenaAnswers(lighthouse, "y");
    const token = lighthouse.mintedTokens()[0];
    const aDayLater = new Date(THURSDAY_MORNING.getTime() + 25 * HOURS);

    await lhOn(lena, { terminal: NO_TERMINAL, now: aDayLater }).run(
      LENAS_FORECAST,
    );

    expect(lighthouse.stateReads()).toContain(token);
    expect(batchesHandedIn(lighthouse)).toEqual([
      { token, batch: A_FORECAST_RUN },
    ]);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toEqual({
      answer: "yes",
      token,
      confirmedAt: aDayLater.toISOString(),
    });
  });

  // @US-02 @driving_port @real-io @kpi @contract-shape:bounded-change
  // Six weeks away is not a change of mind: the lapsed grant is renewed without a question.
  it.skip("renews the grant Lighthouse let lapse after 31 days away, without asking Lena again", async () => {
    const lighthouse = await aFakeLighthouse();
    const { lena } = await lenaAnswers(lighthouse, "y");
    lighthouse.changeUsageData({ forgetsGrants: true });
    const sixWeeksLater = new Date(THURSDAY_MORNING.getTime() + 31 * DAYS);

    const run = await lhOn(lena, { now: sixWeeksLater }).run(LENAS_FORECAST);

    const [first, renewed] = lighthouse.mintedTokens();
    expect(run.questions).toEqual([]);
    expect(lighthouse.decisionsPosted()).toEqual(["granted", "granted"]);
    expect(renewed).not.toBe(first);
    expect(batchesHandedIn(lighthouse)).toEqual([
      { token: renewed, batch: A_FORECAST_RUN },
    ]);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toEqual({
      answer: "yes",
      token: renewed,
      confirmedAt: sixWeeksLater.toISOString(),
    });
  });

  // @US-02 @driving_port @real-io @version-skew @kpi @contract-shape:unbounded-preservation
  // KPI-4 after a rollback: once the day-old check finds a Lighthouse that no longer labels sources, nothing
  // more is sent, and the yes is kept for when it does again.
  it.skip("sends nothing once a day-old check finds the Lighthouse rolled back to one that cannot label lh", async () => {
    const lighthouse = await aFakeLighthouse();
    const { lena } = await lenaAnswers(lighthouse, "y");
    const kept = await theStoredAnswerFor(lena, lighthouse.url);
    lighthouse.changeUsageData({ acceptedSources: null });
    const aDayLater = new Date(THURSDAY_MORNING.getTime() + 25 * HOURS);

    await lhOn(lena, { terminal: NO_TERMINAL, now: aDayLater }).run(
      LENAS_FORECAST,
    );

    expect(lighthouse.handedIn()).toEqual([]);
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toEqual(kept);
  });

  // @US-02 @driving_port @real-io @error @kpi @contract-shape:unbounded-preservation
  // KPI-5: 0 sends after a No.
  it.skip("sends nothing for Marco, whose No is on file, whatever he runs", async () => {
    const lighthouse = await aFakeLighthouse();
    const marco = await lenaAt(lighthouse);
    await anEarlierAnswer(marco, lighthouse.url, aNo());

    const run = await lhOn(marco).run(LENAS_FORECAST);

    expect(run.questions).toEqual([]);
    expect(lighthouse.usageDataRequests()).toEqual([]);
  });
});

describe("usage data never changes what lh answers", () => {
  // @US-02 @driving_port @real-io @infrastructure-failure @kpi @contract-shape:unbounded-preservation
  // KPI-7: with a yes and a Lighthouse that never takes the events, the answer, its format and its exit code
  // are what usage data off gives, and the run ends within a second of it.
  it.skip.each(["--json", "--toon", "--pretty"])(
    "prints the forecast %s exactly as with usage data off, and waits at most a second for a Lighthouse that never takes the event",
    async (format) => {
      const lighthouse = await aFakeLighthouse();
      const lena = await lenaAt(lighthouse);
      const off = await lhOn(lena, {
        terminal: NO_TERMINAL,
        env: { DO_NOT_TRACK: "1" },
      }).run([...LENAS_FORECAST, format]);
      await anEarlierAnswer(
        lena,
        lighthouse.url,
        aYesGiven("lenas-token", 1 * HOURS),
      );
      lighthouse.changeUsageData({ answers: "never" });

      const on = await lhOn(lena, { terminal: NO_TERMINAL }).run([
        ...LENAS_FORECAST,
        format,
      ]);

      expect(on.stdout).toBe(off.stdout);
      expect(on.stderr).toBe(off.stderr);
      expect(on.exitCode).toBe(off.exitCode);
      expect(on.tookMs - off.tookMs).toBeLessThan(1500);
      expect(lighthouse.usageDataRequests().length).toBeGreaterThan(0);
    },
  );
});
