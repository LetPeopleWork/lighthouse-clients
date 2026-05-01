#!/usr/bin/env node
"use strict";
/**
 * launcher.cjs — MCPB bundle entry point for @letpeoplework/lighthouse-mcp-stdio.
 *
 * When a user installs the .mcpb bundle, their MCP client runs this file via
 * `node ${bundle_dir}/server/launcher.cjs`.  The launcher bootstraps the
 * published npm package using npx so the actual server code (and all its
 * dependencies) is always fetched from the npm registry.
 *
 * Environment variables forwarded by the MCP client from the user_config:
 *   LIGHTHOUSE_URL       — required, base URL of the Lighthouse instance
 *   LIGHTHOUSE_API_KEY   — optional, API key when auth is enabled
 */

const { spawn } = require("node:child_process");

const isWindows = process.platform === "win32";
const npxCmd = isWindows ? "npx.cmd" : "npx";

const proc = spawn(npxCmd, ["-y", "@letpeoplework/lighthouse-mcp-stdio"], {
  env: process.env,
  stdio: "inherit",
});

proc.on("error", (err) => {
  process.stderr.write(
    `[lighthouse-mcp-stdio launcher] Failed to start npx: ${err.message}\n`,
  );
  process.exit(1);
});

proc.on("close", (code) => {
  process.exitCode = code ?? 0;
});
