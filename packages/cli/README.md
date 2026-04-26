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
# Point the CLI at your Lighthouse instance
lh config endpoint set --url https://your-lighthouse-instance

# Check connectivity
lh health check

# List teams
lh team list

# Run a forecast for a team
lh forecast manual --team-id 1 --remaining 10
```

## Authentication

```bash
# API key
lh auth login --api-key <your-api-key>

# Bearer token
lh auth login --bearer-token <your-token>

# Check current auth status
lh auth status

# Clear stored credentials
lh auth logout
```

## Commands

```
lh config endpoint set --url <lighthouse-url>
lh config endpoint show
lh auth status [--api-key <key>] [--bearer-token <token>]
lh auth login --api-key <key> [--api-key-header <header-name>]
lh auth login --bearer-token <token>
lh auth logout
lh worktracking list [--url <lighthouse-url>]
lh worktracking get --id <connection-id> [--url <lighthouse-url>]
lh team list [--url <lighthouse-url>]
lh team get --id <team-id> [--url <lighthouse-url>]
lh team refresh --id <team-id> [--url <lighthouse-url>]
lh team metrics throughput --id <team-id> [--start-date <date>] [--end-date <date>]
lh team metrics cycleTimePercentiles --id <team-id> [--start-date <date>] [--end-date <date>]
lh portfolio list [--url <lighthouse-url>]
lh portfolio get --id <portfolio-id> [--url <lighthouse-url>]
lh portfolio refresh --id <portfolio-id> [--url <lighthouse-url>]
lh portfolio metrics throughput --id <portfolio-id> [--start-date <date>] [--end-date <date>]
lh feature get --ids <id1,id2,...> [--url <lighthouse-url>]
lh feature get --refs <ref1,ref2,...> [--url <lighthouse-url>]
lh feature workitems --id <feature-id> [--url <lighthouse-url>]
lh delivery list --portfolio-id <portfolio-id> [--url <lighthouse-url>]
lh forecast manual --team-id <team-id> [--remaining <n>] [--target-date <date>]
lh forecast backtest --team-id <team-id> --start-date <date> --end-date <date> --hist-start-date <date> --hist-end-date <date>
lh health check [--url <lighthouse-url>]
lh version get [--url <lighthouse-url>]
```

Pass `--url <lighthouse-url>` to any command to override the configured endpoint for that call.

## Alternate Installation (Standalone Binary)

Standalone binaries for Linux, macOS, and Windows are available on the [GitHub Releases](https://github.com/LetPeopleWork/lighthouse-clients/releases) page, or via the installer script:

```bash
curl -fsSL https://raw.githubusercontent.com/LetPeopleWork/lighthouse-clients/main/scripts/install-cli.sh | bash
```
