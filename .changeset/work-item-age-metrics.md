---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": major
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
"@letpeoplework/lighthouse-mcp-http": minor
---

Add work item age and total work item age metrics, derived client-side from the WIP-over-time endpoint.

**New exports in `@letpeoplework/lighthouse-client`:**
- `WorkItemAgeEntry`, `DailyWorkItemAge`, `WorkItemAgeOverTimeResult`
- `DailyTotalWorkItemAge`, `TotalWorkItemAgeOverTimeResult`
- `getTeamWorkItemAgeOverTime`, `getTeamTotalWorkItemAgeOverTime`
- `getPortfolioWorkItemAgeOverTime`, `getPortfolioTotalWorkItemAgeOverTime`

**Breaking change in `@letpeoplework/lighthouse-cli`:** The `workItemAge` and `totalWorkItemAge` metric payload shapes have changed. Both now return a time-series result with `{ startDate, endDate, daily: [...] }` instead of a single scalar or legacy structure.

**New MCP tools in `@letpeoplework/lighthouse-mcp-core`:**
- `lighthouse_team_metrics_workItemAge`
- `lighthouse_team_metrics_totalWorkItemAge`
- `lighthouse_portfolio_metrics_workItemAge`
- `lighthouse_portfolio_metrics_totalWorkItemAge`
