import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderCliBanner, runCli } from "./bin";

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
});
