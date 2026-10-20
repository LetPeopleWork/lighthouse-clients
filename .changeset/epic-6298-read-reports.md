---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
"@letpeoplework/lighthouse-mcp-http": minor
---

Read a Team's or Portfolio's reports with `lh report` and the MCP report tools. `lh report list --team-id <id>` names the owner's reports, and `lh report get --team-id <id> --id <report id>` (or `--portfolio-id`) reads one. By default `lh` names the report, its owner and its Then and Now windows, or counts the list; `--json` and `--toon` hand over the report exactly as Lighthouse answers it, every value unrounded and a missing value with its reason. A read Lighthouse refuses is said plainly: no access to that Team's or Portfolio's reports, a report made by a newer version of Lighthouse that can't be shown here, no such report, or, for a list, no such Team or Portfolio. Needs a Lighthouse newer than v26.10.10.1; an older one is told to upgrade and is asked for no report.

Over MCP, `lighthouse_team_report_list`, `lighthouse_team_report_get`, `lighthouse_portfolio_report_list` and `lighthouse_portfolio_report_get` read the same reports, from the local server and the shared HTTP server alike. Each only reads, and a refused read comes back as a tool error in the same words as `lh`. The first block is Lighthouse's answer unchanged; a second block, `summary`, names the report, its owner and its windows, or counts the list.

With usage data on, reading a report with `lh report get` or a `_report_get` tool counts as the report being opened, as it does in the web: only the report's type and where it was read (`lh` or MCP) travel, never a name, an id or a value. Listing reports, a refused read, an older Lighthouse, `DO_NOT_TRACK` or a reader who has not said yes count nothing, and what `lh` prints is the same either way.
