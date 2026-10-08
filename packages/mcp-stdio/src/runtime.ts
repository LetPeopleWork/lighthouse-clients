import {
  createFileVoterKeyStore,
  createLighthouseClient,
  getVoterKeyStorePath,
  type LighthouseConnectionConfiguration,
  loadStandaloneDiscoveryContract,
  STANDALONE_VOTER_KEY_SCOPE,
  voterKeyStoreFor,
} from "@letpeoplework/lighthouse-client";
import {
  type McpVoterKeyStore,
  registerMcpTools,
} from "@letpeoplework/lighthouse-mcp-core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Agent, fetch as undiciFetch } from "undici";
import { version as SERVER_VERSION } from "../package.json" with {
  type: "json",
};

const SERVER_NAME = "lighthouse";

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
  env: NodeJS.ProcessEnv = process.env,
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
  env: NodeJS.ProcessEnv,
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

export const runMcpStdioRuntime = async (
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> => {
  const resolved = await getConnectionConfiguration(env);
  if (resolved === null) {
    return 1;
  }
  const { connection, voterKeyScope } = resolved;

  const getAuth = () =>
    env.LIGHTHOUSE_API_KEY === undefined
      ? {
          kind: "none" as const,
        }
      : {
          kind: "api-key" as const,
          value: env.LIGHTHOUSE_API_KEY,
        };

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerMcpTools(server, {
    createClient: () => {
      const insecureHttpsDispatcher = new Agent({
        connect: { rejectUnauthorized: false },
      });
      const insecureFetch: typeof fetch = async (input, init) => {
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
      return createLighthouseClient(
        {
          connection,
          auth: getAuth(),
        },
        { fetch: insecureFetch },
      );
    },
    voterKeyStore: createLocalVoterKeyStore(voterKeyScope, env),
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const closeServer = async () => {
    try {
      await server.close();
    } catch {
      // Ignore cleanup failures on process termination.
    }
  };

  process.on("SIGINT", () => {
    void closeServer().then(() => {
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    void closeServer().then(() => {
      process.exit(0);
    });
  });

  return 0;
};
