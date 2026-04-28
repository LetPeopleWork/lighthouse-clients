---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
---

Implement the first production-ready stdio MCP server slice and shared discovery/runtime plumbing:

- extract and export shared standalone lock-file discovery helpers in the client package
- move CLI standalone discovery to use shared client helper exports
- add SDK-based MCP tool registration helper and richer tool schemas in mcp-core
- implement executable stdio MCP runtime with env/lockfile connection resolution, API-key auth wiring, and graceful shutdown
- add targeted tests for shared discovery and stdio startup guard paths
