import { describe, expect, it } from "vitest";
import { getMcpHttpPackageContract } from "./index";

describe("mcp-http package contract", () => {
  it("declares streamable-http adapter ownership over mcp-core", () => {
    const contract = getMcpHttpPackageContract();

    expect(contract.name).toBe("@lighthouse/mcp-http");
    expect(contract.dependsOn).toBe("@lighthouse/mcp-core");
    expect(contract.transport).toBe("streamable-http");
  });
});
