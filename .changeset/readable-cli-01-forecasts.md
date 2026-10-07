---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

The client reads a forecast's level and likelihood the way the web does

The client package gains the web's forecast display rules, so the CLI and the MCP summaries can say what
the browser says: `levelOf` names a chance `Risky` (up to 50%), `Realistic` (up to 70%), `Confident` (up
to 85%) or `Certain`, and gives no level when there is no forecast; `formatLikelihood` shows `>95%` only
while work remains, otherwise the value rounded or to two decimals; and `likelihoodAnswer` gives the one
answer a likelihood has, in the web's order: `Cannot forecast`, then `Not enough data` (only while work
remains), then the number.
