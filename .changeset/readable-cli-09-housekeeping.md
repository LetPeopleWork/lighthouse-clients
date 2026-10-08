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

The client package also gains `readWorkTrackingConnections` and `readWorkTrackingConnection`, which label
each option as the connection editor does (from the connection's authentication method, the key when the
method does not name it) and keep a secret's value out of what they return, decided by the secret flag
alone. Under `--pretty`, `lh worktracking list` lists the Work Tracking Systems as the Overview does, with
a Name and a Type column, titled in the instance's own word for them; `lh worktracking get` prints the
connection's name and id, `Type: Jira` and an Option · Value table, where every secret reads
`(secret, not shown)`, even if Lighthouse sends its value. Under `--json` and `--toon` a connection is
still handed over exactly as Lighthouse sent it.

The housekeeping tools state their answer

`lighthouse_health_check` keeps `connectivity: success` and adds a second block,
`summary: Lighthouse is reachable.`; `lighthouse_version_get` keeps `version: v26.10.3.6` and adds
`summary: Lighthouse v26.10.3.6`. `lighthouse_worktracking_list` and `lighthouse_blackout_list` keep their
facts block and add a second one counting the answer: `summary: 3 Work Tracking Systems` in the instance's
own word for them, `summary: 2 recurring blackout rules`, the singular for one and `No …` for none.
`lighthouse_worktracking_get` carries a `summary` naming the connection and its type,
`Letpeoplework Jira [id: 1]` and `Type: Jira`, and never an option's value. When the answer is in a shape
the summary cannot read, the facts go out exactly as before, and the tool never fails because of it; a
failed check or a refused read carries no summary.

`--pretty` is for people and its layout may change in any minor release; `--json`, `--toon` and the MCP
tools' facts are the contract that scripts and agents read.

The client package also gains `describeWorkTrackingSystemCount`, `describeConnectionSummary` and
`LIGHTHOUSE_IS_REACHABLE`.
