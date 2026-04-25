import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  type StoredLighthouseAuth,
  createLighthouseAuthContext,
  createLighthouseClient,
} from "@letpeoplework/lighthouse-client";
import { type CliRuntimeConfig, runCliCommand } from "./index";

export const renderCliBanner = (): string => "Lighthouse CLI";

type RunCliIo = {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
};

type PersistedCliConfig = {
  readonly endpointUrl?: string;
  readonly auth?: StoredLighthouseAuth;
};

const getConfigPath = (): string =>
  process.env.LIGHTHOUSE_CLI_CONFIG_PATH ??
  join(homedir(), ".config", "lighthouse-clients", "cli-config.json");

const loadPersistedConfig = async (): Promise<PersistedCliConfig> => {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as PersistedCliConfig;
    return parsed;
  } catch {
    return {};
  }
};

const savePersistedConfig = async (
  config: PersistedCliConfig,
): Promise<void> => {
  const configPath = getConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(configPath, 0o600);
};

const loadRuntimeConfig = async (): Promise<CliRuntimeConfig | null> => {
  const persisted = await loadPersistedConfig();
  if (
    typeof persisted.endpointUrl !== "string" ||
    persisted.endpointUrl.length === 0
  ) {
    return null;
  }

  return {
    endpointUrl: persisted.endpointUrl,
  };
};

const saveRuntimeConfig = async (config: CliRuntimeConfig): Promise<void> => {
  const persisted = await loadPersistedConfig();
  await savePersistedConfig({
    ...persisted,
    endpointUrl: config.endpointUrl,
  });
};

export const runCli = async (
  args: readonly string[] = process.argv.slice(2),
  io: RunCliIo = {
    stdout: (message) => {
      process.stdout.write(`${message}\n`);
    },
    stderr: (message) => {
      process.stderr.write(`${message}\n`);
    },
  },
): Promise<number> => {
  const authContext = createLighthouseAuthContext({
    load: async () => {
      const persisted = await loadPersistedConfig();
      return persisted.auth ?? null;
    },
    save: async (auth) => {
      const persisted = await loadPersistedConfig();
      await savePersistedConfig({
        ...persisted,
        auth,
      });
    },
    clear: async () => {
      const persisted = await loadPersistedConfig();
      await savePersistedConfig({
        endpointUrl: persisted.endpointUrl,
      });
    },
  });

  const result = await runCliCommand(args, {
    loadConfig: loadRuntimeConfig,
    saveConfig: saveRuntimeConfig,
    authContext,
    createClient: ({ endpointUrl, auth }) => {
      return createLighthouseClient({
        connection: {
          kind: "explicit",
          lighthouseUrl: endpointUrl,
        },
        auth,
      });
    },
  });

  if (result.stdout.length > 0) {
    io.stdout(result.stdout);
  }

  if (result.stderr.length > 0) {
    io.stderr(result.stderr);
  }

  return result.exitCode;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  void runCli().then((code) => {
    process.exitCode = code;
  });
}
