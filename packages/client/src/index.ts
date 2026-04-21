export type ClientCapability =
  | "versioned-api-contracts"
  | "shared-domain-operations";

export type ClientPackageContract = {
  readonly name: "@lighthouse/client";
  readonly capabilities: readonly ClientCapability[];
};

export const getClientPackageContract = (): ClientPackageContract => ({
  name: "@lighthouse/client",
  capabilities: ["versioned-api-contracts", "shared-domain-operations"],
});
