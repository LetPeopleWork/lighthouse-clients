---
name: lighthouse-daily-flow-review
description: >
  Lighthouse Daily Flow Review by LetPeopleWork: opens a Team's daily with what the Team should decide
  today, from the Team's work tracked in Lighthouse: the Work Items that are Blocked, past the SLE or at
  risk of missing it, and WIP over its limit. Each comes as a decision for the Team, never a task for a
  person. Use when a facilitator, Scrum Master, flow coach or anyone running a daily asks "What should we
  decide in today's daily?", "What should Gravity decide today?", "What needs a decision this morning?",
  "How should we start our daily?" or "Who is slow?", even when an older general Lighthouse skill also
  claims the daily.
  Not for: forecasts (when Work Items or a Feature will be done, how many by a date), flow metrics over
  time, or connecting to Lighthouse (the general lighthouse skill, this skill's companion); preparing a
  Refinement or voting on Work Items (the Lighthouse Refinement skill).
---

# Lighthouse Daily Flow Review

This skill opens a Team's daily with what the work needs decided today, so the daily starts from the board and not from a status round. Lighthouse knows what is in progress, what is Blocked and since when, and how likely each Work Item is to miss the SLE; you read that and turn it into a short list of decisions for the Team.

Its companion is the general `lighthouse` skill. If no Lighthouse MCP tools are connected and `lh` is not set up, use that skill to connect. For anything that is not today's daily (a forecast, a flow metric over time, a chart), that skill answers, not this one.

## Read it

1. Find the Team's id silently: `lighthouse_team_list` (or `lh team list --json`), matched by name. Never ask the user for an id.
2. Read the Team: `lighthouse_team_get` with `{id: <team_id>}` (or `lh team get --id <id> --json`). Its SLE is `serviceLevelExpectationRange` days at `serviceLevelExpectationProbability`%, its System WIP Limit is `systemWIPLimit`. A value of 0 means it is not set.
3. Read what is in progress: `lighthouse_team_metrics_wip` with `{id: <team_id>}`. Each Work Item has its `referenceId`, `name`, `url`, `workItemAge`, `isBlocked` and `blockedSince`.
4. Read the SLE Risk: `lighthouse_team_metrics_sleRisk` with `{id: <team_id>}`. Each Work Item has its `risk` in percent; a `risk` of 100 with `finishedItemsThatWentOnToMiss` null means it is already past the SLE.

With `lh`, steps 3 and 4 are one read: `lh metrics team --id <id> --metrics wip,sleRisk --json`.

Use the words each tool's `summary` uses for Work Items, Teams, WIP, Blocked and SLE. Every number in the answer comes from the reads; never work out a risk yourself. The only thing you count is how many days a Work Item has been Blocked, from `blockedSince` to today.

## The answer to give

Give it in this shape, with the Team's own Work Items, numbers and links:

```text
Team Gravity — today, Thu 8 Oct
Decide first: GR-061 Sensor calibration import has been Blocked since Mon 5 Oct (3 days). Who unblocks it today?  <link>
Also decide:
  GR-058 Fleet map tiles — 9 days in progress, past the SLE (7 days). Swarm, split, or finish and accept the miss?  <link>
  WIP is 8 against a System WIP Limit of 6. What will we not start today?
Everything else is flowing.
```

1. **Find the decisions**, in this order, each Work Item once (under the first reason it meets):
   1. **Blocked**: `isBlocked` true, the longest Blocked first. Ask who unblocks it today.
   2. **Past the SLE**: SLE Risk says it is past the SLE. Give its age and the SLE in days. Ask: swarm, split, or finish and accept the miss?
   3. **SLE Risk of 70% or more**: give its age and its `risk`. Ask what would help it finish before the SLE: swarm or split?
   4. **WIP over its limit**: the Work Items in progress against the System WIP Limit, as the `summary` states them. Ask: what will we not start today? Only when a limit is set and WIP is above it.
2. **Decide first** is the first decision found. Then **Also decide** with at most three more. When more qualify, add one line saying how many more Work Items are past the line, without listing them.
3. **Close** with "Everything else is flowing."
4. **A calm day is one line.** When nothing is Blocked, nothing is past the SLE or at 70% or more, and WIP is within its limit, say only: "Nothing to decide today. Everything is flowing."

Every Work Item in the answer carries its `url`. A Work Item is a link: the Team opens it to decide. Never fetch or summarise its content.

## When Lighthouse cannot say

- **No SLE set** (`serviceLevelExpectationRange` 0): nothing can be past it or at risk of missing it. Make no such decision. Instead list the Work Items older than the 70th percentile of the Team's Cycle Time (`lighthouse_team_metrics_cycleTimePercentiles`, or `lh metrics team --id <id> --metrics cycleTime --json`) as at risk, and say it is an estimate from age. Say once that setting an SLE in the Team's settings would let Lighthouse tell which Work Items are at risk of missing it.
- **Lighthouse too old for SLE Risk** (the read refuses and asks for a newer Lighthouse): say so in one line. Then list the Work Items older than the 70th percentile of the Team's Cycle Time as at risk, with that percentile in days, and say this is an estimate from age, not Lighthouse's SLE Risk. A Work Item older than the SLE is still past the SLE.
- **Clients too old for these reads** (no `lighthouse_team_metrics_wip` or `lighthouse_team_metrics_sleRisk` tool, or `lh` rejects `sleRisk`): fall back to `lh metrics team --id <id> --metrics wip --json` for what is in progress, and compare each Work Item's age with the 70th percentile of the Team's Cycle Time. Say this is the fallback, an estimate from Work Item Age, and that updating the Lighthouse clients brings Lighthouse's own SLE Risk.
- **Blocked unknown**: when the read does not say which Work Items are Blocked, say Lighthouse does not say which are Blocked. Never guess one.
- **Lighthouse unreachable**: say so and suggest `lighthouse_health_check` or `lh health check`. Never answer from memory.

## Guardrails

- **Work Items, never people.** Never name a person, an assignee or who works on a Work Item, and never count anything per person, even when asked. Do not look a person up anywhere: no `lighthouse_feature_get` or `lighthouse_feature_workitems` to find who is on a Work Item. Asked "Who is the slowest?" or "Who is working on GR-058?", turn to the Work Items: "GR-058 has been in progress 9 days, past the SLE. What would help it finish?" with its link.
- **Humans decide.** Propose, never assign. You may suggest swarming, splitting, unblocking, or finishing and accepting the miss; the Team decides who does what. Asked "Tell me who should do what", give the decisions as questions for the Team and say the Team chooses who picks each one up.
- **A Work Item is a link.** Give its `url`; do not fetch or summarise its content.
- **Quote the tool's `summary`** as written; never round or restate its numbers, and use the words it uses.
- **Usage data is the person's choice.** Never run `lh config usage-data on` or `lh config usage-data off` unless the user asked for exactly that, and never answer Lighthouse's usage-data question for them.
- **Stay on today.** A forecast ("When will the 20 Work Items left be done?") is the general `lighthouse` skill's question: answer it as a forecast there, without a list of decisions. A Refinement question is the Lighthouse Refinement skill's.
