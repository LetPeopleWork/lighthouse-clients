import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createFileVoterKeyStore,
  getVoterKeyStorePath,
} from "@letpeoplework/lighthouse-client";
import { describe, expect, it } from "vitest";
import { runMcpStdioRuntime } from "./bin";
import { createLocalVoterKeyStore } from "./runtime";

describe("the local voter key store", () => {
  it("keeps the assistant's key where the lh command line keeps its own, for the one Lighthouse", async () => {
    const env = {
      LIGHTHOUSE_CLI_CONFIG_PATH: join(
        mkdtempSync(join(tmpdir(), "lighthouse-mcp-stdio-voter-")),
        "cli-config.json",
      ),
    };
    const assistants = createLocalVoterKeyStore("http://localhost:5000", env);

    await assistants.save("the-assistants-key");

    expect(await assistants.load()).toBe("the-assistants-key");
    const commandLines = createFileVoterKeyStore(getVoterKeyStorePath(env));
    expect(await commandLines.load("http://localhost:5000")).toBe(
      "the-assistants-key",
    );
    expect(await commandLines.load("standalone")).toBeNull();
  });
});

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
