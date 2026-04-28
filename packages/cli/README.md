# @letpeoplework/lighthouse-cli

Command-line interface for [Lighthouse](https://github.com/LetPeopleWork/Lighthouse) — a flow metrics and forecasting tool.

## Installation

```bash
npm install -g @letpeoplework/lighthouse-cli
# or
pnpm add -g @letpeoplework/lighthouse-cli
```

After installation, the `lh` command is available globally.

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

# Server, auth required — supply a bearer token
lh connection connect --mode server --url https://lighthouse.example.com --token <token>

# Server with a self-signed TLS certificate
lh connection connect --mode server --url https://lighthouse.example.com --insecure
lh connection connect --mode server --url https://lighthouse.example.com --insecure --token <token>
```

When `--mode` is provided, the command never prompts for input and exits with a non-zero code if required flags are missing or the server is unreachable.

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
lh connection connect --mode server --url <url> --token <token>    Connect to a server (auth required)
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

## Alternate Installation (Standalone Binary)

Standalone binaries for Linux, macOS, and Windows are available on the [GitHub Releases](https://github.com/LetPeopleWork/lighthouse-clients/releases) page, or via the installer script:

```bash
curl -fsSL https://raw.githubusercontent.com/LetPeopleWork/lighthouse-clients/main/scripts/install-cli.sh | bash
```
