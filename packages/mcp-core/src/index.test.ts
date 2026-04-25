import { describe, expect, it } from "vitest";
import { getMcpCorePackageContract } from "./index";

describe("mcp-core package contract", () => {
  it("declares shared semantics used by multiple transports", () => {
    const contract = getMcpCorePackageContract();

    expect(contract.name).toBe("@letpeoplework/lighthouse-mcp-core");
    expect(contract.dependsOn).toBe("@letpeoplework/lighthouse-client");
    expect(contract.transports).toEqual(["stdio", "streamable-http"]);
  });
});
