# @letpeoplework/lighthouse-mcp-stdio

Local stdio MCP server for [Lighthouse](https://github.com/LetPeopleWork/Lighthouse).

Use this package when you want Lighthouse tools inside a local MCP client such as VS Code / GitHub Copilot or Claude Code without hosting a separate HTTP service.

## What It Exposes

The stdio server exposes Lighthouse as MCP tools for:

- Health and version checks.
- Work tracking, team, and portfolio lookups.
- Team and portfolio refresh operations.
- Team and portfolio metrics.
- Feature, delivery, and forecast operations.

## Connection and Authentication

The runtime resolves Lighthouse in this order:

1. `LIGHTHOUSE_URL`, if set.
2. The Lighthouse standalone lock file, if the standalone app is running and has written its discovery contract.

Authentication is optional. If the target Lighthouse instance requires an API key, set `LIGHTHOUSE_API_KEY`.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `LIGHTHOUSE_URL` | No | Explicit Lighthouse base URL. Must be a valid `http` or `https` URL. |
| `LIGHTHOUSE_API_KEY` | No | API key used for Lighthouse requests. |

If `LIGHTHOUSE_URL` is not set, the package tries standalone discovery using the Lighthouse lock file:

- macOS: `~/Library/Application Support/Lighthouse/standalone.lock.json`
- Windows: `%APPDATA%/Lighthouse/standalone.lock.json`
- Linux: `$XDG_CONFIG_HOME/Lighthouse/standalone.lock.json` or `~/.config/Lighthouse/standalone.lock.json`

## Installation

The recommended setup is to let your MCP client start the package directly with `npx`:

```bash
npx -y @letpeoplework/lighthouse-mcp-stdio
```

If you prefer a global install:

```bash
npm install -g @letpeoplework/lighthouse-mcp-stdio
```

That makes the `lighthouse-mcp-stdio` executable available on your `PATH`.

## VS Code / GitHub Copilot

Add the server to `.vscode/mcp.json` in your workspace or to your user MCP configuration.

```json
{
  "servers": {
    "lighthouse": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@letpeoplework/lighthouse-mcp-stdio"],
      "env": {
        "LIGHTHOUSE_URL": "https://lighthouse.example.com",
        "LIGHTHOUSE_API_KEY": "replace-me"
      }
    }
  }
}
```

Notes:

- Prefer VS Code input variables or environment-file support for secrets instead of hardcoding `LIGHTHOUSE_API_KEY`.
- If you are using the Lighthouse standalone desktop app locally, you can omit `LIGHTHOUSE_URL` and let the package discover the lock file automatically.
- After saving `mcp.json`, start or restart the server from the MCP commands in VS Code. Once it is running, Lighthouse tools become available in chat.

## Claude Code

Add the server with `claude mcp add`:

```bash
claude mcp add --transport stdio --scope user \
  --env LIGHTHOUSE_URL=https://lighthouse.example.com \
  --env LIGHTHOUSE_API_KEY=replace-me \
  lighthouse -- npx -y @letpeoplework/lighthouse-mcp-stdio
```

If you are using a local Lighthouse standalone app, omit `LIGHTHOUSE_URL` and keep only the API key if needed:

```bash
claude mcp add --transport stdio --scope user \
  --env LIGHTHOUSE_API_KEY=replace-me \
  lighthouse -- npx -y @letpeoplework/lighthouse-mcp-stdio
```

You can also commit a project-scoped `.mcp.json` file for Claude Code:

```json
{
  "mcpServers": {
    "lighthouse": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@letpeoplework/lighthouse-mcp-stdio"],
      "env": {
        "LIGHTHOUSE_URL": "https://lighthouse.example.com",
        "LIGHTHOUSE_API_KEY": "replace-me"
      }
    }
  }
}
```

After adding the server, use `/mcp` in Claude Code to confirm it is connected.

## Claude Desktop (MCPB Bundle)

The easiest way to add Lighthouse MCP to Claude Desktop is via the `.mcpb` bundle, which is attached to every [lighthouse-clients GitHub Release](https://github.com/LetPeopleWork/lighthouse-clients/releases) as `lighthouse-mcp-stdio.mcpb`.

Download the `.mcpb` file and open it — Claude Desktop will guide you through installation and ask for your Lighthouse URL and optional API key.

Alternatively, configure the server manually in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lighthouse": {
      "command": "npx",
      "args": ["-y", "@letpeoplework/lighthouse-mcp-stdio"],
      "env": {
        "LIGHTHOUSE_URL": "https://lighthouse.example.com",
        "LIGHTHOUSE_API_KEY": "replace-me"
      }
    }
  }
}
```

## Example Prompts

Once connected, you can ask your MCP client for things like:

- List all Lighthouse teams.
- Refresh team 12 and summarize any changes.
- Show the current throughput and cycle time percentiles for team 5.
- Look up feature references `ABC-123` and `ABC-456`.

## When to Use stdio vs HTTP

Use `@letpeoplework/lighthouse-mcp-stdio` when the MCP client and Lighthouse access both live on the same machine or inside the same developer environment.

Use `@letpeoplework/lighthouse-mcp-http` when you want a shared MCP endpoint for multiple users, multiple workspaces, or container-based deployment.

## Runtime Behavior

### Tool response format

All MCP tool responses are serialized using [TOON](https://github.com/LetPeopleWork/toon-format) instead of plain JSON.
TOON is a structured text format designed for LLM consumption.
MCP clients that display raw tool results will see TOON-encoded output.

### TLS certificate validation

All outbound HTTPS requests to Lighthouse skip TLS certificate validation.
This is intentional and hard-enforced so the server works with self-hosted Lighthouse instances that use self-signed certificates.
There is no option to enable strict TLS validation.
