---
"@letpeoplework/lighthouse-client": patch
"@letpeoplework/lighthouse-mcp-core": patch
---

Surface HTTP 409 optimistic-concurrency conflicts from config-edit writes as a
distinct, recognizable error.

When a config-edit request (e.g. `updateTeam`, `updatePortfolio`,
`updateDelivery`) hits an aggregate that another admin changed concurrently, the
Lighthouse server now answers with HTTP 409 and a `concurrency-conflict`
ProblemDetails body. The client maps that response to a dedicated
`concurrency-conflict` error category (`statusCode: 409`) whose `reason`
preserves the server's message and appends actionable guidance: re-fetch the
current settings to obtain the latest concurrency token, then re-apply the
change. The CLI and MCP error surfaces present that guidance verbatim instead of
an opaque "request failed" message.

The change is purely additive and tolerant of older servers: a server that never
emits 409 exercises none of the new path, and the optimistic-concurrency token
round-trips inside the existing pass-through write payload, so no schema change
or version gate is required. Non-409 failures keep their existing categories.
