# @letpeoplework/lighthouse-cli

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
