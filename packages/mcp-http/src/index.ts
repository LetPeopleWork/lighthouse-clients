export type McpHttpPackageContract = {
  readonly name: "@lighthouse/mcp-http";
  readonly dependsOn: "@lighthouse/mcp-core";
  readonly transport: "streamable-http";
};

export const getMcpHttpPackageContract = (): McpHttpPackageContract => ({
  name: "@lighthouse/mcp-http",
  dependsOn: "@lighthouse/mcp-core",
  transport: "streamable-http",
});
