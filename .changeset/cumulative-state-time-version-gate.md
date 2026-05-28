---
"@letpeoplework/lighthouse-client": patch
---

Gate the cumulative-state-time client methods on the server version. The client
fetches the server version once (cached per instance) and, when the server is
known to be older than the release that introduced these endpoints, returns a
clear `misconfigured` error ("requires a version newer than vX — upgrade
Lighthouse") instead of an opaque 404. Unparseable/dev versions are never
blocked. Exposes `isServerVersionNewerThan` for reuse.
