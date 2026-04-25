import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from "node:http";
import {
  createLighthouseAuthContext,
  createLighthouseClient,
} from "@lighthouse/client";
import { createMcpHttpRuntime } from "./index";

export type McpHttpServerOptions = {
  readonly lighthouseUrl: string;
  readonly host: string;
  readonly port: number;
  readonly apiKey?: string;
  readonly bearerToken?: string;
};

export type McpHttpServerHandle = {
  readonly url: string;
  readonly close: () => Promise<void>;
};

const readBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Uint8Array[] = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
};

const writeJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload));
};

const getAuthContext = (options: McpHttpServerOptions) =>
  createLighthouseAuthContext({
    load: async () => {
      if (options.apiKey !== undefined) {
        return {
          kind: "api-key" as const,
          value: options.apiKey,
        };
      }

      if (options.bearerToken !== undefined) {
        return {
          kind: "bearer-token" as const,
          token: options.bearerToken,
        };
      }

      return null;
    },
    save: async () => undefined,
    clear: async () => undefined,
  });

const getCoreRuntime = (options: McpHttpServerOptions) => ({
  listTools: () =>
    [
      {
        name: "lighthouse.health.check",
        description: "Validate Lighthouse API connectivity.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: "lighthouse.version.get",
        description: "Get Lighthouse version from /api/v1/version.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
      },
    ] as const,
  callTool: async (name: string) => {
    const auth = await getAuthContext(options).resolveAuth();
    const client = createLighthouseClient({
      connection: {
        kind: "explicit",
        lighthouseUrl: options.lighthouseUrl,
      },
      auth,
    });

    if (name === "lighthouse.health.check") {
      const health = await client.checkConnectivity();
      if (health.category === "success") {
        return {
          isError: false,
          content: [
            {
              type: "text" as const,
              text: "connectivity: success",
            },
          ],
        };
      }

      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `connectivity: ${health.category}${
              health.reason !== undefined ? ` (${health.reason})` : ""
            }`,
          },
        ],
      };
    }

    if (name === "lighthouse.version.get") {
      const version = await client.getVersion();
      if (version.ok) {
        return {
          isError: false,
          content: [
            {
              type: "text" as const,
              text: `version: ${version.value}`,
            },
          ],
        };
      }

      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `version: ${version.error.category} (${version.error.reason})`,
          },
        ],
      };
    }

    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Unknown tool: ${name}`,
        },
      ],
    };
  },
});

export const renderMcpHttpBanner = (url: string): string =>
  `Lighthouse MCP HTTP server running at ${url}`;

export const startMcpHttpServer = async (
  options: McpHttpServerOptions,
): Promise<McpHttpServerHandle> => {
  const coreRuntime = getCoreRuntime(options);

  const runtime = createMcpHttpRuntime({
    coreRuntime,
  });

  const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      writeJson(response, 200, runtime.getHealth());
      return;
    }

    if (request.method === "POST" && request.url === "/mcp") {
      try {
        const body = await readBody(request);
        const parsed = JSON.parse(body) as {
          readonly jsonrpc: "2.0";
          readonly id: string | number | null;
          readonly method: string;
          readonly params?: unknown;
        };

        const rpcResponse = await runtime.handleJsonRpcRequest(parsed);
        writeJson(response, 200, rpcResponse);
        return;
      } catch {
        writeJson(response, 400, {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32700,
            message: "Parse error",
          },
        });
        return;
      }
    }

    writeJson(response, 404, {
      error: "Not found",
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const activePort =
    typeof address === "object" && address !== null
      ? address.port
      : options.port;

  return {
    url: `http://${options.host}:${activePort}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error !== undefined) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
};

export const runMcpHttpRuntime = async (
  env: NodeJS.ProcessEnv = process.env,
  write: (message: string) => void = (message) => {
    process.stdout.write(`${message}\n`);
  },
  writeError: (message: string) => void = (message) => {
    process.stderr.write(`${message}\n`);
  },
  onServerStarted?: (server: McpHttpServerHandle) => Promise<void> | void,
): Promise<number> => {
  const lighthouseUrl = env.LIGHTHOUSE_URL;
  if (lighthouseUrl === undefined || lighthouseUrl.length === 0) {
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
    bearerToken: env.LIGHTHOUSE_BEARER_TOKEN,
  });

  write(renderMcpHttpBanner(server.url));

  if (onServerStarted !== undefined) {
    await onServerStarted(server);
  }

  return 0;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  void runMcpHttpRuntime().then((code) => {
    process.exitCode = code;
  });
}
