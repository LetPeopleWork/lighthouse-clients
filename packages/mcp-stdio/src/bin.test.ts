import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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

describe("bin launch guard (npx regression)", () => {
  const binPath = join(fileURLToPath(import.meta.url), "../../dist/bin.js");

  it.skipIf(!existsSync(binPath))(
    "exits with code 1 and prints error when spawned without LIGHTHOUSE_URL",
    () => {
      const result = spawnSync(process.execPath, [binPath], {
        env: {
          ...process.env,
          LIGHTHOUSE_URL: undefined,
          LIGHTHOUSE_STANDALONE_LOCKFILE_PATH:
            "/tmp/lighthouse-mcp-stdio-launch-test-missing.lock.json",
        },
        timeout: 5000,
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Failed to resolve Lighthouse URL");
    },
  );
});
