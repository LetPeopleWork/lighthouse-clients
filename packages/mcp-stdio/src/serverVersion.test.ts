import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runMcpStdioRuntime } from "./runtime";

const wire = vi.hoisted(() => ({ clientSide: undefined as unknown }));

// The runtime talks over the process's own stdin and stdout; the test hands it one end of an in-memory pair.
vi.mock("@modelcontextprotocol/sdk/server/stdio.js", async () => {
  const { InMemoryTransport } = await import(
    "@modelcontextprotocol/sdk/inMemory.js"
  );
  return {
    StdioServerTransport: class {
      constructor() {
        const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
        wire.clientSide = clientSide;
        // biome-ignore lint/correctness/noConstructorReturn: the runtime must get the in-memory end itself
        return serverSide;
      }
    },
  };
});

const packageVersion = (
  JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { readonly version: string }
).version;

describe("the stdio MCP server", () => {
  const signalListeners = {
    SIGINT: process.listeners("SIGINT"),
    SIGTERM: process.listeners("SIGTERM"),
  };

  afterEach(() => {
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      for (const listener of process.listeners(signal)) {
        if (!signalListeners[signal].includes(listener)) {
          process.off(signal, listener);
        }
      }
    }
  });

  it("reports its package's own version to the assistant", async () => {
    expect(
      await runMcpStdioRuntime({ LIGHTHOUSE_URL: "http://127.0.0.1:5000" }),
    ).toBe(0);

    const client = new Client({ name: "version-test", version: "0.0.0" });
    await client.connect(wire.clientSide as Transport);
    try {
      expect(client.getServerVersion()?.version).toBe(packageVersion);
    } finally {
      await client.close();
    }
  });
});
