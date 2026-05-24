---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-http": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
---

Support Lighthouse v26.5.24.10's "Exclude Items for Throughput" forecast filter:

- `getTeamThroughput(teamId, range?, view?)` and `getTeamPredictabilityScore(teamId, range?, view?)` now accept an optional `view: "raw" | "filtered"`. Passing `"filtered"` appends `&view=filtered` so the team's forecast-exclusion rule is applied server-side.
- `ManualForecastInput` and `BacktestInput` gain an optional `applyFilterOverride?: boolean` field (`true` = apply, `false` = skip, omit = respect the team setting).
- MCP tools `lighthouse_team_metrics_throughput`, `lighthouse_forecast_manual`, and `lighthouse_forecast_backtest` accept the new params and surface the `filterApplied` / `excludedSummary` fields on responses (the server already includes them in the payload).
- CLI: `lh metrics team --filter <raw|filtered>` plus `lh forecast manual --filter <raw|filtered|team>` and `lh forecast backtest --filter <raw|filtered|team>`.

All additions are backward-compatible. Older Lighthouse servers ignore the new fields.
