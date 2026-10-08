# lighthouse-clients

Workspace for Lighthouse external client packages.

## Choose a Package

### User-facing packages

| Package | Use it when | Install or run |
| --- | --- | --- |
| `@letpeoplework/lighthouse-cli` | You want a terminal-first workflow for scripts, local inspection, and manual operations. | `npm install -g @letpeoplework/lighthouse-cli` or the GitHub Release installers |
| `@letpeoplework/lighthouse-mcp-stdio` | You want Lighthouse tools inside a local MCP client such as VS Code / GitHub Copilot or Claude Code. | Configure the MCP client to run `npx -y @letpeoplework/lighthouse-mcp-stdio` |
| `@letpeoplework/lighthouse-mcp-http` | You want a shared or remotely hosted MCP endpoint, including Docker-based deployments. | Run `npx -y @letpeoplework/lighthouse-mcp-http` or the GHCR image |

### Shared building blocks

- `@letpeoplework/lighthouse-client`: Shared Lighthouse API client contracts.
- `@letpeoplework/lighthouse-mcp-core`: Shared MCP semantic layer used by the stdio and HTTP transports.

## General Functionality

The user-facing packages cover overlapping Lighthouse capabilities:

- Health and version checks.
- Work tracking, team, and portfolio queries.
- Team and portfolio refresh operations.
- Metrics for teams and portfolios.
- Feature, delivery, and forecast access.

The CLI adds command-oriented connection management and output formatting. The MCP packages expose the same Lighthouse data as tools that AI clients can call.

## Installation

### CLI

Install the CLI globally with npm or pnpm:

```bash
npm install -g @letpeoplework/lighthouse-cli
# or
pnpm add -g @letpeoplework/lighthouse-cli
```

Or use the release installers for the latest published CLI build.

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

### MCP stdio

The stdio package is usually not installed globally. Point your MCP client at the published package:

```bash
npx -y @letpeoplework/lighthouse-mcp-stdio
```

See [packages/mcp-stdio/README.md](packages/mcp-stdio/README.md) for VS Code / GitHub Copilot and Claude Code examples.

### MCP HTTP

Run the HTTP runtime locally with npm tooling:

```bash
LIGHTHOUSE_URL=https://lighthouse.example.com \
LIGHTHOUSE_API_KEY=replace-me \
npx -y @letpeoplework/lighthouse-mcp-http
```

Or run the published container image:

```bash
docker run --rm \
	-p 3000:3000 \
	-e HOST=0.0.0.0 \
	-e PORT=3000 \
	-e LIGHTHOUSE_URL=https://lighthouse.example.com \
	-e LIGHTHOUSE_API_KEY=replace-me \
	ghcr.io/letpeoplework/lighthouse-clients/mcp-http:latest
```

See [packages/mcp-http/README.md](packages/mcp-http/README.md) for MCP client setup and Docker deployment guidance.

## Package Guides

- [packages/cli/README.md](packages/cli/README.md): CLI installation, connection setup, commands, and output formats.
- [packages/mcp-stdio/README.md](packages/mcp-stdio/README.md): Local stdio MCP setup for VS Code / GitHub Copilot and Claude Code.
- [packages/mcp-http/README.md](packages/mcp-http/README.md): Streamable HTTP MCP runtime, remote client configuration, and Docker usage.

## Local Development

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the packages fit together, the conventions they share, and how to add a capability end to end.

- Install dependencies: `pnpm install`
- Run tests: `pnpm test`
- Type-check all packages: `pnpm typecheck`
- Type-check the test files: `pnpm typecheck:tests` (the package builds leave them out, and vitest does not check types)
- Build all packages: `pnpm build`
- Lint workspace: `pnpm lint`

## Release Scaffolding

Release model and ownership boundaries are documented in `docs/release-model.md`.
Deployment details for npm, GitHub Releases, and hosted MCP images are documented in `docs/deployment.md`.

## Releases

Everything runs in one GitHub workflow, `Client CI` (`.github/workflows/ci.yml`). Its `release` job runs after the checks on every push to `main` and waits at the `Release` environment for the maintainer's approval.

1. Run `pnpm release:version` on `main` and commit and push the version bumps and changelogs it writes. The job publishes only versions that are not on npm yet.
2. Approve the `Release` environment on that push's CI run.

The job publishes the npm packages, creates a GitHub Release with the CLI binaries, install/uninstall scripts, MCPB bundle and one zip per agent skill (`lighthouse-skill.zip`, `lighthouse-refinement-skill.zip` and `lighthouse-daily-flow-review-skill.zip`, packed by `scripts/pack-skills.sh`; see `skills/README.md`), and pushes the `mcp-http` image to GHCR when its version is new. See `docs/deployment.md` for details.
