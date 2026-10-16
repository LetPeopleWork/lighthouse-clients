---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

Against a Lighthouse that does not say which Work Items are stale (v26.10.16.6 and older), `lh metrics team
--metrics wip` and `lighthouse_team_metrics_wip`'s summary say so: "Lighthouse does not say which Work Items are
Stale." That is not the same as none being stale, so neither shows a count.
