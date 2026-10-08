---
"@letpeoplework/lighthouse-cli": patch
---

An empty list says so in words under `--pretty`

`lh team list`, `lh portfolio list`, `lh feature get` and `lh worktracking list` printed a table with
headings and no rows when there was nothing to list. They now say `No Teams.`, `No Portfolios.`,
`No Features.` or `No Work Tracking Systems.` in the instance's own words, as `lh blackout list` already
says `No recurring blackout rules.`. `--json` and `--toon` are unchanged.
