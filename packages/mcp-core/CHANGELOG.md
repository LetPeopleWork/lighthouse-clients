# @letpeoplework/lighthouse-mcp-core

## 1.4.0

### Minor Changes

- [`c462875`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c4628751c08cf3e1cc46906a4abe1d81f76f41db) Thanks [@huserben](https://github.com/huserben)! - Support named cycle times (premium) on cycle-time percentiles.

  `getTeamCycleTimePercentiles` / `getPortfolioCycleTimePercentiles` gain an optional
  `definitionId` argument that returns the percentiles for a named cycle time instead of
  the default cycle time. The CLI exposes it as `--definition-id <id>` on `lh metrics ...`
  (cycleTime metric), and the MCP `lighthouse_team_metrics_cycleTimePercentiles` tool gains
  an optional `definitionId`. The change is additive — an older Lighthouse server ignores
  the parameter and returns the default percentiles, so no version gate is required. The
  per-item named durations already flow through `cycleTimeData` unchanged.

- [`f8d5d04`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f8d5d0495d5c93d158a580abaca15b9f6c3d514e) Thanks [@huserben](https://github.com/huserben)! - Add version-gated work-item-age percentiles (team + portfolio).

  `getTeamWorkItemAgePercentiles` / `getPortfolioWorkItemAgePercentiles` wrap the new
  `/metrics/workItemAgePercentiles` endpoint. The CLI surfaces the percentiles under the
  `workItemAge` metric (new `workItemAgePercentiles` payload key), and the MCP gains
  `lighthouse_team_metrics_workItemAgePercentiles` /
  `lighthouse_portfolio_metrics_workItemAgePercentiles` tools. The endpoint requires a
  Lighthouse server newer than `v26.6.7.1`; older servers fail fast with an
  "upgrade Lighthouse" error and never issue the request, while dev/unparseable versions
  are allowed through.

### Patch Changes

- Updated dependencies [[`c462875`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c4628751c08cf3e1cc46906a4abe1d81f76f41db), [`f8d5d04`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f8d5d0495d5c93d158a580abaca15b9f6c3d514e)]:
  - @letpeoplework/lighthouse-client@1.4.0

## 1.3.0

### Minor Changes

- [`1e4f59e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1e4f59ef92d4176cb3c559bc169401d8552cec0c) Thanks [@huserben](https://github.com/huserben)! - Add recurring blackout-rule support across the client, CLI, and MCP surfaces.

  Wraps the new Lighthouse `recurring-blackout-rules` endpoint family — recurring
  non-working days (pick weekdays, an every-X-weeks interval, a start date, and an
  optional open end) that forecasts skip automatically, just like one-off blackout
  dates.

  - **client**: `getRecurringBlackoutRules`, `createRecurringBlackoutRule`,
    `updateRecurringBlackoutRule`, and `deleteRecurringBlackoutRule`, with the
    `RecurringBlackoutRule` / `DayOfWeek` / `RecurringBlackoutRuleInput` types.
  - **cli**: a `blackout` command group — `list`, `create`, `update`, `delete`.
  - **mcp**: four tools — `lighthouse_blackout_list`, `lighthouse_blackout_create`,
    `lighthouse_blackout_update`, `lighthouse_blackout_delete` — exposed through
    the HTTP and stdio servers.

  These methods are server-version-gated: the endpoint family did not exist before,
  so on a Lighthouse server that is not newer than `v26.5.29.5` (the last release
  without it) the client returns a clear "upgrade Lighthouse" error instead of an
  opaque 404, and makes no write request. Dev and unparseable server versions are
  never blocked. Creating, updating, and deleting rules is a Premium, system-admin
  operation on the server; the clients forward the caller's auth and surface a 403
  normally.

### Patch Changes

- [`70a4177`](https://github.com/LetPeopleWork/lighthouse-clients/commit/70a4177e05475185ae29a6623d5e551923fbc22d) Thanks [@huserben](https://github.com/huserben)! - Surface HTTP 409 optimistic-concurrency conflicts from config-edit writes as a
  distinct, recognizable error.

  When a config-edit request (e.g. `updateTeam`, `updatePortfolio`,
  `updateDelivery`) hits an aggregate that another admin changed concurrently, the
  Lighthouse server now answers with HTTP 409 and a `concurrency-conflict`
  ProblemDetails body. The client maps that response to a dedicated
  `concurrency-conflict` error category (`statusCode: 409`) whose `reason`
  preserves the server's message and appends actionable guidance: re-fetch the
  current settings to obtain the latest concurrency token, then re-apply the
  change. The CLI and MCP error surfaces present that guidance verbatim instead of
  an opaque "request failed" message.

  The change is purely additive and tolerant of older servers: a server that never
  emits 409 exercises none of the new path, and the optimistic-concurrency token
  round-trips inside the existing pass-through write payload, so no schema change
  or version gate is required. Non-409 failures keep their existing categories.

- Updated dependencies [[`70a4177`](https://github.com/LetPeopleWork/lighthouse-clients/commit/70a4177e05475185ae29a6623d5e551923fbc22d), [`1e4f59e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1e4f59ef92d4176cb3c559bc169401d8552cec0c)]:
  - @letpeoplework/lighthouse-client@1.3.0

## 1.2.0

### Minor Changes

- [`7f33beb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/7f33beb0b9f243493778b1e2fc9fdc29f641d71a) Thanks [@huserben](https://github.com/huserben)! - Add cumulative-state-time metrics support across the client, CLI, and MCP surfaces.

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

### Patch Changes

- Updated dependencies [[`7f33beb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/7f33beb0b9f243493778b1e2fc9fdc29f641d71a), [`5b622f7`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5b622f7d495cf5d3e5c600c5855ce00a7c4846b9)]:
  - @letpeoplework/lighthouse-client@1.2.0

## 1.1.0

### Minor Changes

- [`bee9336`](https://github.com/LetPeopleWork/lighthouse-clients/commit/bee93362c4c2c62add796346a7ba1b5ef383f7da) Thanks [@huserben](https://github.com/huserben)! - Support Lighthouse v26.5.24.10's "Exclude Items for Throughput" forecast filter:

  - `getTeamThroughput(teamId, range?, view?)` and `getTeamPredictabilityScore(teamId, range?, view?)` now accept an optional `view: "raw" | "filtered"`. Passing `"filtered"` appends `&view=filtered` so the team's forecast-exclusion rule is applied server-side.
  - `ManualForecastInput` and `BacktestInput` gain an optional `applyFilterOverride?: boolean` field (`true` = apply, `false` = skip, omit = respect the team setting).
  - MCP tools `lighthouse_team_metrics_throughput`, `lighthouse_forecast_manual`, and `lighthouse_forecast_backtest` accept the new params and surface the `filterApplied` / `excludedSummary` fields on responses (the server already includes them in the payload).
  - CLI: `lh metrics team --filter <raw|filtered>` plus `lh forecast manual --filter <raw|filtered|team>` and `lh forecast backtest --filter <raw|filtered|team>`.

  All additions are backward-compatible. Older Lighthouse servers ignore the new fields.

### Patch Changes

- Updated dependencies [[`bee9336`](https://github.com/LetPeopleWork/lighthouse-clients/commit/bee93362c4c2c62add796346a7ba1b5ef383f7da)]:
  - @letpeoplework/lighthouse-client@1.1.0

## 1.0.1

### Patch Changes

- [`9c0a057`](https://github.com/LetPeopleWork/lighthouse-clients/commit/9c0a0575c2803ff2fcbc5168ffa1aea87338ca6d) Thanks [@huserben](https://github.com/huserben)! - fix item age calculation with non-midnight UTC startedDate

- Updated dependencies [[`9c0a057`](https://github.com/LetPeopleWork/lighthouse-clients/commit/9c0a0575c2803ff2fcbc5168ffa1aea87338ca6d)]:
  - @letpeoplework/lighthouse-client@1.0.1

## 1.0.0

### Major Changes

- [`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c) Thanks [@huserben](https://github.com/huserben)! - Initial release of cli and mcp for Lighthouse

### Minor Changes

- [`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c) Thanks [@huserben](https://github.com/huserben)! - Add work item age and total work item age metrics, derived client-side from the WIP-over-time endpoint.

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

### Patch Changes

- Updated dependencies [[`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c), [`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c)]:
  - @letpeoplework/lighthouse-client@1.0.0

## 0.7.0

### Minor Changes

- [`8dc4efc`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8dc4efc5d151d36c5e68d74741ae3feb14c94865) Thanks [@huserben](https://github.com/huserben)! - update tool names to use snake_case format for consistency

## 0.6.0

### Minor Changes

- [`53ca796`](https://github.com/LetPeopleWork/lighthouse-clients/commit/53ca79637b8d67319423693f81603c809d7b01bf) Thanks [@huserben](https://github.com/huserben)! - add TOON serialization for MCP tool responses and implement insecure HTTPS handling

## 0.5.0

### Minor Changes

- [`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94) Thanks [@huserben](https://github.com/huserben)! - Implement the first production-ready stdio MCP server slice and shared discovery/runtime plumbing:

  - extract and export shared standalone lock-file discovery helpers in the client package
  - move CLI standalone discovery to use shared client helper exports
  - add SDK-based MCP tool registration helper and richer tool schemas in mcp-core
  - implement executable stdio MCP runtime with env/lockfile connection resolution, API-key auth wiring, and graceful shutdown
  - add targeted tests for shared discovery and stdio startup guard paths

- [`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94) Thanks [@huserben](https://github.com/huserben)! - Add MCP Server features

### Patch Changes

- Updated dependencies [[`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94), [`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94)]:
  - @letpeoplework/lighthouse-client@0.8.0

## 0.4.2

### Patch Changes

- Updated dependencies [[`d2b2795`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d2b27956b91c84d314ce8b37ae81d6ff4c8800ee)]:
  - @letpeoplework/lighthouse-client@0.7.0

## 0.4.1

### Patch Changes

- Updated dependencies [[`a9ebce0`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a9ebce0fceae503971b45bf3ec1b595efe0e6c94)]:
  - @letpeoplework/lighthouse-client@0.6.0

## 0.4.0

### Minor Changes

- [`2ad3aeb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2ad3aeb8d5cae15c3fb6a80ee8c9146474f02e33) Thanks [@huserben](https://github.com/huserben)! - enhance CLI to support standalone mode

### Patch Changes

- Updated dependencies [[`2ad3aeb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2ad3aeb8d5cae15c3fb6a80ee8c9146474f02e33)]:
  - @letpeoplework/lighthouse-client@0.5.0

## 0.3.2

### Patch Changes

- Updated dependencies [[`d5fd130`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d5fd130c5afc4b1a7e5d6655fb6ab993ba8a82b7), [`d4a3c0f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d4a3c0f62525e59a3532251f8cab4c9761766bb2)]:
  - @letpeoplework/lighthouse-client@0.4.0

## 0.3.1

### Patch Changes

- Bump packages

- Updated dependencies [[`2564221`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2564221cb3b7ebe5cc93f47dd6f4ffcd92db8cc0)]:
  - @letpeoplework/lighthouse-client@0.3.1

## 0.3.0

### Minor Changes

- [`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce) Thanks [@huserben](https://github.com/huserben)! - add team and portfolio metrics tools

### Patch Changes

- Updated dependencies [[`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce)]:
  - @letpeoplework/lighthouse-client@0.3.0
