---
"@letpeoplework/lighthouse-client": minor
---

`lh` and the MCP server read a Portfolio's Deliveries the way Lighthouse has answered them since v26.8.31.7: the
Deliveries still running apart from the archived ones. A Lighthouse older than that keeps working, its Deliveries
read as the running ones with none archived.

An archived Delivery's likelihood reads "Cannot forecast" when a team in it could not be forecast, and "Not enough
data" when work remained and its history was too thin, as the Lighthouse page shows it.
