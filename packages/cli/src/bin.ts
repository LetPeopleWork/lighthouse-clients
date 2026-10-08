import { realpathSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  type CliSessionIo,
  type CliTerminal,
  runCliSession,
} from "./cliSession";

export const renderCliBanner = (): string => "Lighthouse CLI";

// The question is asked on stderr so stdout stays the command's answer and nothing else. Ctrl-C and end of
// input are caught here and mean "no answer": the run still ends with the command's own exit code.
const askOnStderr = (question: string): Promise<string | null> =>
  new Promise((resolve) => {
    const reader = createInterface({
      input: process.stdin,
      output: process.stderr,
      terminal: true,
    });
    let answered = false;
    const settle = (answer: string | null) => {
      if (answered) {
        return;
      }
      answered = true;
      resolve(answer);
      reader.close();
    };
    reader.on("SIGINT", () => {
      process.stderr.write("\n");
      settle(null);
    });
    reader.on("close", () => settle(null));
    reader.question(`${question} `, (answer) => settle(answer));
  });

const processTerminal = (): CliTerminal => ({
  stdinIsTTY: process.stdin.isTTY === true,
  stdoutIsTTY: process.stdout.isTTY === true,
  stderrIsTTY: process.stderr.isTTY === true,
  ask: askOnStderr,
});

const defaultIo: CliSessionIo = {
  stdout: (message) => {
    process.stdout.write(`${message}\n`);
  },
  stderr: (message) => {
    process.stderr.write(`${message}\n`);
  },
};

export const runCli = async (
  args: readonly string[] = process.argv.slice(2),
  io: CliSessionIo = defaultIo,
): Promise<number> =>
  runCliSession(args, io, {
    env: process.env,
    terminal: processTerminal(),
    now: () => new Date(),
  });

export const isDirectExecution = (
  moduleUrl: string = import.meta.url,
): boolean => {
  const argvPath = process.argv[1];
  if (argvPath === undefined) {
    return false;
  }

  try {
    return fileURLToPath(moduleUrl) === realpathSync(argvPath);
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  process.exitCode = await runCli();
}
