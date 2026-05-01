# @letpeoplework/lighthouse-mcp-stdio

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
