---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Expose blocked items to the clients (Lighthouse Epic 5074).

- **Client**: new version-gated `getTeamBlockedCountHistory` / `getPortfolioBlockedCountHistory` methods returning the blocked-items-over-time trend (`BlockedCountSnapshot[]`). Gated on a Lighthouse server newer than `v26.7.3.1`.
- **CLI**: new `blocked` metric for the `metrics` command (`--metrics blocked`) surfacing the blocked-over-time history; replaces the former static "unavailable" placeholder.
- **MCP**: new `lighthouse_team_metrics_blockedCountHistory` and `lighthouse_portfolio_metrics_blockedCountHistory` tools.

To see what is blocked *right now* and for how long, read the current WIP snapshot — each item carries `isBlocked` and, when blocked, a `blockedSince` timestamp (server newer than `v26.7.3.1`).
