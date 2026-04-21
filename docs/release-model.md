# Release Model

## Goal
Define independent package lifecycle expectations for the Lighthouse client workspace.

## Package Ownership Boundaries
- `@lighthouse/client`
  - Owns shared Lighthouse API contracts and domain-level request/response behavior.
- `@lighthouse/cli`
  - Owns user-facing command orchestration and output behavior.
- `@lighthouse/mcp-core`
  - Owns transport-agnostic MCP semantic behavior (tools/resources/prompts, orchestration, mapping).
- `@lighthouse/mcp-stdio`
  - Owns stdio transport adapter behavior only.
- `@lighthouse/mcp-http`
  - Owns Streamable HTTP transport/runtime behavior only.

Business/domain behavior must be implemented in shared packages (`@lighthouse/client`, `@lighthouse/mcp-core`) and not duplicated in transport adapters.

## Versioning Expectations
- Packages are versioned independently.
- Changesets are used to record release intent per package.
- Internal package dependency version bumps are updated with patch semantics by default.

## Release Workflow
1. Add a changeset for each package-affecting change:
  - `pnpm changeset`
2. Apply version updates:
  - `pnpm release:version`
3. Publish packages:
  - `pnpm release:publish`

## Build/Test Quality Gates
Before publishing, run:
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`

## Notes
CI release automation and publication credentials are handled by workflows in `.github/workflows/`.
Runtime deployment details are documented in `docs/deployment.md`.
