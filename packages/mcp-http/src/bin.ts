import { realpathSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import {
  createLighthouseClient,
  FEATURE_REQUIRES_SERVER_NEWER_THAN,
  isDoNotTrackSet,
  isServerVersionNewerThan,
  type LighthouseClientAuth,
  type LighthouseUsageDataStore,
  queryServerAuthMode,
  type StoredUsageDataAnswer,
  settleUsageDataStep,
  switchUsageDataOn,
  type UsageDataLighthouse,
  type UsageDataReporterDependencies,
} from "@letpeoplework/lighthouse-client";
import {
  type McpUsageDataPort,
  registerMcpTools,
} from "@letpeoplework/lighthouse-mcp-core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Agent, fetch as undiciFetch } from "undici";
import { version as SERVER_VERSION } from "../package.json" with {
  type: "json",
};

const SERVER_NAME = "@letpeoplework/lighthouse-mcp-http";

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
  /** Present when the operator switched usage data on; the environment it reads `DO_NOT_TRACK` from. */
  readonly usageData?: {
    readonly env: Readonly<Record<string, string | undefined>>;
  };
};

export const PROTECTED_RESOURCE_METADATA_PATH =
  "/.well-known/oauth-protected-resource";

/**
 * The path the MCP server is mounted on behind the ingress (the POST endpoint).
 * Per RFC 9728 the protected-resource metadata for a resource served at this path
 * lives at the ROOT-anchored well-known with the path appended as a suffix —
 * `/.well-known/oauth-protected-resource/mcp` — NOT under the mount
 * (`/mcp/.well-known/...`). Spec-compliant MCP clients construct that root path
 * themselves and ignore the `WWW-Authenticate` hint, so we serve it there and the
 * chart ingress routes `/.well-known/oauth-protected-resource` to this server.
 */
export const MCP_MOUNT_PATH = "/mcp";

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
 * True when the request targets the RFC 9728 protected-resource metadata. The
 * well-known segment is anchored at the host root with the resource path appended
 * as a suffix, so behind the `/mcp` mount the metadata is at
 * `/.well-known/oauth-protected-resource/mcp`; direct-to-service (root-mounted)
 * deployments use the bare `/.well-known/oauth-protected-resource`. Both are
 * accepted so the server works behind the ingress and when hit directly.
 */
export const isProtectedResourceMetadataPath = (
  requestUrl: string | undefined,
): boolean =>
  requestUrl === PROTECTED_RESOURCE_METADATA_PATH ||
  requestUrl === `${PROTECTED_RESOURCE_METADATA_PATH}${MCP_MOUNT_PATH}`;

/**
 * Computes the absolute URL an MCP client should fetch for the protected-resource
 * metadata (the `resource_metadata` of the 401 `WWW-Authenticate` challenge),
 * matching the RFC 9728 path a spec-compliant client constructs from the server
 * URL. It must survive a TLS-terminating, prefix-routing ingress (ADO #5362):
 *  - scheme honours `X-Forwarded-Proto` (https behind the ingress), else the
 *    http the server actually speaks direct-to-service;
 *  - host honours `X-Forwarded-Host`, else the request `Host`;
 *  - the well-known is root-anchored with the mount path appended as a suffix
 *    (`/.well-known/oauth-protected-resource/mcp` behind the ingress, bare when
 *    the request hit the root directly).
 */
export const resolveProtectedResourceMetadataUrl = (
  headers: NodeJS.Dict<string | string[]>,
  requestUrl: string | undefined,
): string => {
  const forwardedProto = firstHeaderValue(headers["x-forwarded-proto"])
    ?.split(",")[0]
    ?.trim();
  const scheme =
    forwardedProto !== undefined && forwardedProto.length > 0
      ? forwardedProto
      : "http";
  const forwardedHost = firstHeaderValue(headers["x-forwarded-host"])
    ?.split(",")[0]
    ?.trim();
  const host =
    forwardedHost !== undefined && forwardedHost.length > 0
      ? forwardedHost
      : (firstHeaderValue(headers.host) ?? "localhost");
  const pathSuffix = requestUrl === MCP_MOUNT_PATH ? MCP_MOUNT_PATH : "";
  return `${scheme}://${host}${PROTECTED_RESOURCE_METADATA_PATH}${pathSuffix}`;
};

/**
 * When OAuth is enabled, an MCP request carrying no caller credential must be
 * challenged (401 + WWW-Authenticate) so the client starts its OAuth flow rather
 * than silently driving Lighthouse anonymously.
 */
export const shouldChallengeForOAuth = (
  headers: NodeJS.Dict<string | string[]>,
  oauthEnabled: boolean,
): boolean => oauthEnabled && !hasCallersOwnCredential(headers);

/** Whether the request carries a credential of the caller's own, rather than relying on the server's. */
export const hasCallersOwnCredential = (
  headers: NodeJS.Dict<string | string[]>,
): boolean =>
  firstHeaderValue(headers["x-api-key"]) !== undefined ||
  parseBearerToken(firstHeaderValue(headers.authorization)) !== undefined;

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

export const NO_SHARED_VOTES =
  "Votes through the shared Lighthouse MCP server need sign-in, and this Lighthouse runs without it. Vote from the web page, the lh command line or an MCP server on your own machine.";

export const NO_OWN_CREDENTIAL =
  "Votes through the shared Lighthouse MCP server need your own API key or sign-in; this request has none.";

/**
 * This server is shared and keeps no voter key for anyone, so without sign-in it cannot tell one voter
 * from another. With sign-in a vote is the credential's, so a request without one of its own would vote
 * as whoever owns the server's fallback key. When the mode cannot be read, Lighthouse itself decides.
 */
export const refuseVotingWithoutSignIn = async (
  lighthouseUrl: string,
  fetch: typeof globalThis.fetch,
  hasOwnCredential: boolean,
): Promise<string | null> => {
  const { mode } = await queryServerAuthMode(lighthouseUrl, { fetch });
  if (mode === "disabled") {
    return NO_SHARED_VOTES;
  }
  return hasOwnCredential ? null : NO_OWN_CREDENTIAL;
};

export type UsageDataSwitch = {
  readonly on: boolean;
  readonly warning?: string;
};

export const USAGE_DATA_ON_LINE = "Usage data: on (LIGHTHOUSE_USAGE_DATA)";
export const USAGE_DATA_OFF_LINE = "Usage data: off";

/**
 * The operator decides for everyone the shared server serves, so nobody is asked and it is off unless
 * LIGHTHOUSE_USAGE_DATA says on. A value that is neither on nor off is warned about but never stops the
 * server: a typo must not break a deployment.
 */
export const resolveUsageDataSwitch = (
  env: NodeJS.ProcessEnv,
): UsageDataSwitch => {
  const value = env.LIGHTHOUSE_USAGE_DATA?.trim() ?? "";
  const normalised = value.toLowerCase();
  if (normalised === "on") {
    return { on: !isDoNotTrackSet(env) };
  }
  if (normalised === "" || normalised === "off") {
    return { on: false };
  }
  return {
    on: false,
    warning: `LIGHTHOUSE_USAGE_DATA takes on or off, not "${value}", so usage data is off.`,
  };
};

/** A yes held in this process's memory only: a restart forgets it, and Lighthouse lets its grant lapse. */
const inMemoryUsageDataStore = (): LighthouseUsageDataStore => {
  let kept: StoredUsageDataAnswer | undefined;
  return {
    read: async () => kept,
    answer: async (answer) => {
      if (kept !== undefined) {
        return false;
      }
      kept = answer;
      return true;
    },
    replace: async (answer) => {
      kept = answer;
    },
    renew: async (token, answer) => {
      if (kept?.answer !== "yes" || kept.token !== token) {
        return false;
      }
      kept = answer;
      return true;
    },
  };
};

export type OperatorsUsageDataDependencies = Pick<
  UsageDataReporterDependencies,
  "lighthouse" | "env" | "now"
>;

// Without a grant, Lighthouse's state is looked at no more than once an hour, so a lifted veto still takes
// effect without a restart and a vetoing Lighthouse is not asked on every tool call.
const STATE_REREAD_INTERVAL_MS = 60 * 60 * 1000;

type SwitchingOn = {
  /** Settles once the state read has decided: when a grant is requested, or when the attempt ends. */
  readonly decided: Promise<void>;
  readonly on: Promise<boolean>;
};

const NOT_DUE: SwitchingOn = {
  decided: Promise.resolve(),
  on: Promise.resolve(false),
};

/**
 * One attempt to switch on, telling the state read a caller waits for apart from the grant it never waits
 * for. A refusal is handed to `whenRefused` before anyone waiting hears the attempt has decided.
 */
const attemptToSwitchOn = (
  reporter: UsageDataReporterDependencies,
  whenRefused: () => void,
): SwitchingOn => {
  let markDecided = (): void => undefined;
  const decided = new Promise<void>((resolve) => {
    markDecided = resolve;
  });
  const { lighthouse } = reporter;
  const watched: UsageDataLighthouse = {
    getUsageDataState: (options) => lighthouse.getUsageDataState(options),
    grantUsageData: (options) => {
      markDecided();
      return lighthouse.grantUsageData(options);
    },
    handInUsageData: (batch, options) =>
      lighthouse.handInUsageData(batch, options),
  };
  const on = switchUsageDataOn({ ...reporter, lighthouse: watched })
    .then(
      (outcome) => outcome === "on",
      () => false,
    )
    .then((switchedOn) => {
      if (!switchedOn) {
        whenRefused();
      }
      return switchedOn;
    })
    .finally(markDecided);
  return { decided, on };
};

/**
 * Usage data as the operator switched it on for everyone the shared server serves: nobody is asked, and one
 * grant is requested for the whole process on the first thing worth counting, however many callers arrive
 * together. Until a grant is had, Lighthouse's state is read at most once an hour. A caller waits only for
 * that state read, bounded like every usage data call, never for the grant or the send.
 */
export const operatorsUsageDataPort = (
  dependencies: OperatorsUsageDataDependencies,
): McpUsageDataPort => {
  const reporter: UsageDataReporterDependencies = {
    ...dependencies,
    store: inMemoryUsageDataStore(),
    source: "Mcp",
  };
  let switching: SwitchingOn | undefined;
  let lastLookedAt: number | undefined;
  const switchOnIfDue = (): SwitchingOn => {
    if (switching !== undefined) {
      return switching;
    }
    const now = dependencies.now().getTime();
    if (
      lastLookedAt !== undefined &&
      now - lastLookedAt < STATE_REREAD_INTERVAL_MS
    ) {
      return NOT_DUE;
    }
    lastLookedAt = now;
    switching = attemptToSwitchOn(reporter, () => {
      switching = undefined;
    });
    return switching;
  };
  return async ({ reached, occurrences }) => {
    if (!reached || occurrences.length === 0) {
      return;
    }
    const attempt = switchOnIfDue();
    void attempt.on.then((on) =>
      on ? settleUsageDataStep(reporter, { reached, occurrences }) : undefined,
    );
    await attempt.decided;
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
  const usageData =
    options.usageData === undefined
      ? undefined
      : operatorsUsageDataPort({
          lighthouse: createLighthouseClient(
            {
              connection: {
                kind: "explicit",
                lighthouseUrl: options.lighthouseUrl,
              },
              auth: { kind: "none" },
            },
            { fetch: insecureFetch },
          ),
          env: options.usageData.env,
          now: () => new Date(),
        });

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
      isProtectedResourceMetadataPath(req.url)
    ) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(buildProtectedResourceMetadata(oauth)));
      return;
    }

    if (req.method === "POST" && (req.url === "/mcp" || req.url === "/")) {
      if (shouldChallengeForOAuth(req.headers, oauth !== undefined)) {
        const metadataUrl = resolveProtectedResourceMetadataUrl(
          req.headers,
          req.url,
        );
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
        refuseVoting: () =>
          refuseVotingWithoutSignIn(
            options.lighthouseUrl,
            insecureFetch,
            hasCallersOwnCredential(req.headers),
          ),
        voterKeyRequired: NO_SHARED_VOTES,
        usageData,
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

  const usageData = resolveUsageDataSwitch(env);

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
    usageData: usageData.on ? { env } : undefined,
  });

  write(renderMcpHttpBanner(server.url));
  if (usageData.warning !== undefined) {
    writeError(usageData.warning);
  }
  write(usageData.on ? USAGE_DATA_ON_LINE : USAGE_DATA_OFF_LINE);
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
