---
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
---

An assistant can now read what a Team has in progress right now with `lighthouse_team_metrics_wip`: each
Work Item with its age, state, whether it is Blocked and since when, and its link, with a summary of how
many are in progress against the System WIP Limit and how many are Blocked.

When there is less to say, the summary and `lh metrics team --metrics wip --pretty` say so in the same
words: that no System WIP Limit is set, that Lighthouse does not say which Work Items are Blocked (an older
server, never read as none Blocked), or that no Work Items are in progress.
