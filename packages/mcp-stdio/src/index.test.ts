import { describe, expect, it } from "vitest";
import { getMcpStdioPackageContract } from "./index";

describe("mcp-stdio package contract", () => {
  it("declares stdio adapter ownership over mcp-core", () => {
    const contract = getMcpStdioPackageContract();

    expect(contract.name).toBe("@lighthouse/mcp-stdio");
    expect(contract.dependsOn).toBe("@lighthouse/mcp-core");
    expect(contract.transport).toBe("stdio");
  });
});
