---
"@letpeoplework/lighthouse-client": patch
"@letpeoplework/lighthouse-cli": patch
---

A Terminology answer whose term is not a word no longer breaks `--pretty` or an MCP summary

`resolveTerms` now takes an instance's value, then its default, only when it is non-empty text, and falls
back to the seeded word otherwise. Before, a number or an object in a term made `--pretty` fail with
`cell.padEnd is not a function`, or print `[object Object]`, and made an MCP summary read
`3 [object Object]`. `--pretty` also no longer fails at all when a readable view cannot cope with an
answer: it shows that answer in the generic view instead, with exit code 0.
