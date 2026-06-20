import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  type McpHttpServerHandle,
  PROTECTED_RESOURCE_METADATA_PATH,
  startMcpHttpServer,
} from "./bin";

const ISSUER = "https://idp.example.test";
const RESOURCE = "https://lighthouse.example/api";

const postMcp = (
  url: string,
  headers: Record<string, string> = {},
): Promise<Response> =>
  fetch(`${url}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "0.0.0" },
      },
    }),
  });

describe("mcp-http advertises MCP OAuth protected-resource metadata", () => {
  let mcp: McpHttpServerHandle;

  beforeEach(async () => {
    mcp = await startMcpHttpServer({
      lighthouseUrl: "http://127.0.0.1:9999",
      host: "127.0.0.1",
      port: 0,
      oauth: { issuer: ISSUER, resource: RESOURCE },
    });
  });

  afterEach(async () => {
    await mcp.close();
  });

  it("serves RFC 9728 protected-resource metadata naming the IdP and resource", async () => {
    const response = await fetch(
      `${mcp.url}${PROTECTED_RESOURCE_METADATA_PATH}`,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      readonly resource: string;
      readonly authorization_servers: readonly string[];
    };
    expect(body.resource).toBe(RESOURCE);
    expect(body.authorization_servers).toEqual([ISSUER]);
  });

  it("challenges an uncredentialed /mcp request with 401 and a resource_metadata pointer", async () => {
    const response = await postMcp(mcp.url);

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "resource_metadata=",
    );
    expect(response.headers.get("www-authenticate")).toContain(
      PROTECTED_RESOURCE_METADATA_PATH,
    );
    await response.body?.cancel();
  });

  it("does not challenge a request that already carries a Bearer token", async () => {
    const response = await postMcp(mcp.url, { authorization: "Bearer abc" });

    expect(response.status).not.toBe(401);
    await response.body?.cancel();
  });
});

describe("mcp-http with OAuth disabled keeps its existing behaviour", () => {
  let mcp: McpHttpServerHandle;

  beforeEach(async () => {
    mcp = await startMcpHttpServer({
      lighthouseUrl: "http://127.0.0.1:9999",
      host: "127.0.0.1",
      port: 0,
    });
  });

  afterEach(async () => {
    await mcp.close();
  });

  it("does not serve the protected-resource metadata endpoint", async () => {
    const response = await fetch(
      `${mcp.url}${PROTECTED_RESOURCE_METADATA_PATH}`,
    );

    expect(response.status).toBe(404);
    await response.body?.cancel();
  });

  it("does not challenge an uncredentialed /mcp request", async () => {
    const response = await postMcp(mcp.url);

    expect(response.status).not.toBe(401);
    await response.body?.cancel();
  });
});
