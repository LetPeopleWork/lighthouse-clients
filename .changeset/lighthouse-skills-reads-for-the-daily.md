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

`lh metrics team --metrics sleRisk` reads which Work Items in progress are likely to miss the Team's SLE, with
Lighthouse's own numbers handed over unchanged for `--json` and `--toon`. It is read only when named, needs a
Lighthouse newer than v26.9.19.10, and a Portfolio is told SLE Risk is for Teams.

With `--pretty` it says how many Work Items in progress are at risk of missing the SLE, counting from the
same 70% the web's SLE Risk widget counts from, then lists every Work Item highest risk first with its name,
age, risk and the finished Work Items behind it ("6 of 11 finished Work Items that reached this age went past
7 days"), or that it is already past the SLE. A Team without an SLE is told it has no SLE Risk, and when the
names cannot be read every risk is still listed by its reference.

An assistant can read the same SLE Risk with `lighthouse_team_metrics_sleRisk`: Lighthouse's numbers for each
Work Item unchanged, beside a summary in the words `lh --pretty` uses, every Work Item flush at the start of its
line. An older Lighthouse's refusal comes back as the upgrade it asks for.

An assistant can read one Process Behaviour Chart of a Team or Portfolio with
`lighthouse_team_metrics_processBehaviorChart` and `lighthouse_portfolio_metrics_processBehaviorChart`,
naming the chart with `metricType` (Feature Size for Portfolios only). Lighthouse's chart comes back unchanged,
beside a summary that names each signal Lighthouse found with the days it fired ("Large Change on Wed 7 Oct,
Thu 8 Oct"), or says there are no signals.

A chart whose limits mean little names no signal: a chart without a baseline says no baseline is set and that
its limits come from the range shown, and a chart Lighthouse could not compute says why, in Lighthouse's own
words. A blackout day is listed as one and never as a signal. A chart from a Lighthouse that predates blackout
days and baselines still has its signals named, and the chart itself always comes back unchanged.

`lh metrics team --metrics processBehaviorChart` reads every Process Behaviour Chart of the Team at once, and
`lh metrics portfolio` reads Feature Size too. `--json` and `--toon` hand over each chart unchanged, keyed by
chart type, with the range; a chart Lighthouse cannot answer carries its refusal while the others still come
back. The charts are read only when named, and `pbc`, `processbehaviorchart` and `processbehaviourchart` name
them too.

With `--pretty` it prints one line per chart under the range, each titled as the web titles it ("Throughput
Process Behaviour Chart", "Total Work Item Age Process Behaviour Chart", in the instance's own words), followed
by the same sentence the assistant's summary gives: the signals with their days, "No signals", that no baseline
is set, or why Lighthouse could not compute it. A chart that cannot be read says so on its own line and leaves
every other chart in place.

`lh metrics team` and `lh metrics portfolio` without `--metrics` print and read exactly what they did before.
