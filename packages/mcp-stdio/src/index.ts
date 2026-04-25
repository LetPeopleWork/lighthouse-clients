export type McpStdioPackageContract = {
  readonly name: "@letpeoplework/lighthouse-mcp-stdio";
  readonly dependsOn: "@letpeoplework/lighthouse-mcp-core";
  readonly transport: "stdio";
};

export const getMcpStdioPackageContract = (): McpStdioPackageContract => ({
  name: "@letpeoplework/lighthouse-mcp-stdio",
  dependsOn: "@letpeoplework/lighthouse-mcp-core",
  transport: "stdio",
});
