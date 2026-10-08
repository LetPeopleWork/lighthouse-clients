// RED scaffold, created before the behaviour exists. `lh` as one run of the process: the command's answer printed, then, in a
// full terminal, the usage data question, then the usage data settled. `runCli` becomes this with the
// process's own environment, terminal and clock. DELIVER replaces the body and removes the marker.

export const __SCAFFOLD__ = true;

/** The terminal `lh` runs in: which of its three streams are terminals, and how a question is put. */
export type CliTerminal = {
  readonly stdinIsTTY: boolean;
  readonly stdoutIsTTY: boolean;
  readonly stderrIsTTY: boolean;
  /** Puts the question on stderr; the line the person typed, or null on Ctrl-C or end of input. */
  readonly ask: (question: string) => Promise<string | null>;
};

export type CliSessionIo = {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
};

/**
 * What a run takes from outside the process image: its environment (`HOME`, `LIGHTHOUSE_CLI_CONFIG_PATH`,
 * `LIGHTHOUSE_API_KEY`, `CI`, `DO_NOT_TRACK`), its terminal and its clock. Everything else is production.
 */
export type CliSessionDependencies = {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly terminal: CliTerminal;
  readonly now: () => Date;
};

export const runCliSession = async (
  _args: readonly string[],
  _io: CliSessionIo,
  _dependencies: CliSessionDependencies,
): Promise<number> => {
  throw new Error("Not yet implemented -- RED scaffold");
};
