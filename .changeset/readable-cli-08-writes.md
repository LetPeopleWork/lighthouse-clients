---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Every write confirms in one line

The client package gains the write confirmations: `describeOwnerWriteConfirmation` says `Created: Team
Lightspeed [id: 9].`, `Updated: …` or `Deleted: Team [id: 9].` in the instance's own word for a Team or
Portfolio, `describeRefreshConfirmation` says a refresh was queued, and
`describeBlackoutRuleWriteConfirmation` confirms a recurring blackout rule with Lighthouse's own summary of
its schedule, word for word. `readWrittenOwner` and `readWrittenBlackoutRule` read what a write answered
with.

Under `--pretty`, `lh team`, `lh portfolio` and `lh blackout` create, update and delete, and the Team and
Portfolio refresh, now print that one line, for example `Refresh queued: Team [id: 3]. Lighthouse updates
it in the background.` A refresh used to say `Team refreshed: 3`, though Lighthouse only queues it. Under
`--json` and `--toon` nothing changes: create and update hand back the written record, and delete and
refresh keep today's lines (`Team deleted: 9`, `Team refreshed: 3`, …).
