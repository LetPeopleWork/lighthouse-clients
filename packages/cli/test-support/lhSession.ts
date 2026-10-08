// `lh` as a person runs it on their own machine: a home directory of its own, a connection saved in the
// command line's config file, a real Lighthouse on a socket (`aFakeLighthouse`), and a terminal whose
// streams and typed answers the scenario decides. Everything between is production: the config file, the
// HTTP client, the usage data store beside the voter keys.
//
// The environment is the run's own, never the test process's: CI sets `CI=true` and a developer may export
// `DO_NOT_TRACK=1`, and a scenario that read either would pass on one machine and fail on the other.

import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getVoterKeyScope } from "@letpeoplework/lighthouse-client";
import { aTempDirectory } from "../../../test-support/tempDirectories";
import { type CliTerminal, runCliSession } from "../src/cliSession";

/** Thursday 8 October 2026, 09:00 UTC: "now" for every run unless a scenario says otherwise. */
export const THURSDAY_MORNING = new Date("2026-10-08T09:00:00Z");

export const HOURS = 60 * 60 * 1000;
export const DAYS = 24 * HOURS;

export const DOCS_URL =
  "https://docs.lighthouse.letpeople.work/settings/usagedata.html";

/** One person's machine: a home directory and the command line's config file inside it. */
export type Machine = {
  readonly home: string;
  readonly configPath: string;
};

export const aMachine = (): Machine => {
  const home = aTempDirectory("lighthouse-usage-data-home-");
  return {
    home,
    configPath: join(home, ".config", "lighthouse-clients", "cli-config.json"),
  };
};

/** Saves the connection `lh connection connect` would have saved for this Lighthouse. */
export const connectedTo = async (
  machine: Machine,
  lighthouseUrl: string,
): Promise<Machine> => {
  await mkdir(dirname(machine.configPath), { recursive: true });
  await writeFile(
    machine.configPath,
    JSON.stringify({
      version: 2,
      connection: {
        mode: "server",
        endpointUrl: lighthouseUrl,
        authMode: "disabled",
      },
    }),
    { encoding: "utf8", mode: 0o600 },
  );
  return machine;
};

/** Where the usage data answers live: beside the voter keys, beside the command line's config. */
export const usageDataFileOf = (machine: Machine): string =>
  join(dirname(machine.configPath), "usage-data.json");

export const voterKeysFileOf = (machine: Machine): string =>
  join(dirname(machine.configPath), "voter-keys.json");

export type StoredAnswer =
  | {
      readonly answer: "yes";
      readonly token: string;
      readonly confirmedAt: string;
    }
  | { readonly answer: "no"; readonly decidedAt: string };

/** The answers on disk, by Lighthouse; null when the file does not exist. */
export const theStoredAnswers = async (
  machine: Machine,
): Promise<Readonly<Record<string, StoredAnswer>> | null> => {
  try {
    const persisted = JSON.parse(
      await readFile(usageDataFileOf(machine), "utf8"),
    ) as { readonly answers?: Readonly<Record<string, StoredAnswer>> };
    return persisted.answers ?? {};
  } catch {
    return null;
  }
};

/** The answer kept for one Lighthouse, or undefined when it was never asked there. */
export const theStoredAnswerFor = async (
  machine: Machine,
  lighthouseUrl: string,
): Promise<StoredAnswer | undefined> =>
  (await theStoredAnswers(machine))?.[getVoterKeyScope(lighthouseUrl)];

/** Writes the file an earlier answer left, in the format both `lh` and the local MCP server read. */
export const anEarlierAnswer = async (
  machine: Machine,
  lighthouseUrl: string,
  answer: StoredAnswer,
): Promise<void> => {
  const file = usageDataFileOf(machine);
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(
    file,
    JSON.stringify({
      version: 1,
      answers: { [getVoterKeyScope(lighthouseUrl)]: answer },
    }),
    { encoding: "utf8", mode: 0o600 },
  );
  await chmod(file, 0o600);
};

/** A yes given `ago` milliseconds before `now`, with the token Lighthouse minted for it. */
export const aYesGiven = (
  token: string,
  ago: number,
  now: Date = THURSDAY_MORNING,
): StoredAnswer => ({
  answer: "yes",
  token,
  confirmedAt: new Date(now.getTime() - ago).toISOString(),
});

export const aNo = (now: Date = THURSDAY_MORNING): StoredAnswer => ({
  answer: "no",
  decidedAt: now.toISOString(),
});

/** Which of the three streams are terminals. */
export type TerminalShape = {
  readonly stdinIsTTY: boolean;
  readonly stdoutIsTTY: boolean;
  readonly stderrIsTTY: boolean;
};

export const A_FULL_TERMINAL: TerminalShape = {
  stdinIsTTY: true,
  stdoutIsTTY: true,
  stderrIsTTY: true,
};

export const NO_TERMINAL: TerminalShape = {
  stdinIsTTY: false,
  stdoutIsTTY: false,
  stderrIsTTY: false,
};

/** What a person types at the question: a line, or null for Ctrl-C / end of input. */
export type Typed = string | null;

type Shown = {
  readonly stream: "stdout" | "stderr" | "question";
  readonly text: string;
};

export type Run = {
  readonly exitCode: number;
  /** What went to stdout, every message joined by a newline. */
  readonly stdout: string;
  /** What went to stderr, the questions included, in order. */
  readonly stderr: string;
  /** Every question put, as the terminal was handed it. */
  readonly questions: readonly string[];
  /** Everything the terminal showed, in order, one line per entry. */
  readonly shownLines: readonly string[];
  /** How long the run took, in milliseconds. */
  readonly tookMs: number;
};

export type SessionOptions = {
  readonly terminal?: TerminalShape;
  /** What the person types at each question, in order; a question beyond them is left unanswered (null). */
  readonly typing?: readonly Typed[];
  /** Holds every answer until the promise resolves: a question still open while something else happens. */
  readonly answerOnlyAfter?: Promise<void>;
  /** Variables the run sees besides HOME and LIGHTHOUSE_CLI_CONFIG_PATH. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly now?: Date;
};

const linesOf = (text: string): string[] =>
  text.split("\n").map((line) => line.trimEnd());

/** `lh` on this machine, through its production entry point, with the terminal and clock given. */
export const lhOn = (machine: Machine, options: SessionOptions = {}) => {
  const run = async (args: readonly string[]): Promise<Run> => {
    const shown: Shown[] = [];
    const typing = [...(options.typing ?? [])];
    const questions: string[] = [];
    const terminal: CliTerminal = {
      ...(options.terminal ?? A_FULL_TERMINAL),
      ask: async (question) => {
        questions.push(question);
        shown.push({ stream: "question", text: question });
        await options.answerOnlyAfter;
        return typing.length > 0 ? (typing.shift() ?? null) : null;
      },
    };
    const startedAt = performance.now();
    const exitCode = await runCliSession(
      args,
      {
        stdout: (message) => shown.push({ stream: "stdout", text: message }),
        stderr: (message) => shown.push({ stream: "stderr", text: message }),
      },
      {
        env: {
          HOME: machine.home,
          LIGHTHOUSE_CLI_CONFIG_PATH: machine.configPath,
          ...options.env,
        },
        terminal,
        now: () => options.now ?? THURSDAY_MORNING,
      },
    );
    const tookMs = performance.now() - startedAt;
    const textOf = (streams: readonly Shown["stream"][]) =>
      shown
        .filter((entry) => streams.includes(entry.stream))
        .map((entry) => entry.text)
        .join("\n");
    return {
      exitCode,
      stdout: textOf(["stdout"]),
      stderr: textOf(["stderr", "question"]),
      questions,
      shownLines: shown.flatMap((entry) => linesOf(entry.text)),
      tookMs,
    };
  };
  return { run };
};

/** True when `lines` appear in `shown` one after another, in this order. */
export const showsTogether = (
  shown: readonly string[],
  lines: readonly string[],
): boolean =>
  shown.some((_, start) =>
    lines.every((line, offset) => shown[start + offset] === line),
  );

/** Where in what was shown `line` first appears, or -1. */
export const whereShown = (shown: readonly string[], line: string): number =>
  shown.indexOf(line);
