# @letpeoplework/lighthouse-cli

Command-line interface for [Lighthouse](https://github.com/LetPeopleWork/Lighthouse) — a flow metrics and forecasting tool.

## When to Use the CLI

Use the CLI when you want a terminal-first workflow:

- Connect to a Lighthouse server or standalone app from scripts, local shells, or CI jobs.
- Inspect teams, portfolios, work tracking connections, deliveries, features, metrics, and forecasts without opening an MCP client.
- Switch between human-readable output, raw JSON, and TOON depending on the consumer.

If you want Lighthouse exposed as MCP tools inside VS Code / GitHub Copilot or Claude Code, use `@letpeoplework/lighthouse-mcp-stdio` or `@letpeoplework/lighthouse-mcp-http` instead.

## Installation

```bash
npm install -g @letpeoplework/lighthouse-cli
# or
pnpm add -g @letpeoplework/lighthouse-cli
```

After installation, the `lh` command is available globally.

You can also install the latest published CLI build from GitHub Releases.

Linux and macOS:

```bash
curl -fsSL https://github.com/LetPeopleWork/lighthouse-clients/releases/latest/download/install.sh | bash
```

Windows:

```powershell
irm https://github.com/LetPeopleWork/lighthouse-clients/releases/latest/download/install.ps1 | iex
```

Uninstall with the matching release asset.

Linux and macOS:

```bash
curl -fsSL https://github.com/LetPeopleWork/lighthouse-clients/releases/latest/download/uninstall.sh | bash
```

Windows:

```powershell
irm https://github.com/LetPeopleWork/lighthouse-clients/releases/latest/download/uninstall.ps1 | iex
```

## What You Can Do

- Connect to a Lighthouse server or standalone app.
- Check health and version information.
- List, inspect, and refresh work tracking connections, teams, and portfolios.
- Create, update, and delete teams and portfolios with JSON payloads.
- Query features, deliveries, metrics, and forecasts.
- Persist a default output format and override it per command.

## Quick Start

```bash
# Show available connection subcommands
lh connection

# Connect to your Lighthouse instance (interactive wizard)
lh connection connect

# Set your preferred payload output format
lh config output set --format pretty

# Check current connection status
lh connection status

# List teams
lh team list

# Override the saved default for a single command
lh team get --id 1 --json

# Get bundled team metrics for the last 30 days
lh metrics team --id 1

# Get only throughput and wip for a team
lh metrics team --id 1 --metrics throughput,wip

# Get a single metric for a portfolio
lh metrics portfolio --id 7 --metrics cycletime

# Run a forecast for a team
lh forecast manual --team-id 1 --remaining 10
```

`lh connection connect` supports both server mode and standalone mode.

**Interactive wizard** (default, no flags):
Server mode walks you through URL entry, connectivity validation, and — if authentication is enabled on the server — opens your browser so you can log in and authorize CLI access. Standalone mode reads the current Lighthouse URL from the standalone lockfile in the Lighthouse app data directory, so no URL is stored in the CLI config and dynamic ports are picked up fresh on every CLI startup.

**Scripted / non-interactive** (supply `--mode` to skip all prompts):

```bash
# Standalone (no URL needed)
lh connection connect --mode standalone

# Server, auth disabled
lh connection connect --mode server --url https://lighthouse.example.com

# Server, auth required — supply the API key directly (stored in CLI config)
lh connection connect --mode server --url https://lighthouse.example.com --api-key <key>

# Server with a self-signed TLS certificate
lh connection connect --mode server --url https://lighthouse.example.com --insecure
lh connection connect --mode server --url https://lighthouse.example.com --insecure --api-key <key>
```

When `--mode` is provided, the command never prompts for input and exits with a non-zero code if required flags are missing or the server is unreachable.

## Authentication via Environment Variable

You can authenticate without storing an API key in the CLI config by setting the `LIGHTHOUSE_API_KEY` environment variable:

```bash
export LIGHTHOUSE_API_KEY=<your-api-key>
```

When this variable is set:

- All commands use it automatically at runtime (it takes precedence over any stored key).
- During interactive connect, you can leave the **API Key** prompt blank — the CLI will detect the env var and save the connection as auth-required without persisting the key to disk.
- `lh connection status` will report `API Key: none` with a hint to set `LIGHTHOUSE_API_KEY` if no key is stored.

This is the recommended approach for CI/CD pipelines and environments where secrets management tooling already injects credentials via environment variables.

## Output Formats

Payload-producing commands support three output modes:

- `pretty` renders a human-readable view and surfaces `name` / `id` prominently when available. This is the default.
- `json` returns the raw endpoint payload JSON.
- `toon` converts the endpoint payload to [TOON](https://github.com/toon-format/toon), which is often easier to feed into LLM prompts.

You can override the saved default on any payload command with one of these global flags:

```bash
--pretty
--json
--toon
```

Use the config command to change the persisted default:

```bash
lh config output
lh config output set --format pretty
lh config output set --format json
lh config output set --format toon
```

Explicit flags take precedence over the saved default. Status and error output remain plain text in all modes.

## Commands

```
lh connection                                 Show connection subcommands
lh connection connect                         Connect to a Lighthouse server or standalone app (interactive wizard)
lh connection connect --mode standalone       Connect to standalone Lighthouse (non-interactive)
lh connection connect --mode server --url <url>                    Connect to a server (auth disabled)
lh connection connect --mode server --url <url> --api-key <key>   Connect to a server (store API key)
lh connection connect --mode server --url <url> --insecure         Skip TLS certificate verification
lh connection disconnect                      Remove the saved connection
lh connection status                          Show current connection status
lh config output                              Show the current default payload output format
lh config output set --format <pretty|toon|json>
											  Persist the default payload output format
lh health check                               Check server connectivity
lh version get                                Get server version
lh worktracking list                          List work tracking connections
lh worktracking get --id <id>                Get a work tracking connection
lh team list                                  List all teams
lh team get --id <team-id>                   Get a team
lh team create --payload-file <path>
lh team create --payload-json <json>         Create a team from a JSON payload
lh team update --id <team-id> --payload-file <path>
lh team update --id <team-id> --payload-json <json>
							  Update a team from a JSON payload
lh team delete --id <team-id>                Delete a team
lh team refresh --id <team-id>               Refresh a team
lh portfolio list                             List all portfolios
lh portfolio get --id <portfolio-id>         Get a portfolio
lh portfolio create --payload-file <path>
lh portfolio create --payload-json <json>    Create a portfolio from a JSON payload
lh portfolio update --id <portfolio-id> --payload-file <path>
lh portfolio update --id <portfolio-id> --payload-json <json>
							  Update a portfolio from a JSON payload
lh portfolio delete --id <portfolio-id>      Delete a portfolio
lh portfolio refresh --id <portfolio-id>     Refresh a portfolio
lh metrics team --id <team-id> [--start-date <date>] [--end-date <date>] [--metrics <metric,...>]
lh metrics portfolio --id <portfolio-id> [--start-date <date>] [--end-date <date>] [--metrics <metric,...>]
						  Return bundled metrics. Team defaults to 30 days,
						  portfolio defaults to 90 days. If only one date is
						  provided, it is used for both start and end.
						  Use --metrics to select one or more specific metrics;
						  omit to get all. Allowed values:
						  throughput, wip, cycleTime, workItemAge,
						  totalWorkItemAge, arrivals, predictabilityScore
lh feature get --ids <id1,id2,...>           Get features by IDs
lh feature get --refs <ref1,ref2,...>        Get features by references
lh feature workitems --id <feature-id>       Get work items for a feature
lh delivery list --portfolio-id <portfolio-id>
lh forecast manual --team-id <team-id> [--remaining <n>] [--target-date <date>]
lh forecast backtest --team-id <team-id> --start-date <date> --end-date <date> --hist-start-date <date> --hist-end-date <date>
```

Global payload output override flags: `--pretty`, `--json`, `--toon`

Run `lh <group>` to see the available subcommands for that group.

All operational commands require an active connection. Run `lh connection connect` first.

Standalone discovery uses the Lighthouse lockfile in the app data directory:

- macOS: `~/Library/Application Support/Lighthouse/standalone.lock.json`
- Windows: `%APPDATA%/Lighthouse/standalone.lock.json`
- Linux: `$XDG_CONFIG_HOME/Lighthouse/standalone.lock.json` or `~/.config/Lighthouse/standalone.lock.json`

## Release Assets

Standalone binaries for Linux, macOS, and Windows are available on the [GitHub Releases](https://github.com/LetPeopleWork/lighthouse-clients/releases) page together with the install and uninstall scripts shown above.
