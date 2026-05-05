# @letpeoplework/lighthouse-mcp-http

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

- Updated dependencies [[`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c), [`2b54253`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2b542537d2756dbeb582764bdff1aa4077e35e3c)]:
  - @letpeoplework/lighthouse-mcp-core@1.0.0
  - @letpeoplework/lighthouse-client@1.0.0

## 0.8.1

### Patch Changes

- [`7e11c9e`](https://github.com/LetPeopleWork/lighthouse-clients/commit/7e11c9e61238b722143de8c013a700c9c8cfd2a3) Thanks [@huserben](https://github.com/huserben)! - update Dockerfile for mcp-http to streamline build process and add noExternal configuration in tsup

## 0.8.0

### Minor Changes

- [`ceeef62`](https://github.com/LetPeopleWork/lighthouse-clients/commit/ceeef62888f6285e01fcb6e8b075a43ede120e46) Thanks [@huserben](https://github.com/huserben)! - enhance HTTP headers

## 0.7.0

### Minor Changes

- [`8dc4efc`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8dc4efc5d151d36c5e68d74741ae3feb14c94865) Thanks [@huserben](https://github.com/huserben)! - update tool names to use snake_case format for consistency

### Patch Changes

- Updated dependencies [[`8dc4efc`](https://github.com/LetPeopleWork/lighthouse-clients/commit/8dc4efc5d151d36c5e68d74741ae3feb14c94865)]:
  - @letpeoplework/lighthouse-mcp-core@0.7.0

## 0.6.1

### Patch Changes

- [`1f4ada1`](https://github.com/LetPeopleWork/lighthouse-clients/commit/1f4ada1232f39576f14d98763898db651141c9e2) Thanks [@huserben](https://github.com/huserben)! - Update build steps

## 0.6.0

### Minor Changes

- [`e8f8796`](https://github.com/LetPeopleWork/lighthouse-clients/commit/e8f8796638fe1572f2d794dcbef2926cd9eab9dc) Thanks [@huserben](https://github.com/huserben)! - implement direct execution check for MCP tools using realpathSync

## 0.5.0

### Minor Changes

- [`226fd77`](https://github.com/LetPeopleWork/lighthouse-clients/commit/226fd778a3b7a1b2ef226bf3d42fbb37295e14d4) Thanks [@huserben](https://github.com/huserben)! - update build scripts and improve runtime exit handling for MCP tools

## 0.4.0

### Minor Changes

- [`c84ef36`](https://github.com/LetPeopleWork/lighthouse-clients/commit/c84ef36d59f577fa057d3235fdc514b9d82bf23a) Thanks [@huserben](https://github.com/huserben)! - update bin scripts for proper shebang handling

## 0.3.0

### Minor Changes

- [`53ca796`](https://github.com/LetPeopleWork/lighthouse-clients/commit/53ca79637b8d67319423693f81603c809d7b01bf) Thanks [@huserben](https://github.com/huserben)! - add TOON serialization for MCP tool responses and implement insecure HTTPS handling

### Patch Changes

- Updated dependencies [[`53ca796`](https://github.com/LetPeopleWork/lighthouse-clients/commit/53ca79637b8d67319423693f81603c809d7b01bf)]:
  - @letpeoplework/lighthouse-mcp-core@0.6.0

## 0.2.6

### Patch Changes

- Updated dependencies [[`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94), [`0976815`](https://github.com/LetPeopleWork/lighthouse-clients/commit/0976815b9a460ee74da65a2871a5bdf36685dd94)]:
  - @letpeoplework/lighthouse-client@0.8.0
  - @letpeoplework/lighthouse-mcp-core@0.5.0

## 0.2.5

### Patch Changes

- Updated dependencies [[`d2b2795`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d2b27956b91c84d314ce8b37ae81d6ff4c8800ee)]:
  - @letpeoplework/lighthouse-client@0.7.0
  - @letpeoplework/lighthouse-mcp-core@0.4.2

## 0.2.4

### Patch Changes

- Updated dependencies [[`a9ebce0`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a9ebce0fceae503971b45bf3ec1b595efe0e6c94)]:
  - @letpeoplework/lighthouse-client@0.6.0
  - @letpeoplework/lighthouse-mcp-core@0.4.1

## 0.2.3

### Patch Changes

- Updated dependencies [[`2ad3aeb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2ad3aeb8d5cae15c3fb6a80ee8c9146474f02e33)]:
  - @letpeoplework/lighthouse-mcp-core@0.4.0
  - @letpeoplework/lighthouse-client@0.5.0

## 0.2.2

### Patch Changes

- Updated dependencies [[`d5fd130`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d5fd130c5afc4b1a7e5d6655fb6ab993ba8a82b7), [`d4a3c0f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d4a3c0f62525e59a3532251f8cab4c9761766bb2)]:
  - @letpeoplework/lighthouse-client@0.4.0
  - @letpeoplework/lighthouse-mcp-core@0.3.2

## 0.2.1

### Patch Changes

- Bump packages

- Updated dependencies [[`2564221`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2564221cb3b7ebe5cc93f47dd6f4ffcd92db8cc0)]:
  - @letpeoplework/lighthouse-client@0.3.1
  - @letpeoplework/lighthouse-mcp-core@0.3.1

## 0.2.0

### Minor Changes

- [`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce) Thanks [@huserben](https://github.com/huserben)! - add team and portfolio metrics tools

### Patch Changes

- Updated dependencies [[`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce)]:
  - @letpeoplework/lighthouse-mcp-core@0.3.0
  - @letpeoplework/lighthouse-client@0.3.0
