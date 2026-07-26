---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-cli": minor
---

Expose the two over-time trend series — percentiles and process-behaviour limits (Lighthouse Epic 5427).

Lighthouse records a daily snapshot of its percentile quartet and its natural process limits, so you can ask "how has this been trending?" instead of only "what is it right now?". Both series are now readable from the client, the CLI and MCP.

- **Client**: `getTeamPercentilesOverTime` / `getPortfolioPercentilesOverTime` return the dated `p50/p70/p85/p95` quartet for a metric family (`CycleTime`, `WorkItemAge`), and `getTeamProcessBehaviorOverTime` / `getPortfolioProcessBehaviorOverTime` return the dated `unpl/average/lnpl` triple for a process-behaviour family (`Throughput`, `WorkItemAge`, `Wip`, `CycleTime`, `Arrivals`, and — portfolio only — `FeatureSize`). Both are gated on a Lighthouse server newer than v26.7.11.4.
- **CLI**: two new `metrics` selections, `--metrics percentilesOverTime` and `--metrics processBehaviorOverTime`.
- **MCP**: `lighthouse_{team,portfolio}_metrics_percentilesOverTime` and `lighthouse_{team,portfolio}_metrics_processBehaviorOverTime`.

Two things worth knowing, because they change how an empty answer should be read:

**Recording is forward-only.** Lighthouse starts capturing the day the feature is deployed and never backfills history it did not observe, so a freshly upgraded server returns an empty series until it has recorded some days. That is honest emptiness, not an error. Process-behaviour days without a usable baseline are omitted rather than recorded as zeroes, so an empty series never means "a process pinned at zero".

**Ask for one cycle-time horizon at a time.** Cycle-time percentiles are recorded per horizon (30/60/90 days), but the row shape carries no horizon field — so a `CycleTime` request that omits `horizon` returns all three interleaved with no way to separate them. Pass an explicit `horizon` whenever you ask for `CycleTime`. Work item age is always as-of-today and has no horizon, so one is ignored if sent. The CLI pins horizon 30, matching the dashboard's default view.
