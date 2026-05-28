import { describe, expect, it } from "vitest";
import { getClientPackageContract, isServerVersionNewerThan } from "./index";

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

describe("isServerVersionNewerThan (server-version gating)", () => {
  it.each([
    { candidate: "v26.5.25.1", baseline: "v26.5.24.10", expected: true },
    { candidate: "v26.6.1.1", baseline: "v26.5.24.10", expected: true },
    { candidate: "v27.1.1.1", baseline: "v26.5.24.10", expected: true },
    { candidate: "v26.5.24.11", baseline: "v26.5.24.10", expected: true },
  ])(
    "returns true when $candidate is newer than $baseline",
    ({ candidate, baseline, expected }) => {
      expect(isServerVersionNewerThan(candidate, baseline)).toBe(expected);
    },
  );

  it.each([
    { candidate: "v26.5.24.10", baseline: "v26.5.24.10" },
    { candidate: "v26.5.24.9", baseline: "v26.5.24.10" },
    { candidate: "v26.5.19.1", baseline: "v26.5.24.10" },
    { candidate: "v25.12.31.99", baseline: "v26.5.24.10" },
  ])(
    "returns false when $candidate is equal-or-older than $baseline",
    ({ candidate, baseline }) => {
      expect(isServerVersionNewerThan(candidate, baseline)).toBe(false);
    },
  );

  it("tolerates a missing 'v' prefix and differing segment counts", () => {
    expect(isServerVersionNewerThan("26.5.25", "v26.5.24.10")).toBe(true);
    expect(isServerVersionNewerThan("v26.5.24", "26.5.24.10")).toBe(false);
  });

  it("returns null (do not block) for unparseable versions like DEV builds", () => {
    expect(isServerVersionNewerThan("DEV", "v26.5.24.10")).toBeNull();
    expect(isServerVersionNewerThan("", "v26.5.24.10")).toBeNull();
    expect(isServerVersionNewerThan("v26.5.24.10", "local")).toBeNull();
  });
});
