---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Add version-gated work-item-age percentiles (team + portfolio).

`getTeamWorkItemAgePercentiles` / `getPortfolioWorkItemAgePercentiles` wrap the new
`/metrics/workItemAgePercentiles` endpoint. The CLI surfaces the percentiles under the
`workItemAge` metric (new `workItemAgePercentiles` payload key), and the MCP gains
`lighthouse_team_metrics_workItemAgePercentiles` /
`lighthouse_portfolio_metrics_workItemAgePercentiles` tools. The endpoint requires a
Lighthouse server newer than `v26.6.7.1`; older servers fail fast with an
"upgrade Lighthouse" error and never issue the request, while dev/unparseable versions
are allowed through.
