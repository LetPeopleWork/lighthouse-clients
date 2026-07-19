---
"@letpeoplework/lighthouse-client": patch
"@letpeoplework/lighthouse-mcp-core": patch
---

Work-item age is now reported as of the end of the selected range (Lighthouse Story 5508).

Previously every work-item-age surface aged items to *today*, no matter which range you asked for — so a query for last quarter came back describing how old those items would be now, not how old they were then. Lighthouse now ages items to the **last day of the selected range**, which is what a historical question actually asks.

- **Client**: `getTeamWorkItemAgePercentiles`, `getPortfolioWorkItemAgePercentiles`, `getTeamTotalWorkItemAge` and `getPortfolioTotalWorkItemAge` return the corrected values. No method signatures or response types change — only the numbers, and only for ranges that end in the past.
- **MCP**: the `lighthouse_team_metrics_workItemAgePercentiles` and `lighthouse_portfolio_metrics_workItemAgePercentiles` tool descriptions now state the as-of semantics, so an assistant does not narrate a historical result as the current state of the board.

Nothing breaks: when the range ends today, values are identical to before. The daily over-time series (`lighthouse_*_metrics_workItemAge` / `totalWorkItemAge`) was already date-correct and is unaffected. Requires a Lighthouse server carrying the Story 5508 change; older servers keep the old aging behaviour.
