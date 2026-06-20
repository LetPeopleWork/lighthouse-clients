---
"@letpeoplework/lighthouse-mcp-http": minor
---

The HTTP MCP server now forwards each caller's own credential to Lighthouse
instead of driving every request as a single shared baked key. A caller's
`X-Api-Key` header (or `Authorization: Bearer` token) takes precedence, so every
caller acts as themselves with their own RBAC scope and audit — removing the
confused-deputy ambient authority. The container's configured `LIGHTHOUSE_API_KEY`
remains as the legacy single-container / dev fallback for callers that send no
credential, so self-hosted setups keep working unchanged. The CLI and stdio MCP
server are unaffected and continue to use the user's own API key.
