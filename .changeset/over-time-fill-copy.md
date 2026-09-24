---
"@letpeoplework/lighthouse-client": patch
"@letpeoplework/lighthouse-cli": patch
"@letpeoplework/lighthouse-mcp-core": patch
---

The over-time series no longer claim Lighthouse "never backfills". A System Admin can now switch on filling in past days (a Preview, off by default); on such a server a read that finds missing days starts filling them in the background, so a later call may return more days. The client docs, CLI comments, MCP tool descriptions and the skill now say what is true either way. No request or response shape changed.
