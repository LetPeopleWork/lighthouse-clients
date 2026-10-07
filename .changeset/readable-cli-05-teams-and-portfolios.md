---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

`lh team list` reads like the Overview's Teams table, and `lh team get` like the Team page

Under `--pretty`, `lh team list` now prints the title `Teams` and a table with the Overview's columns:
the Team's name with its id beside it (`Gravity [id: 3]`), how many Features it owns (`1 Feature`,
`6 Features`), its tags, and when it was last updated, in the reader's own time zone
(`Tue 6 Oct 2026, 07:14`). A Team never updated says `—`, and the Tags cell stays empty when
Lighthouse sends no tags. An instance that renamed its terms sees its own words. A list in which any
Team arrives without its name or id still prints the generic view, exit 0, as before. `--json` and
`--toon` are unchanged.

Under `--pretty`, `lh team get` states the Team as its page does: its name and id, when it was last
updated, then its settings one per line — the Service Level Expectation (`85% of Work Items within 12
days or less`), the System WIP Limit (`10 Work Items`), the Feature WIP (`1 Feature`, `2 Features`),
the Throughput dates with `(rolling)` or `(fixed dates)`, the Portfolios it works for, how many
Features it owns, its tags when it has some, and its Work Item Types. A setting left unset reads
`Not set`, as on the web, and an instance that renamed its terms sees its own words. A Team that
arrives without its name or id prints the generic view, exit 0. `--json` and `--toon` are unchanged.

The client package gains `readOwnerList`, `describeOwnerListTitle`, `describeOwnerListHeadings`,
`describeOwnerName`, `describeFeatureCount`, `describeTags`, `describeLastUpdated`, `NOT_SENT`,
`readTeam`, `describeTeamSummary`, `NOT_SET` and the `TeamSummary`, `ThroughputDates` and
`OwnerReference` types.
