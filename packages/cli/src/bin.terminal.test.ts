import { EventEmitter } from "node:events";
import { createInterface } from "node:readline";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aFakeLighthouse } from "../../../test-support/fakeLighthouse";
import {
  aMachine,
  connectedTo,
  type Machine,
  theStoredAnswerFor,
} from "../test-support/lhSession";
import { runCli } from "./bin";

// lh as the shell starts it: which of the process's own streams are terminals decides whether it may ask,
// and the question is put through readline on stderr. Readline is replaced by a reader the scenario
// drives, so a person typing, or pressing Ctrl-C, is played without a real terminal.

vi.mock("node:readline", () => ({ createInterface: vi.fn() }));

const THE_QUESTION_OPENS = "May Lighthouse send usage data?";
const LENAS_FORECAST = [
  "forecast",
  "manual",
  "--team-id",
  "3",
  "--remaining",
  "25",
];

type Stream = "stdin" | "stdout" | "stderr";
const STREAMS: readonly Stream[] = ["stdin", "stdout", "stderr"];

/** A readline interface as lh uses it: it closes once, and the scenario decides what happens at the question. */
class FakeReader extends EventEmitter {
  closeCalls = 0;
  readonly questions: string[] = [];

  constructor(
    private readonly atTheQuestion: (
      reader: FakeReader,
      answer: (line: string) => void,
    ) => void,
  ) {
    super();
  }

  question(question: string, answer: (line: string) => void) {
    this.questions.push(question);
    this.atTheQuestion(this, answer);
  }

  close() {
    this.closeCalls += 1;
    if (this.closeCalls === 1) {
      this.emit("close");
    }
  }
}

const readers: FakeReader[] = [];

const aPersonWho = (
  atTheQuestion: (reader: FakeReader, answer: (line: string) => void) => void,
) => {
  vi.mocked(createInterface).mockImplementation(() => {
    const reader = new FakeReader(atTheQuestion);
    readers.push(reader);
    return reader as never;
  });
};

const restorers: (() => void)[] = [];

afterEach(() => {
  for (const restore of restorers.splice(0).reverse()) {
    restore();
  }
  readers.splice(0);
  vi.mocked(createInterface).mockReset();
  vi.restoreAllMocks();
});

const terminalsAre = (terminals: readonly Stream[]) => {
  for (const name of STREAMS) {
    const stream = process[name];
    const before = Object.getOwnPropertyDescriptor(stream, "isTTY");
    Object.defineProperty(stream, "isTTY", {
      value: terminals.includes(name),
      configurable: true,
    });
    restorers.push(() => {
      if (before === undefined) {
        delete (stream as { isTTY?: boolean }).isTTY;
      } else {
        Object.defineProperty(stream, "isTTY", before);
      }
    });
  }
};

/** The run sees exactly this machine's HOME and config, and none of CI, DO_NOT_TRACK or LIGHTHOUSE_API_KEY. */
const environmentOf = (machine: Machine) => {
  const names = [
    "HOME",
    "LIGHTHOUSE_CLI_CONFIG_PATH",
    "LIGHTHOUSE_API_KEY",
    "CI",
    "DO_NOT_TRACK",
  ] as const;
  const before = new Map(names.map((name) => [name, process.env[name]]));
  for (const name of names) {
    delete process.env[name];
  }
  process.env.HOME = machine.home;
  process.env.LIGHTHOUSE_CLI_CONFIG_PATH = machine.configPath;
  restorers.push(() => {
    for (const [name, value] of before) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });
};

const lhInATerminal = async (
  machine: Machine,
  terminals: readonly Stream[] = STREAMS,
) => {
  environmentOf(machine);
  terminalsAre(terminals);
  const stderr: string[] = [];
  const exitCode = await runCli(LENAS_FORECAST, {
    stdout: () => undefined,
    stderr: (message) => stderr.push(message),
  });
  return { exitCode, stderr: stderr.join("\n") };
};

describe("lh at a full terminal", () => {
  it("asks on stderr through a terminal reader, keeps a No with the time it was given, and closes the reader", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await connectedTo(aMachine(), lighthouse.url);
    aPersonWho((_reader, answer) => answer("n"));
    const before = Date.now();

    const run = await lhInATerminal(lena);

    expect(run.exitCode).toBe(0);
    expect(createInterface).toHaveBeenCalledWith({
      input: process.stdin,
      output: process.stderr,
      terminal: true,
    });
    expect(readers[0]?.questions[0]).toContain(THE_QUESTION_OPENS);
    expect(readers[0]?.closeCalls).toBeGreaterThan(0);
    const kept = await theStoredAnswerFor(lena, lighthouse.url);
    expect(kept?.answer).toBe("no");
    const decidedAt = Date.parse(
      kept?.answer === "no" ? kept.decidedAt : "not a time",
    );
    expect(decidedAt).toBeGreaterThanOrEqual(before);
    expect(decidedAt).toBeLessThanOrEqual(Date.now());
  });

  it("takes Ctrl-C at the question as no answer, ends the line, and keeps nothing", async () => {
    const lighthouse = await aFakeLighthouse();
    const lena = await connectedTo(aMachine(), lighthouse.url);
    aPersonWho((reader) => reader.emit("SIGINT"));
    const written = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const run = await lhInATerminal(lena);

    expect(run.exitCode).toBe(0);
    expect(written).toHaveBeenCalledWith("\n");
    expect(await theStoredAnswerFor(lena, lighthouse.url)).toBeUndefined();
  });

  it.each(STREAMS)(
    "does not ask when %s is not a terminal",
    async (notATerminal) => {
      const lighthouse = await aFakeLighthouse();
      const lena = await connectedTo(aMachine(), lighthouse.url);
      aPersonWho((_reader, answer) => answer("y"));

      const run = await lhInATerminal(
        lena,
        STREAMS.filter((name) => name !== notATerminal),
      );

      expect(run.exitCode).toBe(0);
      expect(createInterface).not.toHaveBeenCalled();
      expect(await theStoredAnswerFor(lena, lighthouse.url)).toBeUndefined();
    },
  );
});
