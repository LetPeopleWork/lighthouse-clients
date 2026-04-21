export type McpCorePackageContract = {
  readonly name: "@lighthouse/mcp-core";
  readonly dependsOn: "@lighthouse/client";
  readonly transports: readonly ["stdio", "streamable-http"];
};

export const getMcpCorePackageContract = (): McpCorePackageContract => ({
  name: "@lighthouse/mcp-core",
  dependsOn: "@lighthouse/client",
  transports: ["stdio", "streamable-http"],
});
