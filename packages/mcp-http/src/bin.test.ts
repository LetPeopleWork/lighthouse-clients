import { describe, expect, it, vi } from "vitest";
import { renderMcpHttpBanner, runMcpHttpRuntime } from "./bin";

describe("mcp-http runtime entrypoint", () => {
  it("renders baseline hosted runtime banner", () => {
    expect(renderMcpHttpBanner()).toBe("Lighthouse MCP HTTP runtime skeleton");
  });

  it("writes runtime status through provided writer", () => {
    const write = vi.fn<(message: string) => void>();

    runMcpHttpRuntime(write);

    expect(write).toHaveBeenCalledOnce();
    expect(write).toHaveBeenCalledWith("Lighthouse MCP HTTP runtime skeleton");
  });
});
