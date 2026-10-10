# Deployment Strategy

## Goal
Define release and deployment paths for Lighthouse clients, CLI, and hosted MCP runtime.

## Decision Summary
- Package distribution uses npm for all public packages.
- CLI distribution uses both npm and GitHub Releases.
- Hosted MCP runtime uses npm package release and GHCR container release.
- Releases run from the `release` job in `.github/workflows/ci.yml` on a push to `main`, held at the `Release` environment until the maintainer approves.

## Repository Scope and GitHub Releases
GitHub Releases can be created from this repository without requiring a separate repository.

This repository is intentionally dedicated to client deliverables, so release tags and assets are isolated from the main Lighthouse application releases.

## CLI Deployment
### npm
- Package: `@letpeoplework/lighthouse-cli`
- Install path: `pnpm add -g @letpeoplework/lighthouse-cli` or `npm i -g @letpeoplework/lighthouse-cli`
- After install, the `lh` command is available globally.

### GitHub Releases
- The release job builds standalone CLI binaries for Linux, macOS, and Windows.
- Each approved release run creates a GitHub Release tagged `v<YYYY.MM.DD>.<CI run number>` and attaches the assets to it.
- Installer helpers are published as release assets: `install.sh`, `uninstall.sh`, `install.ps1`, and `uninstall.ps1`.

#### Installer environment variables

| Variable | Script | Purpose |
| --- | --- | --- |
| `LH_VERSION` | `install.sh`, `install.ps1` | Pin an exact release version (e.g. `0.12.0`). When unset, the latest release is used. |
| `LH_INSTALL_DIR` | `install.sh` | Override the install directory. Defaults to `/usr/local/bin` (root) or `~/.local/bin` (user). |

When running inside GitHub Actions (i.e. `GITHUB_OUTPUT` is set), the installer emits `install_dir=<path>` to `$GITHUB_OUTPUT` so subsequent steps can add it to `$GITHUB_PATH`.

## MCP Deployment
### npm
- Package: `@letpeoplework/lighthouse-mcp-http`
- Hosted runtime entrypoint is provided via package bin `lighthouse-mcp-http`.

### MCPB Bundle (stdio)
- Asset: `lighthouse-mcp-stdio.mcpb` — attached to every [GitHub Release](https://github.com/LetPeopleWork/lighthouse-clients/releases).
- Allows one-click installation into MCP clients that support MCPB (e.g. Claude Desktop).
- The bundle is built and validated in the release job using `@anthropic-ai/mcpb`.
- The bundle is fully self-contained: the MCP server runtime (`mcpb-runtime.cjs`) is bundled inside the `.mcpb` file alongside the launcher. When installed, the MCP client runs the bundled launcher which starts the server in-process without npx or any additional npm install.

### Container
- Image: `ghcr.io/letpeoplework/lighthouse-clients/mcp-http`
- Published by the release job, tagged with the `mcp-http` package version and `latest`, only when no image with that version exists yet.

## Release Workflow
There is one workflow, `Client CI` (`.github/workflows/ci.yml`). Its `release` job runs after `verify` and the integration smoke on every push to `main` and waits at the `Release` environment for the maintainer's approval. A newer push to `main` replaces a release still waiting for approval.

To cut a release:
1. On `main`, run `pnpm release:version` (with `GITHUB_TOKEN_CHANGESET` set to a GitHub token; the changelog entries link to commits and authors). It consumes the pending `.changeset/*.md` files, bumps the package versions and writes the changelogs.
2. Commit and push that change. The release job only publishes versions that are not on npm yet, so the bump has to be on `main` before the job runs.
3. Approve the `Release` environment on that push's CI run.

The approved job then:
- publishes every package whose version is not on npm yet (`pnpm release:publish`, with provenance);
- builds the CLI binaries, the `mcp-stdio` MCPB bundle and one zip per folder under `skills/` (`lighthouse-skill.zip`, `lighthouse-refinement-skill.zip` and `lighthouse-daily-flow-review-skill.zip`, packed by `scripts/pack-skills.sh` before anything is published), and creates the GitHub Release with them and the install/uninstall scripts;
- builds and pushes the `mcp-http` container if its version has no image yet.

Before it, `smoke-prerelease` runs `scripts/smoke-integration.sh` with the CLI packed from the pushed commit against a Lighthouse container with demo data, once on the released server image (`lighthouse:latest`) and once on the next one (`lighthouse:dev-latest`). The release waits for the `latest` run to pass. On a push to `main` a failing `dev-latest` run is a warning only, since that server is not released yet; the nightly and manual runs, which run `verify` and both smoke runs but never ask for the `Release` environment, go red on it so the failure is noticed. Before the smoke, the job checks that the CLI resolved the client packed from the same commit, not a copy from npm. The smoke archives a Delivery to check the archived table, which needs a premium licence: the `LIGHTHOUSE_SMOKE_LICENSE` secret holds one, and without it that check is skipped with a notice. Run locally, the script takes the licence as a file in `LIGHTHOUSE_SMOKE_LICENSE_FILE`, and `LIGHTHOUSE_SMOKE_CONTAINER` and `LIGHTHOUSE_SMOKE_PORT` override the container name and host port (`lighthouse-smoke`, 8443).

After it, `smoke-platform` installs the published CLI from npm on Linux, macOS and Windows, and `smoke-integration` runs the same script with it against `lighthouse:latest`.

Approving a run without a version bump publishes nothing to npm or GHCR, but still creates a GitHub Release.

## Required Secrets
- Default GitHub token is used for GitHub Releases and GHCR push

## npm Trusted Publishing (OIDC)
- npm publish is configured to use GitHub Actions OIDC trusted publishing (no `NPM_TOKEN` secret required).
- Configure a trusted publisher in npm package settings for each published package:
  - `@letpeoplework/lighthouse-client`
  - `@letpeoplework/lighthouse-cli`
  - `@letpeoplework/lighthouse-mcp-core`
  - `@letpeoplework/lighthouse-mcp-stdio`
  - `@letpeoplework/lighthouse-mcp-http`
- Trusted publisher fields must match exactly:
  - Organization: `LetPeopleWork`
  - Repository: `lighthouse-clients`
  - Workflow filename: `ci.yml`
  - Environment: `Release` (or leave it empty)