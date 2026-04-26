import { describe, expect, it } from "vitest";
import { queryServerAuthMode, startCliAuthSession } from "./index";

type MockResponse = {
  readonly ok: boolean;
  readonly status: number;
  readonly text: () => Promise<string>;
  readonly json: () => Promise<unknown>;
};

const getResponse = (response: {
  readonly ok: boolean;
  readonly status: number;
  readonly text?: string;
  readonly json?: unknown;
}): MockResponse => ({
  ok: response.ok,
  status: response.status,
  text: async () => response.text ?? "",
  json: async () => response.json ?? {},
});

describe("CLI auth helpers", () => {
  it("normalizes trailing slash endpoint when querying auth mode", async () => {
    let calledUrl = "";
    const result = await queryServerAuthMode("http://localhost:5000/", {
      fetch: async (url) => {
        calledUrl = url;
        return getResponse({
          ok: true,
          status: 200,
          json: { mode: "Enabled" },
        });
      },
    });

    expect(result.mode).toBe("required");
    expect(calledUrl).toBe("http://localhost:5000/api/v1/auth/mode");
  });

  it("maps enabled server auth mode to required", async () => {
    const result = await queryServerAuthMode("http://localhost:5000", {
      fetch: async () =>
        getResponse({
          ok: true,
          status: 200,
          json: { mode: "Enabled" },
        }),
    });

    expect(result.mode).toBe("required");
  });

  it("returns misconfigured auth mode with body reason when endpoint fails", async () => {
    const result = await queryServerAuthMode("http://localhost:5000", {
      fetch: async () =>
        getResponse({
          ok: false,
          status: 404,
          text: "auth mode endpoint unavailable",
        }),
    });

    expect(result.mode).toBe("misconfigured");
    expect(result.misconfigurationMessage).toContain(
      "auth mode endpoint unavailable",
    );
  });

  it("starts cli auth session when endpoint responds successfully", async () => {
    let calledUrl = "";
    const result = await startCliAuthSession("http://localhost:5000", {
      fetch: async (url) => {
        calledUrl = url;
        return getResponse({
          ok: true,
          status: 200,
          json: {
            sessionId: "sess-123",
            verificationUrl:
              "http://localhost:5000/api/v1/auth/cli/verify/sess-123",
            expiresAt: "2026-01-01T00:00:00.000Z",
          },
        });
      },
    });

    expect(result.status).toBe("started");
    if (result.status !== "started") {
      throw new Error("Expected started status");
    }

    expect(result.sessionId).toBe("sess-123");
    expect(calledUrl).toBe("http://localhost:5000/api/v1/auth/cli/session");
  });

  it("normalizes trailing slash endpoint when starting cli auth session", async () => {
    let calledUrl = "";
    const result = await startCliAuthSession("http://localhost:5000/", {
      fetch: async (url) => {
        calledUrl = url;
        return getResponse({
          ok: true,
          status: 200,
          json: {
            sessionId: "sess-123",
            verificationUrl:
              "http://localhost:5000/api/v1/auth/cli/verify/sess-123",
            expiresAt: "2026-01-01T00:00:00.000Z",
          },
        });
      },
    });

    expect(result.status).toBe("started");
    expect(calledUrl).toBe("http://localhost:5000/api/v1/auth/cli/session");
  });

  it("returns categorized error when cli auth session endpoint rejects the request", async () => {
    const result = await startCliAuthSession("http://localhost:5000", {
      fetch: async () =>
        getResponse({
          ok: false,
          status: 401,
          text: "Unauthorized",
        }),
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") {
      throw new Error("Expected error status");
    }

    expect(result.category).toBe("unauthorized");
    expect(result.reason).toContain("Unauthorized");
  });

  it("returns unreachable error when cli auth session endpoint cannot be reached", async () => {
    const result = await startCliAuthSession("http://localhost:5000", {
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") {
      throw new Error("Expected error status");
    }

    expect(result.category).toBe("unreachable");
    expect(result.reason).toContain("fetch failed");
  });
});
