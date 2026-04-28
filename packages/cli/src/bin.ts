import { spawn } from "node:child_process";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import {
  type CliConnection,
  type CliServerConnection,
  type StandaloneDiscoveryContract,
  createLighthouseClient,
  parseStandaloneDiscoveryContract,
  validateLighthouseConnectivity,
} from "@letpeoplework/lighthouse-client";
import { Agent, fetch as undiciFetch } from "undici";
import { type RunCliCommandDependencies, runCliCommand } from "./index";
import { type OutputFormat, isOutputFormat } from "./output";

export const renderCliBanner = (): string => "Lighthouse CLI";

type RunCliIo = {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
};

type PersistedConfigV1 = {
  readonly endpointUrl?: string;
  readonly auth?: { readonly kind: string; [key: string]: unknown };
};

type PersistedConfigV2 = {
  readonly version: 2;
  readonly connection?: CliConnection;
  readonly outputFormat?: OutputFormat;
};

const getConfigPath = (): string =>
  process.env.LIGHTHOUSE_CLI_CONFIG_PATH ??
  join(homedir(), ".config", "lighthouse-clients", "cli-config.json");

const STANDALONE_DISCOVERY_LOCKFILE_NAME = "standalone.lock.json";

const getStandaloneDiscoveryLockfilePath = (): string => {
  if (process.env.LIGHTHOUSE_STANDALONE_LOCKFILE_PATH !== undefined) {
    return process.env.LIGHTHOUSE_STANDALONE_LOCKFILE_PATH;
  }

  if (process.platform === "darwin") {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "Lighthouse",
      STANDALONE_DISCOVERY_LOCKFILE_NAME,
    );
  }

  if (process.platform === "win32") {
    return join(
      process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
      "Lighthouse",
      STANDALONE_DISCOVERY_LOCKFILE_NAME,
    );
  }

  return join(
    process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
    "Lighthouse",
    STANDALONE_DISCOVERY_LOCKFILE_NAME,
  );
};

const loadStandaloneDiscoveryContract =
  async (): Promise<StandaloneDiscoveryContract | null> => {
    try {
      const serializedContract = await readFile(
        getStandaloneDiscoveryLockfilePath(),
        "utf8",
      );
      const parsedContract =
        parseStandaloneDiscoveryContract(serializedContract);

      if (!parsedContract.isValid) {
        return null;
      }

      return parsedContract.contract;
    } catch {
      return null;
    }
  };

const loadPersistedStorage = async (): Promise<PersistedConfigV2> => {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as PersistedConfigV1 | PersistedConfigV2;
    if ("version" in parsed && parsed.version === 2) {
      return {
        version: 2,
        connection: parsed.connection,
        outputFormat: isOutputFormat(parsed.outputFormat)
          ? parsed.outputFormat
          : undefined,
      };
    }
    // Migrate v1 → v2
    const v1 = parsed as PersistedConfigV1;
    if (
      typeof v1.endpointUrl === "string" &&
      v1.endpointUrl.trim().length > 0
    ) {
      // v1 used bearer-token auth; we drop it since tokens are no longer valid
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
  storage: PersistedConfigV2,
): Promise<void> => {
  const configPath = getConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(storage, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(configPath, 0o600);
};

// ── IO helpers ────────────────────────────────────────────────────────────────

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

const openBrowser = async (url: string): Promise<void> => {
  let cmd: string;
  let openArgs: string[];
  if (process.platform === "win32") {
    cmd = "cmd";
    openArgs = ["/c", "start", "", url];
  } else if (process.platform === "darwin") {
    cmd = "open";
    openArgs = [url];
  } else {
    cmd = "xdg-open";
    openArgs = [url];
  }
  return new Promise<void>((resolve) => {
    const child = spawn(cmd, openArgs, { detached: true, stdio: "ignore" });
    child.unref();
    resolve();
  });
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

// ── Main entry ────────────────────────────────────────────────────────────────

const defaultIo: RunCliIo = {
  stdout: (message) => {
    process.stdout.write(`${message}\n`);
  },
  stderr: (message) => {
    process.stderr.write(`${message}\n`);
  },
};

export const runCli = async (
  args: readonly string[] = process.argv.slice(2),
  io: RunCliIo = defaultIo,
): Promise<number> => {
  const dependencies: RunCliCommandDependencies = {
    loadConnection: async () => {
      const storage = await loadPersistedStorage();
      return storage.connection ?? null;
    },
    saveConnection: async (connection) => {
      const storage = await loadPersistedStorage();
      if (connection === null) {
        await savePersistedStorage({
          version: 2,
          outputFormat: storage.outputFormat,
        });
        return;
      }

      await savePersistedStorage({
        version: 2,
        connection,
        outputFormat: storage.outputFormat,
      });
    },
    loadOutputFormat: async () => {
      const storage = await loadPersistedStorage();
      return storage.outputFormat ?? null;
    },
    saveOutputFormat: async (outputFormat) => {
      const storage = await loadPersistedStorage();
      await savePersistedStorage({
        version: 2,
        connection: storage.connection,
        outputFormat,
      });
    },
    readTextFile: async (filePath) => readFile(filePath, "utf8"),
    prompt,
    openBrowser,
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
    createClient: (connection) => {
      // LIGHTHOUSE_API_KEY env var overrides stored auth
      const envApiKey = process.env.LIGHTHOUSE_API_KEY?.trim();
      const envAuth =
        envApiKey !== undefined && envApiKey.length > 0
          ? { kind: "api-key" as const, value: envApiKey }
          : undefined;

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

      return createLighthouseClient(
        {
          connection: {
            kind: "explicit",
            lighthouseUrl: connection.endpointUrl,
          },
          auth: envAuth ?? connection.auth,
        },
        { fetch: createFetch(connection.insecure) },
      );
    },
  };

  const result = await runCliCommand(args, dependencies);

  if (result.stdout.length > 0) {
    io.stdout(result.stdout);
  }

  if (result.stderr.length > 0) {
    io.stderr(result.stderr);
  }

  return result.exitCode;
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await runCli();
}
