---
"@letpeoplework/lighthouse-mcp-http": patch
---

Fix MCP OAuth auto-discovery behind a TLS-terminating, prefix-routing ingress.
The `WWW-Authenticate` `resource_metadata` URL now honours `X-Forwarded-Proto`
(advertising `https` behind the ingress instead of a hardcoded `http`) and
`X-Forwarded-Host`, and is mounted under the same base path the MCP request
arrived on. When the request comes in under the `/mcp` mount the metadata is
advertised — and served — at `/mcp/.well-known/oauth-protected-resource`, so an
external MCP client (e.g. Claude Desktop) can reach it through an ingress that
routes only `/mcp` to the MCP server. Direct-to-service behaviour (http, root
path) is unchanged.
