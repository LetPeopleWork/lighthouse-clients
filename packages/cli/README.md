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
# Connect to your Lighthouse instance (interactive wizard)
lh connect

# Set your preferred payload output format
lh config output set --format pretty

# Check current connection status
lh connection

# List teams
lh team list

# Override the saved default for a single command
lh team get --id 1 --json

# Run a forecast for a team
lh forecast manual --team-id 1 --remaining 10
```

`lh connect` supports both server mode and standalone mode. Server mode walks you through URL entry, connectivity validation, and — if authentication is enabled on the server — opens your browser so you can log in and authorize CLI access. Standalone mode reads the current Lighthouse URL from the standalone lockfile in the Lighthouse app data directory, so no URL is stored in the CLI config and dynamic ports are picked up fresh on every CLI startup.

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
lh connect                                    Connect to a Lighthouse server or standalone app (interactive)
lh connection                                 Show current connection status
lh config output                              Show the current default payload output format
lh config output set --format <pretty|toon|json>
											  Persist the default payload output format
lh health check                               Check server connectivity
lh version get                                Get server version
lh worktracking list                          List work tracking connections
lh worktracking get --id <id>                Get a work tracking connection
lh team list                                  List all teams
lh team get --id <team-id>                   Get a team
lh team refresh --id <team-id>               Refresh a team
lh team metrics throughput --id <team-id> [--start-date <date>] [--end-date <date>]
lh team metrics cycleTimePercentiles --id <team-id> [--start-date <date>] [--end-date <date>]
lh portfolio list                             List all portfolios
lh portfolio get --id <portfolio-id>         Get a portfolio
lh portfolio refresh --id <portfolio-id>     Refresh a portfolio
lh portfolio metrics throughput --id <portfolio-id> [--start-date <date>] [--end-date <date>]
lh feature get --ids <id1,id2,...>           Get features by IDs
lh feature get --refs <ref1,ref2,...>        Get features by references
lh feature workitems --id <feature-id>       Get work items for a feature
lh delivery list --portfolio-id <portfolio-id>
lh forecast manual --team-id <team-id> [--remaining <n>] [--target-date <date>]
lh forecast backtest --team-id <team-id> --start-date <date> --end-date <date> --hist-start-date <date> --hist-end-date <date>
```

Global payload output override flags: `--pretty`, `--json`, `--toon`

All operational commands require an active connection. Run `lh connect` first.

Standalone discovery uses the Lighthouse lockfile in the app data directory:

- macOS: `~/Library/Application Support/Lighthouse/standalone.lock.json`
- Windows: `%APPDATA%/Lighthouse/standalone.lock.json`
- Linux: `$XDG_CONFIG_HOME/Lighthouse/standalone.lock.json` or `~/.config/Lighthouse/standalone.lock.json`

## Alternate Installation (Standalone Binary)

Standalone binaries for Linux, macOS, and Windows are available on the [GitHub Releases](https://github.com/LetPeopleWork/lighthouse-clients/releases) page, or via the installer script:

```bash
curl -fsSL https://raw.githubusercontent.com/LetPeopleWork/lighthouse-clients/main/scripts/install-cli.sh | bash
```
