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
2. Apply version updates on `main`, then commit and push them:
  - `pnpm release:version`
3. Approve the `Release` environment on that push's CI run; the `release` job in `.github/workflows/ci.yml` publishes with:
  - `pnpm release:publish`

## Integration Smoke
`scripts/smoke-integration.sh <lighthouse-image>` starts a Lighthouse container with demo data and checks the `lh` found on `PATH` against it. CI runs it three ways:
- **Before the Release gate**, with the packages built and packed from the pushed commit, against two server images: `ghcr.io/letpeoplework/lighthouse:latest`, the released server, and `:dev-latest`, the next one. The `Release` environment is only requested once the `latest` run passes. A failing `dev-latest` run never blocks the release, because that server is not out yet and may carry changes a client release cannot fix: on a push to `main` it is a warning only. The nightly and manual runs go red on it, so the failure is noticed before that server ships.
- **Nightly** (and on manual dispatch), the same two runs without asking for a release, so a change in the next server shows up before anyone cuts one.
- **After publishing**, against `latest` with the CLI installed from npm, to check what actually landed there.

Run it locally the same way: build and pack `client` and `cli`, install both tarballs into one prefix, put its `node_modules/.bin` first on `PATH`, and pass the image. It writes the CLI's configuration under `$HOME`, so point `HOME` at a scratch directory.

## Build/Test Quality Gates
Before publishing, run:
- `pnpm test`
- `pnpm typecheck`
- `pnpm typecheck:tests`
- `pnpm build`
- `pnpm lint`

These same checks run automatically as a strict pre-commit gate via `pnpm ci`.
To skip the hook in exceptional cases (e.g., WIP commits to a local branch), set
`SKIP_SIMPLE_GIT_HOOKS=1` before your `git commit` command.

## Dependency Updates
Renovate (`renovate.json`) keeps npm packages, GitHub Actions and the mcp-http base image current:
- A new version is only proposed once it has been published for 7 days, so a compromised release has time to be caught and pulled before it reaches this repo.
- Every update, majors and security fixes included, merges itself once CI is green.
- Update PRs carry no changeset. They ship with the next release of the affected package; when a fix must go out sooner, add a changeset by hand and cut a release.
- The Dependency Dashboard issue lists pending, open and held-back updates.

## Notes
CI release automation and publication credentials are handled by workflows in `.github/workflows/`.
Runtime deployment details are documented in `docs/deployment.md`.
