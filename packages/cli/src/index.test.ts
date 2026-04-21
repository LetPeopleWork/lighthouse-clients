import { describe, expect, it } from "vitest";
import { getCliPackageContract } from "./index";

describe("cli package contract", () => {
  it("declares a user-facing runtime over shared client contracts", () => {
    const contract = getCliPackageContract();

    expect(contract.name).toBe("@lighthouse/cli");
    expect(contract.dependsOn).toBe("@lighthouse/client");
    expect(contract.runtime).toBe("command-line");
  });
});
