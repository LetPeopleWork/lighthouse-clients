import { describe, expect, it } from "vitest";
import { createLighthouseAuthContext } from "./index";

type PersistedAuthState =
  | {
      readonly kind: "api-key";
      readonly value: string;
      readonly headerName?: string;
    }
  | {
      readonly kind: "bearer-token";
      readonly token: string;
    }
  | {
      readonly kind: "none";
    };

const getStore = (initialState: PersistedAuthState | null = null) => {
  let state = initialState;

  return {
    store: {
      load: async () => state,
      save: async (nextState: PersistedAuthState) => {
        state = nextState;
      },
      clear: async () => {
        state = null;
      },
    },
    getState: () => state,
  };
};

describe("createLighthouseAuthContext", () => {
  it("resolves stored API key auth when no override is provided", async () => {
    const { store } = getStore({
      kind: "api-key",
      value: "stored-key",
    });
    const authContext = createLighthouseAuthContext(store);

    const auth = await authContext.resolveAuth();

    expect(auth).toEqual({
      kind: "api-key",
      value: "stored-key",
    });
  });

  it("allows override auth without mutating stored credentials", async () => {
    const { store, getState } = getStore({
      kind: "api-key",
      value: "stored-key",
    });
    const authContext = createLighthouseAuthContext(store);

    const auth = await authContext.resolveAuth({
      bearerToken: "override-token",
    });

    expect(auth).toEqual({
      kind: "bearer-token",
      token: "override-token",
    });
    expect(getState()).toEqual({
      kind: "api-key",
      value: "stored-key",
    });
  });

  it("persists API key credentials through login", async () => {
    const { store, getState } = getStore();
    const authContext = createLighthouseAuthContext(store);

    await authContext.login({
      apiKey: "new-key",
    });

    expect(getState()).toEqual({
      kind: "api-key",
      value: "new-key",
    });
  });

  it("clears persisted credentials through logout", async () => {
    const { store, getState } = getStore({
      kind: "bearer-token",
      token: "stored-token",
    });
    const authContext = createLighthouseAuthContext(store);

    await authContext.logout();

    expect(getState()).toBeNull();
  });

  it("returns a sanitized auth status without exposing secrets", async () => {
    const { store } = getStore({
      kind: "api-key",
      value: "stored-key",
    });
    const authContext = createLighthouseAuthContext(store);

    const status = await authContext.getStatus();

    expect(status).toEqual({
      isAuthenticated: true,
      kind: "api-key",
      source: "stored",
    });
    expect(JSON.stringify(status)).not.toContain("stored-key");
  });
});
