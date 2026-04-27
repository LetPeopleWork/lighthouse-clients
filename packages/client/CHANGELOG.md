# @letpeoplework/lighthouse-client

## 0.7.0

### Minor Changes

- [`d2b2795`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d2b27956b91c84d314ce8b37ae81d6ff4c8800ee) Thanks [@huserben](https://github.com/huserben)! - rename totalWorkItemAgePbc to totalWorkItemAgeInfo and update related API endpoints

## 0.6.0

### Minor Changes

- [`a9ebce0`](https://github.com/LetPeopleWork/lighthouse-clients/commit/a9ebce0fceae503971b45bf3ec1b595efe0e6c94) Thanks [@huserben](https://github.com/huserben)! - add new team and portfolio metrics endpoints to Lighthouse client

## 0.5.0

### Minor Changes

- [`2ad3aeb`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2ad3aeb8d5cae15c3fb6a80ee8c9146474f02e33) Thanks [@huserben](https://github.com/huserben)! - enhance CLI to support standalone mode

## 0.4.0

### Minor Changes

- [`d5fd130`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d5fd130c5afc4b1a7e5d6655fb6ab993ba8a82b7) Thanks [@huserben](https://github.com/huserben)! - Handle auth properly

- [`d4a3c0f`](https://github.com/LetPeopleWork/lighthouse-clients/commit/d4a3c0f62525e59a3532251f8cab4c9761766bb2) Thanks [@huserben](https://github.com/huserben)! - enhance CLI authentication flow with support for insecure HTTPS and improved error handling

## 0.3.1

### Patch Changes

- [`2564221`](https://github.com/LetPeopleWork/lighthouse-clients/commit/2564221cb3b7ebe5cc93f47dd6f4ffcd92db8cc0) Thanks [@huserben](https://github.com/huserben)! - Fix missing CJS build output in lighthouse-client. The package was missing `"type": "module"` which caused tsup to produce `index.mjs`/`index.js` instead of `index.js`/`index.cjs`, resulting in a runtime crash when the CLI tried to load `dist/index.cjs` after a global install.

- Bump packages

## 0.3.0

### Minor Changes

- [`f31572c`](https://github.com/LetPeopleWork/lighthouse-clients/commit/f31572ccf8fc2481bb7e1106a21b650d86a471ce) Thanks [@huserben](https://github.com/huserben)! - add team and portfolio metrics tools
