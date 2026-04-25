import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createLighthouseClient } from "@lighthouse/client";
import { type CliRuntimeConfig, runCliCommand } from "./index";

export const renderCliBanner = (): string => "Lighthouse CLI";

type RunCliIo = {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
};

const getConfigPath = (): string =>
  process.env.LIGHTHOUSE_CLI_CONFIG_PATH ??
  join(homedir(), ".config", "lighthouse-clients", "cli-config.json");

const loadRuntimeConfig = async (): Promise<CliRuntimeConfig | null> => {
  try {
    const raw = await readFile(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CliRuntimeConfig>;
    if (
      typeof parsed.endpointUrl !== "string" ||
      parsed.endpointUrl.length === 0
    ) {
      return null;
    }

    return {
      endpointUrl: parsed.endpointUrl,
    };
  } catch {
    return null;
  }
};

const saveRuntimeConfig = async (config: CliRuntimeConfig): Promise<void> => {
  const configPath = getConfigPath();
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
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
  const result = await runCliCommand(args, {
    loadConfig: loadRuntimeConfig,
    saveConfig: saveRuntimeConfig,
    createClient: ({ endpointUrl, apiKey, bearerToken }) => {
      const auth =
        apiKey !== undefined
          ? {
              kind: "api-key" as const,
              value: apiKey,
            }
          : bearerToken !== undefined
            ? {
                kind: "bearer-token" as const,
                token: bearerToken,
              }
            : {
                kind: "none" as const,
              };

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
