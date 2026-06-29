---
"@letpeoplework/lighthouse-mcp-http": patch
---

Serve the OAuth protected-resource metadata at the RFC 9728 path a spec-compliant
MCP client actually constructs. For a server mounted at `/mcp` the metadata is
`/.well-known/oauth-protected-resource/mcp` (well-known anchored at the host root
with the mount path appended), not `/mcp/.well-known/oauth-protected-resource`.
The 401 `WWW-Authenticate: resource_metadata` URL now points there too, and the
server serves both the bare root path (direct-to-service) and the `/mcp`-suffixed
path (behind a reverse-proxy / ingress). This makes auto-discovery work with
clients (e.g. mcp-remote / the MCP SDK) that build the well-known URL from the
server URL and ignore the challenge hint. Fixes the discovery leg of ADO #5362
that the prior 1.3.1 attempt mislocated.
