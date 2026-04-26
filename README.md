# lighthouse-clients

Workspace for Lighthouse external client packages.

## Packages

- `@letpeoplework/lighthouse-client`: Shared Lighthouse API client contracts.
- `@letpeoplework/lighthouse-cli`: User-facing command-line runtime.
- `@letpeoplework/lighthouse-mcp-core`: Shared MCP semantic layer.
- `@letpeoplework/lighthouse-mcp-stdio`: stdio transport adapter.
- `@letpeoplework/lighthouse-mcp-http`: Streamable HTTP transport/runtime adapter.

## Installation
# Install
Linux and macOS:
```
	curl -fsSL https://github.com/LetPeopleWork/lighthouse-clients/releases/latest/download/install.sh | bash
```

Windows:
```
	irm https://github.com/LetPeopleWork/lighthouse-clients/releases/latest/download/install.ps1 | iex
```

# Uninstall
Linux and macOS:
```
	curl -fsSL https://github.com/LetPeopleWork/lighthouse-clients/releases/latest/download/uninstall.sh | bash
```

Windows:
```
	irm https://github.com/LetPeopleWork/lighthouse-clients/releases/latest/download/uninstall.ps1 | iex
```

## Local Development

- Install dependencies: `pnpm install`
- Run tests: `pnpm test`
- Type-check all packages: `pnpm typecheck`
- Build all packages: `pnpm build`
- Lint workspace: `pnpm lint`

## Release Scaffolding

Release model and ownership boundaries are documented in `docs/release-model.md`.
Deployment details for npm, GitHub Releases, and hosted MCP images are documented in `docs/deployment.md`.

## Manual Releases

- CI checks: GitHub workflow `Client CI`
- Manual environment-gated release: GitHub workflow `Release Clients`
- Release options:
	- npm package publish
	- GitHub Release with CLI binaries
	- GHCR image publish for `@letpeoplework/lighthouse-mcp-http`
