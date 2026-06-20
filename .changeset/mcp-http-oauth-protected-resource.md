---
"@letpeoplework/lighthouse-mcp-http": minor
"@letpeoplework/lighthouse-client": minor
---

The HTTP MCP server can now advertise itself as an OAuth protected resource so
MCP clients authenticate the user against the same OIDC provider Lighthouse uses
and send their own Bearer token (no API key). When `LIGHTHOUSE_OAUTH_ISSUER` and
`LIGHTHOUSE_OAUTH_RESOURCE` are set, the server serves RFC 9728 protected-resource
metadata at `/.well-known/oauth-protected-resource` and challenges uncredentialed
`/mcp` requests with `401` + `WWW-Authenticate: Bearer resource_metadata=…`, which
triggers the client's browser OAuth flow; the resulting token is forwarded to
Lighthouse (which validates it). A startup version gate refuses OAuth mode against
a Lighthouse older than the supported baseline with a clear upgrade message, while
never blocking unknown/dev versions. With the variables unset, behaviour is
unchanged (X-Api-Key / baked-key path). The client package now exports
`FEATURE_REQUIRES_SERVER_NEWER_THAN`.
