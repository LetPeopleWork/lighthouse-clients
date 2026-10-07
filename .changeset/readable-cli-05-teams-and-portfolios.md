---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

`lh team list` reads like the Overview's Teams table

Under `--pretty`, `lh team list` now prints the title `Teams` and a table with the Overview's columns:
the Team's name with its id beside it (`Gravity [id: 3]`), how many Features it owns (`1 Feature`,
`6 Features`), its tags, and when it was last updated, in the reader's own time zone
(`Tue 6 Oct 2026, 07:14`). A Team never updated says `—`, and the Tags cell stays empty when
Lighthouse sends no tags. An instance that renamed its terms sees its own words. A list in which any
Team arrives without its name or id still prints the generic view, exit 0, as before. `--json` and
`--toon` are unchanged.

The client package gains `readOwnerList`, `describeOwnerListTitle`, `describeOwnerListHeadings`,
`describeOwnerName`, `describeFeatureCount`, `describeTags`, `describeLastUpdated` and `NOT_SENT`.
