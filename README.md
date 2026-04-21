# lighthouse-clients

Workspace for Lighthouse external client packages.

## Packages

- `@lighthouse/client`: Shared Lighthouse API client contracts.
- `@lighthouse/cli`: User-facing command-line runtime.
- `@lighthouse/mcp-core`: Shared MCP semantic layer.
- `@lighthouse/mcp-stdio`: stdio transport adapter.
- `@lighthouse/mcp-http`: Streamable HTTP transport/runtime adapter.

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
	- GHCR image publish for `@lighthouse/mcp-http`
