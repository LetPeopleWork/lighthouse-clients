import { describe, expect, it } from "vitest";
import { getCliPackageContract } from "./index";

describe("cli package contract", () => {
  it("declares a user-facing runtime over shared client contracts", () => {
    const contract = getCliPackageContract();

    expect(contract.name).toBe("@letpeoplework/lighthouse-cli");
    expect(contract.dependsOn).toBe("@letpeoplework/lighthouse-client");
    expect(contract.runtime).toBe("command-line");
  });
});
