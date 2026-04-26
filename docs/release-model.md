# Release Model

## Goal
Define independent package lifecycle expectations for the Lighthouse client workspace.

## Package Ownership Boundaries
- `@letpeoplework/lighthouse-client`
  - Owns shared Lighthouse API contracts and domain-level request/response behavior.
- `@letpeoplework/lighthouse-cli`
  - Owns user-facing command orchestration and output behavior.
- `@letpeoplework/lighthouse-mcp-core`
  - Owns transport-agnostic MCP semantic behavior (tools/resources/prompts, orchestration, mapping).
- `@letpeoplework/lighthouse-mcp-stdio`
  - Owns stdio transport adapter behavior only.
- `@letpeoplework/lighthouse-mcp-http`
  - Owns Streamable HTTP transport/runtime behavior only.

Business/domain behavior must be implemented in shared packages (`@letpeoplework/lighthouse-client`, `@letpeoplework/lighthouse-mcp-core`) and not duplicated in transport adapters.

## Versioning Expectations
- Packages are versioned independently.
- Changesets are used to record release intent per package.
- Internal package dependency version bumps are updated with patch semantics by default.

## Release Workflow
1. Add a changeset for each package-affecting change:
  - `pnpm changeset`
  - Stage the generated `.changeset/*.md` file alongside your other changes.
  - The pre-commit hook enforces this: commits that touch `packages/<name>/src/` or
    `packages/<name>/package.json` will be blocked unless a new `.changeset/*.md` is also staged.
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

These same checks run automatically as a strict pre-commit gate via `pnpm ci`.
To skip the hook in exceptional cases (e.g., WIP commits to a local branch), set
`SKIP_SIMPLE_GIT_HOOKS=1` before your `git commit` command.

## Notes
CI release automation and publication credentials are handled by workflows in `.github/workflows/`.
Runtime deployment details are documented in `docs/deployment.md`.
