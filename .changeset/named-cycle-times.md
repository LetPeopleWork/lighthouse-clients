---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Support named cycle times (premium) on cycle-time percentiles.

`getTeamCycleTimePercentiles` / `getPortfolioCycleTimePercentiles` gain an optional
`definitionId` argument that returns the percentiles for a named cycle time instead of
the default cycle time. The CLI exposes it as `--definition-id <id>` on `lh metrics ...`
(cycleTime metric), and the MCP `lighthouse_team_metrics_cycleTimePercentiles` tool gains
an optional `definitionId`. The change is additive — an older Lighthouse server ignores
the parameter and returns the default percentiles, so no version gate is required. The
per-item named durations already flow through `cycleTimeData` unchanged.
