import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderCliBanner, runCli } from "./bin";

const writeStandaloneLockfile = async (
  lockfilePath: string,
  lighthouseUrl: string,
): Promise<void> => {
  await writeFile(
    lockfilePath,
    JSON.stringify(
      {
        contractVersion: 1,
        lighthouseUrl,
        detectedAtUtc: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
};

const startVersionServer = async (
  version: string,
): Promise<{ readonly url: string; readonly close: () => Promise<void> }> => {
  const server = createServer((request, response) => {
    if (request.url === "/api/v1/version/current") {
      response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(version);
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected an ephemeral TCP port for the test server.");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
};

describe("cli binary entrypoint", () => {
  it("renders the CLI banner", () => {
    expect(renderCliBanner()).toBe("Lighthouse CLI");
  });

  it("writes command errors through provided stderr writer", async () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();
    const previousConfigPath = process.env.LIGHTHOUSE_CLI_CONFIG_PATH;
    process.env.LIGHTHOUSE_CLI_CONFIG_PATH = join(
      tmpdir(),
      `lighthouse-cli-bin-test-${Date.now()}-${Math.random()}.json`,
    );

    try {
      const exitCode = await runCli(["health", "check"], {
        stdout,
        stderr,
      });

      expect(exitCode).toBe(1);
      expect(stdout).not.toHaveBeenCalled();
      expect(stderr).toHaveBeenCalledOnce();
      expect(stderr.mock.calls[0]?.[0]).toContain("Not connected");
    } finally {
      if (previousConfigPath === undefined) {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = undefined;
      } else {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = previousConfigPath;
      }
    }
  });

  it("prints lh-prefixed usage text when no command is given", async () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();
    const previousConfigPath = process.env.LIGHTHOUSE_CLI_CONFIG_PATH;
    process.env.LIGHTHOUSE_CLI_CONFIG_PATH = join(
      tmpdir(),
      `lighthouse-cli-bin-test-${Date.now()}-${Math.random()}.json`,
    );

    try {
      const exitCode = await runCli([], { stdout, stderr });

      expect(exitCode).toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      expect(stdout).toHaveBeenCalledOnce();
      const helpText = stdout.mock.calls[0]?.[0] ?? "";
      expect(helpText).toContain("lh connect");
      expect(helpText).toContain("lh connection");
      expect(helpText).toContain(
        "You must be connected before running commands",
      );
      expect(helpText).not.toContain("  lighthouse ");
    } finally {
      if (previousConfigPath === undefined) {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = undefined;
      } else {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = previousConfigPath;
      }
    }
  });

  it("prints lh-prefixed usage text when only one argument is given", async () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();
    const previousConfigPath = process.env.LIGHTHOUSE_CLI_CONFIG_PATH;
    process.env.LIGHTHOUSE_CLI_CONFIG_PATH = join(
      tmpdir(),
      `lighthouse-cli-bin-test-${Date.now()}-${Math.random()}.json`,
    );

    try {
      const exitCode = await runCli(["team"], { stdout, stderr });

      expect(exitCode).toBe(1);
      expect(stderr).toHaveBeenCalledOnce();
      const helpText = stderr.mock.calls[0]?.[0] ?? "";
      expect(helpText).toContain("lh connect");
    } finally {
      if (previousConfigPath === undefined) {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = undefined;
      } else {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = previousConfigPath;
      }
    }
  });

  it("persists the configured default output format in the cli config", async () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();
    const configPath = join(
      tmpdir(),
      `lighthouse-cli-bin-test-${Date.now()}-${Math.random()}.json`,
    );
    const previousConfigPath = process.env.LIGHTHOUSE_CLI_CONFIG_PATH;
    process.env.LIGHTHOUSE_CLI_CONFIG_PATH = configPath;

    try {
      const exitCode = await runCli(
        ["config", "output", "set", "--format", "json"],
        { stdout, stderr },
      );

      expect(exitCode).toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const savedConfig = JSON.parse(await readFile(configPath, "utf8")) as {
        readonly outputFormat?: string;
      };
      expect(savedConfig.outputFormat).toBe("json");
    } finally {
      if (previousConfigPath === undefined) {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = undefined;
      } else {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = previousConfigPath;
      }
    }
  });

  it("preserves the saved default output format when disconnecting", async () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();
    const configPath = join(
      tmpdir(),
      `lighthouse-cli-bin-test-${Date.now()}-${Math.random()}.json`,
    );
    const previousConfigPath = process.env.LIGHTHOUSE_CLI_CONFIG_PATH;
    process.env.LIGHTHOUSE_CLI_CONFIG_PATH = configPath;

    await writeFile(
      configPath,
      JSON.stringify(
        {
          version: 2,
          connection: {
            mode: "server",
            endpointUrl: "http://localhost:5000",
            authMode: "disabled",
          },
          outputFormat: "toon",
        },
        null,
        2,
      ),
      "utf8",
    );

    try {
      const exitCode = await runCli(["disconnect"], { stdout, stderr });

      expect(exitCode).toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      const savedConfig = JSON.parse(await readFile(configPath, "utf8")) as {
        readonly connection?: unknown;
        readonly outputFormat?: string;
      };
      expect(savedConfig.connection).toBeUndefined();
      expect(savedConfig.outputFormat).toBe("toon");
    } finally {
      if (previousConfigPath === undefined) {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = undefined;
      } else {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = previousConfigPath;
      }
    }
  });

  it("resolves standalone URLs from the lockfile on every CLI startup", async () => {
    const firstServer = await startVersionServer("v1.0.0");
    const secondServer = await startVersionServer("v2.0.0");
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();
    const configPath = join(
      tmpdir(),
      `lighthouse-cli-bin-test-${Date.now()}-${Math.random()}.json`,
    );
    const lockfilePath = join(
      tmpdir(),
      `lighthouse-standalone-lock-${Date.now()}-${Math.random()}.json`,
    );
    const previousConfigPath = process.env.LIGHTHOUSE_CLI_CONFIG_PATH;
    const previousLockfilePath =
      process.env.LIGHTHOUSE_STANDALONE_LOCKFILE_PATH;
    process.env.LIGHTHOUSE_CLI_CONFIG_PATH = configPath;
    process.env.LIGHTHOUSE_STANDALONE_LOCKFILE_PATH = lockfilePath;

    await writeFile(
      configPath,
      JSON.stringify(
        {
          version: 2,
          connection: {
            mode: "standalone",
            authMode: "disabled",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    try {
      await writeStandaloneLockfile(lockfilePath, firstServer.url);

      const firstExitCode = await runCli(["version", "get"], {
        stdout,
        stderr,
      });

      expect(firstExitCode).toBe(0);
      expect(stderr).not.toHaveBeenCalled();
      expect(stdout.mock.calls[0]?.[0]).toContain("v1.0.0");

      stdout.mockClear();

      await writeStandaloneLockfile(lockfilePath, secondServer.url);

      const secondExitCode = await runCli(["version", "get"], {
        stdout,
        stderr,
      });

      expect(secondExitCode).toBe(0);
      expect(stdout.mock.calls[0]?.[0]).toContain("v2.0.0");
      const savedConfig = JSON.parse(await readFile(configPath, "utf8")) as {
        readonly connection?: {
          readonly endpointUrl?: string;
          readonly mode?: string;
        };
      };
      expect(savedConfig.connection?.mode).toBe("standalone");
      expect(savedConfig.connection?.endpointUrl).toBeUndefined();
    } finally {
      await firstServer.close();
      await secondServer.close();
      if (previousConfigPath === undefined) {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = undefined;
      } else {
        process.env.LIGHTHOUSE_CLI_CONFIG_PATH = previousConfigPath;
      }
      if (previousLockfilePath === undefined) {
        process.env.LIGHTHOUSE_STANDALONE_LOCKFILE_PATH = undefined;
      } else {
        process.env.LIGHTHOUSE_STANDALONE_LOCKFILE_PATH = previousLockfilePath;
      }
    }
  });
});
