// RED scaffold, created before the behaviour exists. The local MCP server as `runMcpStdioRuntime` builds it,
// before it is connected to stdio: the tools, the voter key and usage data answers kept beside lh's, and
// the usage data question put through the assistant. `runMcpStdioRuntime` connects what this returns.
// DELIVER replaces the body and removes the marker.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const __SCAFFOLD__ = true;

/**
 * The server for the Lighthouse `env` names (`LIGHTHOUSE_URL`, `LIGHTHOUSE_API_KEY`), keeping its answers
 * where `LIGHTHOUSE_CLI_CONFIG_PATH` (or `HOME`) says lh keeps its own, honouring `DO_NOT_TRACK`; null when
 * no Lighthouse can be resolved.
 */
export const createLocalLighthouseMcpServer = async (
  _env: Readonly<Record<string, string | undefined>>,
): Promise<McpServer | null> => {
  throw new Error("Not yet implemented -- RED scaffold");
};
