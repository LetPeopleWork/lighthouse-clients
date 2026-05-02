export type McpHttpPackageContract = {
  readonly name: "@letpeoplework/lighthouse-mcp-http";
  readonly dependsOn: "@letpeoplework/lighthouse-mcp-core";
  readonly transport: "streamable-http";
};

export const getMcpHttpPackageContract = (): McpHttpPackageContract => ({
  name: "@letpeoplework/lighthouse-mcp-http",
  dependsOn: "@letpeoplework/lighthouse-mcp-core",
  transport: "streamable-http",
});
