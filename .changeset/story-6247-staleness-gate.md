---
"@letpeoplework/lighthouse-client": minor
---

`FEATURE_REQUIRES_SERVER_NEWER_THAN.staleness` names v26.10.16.6, the last Lighthouse release whose WIP read does
not say which Work Items are stale. No read is refused on it: an older Lighthouse is read as one that does not say.
