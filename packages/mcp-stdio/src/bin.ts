import {
  type LighthouseConnectionConfiguration,
  createLighthouseClient,
  loadStandaloneDiscoveryContract,
} from "@letpeoplework/lighthouse-client";
import { registerMcpTools } from "@letpeoplework/lighthouse-mcp-core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Agent, fetch as undiciFetch } from "undici";

const SERVER_NAME = "lighthouse";
const SERVER_VERSION = "0.2.5";

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

const getConnectionConfiguration = async (
  env: NodeJS.ProcessEnv,
): Promise<LighthouseConnectionConfiguration | null> => {
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
      kind: "explicit",
      lighthouseUrl: normalizedUrl,
    };
  }

  const discoveryContract = await loadStandaloneDiscoveryContract();
  if (discoveryContract !== null) {
    return {
      kind: "explicit",
      lighthouseUrl: discoveryContract.lighthouseUrl,
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
  const connection = await getConnectionConfiguration(env);
  if (connection === null) {
    return 1;
  }

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

if (import.meta.url === `file://${process.argv[1]}`) {
  void runMcpStdioRuntime().then((code) => {
    process.exitCode = code;
  });
}
