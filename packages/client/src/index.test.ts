import { describe, expect, it } from "vitest";
import { getClientPackageContract } from "./index";

describe("client package contract", () => {
  it("exposes shared client identity and capabilities", () => {
    const contract = getClientPackageContract();

    expect(contract.name).toBe("@letpeoplework/lighthouse-client");
    expect(contract.capabilities).toContain("versioned-api-contracts");
    expect(contract.capabilities).toContain("shared-domain-operations");
    expect(contract.capabilities).toContain(
      "connectivity-and-discovery-contracts",
    );
    expect(contract.capabilities).toContain("automation-auth-contracts");
  });
});
