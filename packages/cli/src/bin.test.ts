import { describe, expect, it, vi } from "vitest";
import { renderCliBanner, runCli } from "./bin";

describe("cli binary entrypoint", () => {
  it("renders the CLI banner", () => {
    expect(renderCliBanner()).toBe("Lighthouse CLI");
  });

  it("writes command errors through provided stderr writer", async () => {
    const stdout = vi.fn<(message: string) => void>();
    const stderr = vi.fn<(message: string) => void>();

    const exitCode = await runCli(["health", "check"], {
      stdout,
      stderr,
    });

    expect(exitCode).toBe(1);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledOnce();
    expect(stderr.mock.calls[0]?.[0]).toContain("No endpoint configured");
  });
});
