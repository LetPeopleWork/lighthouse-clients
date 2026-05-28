---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Add cumulative-state-time metrics support across the client, CLI, and MCP surfaces.

Wraps the six Lighthouse `cumulativeStateTime` endpoints (bar data, per-state
item drill-down, and picker candidates — team and portfolio scoped):

- **client**: `getTeamCumulativeStateTime`, `getTeamCumulativeStateTimeItems`,
  `getTeamCumulativeStateTimeCandidates` and the portfolio equivalents, plus
  typed result models. Bar and items accept an optional `itemIds` subset; items
  takes a `state`.
- **cli**: new `cumulativeStateTime` value for `lh metrics team|portfolio --metrics`,
  bundling bar + candidates (+ per-state drill-down when `--state` is given);
  `--item-ids <id,...>` narrows the bars to a subset.
- **mcp**: six new read-only tools
  (`lighthouse_{team,portfolio}_metrics_cumulativeStateTime[Items|Candidates]`).
