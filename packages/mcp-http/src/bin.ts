import { realpathSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import {
  FEATURE_REQUIRES_SERVER_NEWER_THAN,
  type LighthouseClientAuth,
  createLighthouseClient,
  isServerVersionNewerThan,
} from "@letpeoplework/lighthouse-client";
import { registerMcpTools } from "@letpeoplework/lighthouse-mcp-core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Agent, fetch as undiciFetch } from "undici";

const SERVER_NAME = "@letpeoplework/lighthouse-mcp-http";
const SERVER_VERSION = "0.1.0";

export type McpOAuthConfig = {
  readonly issuer: string;
  readonly resource: string;
};

export type McpHttpServerOptions = {
  readonly lighthouseUrl: string;
  readonly host: string;
  readonly port: number;
  readonly apiKey?: string;
  readonly oauth?: McpOAuthConfig;
};

export const PROTECTED_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource";

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

export type ProtectedResourceMetadata = {
  readonly resource: string;
  readonly authorization_servers: readonly string[];
  readonly bearer_methods_supported: readonly string[];
};

/**
 * RFC 9728 OAuth 2.0 Protected Resource Metadata for the MCP HTTP server. It
 * names the IdP (the same OIDC provider Lighthouse trusts) as the authorization
 * server and the Lighthouse API audience as the resource, so an MCP client
 * discovers where to run its OAuth flow and which audience to request a token
 * for (RFC 8707 resource indicator).
 */
export const buildProtectedResourceMetadata = (
  oauth: McpOAuthConfig,
): ProtectedResourceMetadata => ({
  resource: oauth.resource,
  authorization_servers: [oauth.issuer],
  bearer_methods_supported: ["header"],
});

/**
 * When OAuth is enabled, an MCP request carrying no caller credential must be
 * challenged (401 + WWW-Authenticate) so the client starts its OAuth flow rather
 * than silently driving Lighthouse anonymously.
 */
export const shouldChallengeForOAuth = (
  headers: NodeJS.Dict<string | string[]>,
  oauthEnabled: boolean,
): boolean => {
  if (!oauthEnabled) {
    return false;
  }

  const hasApiKey = firstHeaderValue(headers["x-api-key"]) !== undefined;
  const hasBearer =
    parseBearerToken(firstHeaderValue(headers.authorization)) !== undefined;
  return !hasApiKey && !hasBearer;
};

/**
 * Reads the MCP OAuth configuration from the environment. Both the issuer (the
 * OIDC provider Lighthouse trusts) and the resource (the Lighthouse API
 * audience) must be set together to enable OAuth; absent both, OAuth is off and
 * the server keeps its credential-forwarding / baked-key behaviour unchanged.
 */
export const resolveOAuthConfigFromEnv = (
  env: NodeJS.ProcessEnv,
): { readonly oauth?: McpOAuthConfig; readonly error?: string } => {
  const issuer = env.LIGHTHOUSE_OAUTH_ISSUER?.trim();
  const resource = env.LIGHTHOUSE_OAUTH_RESOURCE?.trim();

  if (!issuer && !resource) {
    return {};
  }

  if (!issuer || !resource) {
    return {
      error:
        "Both LIGHTHOUSE_OAUTH_ISSUER and LIGHTHOUSE_OAUTH_RESOURCE must be set to enable MCP OAuth.",
    };
  }

  return { oauth: { issuer, resource } };
};

/**
 * MCP OAuth pass-through needs a Lighthouse server that validates IdP JWT bearer
 * tokens (ADR-079), which only exists in releases newer than the registry
 * baseline. Block OAuth mode against an older server with a clear upgrade
 * message; never block when the version is unknown or a dev/unparseable build.
 */
export const evaluateOAuthVersionGate = (
  serverVersion: string | null,
  baseline: string = FEATURE_REQUIRES_SERVER_NEWER_THAN.mcpOAuthPassThrough,
): { readonly ok: true } | { readonly ok: false; readonly error: string } => {
  if (serverVersion === null) {
    return { ok: true };
  }

  const newer = isServerVersionNewerThan(serverVersion, baseline);
  if (newer === null || newer) {
    return { ok: true };
  }

  return {
    ok: false,
    error: `This Lighthouse server (${serverVersion}) does not support MCP OAuth — it requires a version newer than ${baseline}. Upgrade Lighthouse, or run the MCP server without OAuth (X-Api-Key).`,
  };
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

  const oauth = options.oauth;

  // Each request gets its own McpServer + transport (stateless/sessionless)
  const httpServer = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (
      oauth !== undefined &&
      req.method === "GET" &&
      req.url === PROTECTED_RESOURCE_METADATA_PATH
    ) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(buildProtectedResourceMetadata(oauth)));
      return;
    }

    if (req.method === "POST" && (req.url === "/mcp" || req.url === "/")) {
      if (shouldChallengeForOAuth(req.headers, oauth !== undefined)) {
        const metadataUrl = `http://${req.headers.host}${PROTECTED_RESOURCE_METADATA_PATH}`;
        res.writeHead(401, {
          "content-type": "application/json",
          "www-authenticate": `Bearer resource_metadata="${metadataUrl}"`,
        });
        res.end(JSON.stringify({ error: "Authentication required" }));
        return;
      }

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

  const oauthResult = resolveOAuthConfigFromEnv(env);
  if (oauthResult.error !== undefined) {
    writeError(oauthResult.error);
    return 1;
  }

  if (oauthResult.oauth !== undefined) {
    const versionClient = createLighthouseClient({
      connection: { kind: "explicit", lighthouseUrl },
      auth: { kind: "none" },
    });
    const versionResult = await versionClient.getVersion();
    const gate = evaluateOAuthVersionGate(
      versionResult.ok ? versionResult.value : null,
    );
    if (!gate.ok) {
      writeError(gate.error);
      return 1;
    }
  }

  const server = await startMcpHttpServer({
    lighthouseUrl,
    host,
    port: parsedPort,
    apiKey: env.LIGHTHOUSE_API_KEY,
    oauth: oauthResult.oauth,
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
