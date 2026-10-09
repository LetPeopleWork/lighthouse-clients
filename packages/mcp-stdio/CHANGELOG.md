# @letpeoplework/lighthouse-mcp-stdio

## 1.3.0

### Minor Changes

- [`4dc896a`](https://github.com/LetPeopleWork/lighthouse-clients/commit/4dc896accfc148665c8d3e6fd26f5d5b26b70d98) Thanks [@huserben](https://github.com/huserben)! - See how the refinement votes stand, and vote, from the terminal and from an assistant
  
  Saying whether a Work Item is ready, and seeing whether the Team agrees, happened only on a Team's
  Refinement tab in the browser. Now `lh` and the MCP tools show how the votes stand on every Work Item in
  refinement, and let a person cast a vote, add a comment and take their vote back, under the same identity
  rules as the web page and in its words. Needs a Lighthouse newer than v26.10.3.6; an older server is told to
  upgrade and is never asked.
  
  - `lh refinement get` lists three more columns: **Votes** (the split, such as `1 Yes · 1 Yes, if…`, with a
    `*` where you have voted, or `No votes`), **Readiness** (`Ready`, `2 more Yes needed`, `Needs discussion`,
    as the web says it) and **Warnings** (`open question`, `stage disagrees`).
  - `lh refinement vote --team-id <id> --work-item <ref> --answer yes|yes-but|no [--comment <text>] [--as <name>]`,
    `lh refinement comment … --text <text>` and `lh refinement take-back …` answer in one line, such as
    `Recorded: Ana Lima — Yes on GR-073. That made GR-073 Ready.` A "Yes, if…" needs its condition. Lighthouse's
    refusals of a vote come back in plain words; any other refusal (a Team that is not there, a role that may
    not vote) reads `<category>: <reason>`, as in every other `lh` command. `--json` and `--toon` return the Work Item as the vote left it. A
    take-back names the answer it saw, so a vote changed since from somewhere else stays, and says whose vote it
    took back by the name that vote was cast under ("your vote" with sign-in, or when the log cannot say).
  - With sign-in, a vote is the signed-in account's; `lh` goes by what Lighthouse says, not by what was answered
    when the connection was saved. Without it, a vote carries the name given with `--as` or
    stored once with `lh config voter set --name <name>` (`lh config voter` shows it); `lh` never guesses a name.
    The first vote mints a random voter key for that Lighthouse and keeps it in `voter-keys.json` beside the CLI
    config, so the vote can be taken back from that machine. The file is its owner's alone (on Linux and
    macOS); `lh` and a local MCP server saving at the same moment both keep their keys, and a file that cannot
    be read is refused with a message naming it, never written over.
  - The MCP tools `lighthouse_team_refinement_vote` (`{ id, workItem, answer, comment?, voterName? }`, answer
    `Yes`, `YesBut` or `No`), `lighthouse_team_refinement_comment` and `lighthouse_team_refinement_voteTakeBack`
    are registered as writes. Their descriptions tell the assistant to confirm with the user first and to ask
    for the user's name rather than infer it. Each result carries a `summary` in the same words as `lh`.
    `lighthouse_team_refinement_get` marks the user's own vote. Like `lh`, the tools go by what Lighthouse says
    about sign-in: with it they send no name and keep no key, and a signed-in vote can be taken back; without
    it a vote or comment without `voterName` is refused before anything is sent or kept.
  - mcp-stdio keeps its voter key in the same file as `lh`, so a person is one voter whichever they use, and
    however each was given the URL (`HTTPS://Lighthouse.example:443/` and `https://lighthouse.example/api` are
    one Lighthouse).
    mcp-http, shared by many people, refuses votes on a Lighthouse without sign-in and points to the web page,
    `lh` or a local MCP server. With sign-in it votes only with the caller's own API key or token; a request
    that would fall back to the server's `LIGHTHOUSE_API_KEY` is refused, so nobody votes as the operator.
  - The client gains `castRefinementVote`, `addRefinementComment`, `takeBackRefinementVote` (with the `answer` it saw),
    `getRefinementLog` (a Work Item's sizing log, the caller's own entries marked `isMine`), a `voterKey` option
    on `getTeamRefinement`, `mintVoterKey`, `createFileVoterKeyStore` and the shared vote wording. A refusal's
    `LighthouseApiError` now also carries the `problemCode` and `problemTitle` Lighthouse sent.

- [`ce3d723`](https://github.com/LetPeopleWork/lighthouse-clients/commit/ce3d7234489fa2d1b01ab15171523eb1b9bfe86f) Thanks [@huserben](https://github.com/huserben)! - The local MCP server asks once, through the assistant, whether Lighthouse may receive usage data
  
  The first tool call that succeeds against a Lighthouse nobody on this machine has answered for asks once,
  through the assistant, when the assistant can ask (MCP elicitation). The tool's own answer reaches you
  unchanged either way. Accepting turns usage data on and declining keeps a No; closing the question or 50
  seconds without an answer keeps nothing, and the server does not ask again until it restarts.
  
  The answer is the one `lh` keeps for the same Lighthouse, so answering in either place stops both asking.
  When the assistant cannot ask, nothing is sent until you run `lh config usage-data on`. Nothing is asked
  or sent when the Lighthouse's administrator has stopped usage data or it was installed less than three
  days ago.
  
  With a yes, a manual forecast, a Team refresh, a Portfolio refresh, a Refinement vote (and the Work Item
  becoming Ready through it) and the Refinement read on a Refinement day are reported with the source `Mcp`,
  the same events the web reports for them. The send happens after the result is returned, so a slow
  Lighthouse never delays a tool, and a call Lighthouse refused reports nothing. `DO_NOT_TRACK` is honoured.
  
  `mcp-core`'s `registerMcpTools` takes an optional `usageData` port; without one, every tool behaves as
  before. `createMcpCoreRuntime` gains `callCountedTool`, which returns a tool's result with what it counts.
  
  When the Lighthouse will not let the question be put (installed less than three days ago, stopped by its
  administrator, not taking usage data from MCP, or not answering), tool calls stop waiting on it, and the
  server looks at its usage data state again at most once an hour instead of on every tool call.

### Patch Changes

- [`0f3d4af`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0f3d4afc80f1f17877b064e3de9e531eb48f9194) Thanks [@huserben](https://github.com/huserben)! - The MCP servers report their own package version to the assistant, instead of a fixed number that had fallen behind (0.2.5 for mcp-stdio, 0.1.0 for mcp-http).

- [`c113a1e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c113a1ee4b61cfc1501092a71a1a5b5ad277c94c) Thanks [@huserben](https://github.com/huserben)! - Ask how much to refine from the terminal and from an assistant
  
  "How many Work Items should we refine before the next Refinement?" was answered only on a Team's
  Refinement tab in the browser. Now `lh` and the MCP tools answer it too, in exactly the words the
  web page uses and in the instance's own terminology, so a renamed "Story" or "Grooming" reads the
  same everywhere. A term left blank, or terminology that cannot be read, reads as the default word, and a Team
  read without a name is called by the instance's word for a Team and its id ("Squad 3").
  Needs a Lighthouse newer than v26.10.3.6; an older server is told to upgrade and is never asked.
  
  - `lh refinement get --team-id <id>` states the next Refinement, how many Work Items are ready
    against the range the Team is likely to pull, and how many more to refine. It then lists the
    Work Items in refinement with the needed ones numbered and the "enough for the next Refinement"
    line where the web draws it. Without a number it says why: no Refinement cadence, not enough data
    yet, or no refinement states. Like the web page, it states a verdict only with every fact it is
    said with — the next Refinement, the cycle and its likelihoods — and otherwise gives no number,
    no numbered Work Items and no line. With nothing in refinement it says only "No Work Items in
    Refinement states right now", as the web page does. `--json` and `--toon` return the facts unchanged.
  - The MCP tool `lighthouse_team_refinement_get` (input `{ id }`) returns the same facts plus a
    `summary` holding the sentence the web page states. Its description explains the verdict, the
    range and the cycle it covers, whether today is a Refinement day, how many days remain until the
    next one, and whether the ready count comes from votes or from stages.
  - The client gains `getTeamRefinement(teamId)`, `getTerminology()` and the shared wording both
    surfaces use: `readRefinementWording` reads the Team's name and the instance's terms, and
    `describeRefinementSummary` and friends state the need in them.
  
  This release also carries the runtime dependency updates held back since the last one:
  `@modelcontextprotocol/sdk` 1.31.0, `undici` 8.11.2, `zod` 4 and `@toon-format/toon` 4. The TOON
  update changes what `--toon` and the MCP tool results look like in two places, while decoding to the
  same data: a list of records whose nested objects hold only plain values is now one table row per
  record (for example `split{yes,yesBut,no}` in the header), and an empty list prints as `[]`. A
  parser built on TOON 2 cannot read those tables; one built on TOON 4 reads them back exactly.
- Updated dependencies [[`92dcba7`](https://github.com/LetPeopleWork/lighthouse-clients/commit/92dcba78798a43179e6b610da647d70df7d78642), [`d624b34`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d624b34c91cae9a7fd0d6fd5651d5662bbcccb69), [`8dbc106`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8dbc1062877fc9e3067623b000a94466717b3515), [`7641927`](https://github.com/LetPeopleWork/lighthouse-clients/commit/7641927e0101b9c66e1cbf776715c68f71ec53ea), [`45aa6be`](https://github.com/LetPeopleWork/lighthouse-clients/commit/45aa6be764d20c6773a596e5cb0eba531cf116bf), [`004f43f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/004f43f8b9f28050b06876f8bf04468d4b88e581), [`a31f95f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a31f95fd24bfb8455a56c74362fd6a5cb9235192), [`6451f2e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/6451f2ef9929f66f93fd8189020ca9014bbb286e), [`2f4a0c1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2f4a0c1898e51540962cf92b3e70a522db1c35c4), [`8f750d3`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8f750d3debbea58b2eea130376f30117370f46f3), [`05dfd9a`](https://github.com/LetPeopleWork/lighthouse-clients/commit/05dfd9a500e5cc5ab2f0a5eef197ac982c893cfd), [`d10bd08`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d10bd086de111130b84a80be0f965419288e9792), [`92d0743`](https://github.com/LetPeopleWork/lighthouse-clients/commit/92d0743a591e9669bc3adacbc40fd00d65c066ae), [`c113a1e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c113a1ee4b61cfc1501092a71a1a5b5ad277c94c), [`4dc896a`](https://github.com/LetPeopleWork/lighthouse-clients/commit/4dc896accfc148665c8d3e6fd26f5d5b26b70d98), [`c4d52b9`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c4d52b9f12120bb71418f5c333be35280feae160), [`25fc147`](https://github.com/LetPeopleWork/lighthouse-clients/commit/25fc14711eaf2af0f855a306d942c687cc20ed53), [`ce3d723`](https://github.com/LetPeopleWork/lighthouse-clients/commit/ce3d7234489fa2d1b01ab15171523eb1b9bfe86f)]:
  - @letpeoplework/lighthouse-mcp-core@1.8.0
  - @letpeoplework/lighthouse-client@1.9.0

## 1.2.6

### Patch Changes

- Updated dependencies [[`1ceb8e6`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1ceb8e6bdc6dea7fea52c462efc11195b37e250b)]:
  - @letpeoplework/lighthouse-client@1.8.1
  - @letpeoplework/lighthouse-mcp-core@1.7.1

## 1.2.5

### Patch Changes

- Updated dependencies [[`501ceb1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/501ceb13c60668d194e9f970a935ae4529c371ec)]:
  - @letpeoplework/lighthouse-client@1.8.0
  - @letpeoplework/lighthouse-mcp-core@1.7.0

## 1.2.4

### Patch Changes

- Updated dependencies [[`5bcb2a6`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5bcb2a6996c1b7e09b78ef4c82b44811e6d7e498), [`9db487b`](https://github.com/LetPeopleWork/lighthouse-clients/commit/9db487bb4ed87409e8f264751a7f1b6a64b10499)]:
  - @letpeoplework/lighthouse-client@1.7.0
  - @letpeoplework/lighthouse-mcp-core@1.6.0

## 1.2.3

### Patch Changes

- Updated dependencies [[`5b8f305`](https://github.com/LetPeopleWork/lighthouse-clients/commit/5b8f305c33c5029bbde42fc9d02f1e39f03d8c9c)]:
  - @letpeoplework/lighthouse-client@1.6.0
  - @letpeoplework/lighthouse-mcp-core@1.5.0

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
