---
name: lighthouse-reports
description: >
  Lighthouse Reports by LetPeopleWork: show a report saved in Lighthouse the way Lighthouse shows it, with
  its own numbers, dates and words. Use when the user asks to show, summarise, or turn a Lighthouse report
  into a dashboard, a slide, a table or a document, for example "Make a one-page dashboard of Team
  Lightspeed's Then & Now report for our sponsor", or shares a report PDF and wants it laid out again.
  Not for: today's flow metrics or forecasts, such as "What is our Cycle Time right now?" (the general
  lighthouse skill); connecting an assistant to Lighthouse (the general lighthouse skill, this skill's
  companion, says how).
---

# Lighthouse Reports

A report in Lighthouse is a saved comparison its readers already trust: a Then & Now report, for example, sets a
Team's or Portfolio's flow at the start of an engagement beside its flow today. This skill lays such a report out
for someone outside Lighthouse so that every number, date and word is the one Lighthouse shows, and nothing is
added that the report does not say.

Its companion is the general `lighthouse` skill. If no Lighthouse MCP tools are connected and `lh` is not set up,
use that skill to connect. For anything that is not a saved report (a metric today, a forecast, a chart), that
skill answers, not this one.

## Read the report

1. **Find the owner's id silently.** `lighthouse_team_list` or `lighthouse_portfolio_list` (or `lh team list --json`,
   `lh portfolio list --json`), matched by name. Never ask the user for an id.
2. **Find the report.** `lighthouse_team_report_list` / `lighthouse_portfolio_report_list` with `{id}`, or
   `lh report list --team-id <id> --json` / `lh report list --portfolio-id <id> --json`. Match the report by its
   name; each row carries its `id` and its type (`templateKey`). When the owner is not known, `lighthouse_report_list` or
   `lh report list --json` lists every report the user can read, each row naming its owner.
3. **Read it.** `lighthouse_team_report_get` / `lighthouse_portfolio_report_get` with `{id, reportId}`, or
   `lh report get --team-id <id> --id <report id> --json` (`--portfolio-id` for a Portfolio). The first block is
   Lighthouse's answer, unchanged; the `summary` names the report, its owner in the instance's words and both
   windows.
4. **Open the reference file for its type** and lay the report out exactly as it says.

## Report types

| `templateKey` | Reference file |
|---|---|
| `then-and-now` | `references/then-and-now.md` |

Each report type has its own reference file with its layout and the rules Lighthouse shows its values by, and its
own row here. A type this table does not name was made by a newer Lighthouse than this skill knows: say that this
version of the skill cannot lay it out, give its values as the report holds them, and say they are unrounded.

## Guardrails

- **Every value as Lighthouse shows it.** The answer holds raw values; Lighthouse rounds them, adds their unit and
  works out the change by fixed rules. Follow the reference file's rules exactly: each value at its line's decimals
  and never more, the change and the percent change worked out only as the reference file says. Never quote a raw
  value such as `0.5777` when Lighthouse shows `0.58 per day`.
- **Never rebuild a side.** Then is frozen as the report captured it; Now is what the report holds too. Never call
  a metric tool (`lighthouse_team_metrics_*`, `lighthouse_portfolio_metrics_*`, `lh metrics team`,
  `lh metrics portfolio`) to rebuild, check or refresh either side. Asked to double-check Then against today's
  metrics, say that Then is fixed as the report captured it and show it as the report holds it.
- **A dash stays a dash.** A value Lighthouse has no number for reads "—" with its reason beside it, never 0 and
  never left out.
- **The instance's words.** An instance may rename Team, Portfolio, Work Item, Cycle Time, Throughput, WIP or Work
  Item Age. Name the owner as the `summary` does ("Team Lightspeed", "Squad Lightspeed"), and use the instance's word
  for every metric and for Work Items wherever a Lighthouse answer in this conversation shows one; the defaults
  otherwise.
- **The dated header and the credit.** Open with the report, its owner, both windows and the day you read it; end
  with the line naming Lighthouse by LetPeopleWork. The reference file gives both, word for word.
- **The assistant's own view, apart and only when asked.** When the user asks what you make of the report, put
  your reading after the report's content, under its own heading saying it is the assistant's view. It never
  changes, re-colours or re-orders the report's numbers, and the report's part reads the same as without it. Not
  asked, add none: no "great improvement!", no reading of your own between the numbers.

## When the report cannot be read

- **No access.** Quote the refusal ("You have no access to that Team's reports.", or for the list of every report "Lighthouse refused to list reports for you.") and show no numbers. Do not
  rebuild the report from metric tools.
- **No such report.** Quote the refusal and list the owner's reports by name, so the user can pick one.
- **No such Team or Portfolio.** A list refused with "There is no such Team." means the owner itself is unknown: say
  so and ask which one they meant, or find it with `lighthouse_team_list` / `lighthouse_portfolio_list`.
- **An older Lighthouse.** A refusal saying the read needs a newer Lighthouse ("requires a version newer than", or "This Lighthouse has no list of every report. Upgrade Lighthouse to list them.") means this Lighthouse is too old to
  read reports from. Say so plainly, "Upgrade Lighthouse to read its reports here", and offer to work from a report
  PDF or values the user supplies. It is not a fault; do not retry.
- **A report made by a newer Lighthouse.** Quote the refusal; it says the report can't be shown here.
- **No connection at all.** Work from a report PDF the user supplies or values they paste. Lay it out the same way,
  and say in the header where the numbers came from ("From the report PDF you shared", "From the values you
  pasted") instead of the day it was read. Ask for what is missing rather than filling it in.
