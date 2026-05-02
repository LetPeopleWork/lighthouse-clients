import { realpathSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createLighthouseClient } from "@letpeoplework/lighthouse-client";
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

export const startMcpHttpServer = async (
  options: McpHttpServerOptions,
): Promise<McpHttpServerHandle> => {
  const getAuth = () =>
    options.apiKey === undefined
      ? { kind: "none" as const }
      : { kind: "api-key" as const, value: options.apiKey };

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

      registerMcpTools(server, {
        createClient: () =>
          createLighthouseClient(
            {
              connection: {
                kind: "explicit",
                lighthouseUrl: options.lighthouseUrl,
              },
              auth: getAuth(),
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
