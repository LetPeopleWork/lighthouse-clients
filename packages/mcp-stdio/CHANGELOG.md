# @letpeoplework/lighthouse-mcp-stdio

## 1.2.2

### Patch Changes

- Updated dependencies [[`c2efcf1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c2efcf1dede34a766b26f50003ec0bf2dbd698ab)]:
  - @letpeoplework/lighthouse-client@1.5.0
  - @letpeoplework/lighthouse-mcp-core@1.4.1

## 1.2.1

### Patch Changes

- Updated dependencies [[`c462875`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c4628751c08cf3e1cc46906a4abe1d81f76f41db), [`f8d5d04`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f8d5d0495d5c93d158a580abaca15b9f6c3d514e)]:
  - @letpeoplework/lighthouse-client@1.4.0
  - @letpeoplework/lighthouse-mcp-core@1.4.0

## 1.2.0

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

- Updated dependencies [[`70a4177`](https://github.com/LetPeopleWork/lighthouse-clients/commit/70a4177e05475185ae29a6623d5e551923fbc22d), [`1e4f59e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1e4f59ef92d4176cb3c559bc169401d8552cec0c)]:
  - @letpeoplework/lighthouse-client@1.3.0
  - @letpeoplework/lighthouse-mcp-core@1.3.0

## 1.1.1

### Patch Changes

- Updated dependencies [[`7f33beb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/7f33beb0b9f243493778b1e2fc9fdc29f641d71a), [`5b622f7`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5b622f7d495cf5d3e5c600c5855ce00a7c4846b9)]:
  - @letpeoplework/lighthouse-client@1.2.0
  - @letpeoplework/lighthouse-mcp-core@1.2.0

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
  - @letpeoplework/lighthouse-mcp-core@1.1.0

## 1.0.1

### Patch Changes

- [`9c0a057`](https://github.com/LetPeopleWork/lighthouse-clients/commit/9c0a0575c2803ff2fcbc5168ffa1aea87338ca6d) Thanks [@huserben](https://github.com/huserben)! - fix item age calculation with non-midnight UTC startedDate

- Updated dependencies [[`9c0a057`](https://github.com/LetPeopleWork/lighthouse-clients/commit/9c0a0575c2803ff2fcbc5168ffa1aea87338ca6d)]:
  - @letpeoplework/lighthouse-client@1.0.1
  - @letpeoplework/lighthouse-mcp-core@1.0.1

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

- [`5c912d6`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5c912d60b3c8b59d6ca8774625f3e670e6c7d3f4) Thanks [@huserben](https://github.com/huserben)! - author email in manifest.json

- Updated dependencies [[`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c), [`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c)]:
  - @letpeoplework/lighthouse-mcp-core@1.0.0
  - @letpeoplework/lighthouse-client@1.0.0

## 0.8.2

### Patch Changes

- [`00305be`](https://github.com/LetPeopleWork/lighthouse-clients/commit/00305be38dd065a1eaf43a24c35f083519789046) Thanks [@huserben](https://github.com/huserben)! - feat: enhance MCPB bundle to include self-contained runtime and streamline installation process

- Updated dependencies [[`8dc4efc`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8dc4efc5d151d36c5e68d74741ae3feb14c94865)]:
  - @letpeoplework/lighthouse-mcp-core@0.7.0

## 0.8.1

### Patch Changes

- [`1f4ada1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1f4ada1232f39576f14d98763898db651141c9e2) Thanks [@huserben](https://github.com/huserben)! - Update build steps

## 0.8.0

### Minor Changes

- [`8921a33`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8921a336a63feebd23ff8edd9c34dd03d5cbf1bb) Thanks [@huserben](https://github.com/huserben)! - implement post-release smoke tests and MCPB packaging for lighthouse-mcp-stdio

## 0.7.0

### Minor Changes

- [`e8f8796`](https://github.com/LetPeopleWork/lighthouse-clients/commit/e8f8796638fe1572f2d794dcbef2926cd9eab9dc) Thanks [@huserben](https://github.com/huserben)! - implement direct execution check for MCP tools using realpathSync

## 0.6.0

### Minor Changes

- [`226fd77`](https://github.com/LetPeopleWork/lighthouse-clients/commit/226fd778a3b7a1b2ef226bf3d42fbb37295e14d4) Thanks [@huserben](https://github.com/huserben)! - update build scripts and improve runtime exit handling for MCP tools

## 0.5.0

### Minor Changes

- [`c84ef36`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c84ef36d59f577fa057d3235fdc514b9d82bf23a) Thanks [@huserben](https://github.com/huserben)! - update bin scripts for proper shebang handling

## 0.4.0

### Minor Changes

- [`53ca796`](https://github.com/LetPeopleWork/lighthouse-clients/commit/53ca79637b8d67319423693f81603c809d7b01bf) Thanks [@huserben](https://github.com/huserben)! - add TOON serialization for MCP tool responses and implement insecure HTTPS handling

### Patch Changes

- Updated dependencies [[`53ca796`](https://github.com/LetPeopleWork/lighthouse-clients/commit/53ca79637b8d67319423693f81603c809d7b01bf)]:
  - @letpeoplework/lighthouse-mcp-core@0.6.0

## 0.3.1

### Patch Changes

- [`33632f6`](https://github.com/LetPeopleWork/lighthouse-clients/commit/33632f636a0ef210c185c37bf7c41d1945d58b40) Thanks [@huserben](https://github.com/huserben)! - update package.json and tsup.config.ts for improved CLI and MCP build configurations

## 0.3.0

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
  - @letpeoplework/lighthouse-mcp-core@0.5.0

## 0.2.5

### Patch Changes

- Updated dependencies []:
  - @letpeoplework/lighthouse-mcp-core@0.4.2

## 0.2.4

### Patch Changes

- Updated dependencies []:
  - @letpeoplework/lighthouse-mcp-core@0.4.1

## 0.2.3

### Patch Changes

- Updated dependencies [[`2ad3aeb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2ad3aeb8d5cae15c3fb6a80ee8c9146474f02e33)]:
  - @letpeoplework/lighthouse-mcp-core@0.4.0

## 0.2.2

### Patch Changes

- Updated dependencies []:
  - @letpeoplework/lighthouse-mcp-core@0.3.2

## 0.2.1

### Patch Changes

- Bump packages

- Updated dependencies []:
  - @letpeoplework/lighthouse-mcp-core@0.3.1

## 0.2.0

### Minor Changes

- [`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce) Thanks [@huserben](https://github.com/huserben)! - add team and portfolio metrics tools

### Patch Changes

- Updated dependencies [[`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce)]:
  - @letpeoplework/lighthouse-mcp-core@0.3.0
