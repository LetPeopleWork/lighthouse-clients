# @letpeoplework/lighthouse-cli

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
