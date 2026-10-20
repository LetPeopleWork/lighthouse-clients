---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
"@letpeoplework/lighthouse-mcp-http": minor
---

Read a Team's or Portfolio's reports with `lh report` and the MCP report tools. `lh report list --team-id <id>` names the owner's reports, and `lh report get --team-id <id> --id <report id>` (or `--portfolio-id`) reads one. By default `lh` names the report, its owner and its Then and Now windows, or counts the list; `--json` and `--toon` hand over the report exactly as Lighthouse answers it, every value unrounded and a missing value with its reason. A read Lighthouse refuses is said plainly: no access to that Team's or Portfolio's reports, a report made by a newer version of Lighthouse that can't be shown here, or no such report. Needs a Lighthouse newer than v26.10.10.1; an older one is told to upgrade and is asked for no report.
