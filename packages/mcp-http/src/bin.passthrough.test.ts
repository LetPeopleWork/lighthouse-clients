import { describe, expect, it } from "vitest";
import { resolveRequestAuth } from "./bin";

describe("resolveRequestAuth — per-caller credential pass-through", () => {
  it("uses the caller's X-Api-Key header as the api-key credential", () => {
    const auth = resolveRequestAuth({ "x-api-key": "caller-key" }, "baked-key");

    expect(auth).toEqual({ kind: "api-key", value: "caller-key" });
  });

  it("uses the caller's Authorization Bearer token", () => {
    const auth = resolveRequestAuth(
      { authorization: "Bearer caller-token" },
      "baked-key",
    );

    expect(auth).toEqual({ kind: "bearer-token", token: "caller-token" });
  });

  it("prefers the caller's X-Api-Key over an Authorization header", () => {
    const auth = resolveRequestAuth(
      { "x-api-key": "caller-key", authorization: "Bearer caller-token" },
      "baked-key",
    );

    expect(auth).toEqual({ kind: "api-key", value: "caller-key" });
  });

  it("falls back to the configured baked key when the caller sends no credential", () => {
    const auth = resolveRequestAuth({}, "baked-key");

    expect(auth).toEqual({ kind: "api-key", value: "baked-key" });
  });

  it("returns none when neither a caller credential nor a baked key is present", () => {
    const auth = resolveRequestAuth({}, undefined);

    expect(auth).toEqual({ kind: "none" });
  });

  it("ignores a blank X-Api-Key and falls through to the baked key", () => {
    const auth = resolveRequestAuth({ "x-api-key": "   " }, "baked-key");

    expect(auth).toEqual({ kind: "api-key", value: "baked-key" });
  });

  it("ignores a malformed Authorization header without a bearer token", () => {
    const auth = resolveRequestAuth({ authorization: "Bearer " }, undefined);

    expect(auth).toEqual({ kind: "none" });
  });
});
