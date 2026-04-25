# Deployment Strategy

## Goal
Define release and deployment paths for Lighthouse clients, CLI, and hosted MCP runtime.

## Decision Summary
- Package distribution uses npm for all public packages.
- CLI distribution uses both npm and GitHub Releases.
- Hosted MCP runtime uses npm package release and GHCR container release.
- Manual release is environment-gated through GitHub Actions workflow dispatch.

## Repository Scope and GitHub Releases
GitHub Releases can be created from this repository without requiring a separate repository.

This repository is intentionally dedicated to client deliverables, so release tags and assets are isolated from the main Lighthouse application releases.

## CLI Deployment
### npm
- Package: `@letpeoplework/lighthouse-cli`
- Install path: `pnpm add -g @letpeoplework/lighthouse-cli` or `npm i -g @letpeoplework/lighthouse-cli`

### GitHub Releases
- Release workflow builds standalone CLI binaries for Linux, macOS, and Windows.
- Assets are attached to the selected release tag.
- Installer helper script is provided at `scripts/install-cli.sh`.

## MCP Deployment
### npm
- Package: `@letpeoplework/lighthouse-mcp-http`
- Hosted runtime entrypoint is provided via package bin `lighthouse-mcp-http`.

### Container
- Image: `ghcr.io/letpeoplework/lighthouse-clients/mcp-http`
- Published through the release workflow when container publish is enabled.

## Release Workflow
- Workflow: `Release Clients`
- Trigger: manual (`workflow_dispatch`)
- Environment gate: `Development`, `Staging`, or `Release`
- Optional publish switches:
  - npm publish
  - GitHub Release publish
  - GHCR container publish

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
  - Workflow filename: `release.yml`
  - Environment: leave empty to allow all release environments, or set one exact value and use only that value in workflow dispatch.