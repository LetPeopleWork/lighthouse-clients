---
"@letpeoplework/lighthouse-client": patch
"@letpeoplework/lighthouse-cli": patch
---

`lh worktracking get` and `lh worktracking list` no longer print a secret under `--pretty` when the
connection arrives in a shape the readable view does not recognise

When one option of a connection was in an unexpected shape (a number for a value, or no secret flag), or
one connection in the list had no name, `--pretty` fell back to the generic view and printed every
option's value as Lighthouse sent it, including a secret Lighthouse should never have sent. That generic
view now reads `(secret, not shown)` for every option value that is not known to be safe: only an option
that says it is not secret, and that its authentication method does not declare secret, keeps its value.
`--json` and `--toon` still hand a connection over exactly as Lighthouse sent it.

The client package gains `hideConnectionSecrets`, which makes that copy of a connection or a list of them.
