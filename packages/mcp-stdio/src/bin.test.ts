import { describe, expect, it } from "vitest";
import { runMcpStdioRuntime } from "./bin";

describe("runMcpStdioRuntime", () => {
  it("returns startup error when neither LIGHTHOUSE_URL nor lockfile is available", async () => {
    const originalOverride = process.env.LIGHTHOUSE_STANDALONE_LOCKFILE_PATH;
    process.env.LIGHTHOUSE_STANDALONE_LOCKFILE_PATH =
      "/tmp/lighthouse-mcp-stdio-missing.lock.json";

    try {
      const code = await runMcpStdioRuntime({});
      expect(code).toBe(1);
    } finally {
      process.env.LIGHTHOUSE_STANDALONE_LOCKFILE_PATH = originalOverride;
    }
  });
});
