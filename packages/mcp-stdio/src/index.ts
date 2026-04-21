export type McpStdioPackageContract = {
  readonly name: "@lighthouse/mcp-stdio";
  readonly dependsOn: "@lighthouse/mcp-core";
  readonly transport: "stdio";
};

export const getMcpStdioPackageContract = (): McpStdioPackageContract => ({
  name: "@lighthouse/mcp-stdio",
  dependsOn: "@lighthouse/mcp-core",
  transport: "stdio",
});
