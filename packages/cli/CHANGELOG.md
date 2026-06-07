# @letpeoplework/lighthouse-cli

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

## 0.12.1

### Patch Changes

- [`c0faba8`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c0faba8cce1798d2c7046c2d1b4b21373d137540) Thanks [@huserben](https://github.com/huserben)! - add CLI startup verification and enhance isDirectExecution logic

## 0.12.0

### Minor Changes

- [`820ea0a`](https://github.com/LetPeopleWork/lighthouse-clients/commit/820ea0aaae19e3e3883124503467b9851d4c68f5) Thanks [@huserben](https://github.com/huserben)! - add support for API key authentication via environment variable in CLI

### Patch Changes

- [`d3fa8cd`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d3fa8cd3d8455653137f637f2ca5b0c1fdabb7b7) Thanks [@huserben](https://github.com/huserben)! - Update readme

## 0.11.0

### Minor Changes

- [`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94) Thanks [@huserben](https://github.com/huserben)! - Add MCP Server features

### Patch Changes

- Updated dependencies [[`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94), [`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94)]:
  - @letpeoplework/lighthouse-client@0.8.0

## 0.10.0

### Minor Changes

- [`5e2e897`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5e2e8970d070e124d7962c37176632eb004126e7) Thanks [@huserben](https://github.com/huserben)! - replace bearer token authentication with API key support in CLI

### Patch Changes

- [`2a7085a`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2a7085a17f68d19dedfad8c3497c267cf712e731) Thanks [@huserben](https://github.com/huserben)! - remove blackout indicators from daily metrics data structures

- [`0f91053`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0f910534adbb9670b35f96780d3b440a3c799322) Thanks [@huserben](https://github.com/huserben)! - add scripted connection options for non-interactive CLI usage

## 0.9.0

### Minor Changes

- [`8db3471`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8db34715fc38bf951223fd14eef4e55abf3edf33) Thanks [@huserben](https://github.com/huserben)! - Add optional `--metrics` flag to `lh metrics team` and `lh metrics portfolio` commands. Pass a comma-separated list of metric names to retrieve only those metrics (e.g. `--metrics throughput,wip,cycletime`). Omit the flag to get all metrics as before. Allowed values: `throughput`, `wip`, `cycleTime`, `workItemAge`, `totalWorkItemAge`, `arrivals`, `predictabilityScore`. Unknown values produce a clear error listing allowed names.

- [`8db3471`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8db34715fc38bf951223fd14eef4e55abf3edf33) Thanks [@huserben](https://github.com/huserben)! - add optional --metrics flag to lh metrics commands for selective metric retrieval

- [`d2b2795`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d2b27956b91c84d314ce8b37ae81d6ff4c8800ee) Thanks [@huserben](https://github.com/huserben)! - rename totalWorkItemAgePbc to totalWorkItemAgeInfo and update related API endpoints

### Patch Changes

- Updated dependencies [[`d2b2795`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d2b27956b91c84d314ce8b37ae81d6ff4c8800ee)]:
  - @letpeoplework/lighthouse-client@0.7.0

## 0.8.1

### Patch Changes

- [`6f72583`](https://github.com/LetPeopleWork/lighthouse-clients/commit/6f7258350fca6cd19a200624c3a8f5d8be1a05cf) Thanks [@huserben](https://github.com/huserben)! - Fix linting

## 0.8.0

### Minor Changes

- [`391212c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/391212c10838382a0a6fbdb1ce2fe0c8f46d75cc) Thanks [@huserben](https://github.com/huserben)! - use fileURLToPath for URL comparison in runCli

## 0.7.0

### Minor Changes

- [`a9ebce0`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a9ebce0fceae503971b45bf3ec1b595efe0e6c94) Thanks [@huserben](https://github.com/huserben)! - add new team and portfolio metrics endpoints to Lighthouse client

### Patch Changes

- Updated dependencies [[`a9ebce0`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a9ebce0fceae503971b45bf3ec1b595efe0e6c94)]:
  - @letpeoplework/lighthouse-client@0.6.0

## 0.6.0

### Minor Changes

- [`2ad3aeb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2ad3aeb8d5cae15c3fb6a80ee8c9146474f02e33) Thanks [@huserben](https://github.com/huserben)! - enhance CLI to support standalone mode

### Patch Changes

- Updated dependencies [[`2ad3aeb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2ad3aeb8d5cae15c3fb6a80ee8c9146474f02e33)]:
  - @letpeoplework/lighthouse-client@0.5.0

## 0.5.0

### Minor Changes

- [`d5fd130`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d5fd130c5afc4b1a7e5d6655fb6ab993ba8a82b7) Thanks [@huserben](https://github.com/huserben)! - Handle auth properly

- [`d4a3c0f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d4a3c0f62525e59a3532251f8cab4c9761766bb2) Thanks [@huserben](https://github.com/huserben)! - enhance CLI authentication flow with support for insecure HTTPS and improved error handling

- [`1b93ea0`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1b93ea0ff231016b24d13e99bdf5a675c985e0a0) Thanks [@huserben](https://github.com/huserben)! - add support for multiple output formats (pretty, json, toon) and configure default output format

### Patch Changes

- Updated dependencies [[`d5fd130`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d5fd130c5afc4b1a7e5d6655fb6ab993ba8a82b7), [`d4a3c0f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d4a3c0f62525e59a3532251f8cab4c9761766bb2)]:
  - @letpeoplework/lighthouse-client@0.4.0

## 0.4.2

### Patch Changes

- fix: update CLI version to 0.5.0 and change bin entry to use .js extension

## 0.4.1

### Patch Changes

- [`2564221`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2564221cb3b7ebe5cc93f47dd6f4ffcd92db8cc0) Thanks [@huserben](https://github.com/huserben)! - Fix missing CJS build output in lighthouse-client. The package was missing `"type": "module"` which caused tsup to produce `index.mjs`/`index.js` instead of `index.js`/`index.cjs`, resulting in a runtime crash when the CLI tried to load `dist/index.cjs` after a global install.

- Bump packages

- Updated dependencies [[`2564221`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2564221cb3b7ebe5cc93f47dd6f4ffcd92db8cc0)]:
  - @letpeoplework/lighthouse-client@0.3.1

## 0.4.0

### Minor Changes

- rename CLI command from `lighthouse` to `lh`

- Rename CLI command from `lighthouse` to `lh`.

  **Breaking change:** the globally installed command is now `lh` instead of `lighthouse`. Users upgrading from 0.3.x must reinstall the package to register the new command name:

  ```bash
  npm install -g @letpeoplework/lighthouse-cli
  # then use lh instead of lighthouse
  lh health check
  ```

## 0.3.1

### Patch Changes

- Make cli executable via npm

## 0.3.0

### Minor Changes

- [`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce) Thanks [@huserben](https://github.com/huserben)! - add team and portfolio metrics tools

### Patch Changes

- Updated dependencies [[`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce)]:
  - @letpeoplework/lighthouse-client@0.3.0
