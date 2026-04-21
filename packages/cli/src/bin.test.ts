import { describe, expect, it, vi } from "vitest";
import { renderCliBanner, runCli } from "./bin";

describe("cli binary entrypoint", () => {
  it("renders the baseline skeleton banner", () => {
    expect(renderCliBanner()).toBe("Lighthouse CLI skeleton");
  });

  it("writes banner output through provided writer", () => {
    const write = vi.fn<(message: string) => void>();

    runCli(write);

    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith("Lighthouse CLI skeleton");
  });
});
