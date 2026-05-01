#!/usr/bin/env node
"use strict";
/**
 * launcher.cjs — MCPB bundle entry point for @letpeoplework/lighthouse-mcp-stdio.
 *
 * When a user installs the .mcpb bundle, their MCP client runs this file via
 * `node ${bundle_dir}/server/launcher.cjs`.  The launcher loads the self-contained
 * mcpb-runtime.cjs bundle co-located in this directory and starts the MCP server
 * in-process.  No npx, no network access, and no external npm packages are
 * required at runtime.
 *
 * Environment variables forwarded by the MCP client from the user_config:
 *   LIGHTHOUSE_URL       — required, base URL of the Lighthouse instance
 *   LIGHTHOUSE_API_KEY   — optional, API key when auth is enabled
 */

const path = require("node:path");
const runtimePath = path.join(__dirname, "mcpb-runtime.cjs");

try {
  require(runtimePath);
} catch (err) {
  process.stderr.write(
    `[lighthouse-mcp-stdio launcher] Failed to load bundled runtime: ${err.message}\n`,
  );
  process.exit(1);
}
