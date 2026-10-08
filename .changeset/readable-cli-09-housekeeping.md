---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Blackout rules, the version and the health check read like the web

The client package gains the housekeeping wording: `readBlackoutRules` reads the recurring blackout rules,
`describeBlackoutRuleSchedule` names a rule by its id and Lighthouse's own summary of its schedule, word
for word, `describeBlackoutRuleCount` counts them (`2 recurring blackout rules`), `describeVersion` says
`Lighthouse v26.10.3.6` and `describeReachable` says which Lighthouse a health check reached.

Under `--pretty`, `lh blackout list` lists the rules as the settings page does, under `Recurring blackout
rules` with a Schedule and a Description column, or says `No recurring blackout rules.`; `lh version get`
prints `Lighthouse v26.10.3.6`, as the footer shows it; and `lh health check` says `Lighthouse at
https://… is reachable.` or `The standalone Lighthouse is reachable.` instead of `success`. Under `--json`
and `--toon` nothing changes: the health check still prints `success`, and a failed one still reports
`unreachable: connection refused` with exit code 1.
