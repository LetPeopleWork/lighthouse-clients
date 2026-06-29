import { describe, expect, it } from "vitest";
import {
  buildProtectedResourceMetadata,
  evaluateOAuthVersionGate,
  isProtectedResourceMetadataPath,
  resolveOAuthConfigFromEnv,
  resolveProtectedResourceMetadataUrl,
  shouldChallengeForOAuth,
} from "./bin";

describe("buildProtectedResourceMetadata (RFC 9728)", () => {
  it("names the IdP as the authorization server and the configured resource", () => {
    const metadata = buildProtectedResourceMetadata({
      issuer: "https://idp.example.test",
      resource: "https://lighthouse.example/api",
    });

    expect(metadata).toEqual({
      resource: "https://lighthouse.example/api",
      authorization_servers: ["https://idp.example.test"],
      bearer_methods_supported: ["header"],
    });
  });
});

describe("shouldChallengeForOAuth", () => {
  it("challenges when OAuth is enabled and no caller credential is present", () => {
    expect(shouldChallengeForOAuth({}, true)).toBe(true);
  });

  it("does not challenge when OAuth is disabled", () => {
    expect(shouldChallengeForOAuth({}, false)).toBe(false);
  });

  it("does not challenge when a Bearer token is present", () => {
    expect(
      shouldChallengeForOAuth({ authorization: "Bearer token" }, true),
    ).toBe(false);
  });

  it("does not challenge when an X-Api-Key is present", () => {
    expect(shouldChallengeForOAuth({ "x-api-key": "key" }, true)).toBe(false);
  });

  it("challenges when the Authorization header is not a Bearer token", () => {
    expect(shouldChallengeForOAuth({ authorization: "Basic abc" }, true)).toBe(
      true,
    );
  });
});

describe("resolveOAuthConfigFromEnv", () => {
  it("returns the OAuth config when issuer and resource are both set", () => {
    const result = resolveOAuthConfigFromEnv({
      LIGHTHOUSE_OAUTH_ISSUER: "https://idp.example.test",
      LIGHTHOUSE_OAUTH_RESOURCE: "https://lighthouse.example/api",
    });

    expect(result).toEqual({
      oauth: {
        issuer: "https://idp.example.test",
        resource: "https://lighthouse.example/api",
      },
    });
  });

  it("returns nothing (OAuth off) when neither is set", () => {
    expect(resolveOAuthConfigFromEnv({})).toEqual({});
  });

  it("errors when only the issuer is set", () => {
    const result = resolveOAuthConfigFromEnv({
      LIGHTHOUSE_OAUTH_ISSUER: "https://idp.example.test",
    });

    expect(result.oauth).toBeUndefined();
    expect(result.error).toContain("LIGHTHOUSE_OAUTH_RESOURCE");
  });

  it("errors when only the resource is set", () => {
    const result = resolveOAuthConfigFromEnv({
      LIGHTHOUSE_OAUTH_RESOURCE: "https://lighthouse.example/api",
    });

    expect(result.oauth).toBeUndefined();
    expect(result.error).toContain("LIGHTHOUSE_OAUTH_ISSUER");
  });
});

describe("resolveProtectedResourceMetadataUrl (RFC 9728 discovery, ADO #5362)", () => {
  it("advertises https + the /mcp mount path behind a TLS ingress", () => {
    // Regression: behind the chart's TLS ingress (routes only /mcp), the old
    // hardcoded `http://host/.well-known/...` was wrong scheme + unreachable.
    const url = resolveProtectedResourceMetadataUrl(
      { host: "lighthouse.local", "x-forwarded-proto": "https" },
      "/mcp",
    );

    expect(url).toBe(
      "https://lighthouse.local/mcp/.well-known/oauth-protected-resource",
    );
  });

  it("preserves direct-to-service behaviour (http + root path)", () => {
    const url = resolveProtectedResourceMetadataUrl(
      { host: "localhost:3000" },
      "/",
    );

    expect(url).toBe(
      "http://localhost:3000/.well-known/oauth-protected-resource",
    );
  });

  it("honours X-Forwarded-Host over the request Host", () => {
    const url = resolveProtectedResourceMetadataUrl(
      {
        host: "lighthouse-mcp.svc",
        "x-forwarded-host": "lighthouse.local",
        "x-forwarded-proto": "https",
      },
      "/mcp",
    );

    expect(url).toBe(
      "https://lighthouse.local/mcp/.well-known/oauth-protected-resource",
    );
  });

  it("takes the first hop of a comma-joined X-Forwarded-Proto", () => {
    const url = resolveProtectedResourceMetadataUrl(
      { host: "lighthouse.local", "x-forwarded-proto": "https, http" },
      "/mcp",
    );

    expect(url).toBe(
      "https://lighthouse.local/mcp/.well-known/oauth-protected-resource",
    );
  });
});

describe("isProtectedResourceMetadataPath (ADO #5362)", () => {
  it("matches the host-root well-known path (direct-to-service)", () => {
    expect(
      isProtectedResourceMetadataPath("/.well-known/oauth-protected-resource"),
    ).toBe(true);
  });

  it("matches the /mcp-mounted well-known path (behind the ingress)", () => {
    expect(
      isProtectedResourceMetadataPath(
        "/mcp/.well-known/oauth-protected-resource",
      ),
    ).toBe(true);
  });

  it("does not match the MCP POST mount itself", () => {
    expect(isProtectedResourceMetadataPath("/mcp")).toBe(false);
  });

  it("does not match an unrelated path", () => {
    expect(isProtectedResourceMetadataPath("/other")).toBe(false);
  });
});

describe("evaluateOAuthVersionGate", () => {
  it("blocks OAuth against a server older than the baseline with an upgrade message", () => {
    const result = evaluateOAuthVersionGate("v26.6.16.13", "v26.6.16.14");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Upgrade Lighthouse");
      expect(result.error).toContain("v26.6.16.14");
    }
  });

  it("blocks OAuth when the server equals the baseline (must be strictly newer)", () => {
    expect(evaluateOAuthVersionGate("v26.6.16.14", "v26.6.16.14").ok).toBe(
      false,
    );
  });

  it("allows OAuth against a server newer than the baseline", () => {
    expect(evaluateOAuthVersionGate("v26.6.16.15", "v26.6.16.14").ok).toBe(
      true,
    );
  });

  it("does not block when the version is unknown (null)", () => {
    expect(evaluateOAuthVersionGate(null, "v26.6.16.14").ok).toBe(true);
  });

  it("does not block a dev / unparseable version", () => {
    expect(evaluateOAuthVersionGate("DEV", "v26.6.16.14").ok).toBe(true);
  });
});
