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

# Check current connection status
lh connection

# List teams
lh team list

# Run a forecast for a team
lh forecast manual --team-id 1 --remaining 10
```

`lh connect` walks you through server URL entry, connectivity validation, and — if authentication is enabled on the server — opens your browser so you can log in and authorize CLI access. The resulting connection and token are stored in `~/.config/lighthouse-clients/cli-config.json`.

## Commands

```
lh connect                                    Connect to a Lighthouse server (interactive)
lh connection                                 Show current connection status
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

All operational commands require an active connection. Run `lh connect` first.

> **Note:** Standalone auto-discovery is not yet supported. Use server mode when connecting.

## Alternate Installation (Standalone Binary)

Standalone binaries for Linux, macOS, and Windows are available on the [GitHub Releases](https://github.com/LetPeopleWork/lighthouse-clients/releases) page, or via the installer script:

```bash
curl -fsSL https://raw.githubusercontent.com/LetPeopleWork/lighthouse-clients/main/scripts/install-cli.sh | bash
```
