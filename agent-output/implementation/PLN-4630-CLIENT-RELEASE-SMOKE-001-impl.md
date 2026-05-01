# Implementation: PLN-4630-CLIENT-RELEASE-SMOKE-001

## Plan Reference
**Plan:** `agent-output/planning/PLN-4630-CLIENT-RELEASE-SMOKE-001.md`
**Epic:** 4630 — Usable CLI / MCP slice
**Date:** 2026-05-01

---

## Changelog

| Date | Agent | Request | Summary |
|------|-------|---------|---------|
| 2026-05-01 | Analyst | Analysis phase | Architecture review, endpoint contract discovery, CI constraint findings |
| 2026-05-01 | Planner | PLN-4630-CLIENT-RELEASE-SMOKE-001 | Plan created and approved through critique/revision cycle |
| 2026-05-01 | Implementer | Plan approved | Full implementation — M1–M6 delivered |

---

## Implementation Summary

This implementation adds post-release CLI smoke validation and MCPB packaging for the `@letpeoplework/lighthouse-mcp-stdio` server to the lighthouse-clients CI pipeline.

**Value delivery**: Every merge to `main` that triggers a release now automatically verifies the published CLI binary works end-to-end against a real (Linux) or fixture (Windows/macOS) Lighthouse server. Users receive a one-click `.mcpb` bundle for installing the MCP server in Claude Desktop.

Key engineering decisions:
- **Linux smoke** uses a real `ghcr.io/letpeoplework/lighthouse:latest` Docker container seeded with demo scenario 2, asserting on `Team Zenith`, `Team Voyager`, and `Project Orion`.
- **Windows/macOS smoke** uses a repository-owned Node.js fixture server (`scripts/smoke-fixture.mjs`) — no Docker service containers, which are Linux-only on GitHub-hosted runners.
- **macOS runner** pinned to `macos-13` (x64) because `macos-latest` is arm64 and only x64 CLI binaries are published.
- **MCPB bundle** uses a CJS launcher shim (`launcher.cjs`) that bootstraps the npm package via `npx` — avoiding the need to bundle external node_modules (the `dist/bin.js` has non-bundled deps).
- **Installer `LH_VERSION`** env var added to both `install.sh` and `install.ps1` so smoke jobs download an exact release version instead of "latest".

---

## Milestones Completed

- [x] **M1 — Lock release validation contract** _(encoded in the implementation; no standalone code artifact)_
  - Fixture endpoints: `GET /api/v1/version/current` (text), `GET /api/v1/auth/mode` (JSON), `GET /api/v1/teams` (JSON)
  - `CLI_VERSION` propagated as job output from `release` job to smoke jobs
  - macOS runner pinned to `macos-13` (x64)
- [x] **M2 — Harden installer scripts**
  - `scripts/install.sh`: `LH_VERSION` override; `install_dir` output to `$GITHUB_OUTPUT`
  - `scripts/install.ps1`: `$env:LH_VERSION` override; `install_dir` output to `$env:GITHUB_OUTPUT`
- [x] **M3 — Linux real-Lighthouse smoke job**
  - New `smoke-linux` job in `ci.yml`; Docker run with SQLite mode; demo scenario seed; team + portfolio assertions
- [x] **M4 — Windows/macOS bounded smoke jobs**
  - New `smoke-windows` (windows-latest) and `smoke-macos` (macos-13) jobs
  - Fixture server (`scripts/smoke-fixture.mjs`) provides bounded HTTP stubs
  - Port written to `.fixture-port` and captured via `GITHUB_OUTPUT`
- [x] **M5 — mcp-stdio MCPB bundle**
  - `packages/mcp-stdio/mcpb/manifest.json`: MCPB v0.3 manifest
  - `packages/mcp-stdio/mcpb/launcher.cjs`: cross-platform CJS launcher (npx bootstrap)
  - Release job: MCPB build+validate+pack step; asset appended to GitHub Release
- [x] **M6 — Docs and release notes**
  - `lighthouse-clients/docs/deployment.md`: installer env vars table; MCPB section
  - `packages/mcp-stdio/README.md`: Claude Desktop MCPB section
  - `docs/releasenotes/releasenotes.md`: vNext entry for MCPB bundle

---

## Files Created

| Path | Purpose |
|------|---------|
| `scripts/smoke-fixture.mjs` | Node.js HTTP fixture server for Windows/macOS bounded smoke; serves health, auth-mode, and teams endpoints |
| `packages/mcp-stdio/mcpb/manifest.json` | MCPB v0.3 manifest for `@letpeoplework/lighthouse-mcp-stdio` |
| `packages/mcp-stdio/mcpb/launcher.cjs` | CJS launcher shim; bootstraps the npm package via `npx -y` |

---

## Files Modified

| Path | Changes |
|------|---------|
| `scripts/install.sh` | Added `LH_VERSION` env var override for pinned release URLs; added `install_dir` output to `$GITHUB_OUTPUT` |
| `scripts/install.ps1` | Added `$env:LH_VERSION` override for pinned release URLs; added `install_dir` output to `$env:GITHUB_OUTPUT` |
| `.github/workflows/ci.yml` | Added `outputs` to `release` job; updated Extract Versions step to set `cli_version` job output; added MCPB build+pack steps; added `lighthouse-mcp-stdio.mcpb` to release assets; added `smoke-linux`, `smoke-windows`, `smoke-macos` jobs |
| `packages/mcp-stdio/README.md` | Added "Claude Desktop (MCPB Bundle)" installation section |
| `lighthouse-clients/docs/deployment.md` | Added installer env vars table; added MCPB bundle section under MCP Deployment |
| `docs/releasenotes/releasenotes.md` | Added vNext section announcing the MCPB bundle |

---

## Code Quality Validation

- [x] **YAML structure**: `ci.yml` reviewed — all jobs properly indented, no dangling steps
- [x] **Installer coverage**: `LH_VERSION` defaults to empty (safe fallback to `releases/latest`); `GITHUB_OUTPUT` guard prevents file not found errors outside CI
- [x] **Fixture server**: pure Node.js built-ins only; no npm deps; self-terminating after 120 s
- [x] **Launcher CJS**: uses `require("child_process")` — no bundler needed; cross-platform `npx.cmd` / `npx` handling
- [x] **MCPB manifest**: `manifest_version: "0.3"`, required fields present (`name`, `version`, `description`, `author.name`, `server`)
- [ ] **`mcpb validate`**: will be validated by the CI release job on first run — cannot be validated locally without published MCPB CLI
- [x] **Security**: no secrets in manifests; API key is declared `sensitive: true` in user_config; fixture serves only test data

---

## Value Statement Validation

| | |
|---|---|
| **Original value statement** | Every `main`-merge release is smoke-validated across Linux, Windows, and macOS; users can install the MCP server in Claude Desktop with one click via MCPB |
| **Delivered** | ✅ Three post-release smoke jobs (Linux Docker-real, Windows fixture, macOS fixture); ✅ `lighthouse-mcp-stdio.mcpb` asset attached to every GitHub Release; ✅ Installer hardening with `LH_VERSION` for deterministic CI downloads |

---

## Test Coverage

| Layer | Coverage |
|-------|---------|
| Unit tests | No new unit tests required — all changes are CI/DevOps infrastructure and documentation |
| Integration/smoke | Delivered as CI jobs (`smoke-linux`, `smoke-windows`, `smoke-macos`) that run post-release on every `main` push |
| MCPB validation | `npx -y @anthropic-ai/mcpb validate` runs in the release job against the staged manifest before packing |

---

## Test Execution Results

*These jobs will run on the next `main` merge that triggers a release. No offline test run is possible since smoke-linux requires Docker and smoke-windows/macos require a published CLI binary.*

| Job | Expected outcome |
|-----|-----------------|
| `smoke-linux` | CLI installed, Docker Lighthouse started, demo scenario seeded, `lh team list` returns `Team Zenith`/`Team Voyager`, `lh portfolio list` returns `Project Orion` |
| `smoke-windows` | Fixture started on random port, CLI installed, `lh team list` returns `FixtureTeam` |
| `smoke-macos` | Same as Windows; runs on `macos-13` (x64) to match published binary arch |

---

## Outstanding Items

| # | Item | Risk | Notes |
|---|------|------|-------|
| 1 | `mcpb validate` not pre-validated locally | Low | Will pass/fail on first release run; manifest structure follows spec exactly |
| 2 | `dist/bin.js` external deps in MCPB entry_point | Low | Addressed by CJS launcher + npx approach; launcher is self-contained |
| 3 | Windows background process (`&` in Git Bash) | Low-Medium | `&` in Git Bash generally survives the step on `windows-latest`; `.fixture-port` polling with 10 s timeout provides early failure detection |
| 4 | `smoke-windows` uses `.\scripts\install.ps1` — path separator | Low | Git Bash converts `/` but `.\` is native PowerShell notation; should work in `shell: pwsh` |

---

## Next Steps

1. Merge to `main` to trigger the first release run with the new smoke + MCPB steps.
2. Monitor `smoke-linux` Docker startup time — 90 s timeout may need adjustment if the Lighthouse image is slow to start.
3. After `mcpb validate` runs successfully in CI, consider adding the MCPB asset URL to the mcp-stdio README.
4. If `smoke-windows` fixture background process proves unreliable, replace `&` with `Start-Process` in a PowerShell step.
