---
"@letpeoplework/lighthouse-client": minor
---

`lh` and the MCP server read a Portfolio's Deliveries the way Lighthouse has answered them since v26.8.31.7: the
Deliveries still running apart from the archived ones. A Lighthouse older than that keeps working, its Deliveries
read as the running ones with none archived.
