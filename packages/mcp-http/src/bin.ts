import { realpathSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import {
  type LighthouseClientAuth,
  createLighthouseClient,
} from "@letpeoplework/lighthouse-client";
import { registerMcpTools } from "@letpeoplework/lighthouse-mcp-core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Agent, fetch as undiciFetch } from "undici";

const SERVER_NAME = "@letpeoplework/lighthouse-mcp-http";
const SERVER_VERSION = "0.1.0";

export type McpHttpServerOptions = {
  readonly lighthouseUrl: string;
  readonly host: string;
  readonly port: number;
  readonly apiKey?: string;
};

export type McpHttpServerHandle = {
  readonly url: string;
  readonly close: () => Promise<void>;
};

export const renderMcpHttpBanner = (url: string): string =>
  `Lighthouse MCP HTTP server running at ${url}`;

const BEARER_PREFIX = "Bearer ";

const firstHeaderValue = (
  value: string | readonly string[] | undefined,
): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : (value as string | undefined);
  const trimmed = raw?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : undefined;
};

const parseBearerToken = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!value.toLowerCase().startsWith(BEARER_PREFIX.toLowerCase())) {
    return undefined;
  }

  const token = value.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : undefined;
};

/**
 * Derives the Lighthouse auth for a single inbound MCP request. The caller's own
 * credential (an `X-Api-Key` header, or an `Authorization: Bearer` token) takes
 * precedence so every caller drives Lighthouse as themselves — no shared baked
 * key. The container's configured key (if any) remains as the legacy
 * single-container / dev fallback for callers that send no credential.
 */
export const resolveRequestAuth = (
  headers: NodeJS.Dict<string | string[]>,
  fallbackApiKey: string | undefined,
): LighthouseClientAuth => {
  const callerApiKey = firstHeaderValue(headers["x-api-key"]);
  if (callerApiKey !== undefined) {
    return { kind: "api-key", value: callerApiKey };
  }

  const callerBearer = parseBearerToken(
    firstHeaderValue(headers.authorization),
  );
  if (callerBearer !== undefined) {
    return { kind: "bearer-token", token: callerBearer };
  }

  const fallback = fallbackApiKey?.trim();
  if (fallback !== undefined && fallback.length > 0) {
    return { kind: "api-key", value: fallback };
  }

  return { kind: "none" };
};

export const startMcpHttpServer = async (
  options: McpHttpServerOptions,
): Promise<McpHttpServerHandle> => {
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

  // Each request gets its own McpServer + transport (stateless/sessionless)
  const httpServer = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.method === "POST" && (req.url === "/mcp" || req.url === "/")) {
      const server = new McpServer({
        name: SERVER_NAME,
        version: SERVER_VERSION,
      });

      const requestAuth = resolveRequestAuth(req.headers, options.apiKey);

      registerMcpTools(server, {
        createClient: () =>
          createLighthouseClient(
            {
              connection: {
                kind: "explicit",
                lighthouseUrl: options.lighthouseUrl,
              },
              auth: requestAuth,
            },
            { fetch: insecureFetch },
          ),
      });

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session pinning
      });

      await server.connect(transport);
      await transport.handleRequest(req, res);
      await server.close();
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(options.port, options.host, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  const address = httpServer.address();
  const activePort =
    typeof address === "object" && address !== null
      ? address.port
      : options.port;

  return {
    url: `http://${options.host}:${activePort}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
};

export const runMcpHttpRuntime = async (
  env: NodeJS.ProcessEnv = process.env,
  write: (msg: string) => void = (msg) => process.stdout.write(`${msg}\n`),
  writeError: (msg: string) => void = (msg) => process.stderr.write(`${msg}\n`),
  onServerStarted?: (server: McpHttpServerHandle) => Promise<void> | void,
): Promise<number> => {
  const lighthouseUrl = env.LIGHTHOUSE_URL;
  if (!lighthouseUrl?.length) {
    writeError("Missing LIGHTHOUSE_URL environment variable.");
    return 1;
  }

  const host = env.HOST ?? "127.0.0.1";
  const parsedPort = Number.parseInt(env.PORT ?? "3333", 10);
  if (Number.isNaN(parsedPort)) {
    writeError("PORT must be a valid number.");
    return 1;
  }

  const server = await startMcpHttpServer({
    lighthouseUrl,
    host,
    port: parsedPort,
    apiKey: env.LIGHTHOUSE_API_KEY,
  });

  write(renderMcpHttpBanner(server.url));
  await onServerStarted?.(server);
  return 0;
};

const isDirectExecution = (): boolean => {
  const argvPath = process.argv[1];
  if (argvPath === undefined) return false;
  try {
    return fileURLToPath(import.meta.url) === realpathSync(argvPath);
  } catch {
    return false;
  }
};

if (isDirectExecution()) {
  process.exitCode = await runMcpHttpRuntime();
}
