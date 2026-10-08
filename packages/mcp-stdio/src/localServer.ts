import {
  createFileUsageDataStore,
  createFileVoterKeyStore,
  createLighthouseClient,
  getUsageDataStorePath,
  getVoterKeyStorePath,
  isDoNotTrackSet,
  type LighthouseClient,
  type LighthouseConnectionConfiguration,
  loadStandaloneDiscoveryContract,
  STANDALONE_VOTER_KEY_SCOPE,
  settleUsageDataStep,
  usageDataStoreFor,
  voterKeyStoreFor,
} from "@letpeoplework/lighthouse-client";
import {
  askingOnceInThisProcess,
  type McpUsageDataPort,
  type McpVoterKeyStore,
  registerMcpTools,
} from "@letpeoplework/lighthouse-mcp-core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Agent, fetch as undiciFetch } from "undici";
import { version as SERVER_VERSION } from "../package.json" with {
  type: "json",
};

const SERVER_NAME = "lighthouse";

type ServerEnv = Readonly<Record<string, string | undefined>>;

const getNormalizedExplicitUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const pathname = parsed.pathname.replace(/\/+$/u, "");
    if (pathname.length === 0 || pathname === "/") {
      return parsed.origin;
    }

    return `${parsed.origin}${pathname}`;
  } catch {
    return null;
  }
};

/**
 * The voter key this server keeps for its Lighthouse, in the file the lh command line keeps its keys in,
 * so a person is one voter whether they vote from lh or through their assistant.
 */
export const createLocalVoterKeyStore = (
  voterKeyScope: string,
  env: ServerEnv = process.env,
): McpVoterKeyStore =>
  voterKeyStoreFor(
    createFileVoterKeyStore(getVoterKeyStorePath(env)),
    voterKeyScope,
  );

type ResolvedLighthouse = {
  readonly connection: LighthouseConnectionConfiguration;
  readonly voterKeyScope: string;
};

const getConnectionConfiguration = async (
  env: ServerEnv,
): Promise<ResolvedLighthouse | null> => {
  const explicitUrl = env.LIGHTHOUSE_URL;
  if (explicitUrl !== undefined) {
    const normalizedUrl = getNormalizedExplicitUrl(explicitUrl);
    if (normalizedUrl === null) {
      process.stderr.write(
        "Invalid LIGHTHOUSE_URL environment variable. Use a valid http(s) URL.\n",
      );
      return null;
    }

    return {
      connection: { kind: "explicit", lighthouseUrl: normalizedUrl },
      voterKeyScope: normalizedUrl,
    };
  }

  const discoveryContract = await loadStandaloneDiscoveryContract();
  if (discoveryContract !== null) {
    return {
      connection: {
        kind: "explicit",
        lighthouseUrl: discoveryContract.lighthouseUrl,
      },
      voterKeyScope: STANDALONE_VOTER_KEY_SCOPE,
    };
  }

  process.stderr.write(
    "Failed to resolve Lighthouse URL. Set LIGHTHOUSE_URL or ensure the standalone lock file exists and is valid.\n",
  );
  return null;
};

const createInsecureFetch = (): typeof fetch => {
  const insecureHttpsDispatcher = new Agent({
    connect: { rejectUnauthorized: false },
  });
  return async (input, init) => {
    const requestInit = (
      init === undefined
        ? { dispatcher: insecureHttpsDispatcher }
        : { ...init, dispatcher: insecureHttpsDispatcher }
    ) as RequestInit & { dispatcher: Agent };
    return undiciFetch(
      input as never,
      requestInit as never,
    ) as unknown as Promise<Response>;
  };
};

/**
 * Usage data kept in the answer lh keeps for the same Lighthouse, read again before the question is put,
 * since lh may have answered while this server was running.
 */
const localUsageDataPort = (
  voterKeyScope: string,
  env: ServerEnv,
  createClient: () => LighthouseClient,
): McpUsageDataPort => {
  const store = usageDataStoreFor(
    createFileUsageDataStore(getUsageDataStorePath(env)),
    voterKeyScope,
  );
  return askingOnceInThisProcess({
    mightAsk: async () =>
      !isDoNotTrackSet(env) && (await store.read()) === undefined,
    settle: (step) =>
      settleUsageDataStep(
        {
          lighthouse: createClient(),
          store,
          source: "Mcp",
          env,
          now: () => new Date(),
        },
        step,
      ),
  });
};

/**
 * The server for the Lighthouse `env` names (`LIGHTHOUSE_URL`, `LIGHTHOUSE_API_KEY`), keeping its answers
 * where `LIGHTHOUSE_CLI_CONFIG_PATH` (or `HOME`) says lh keeps its own, honouring `DO_NOT_TRACK`; null when
 * no Lighthouse can be resolved.
 */
export const createLocalLighthouseMcpServer = async (
  env: ServerEnv,
): Promise<McpServer | null> => {
  const resolved = await getConnectionConfiguration(env);
  if (resolved === null) {
    return null;
  }
  const { connection, voterKeyScope } = resolved;
  const apiKey = env.LIGHTHOUSE_API_KEY;
  const createClient = () =>
    createLighthouseClient(
      {
        connection,
        auth:
          apiKey === undefined
            ? { kind: "none" }
            : { kind: "api-key", value: apiKey },
      },
      { fetch: createInsecureFetch() },
    );

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerMcpTools(server, {
    createClient,
    voterKeyStore: createLocalVoterKeyStore(voterKeyScope, env),
    usageData: localUsageDataPort(voterKeyScope, env, createClient),
  });
  return server;
};
