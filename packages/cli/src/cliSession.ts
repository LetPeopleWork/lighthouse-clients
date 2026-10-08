import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  type CliConnection,
  type CliServerConnection,
  createFileUsageDataStore,
  createFileVoterKeyStore,
  createLighthouseClient,
  getUsageDataStorePath,
  getVoterKeyStorePath,
  isAPersonAtTheTerminal,
  isDoNotTrackSet,
  type LighthouseClient,
  loadStandaloneDiscoveryContract,
  settleUsageDataStep,
  switchUsageDataOn,
  type TerminalStreams,
  USAGE_DATA_BUDGET_MS,
  usageDataStoreFor,
  validateLighthouseConnectivity,
  withdrawUsageData,
} from "@letpeoplework/lighthouse-client";
import { Agent, fetch as undiciFetch } from "undici";
import type { CliCommandUsage } from "./commandResult";
import {
  type RunCliCommandDependencies,
  runCliCommand,
  type UnreadableUsageDataFile,
} from "./index";
import { isOutputFormat, type OutputFormat } from "./output";
import { lighthouseOf } from "./refinementCommands";
import {
  readUsageDataAnswer,
  USAGE_DATA_CHANGE_ANY_TIME,
  USAGE_DATA_QUESTION,
  type UsageDataStatus,
  type UsageDataTurnedOff,
  type UsageDataTurnedOn,
  usageDataNotRecorded,
} from "./usageDataQuestion";

/** The terminal `lh` runs in: which of its three streams are terminals, and how a question is put. */
export type CliTerminal = TerminalStreams & {
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

type SessionEnv = CliSessionDependencies["env"];

type PersistedConfigV1 = {
  readonly endpointUrl?: string;
  readonly auth?: { readonly kind: string; [key: string]: unknown };
};

type PersistedConfigV2 = {
  readonly version: 2;
  readonly connection?: CliConnection;
  readonly outputFormat?: OutputFormat;
  readonly voterName?: string;
};

const getConfigPath = (env: SessionEnv): string =>
  env.LIGHTHOUSE_CLI_CONFIG_PATH ??
  join(
    env.HOME ?? homedir(),
    ".config",
    "lighthouse-clients",
    "cli-config.json",
  );

const loadPersistedStorage = async (
  configPath: string,
): Promise<PersistedConfigV2> => {
  try {
    const raw = await readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as PersistedConfigV1 | PersistedConfigV2;
    if ("version" in parsed && parsed.version === 2) {
      return {
        version: 2,
        connection: parsed.connection,
        outputFormat: isOutputFormat(parsed.outputFormat)
          ? parsed.outputFormat
          : undefined,
        voterName:
          typeof parsed.voterName === "string" ? parsed.voterName : undefined,
      };
    }
    const v1 = parsed as PersistedConfigV1;
    if (
      typeof v1.endpointUrl === "string" &&
      v1.endpointUrl.trim().length > 0
    ) {
      // v1 used bearer-token auth; it is dropped because those tokens are no longer valid.
      const connection: CliServerConnection = {
        mode: "server",
        endpointUrl: v1.endpointUrl,
        authMode: "disabled",
      };
      return { version: 2, connection };
    }
    return { version: 2 };
  } catch {
    return { version: 2 };
  }
};

const savePersistedStorage = async (
  configPath: string,
  storage: PersistedConfigV2,
): Promise<void> => {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(storage, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(configPath, 0o600);
};

const insecureHttpsDispatcher = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

const createFetch = (insecure?: boolean): typeof globalThis.fetch => {
  if (!insecure) {
    return undiciFetch as unknown as typeof globalThis.fetch;
  }

  return async (input, init) => {
    const requestInit = (
      init === undefined
        ? {
            dispatcher: insecureHttpsDispatcher,
          }
        : {
            ...init,
            dispatcher: insecureHttpsDispatcher,
          }
    ) as RequestInit & {
      dispatcher: Agent;
    };

    return undiciFetch(
      input as never,
      requestInit as never,
    ) as unknown as Promise<Response>;
  };
};

const prompt = async (question: string): Promise<string> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(question);
  rl.close();
  return answer;
};

const getEnvApiKey = (env: SessionEnv): string | undefined => {
  const key = env.LIGHTHOUSE_API_KEY?.trim();
  return key !== undefined && key.length > 0 ? key : undefined;
};

const createSessionClient = (
  connection: CliConnection,
  env: SessionEnv,
): LighthouseClient => {
  if (connection.mode === "standalone") {
    return createLighthouseClient(
      {
        connection: {
          kind: "standalone",
          getDiscoveryContract: loadStandaloneDiscoveryContract,
        },
      },
      { fetch: createFetch() },
    );
  }

  // LIGHTHOUSE_API_KEY overrides the stored credential.
  const envApiKey = getEnvApiKey(env);
  return createLighthouseClient(
    {
      connection: {
        kind: "explicit",
        lighthouseUrl: connection.endpointUrl,
      },
      auth:
        envApiKey === undefined
          ? connection.auth
          : { kind: "api-key", value: envApiKey },
    },
    { fetch: createFetch(connection.insecure) },
  );
};

const lighthouseNamedOf = (connection: CliConnection): string =>
  connection.mode === "server"
    ? connection.endpointUrl
    : "the standalone Lighthouse";

const usageDataStoreOf = (connection: CliConnection, env: SessionEnv) =>
  usageDataStoreFor(
    createFileUsageDataStore(getUsageDataStorePath(env)),
    lighthouseOf(connection),
  );

const usageDataFor = (
  connection: CliConnection,
  env: SessionEnv,
  now: () => Date,
) => ({
  lighthouse: createSessionClient(connection, env),
  store: usageDataStoreOf(connection, env),
  source: "Cli" as const,
  env,
  now,
});

const unreadableUsageDataFile = (env: SessionEnv): UnreadableUsageDataFile => ({
  unreadableFile: getUsageDataStorePath(env),
});

const loadUsageDataStatus = async (
  connection: CliConnection,
  env: SessionEnv,
): Promise<UsageDataStatus | UnreadableUsageDataFile> => {
  const stored = await usageDataStoreOf(connection, env).read();
  if (stored === "unreadable") {
    return unreadableUsageDataFile(env);
  }
  return {
    lighthouse: lighthouseNamedOf(connection),
    stored,
    state: await createSessionClient(connection, env).getUsageDataState({
      signal: AbortSignal.timeout(USAGE_DATA_BUDGET_MS),
    }),
    doNotTrack: isDoNotTrackSet(env),
  };
};

const turnUsageDataOff = async (
  connection: CliConnection,
  env: SessionEnv,
  now: () => Date,
): Promise<UsageDataTurnedOff | UnreadableUsageDataFile> => {
  const withdrawal = await withdrawUsageData(
    usageDataFor(connection, env, now),
  );
  if (withdrawal === "unreadable") {
    return unreadableUsageDataFile(env);
  }
  return {
    lighthouse: lighthouseNamedOf(connection),
    toldLighthouse: withdrawal === "off",
  };
};

const turnUsageDataOn = async (
  connection: CliConnection,
  env: SessionEnv,
  now: () => Date,
): Promise<UsageDataTurnedOn | UnreadableUsageDataFile> => {
  const outcome = await switchUsageDataOn(usageDataFor(connection, env, now));
  return outcome === "unreadable"
    ? unreadableUsageDataFile(env)
    : { lighthouse: lighthouseNamedOf(connection), outcome };
};

const commandDependencies = (
  env: SessionEnv,
  now: () => Date,
): RunCliCommandDependencies => {
  const configPath = getConfigPath(env);
  const voterKeys = () => createFileVoterKeyStore(getVoterKeyStorePath(env));
  const load = () => loadPersistedStorage(configPath);
  const save = (storage: PersistedConfigV2) =>
    savePersistedStorage(configPath, storage);
  return {
    loadConnection: async () => (await load()).connection ?? null,
    saveConnection: async (connection) => {
      await save({ ...(await load()), connection: connection ?? undefined });
    },
    loadOutputFormat: async () => (await load()).outputFormat ?? null,
    saveOutputFormat: async (outputFormat) => {
      await save({ ...(await load()), outputFormat });
    },
    loadVoterName: async () => (await load()).voterName ?? null,
    saveVoterName: async (voterName) => {
      await save({ ...(await load()), voterName: voterName ?? undefined });
    },
    loadVoterKey: async (lighthouse) => voterKeys().load(lighthouse),
    saveVoterKey: async (lighthouse, key) => voterKeys().save(lighthouse, key),
    readTextFile: async (filePath) => readFile(filePath, "utf8"),
    prompt,
    validateConnectivity: async (url, insecure) =>
      validateLighthouseConnectivity(
        { kind: "explicit", lighthouseUrl: url },
        { fetch: createFetch(insecure) },
      ),
    validateStandaloneDiscovery: async () =>
      validateLighthouseConnectivity(
        {
          kind: "standalone",
          getDiscoveryContract: loadStandaloneDiscoveryContract,
        },
        { fetch: createFetch() },
      ),
    createClient: (connection) => createSessionClient(connection, env),
    getEnvApiKey: () => getEnvApiKey(env),
    loadUsageDataStatus: (connection) => loadUsageDataStatus(connection, env),
    turnUsageDataOff: (connection) => turnUsageDataOff(connection, env, now),
    turnUsageDataOn: (connection) => turnUsageDataOn(connection, env, now),
  };
};

const settleUsageData = async (
  usage: CliCommandUsage,
  io: CliSessionIo,
  dependencies: CliSessionDependencies,
  commands: RunCliCommandDependencies,
): Promise<void> => {
  const connection = await commands.loadConnection();
  if (connection === null) {
    return;
  }
  const { terminal, env, now } = dependencies;
  const outcome = await settleUsageDataStep(
    usageDataFor(connection, env, now),
    {
      ...usage,
      ask: isAPersonAtTheTerminal(terminal, env)
        ? async () =>
            readUsageDataAnswer(await terminal.ask(USAGE_DATA_QUESTION))
        : undefined,
    },
  );
  if (outcome === "kept-yes" || outcome === "kept-no") {
    io.stderr(USAGE_DATA_CHANGE_ANY_TIME);
  } else if (outcome === "not-recorded") {
    io.stderr(usageDataNotRecorded(lighthouseNamedOf(connection)));
  }
};

export const runCliSession = async (
  args: readonly string[],
  io: CliSessionIo,
  dependencies: CliSessionDependencies,
): Promise<number> => {
  const commands = commandDependencies(dependencies.env, dependencies.now);
  const result = await runCliCommand(args, commands);

  if (result.stdout.length > 0) {
    io.stdout(result.stdout);
  }

  if (result.stderr.length > 0) {
    io.stderr(result.stderr);
  }

  if (result.usage?.reached === true) {
    await settleUsageData(result.usage, io, dependencies, commands);
  }

  return result.exitCode;
};
