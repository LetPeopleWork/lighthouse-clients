---
"@letpeoplework/lighthouse-client": minor
---

The client reads why Lighthouse marks a Work Item stale (`staleReasons`): how many days it has sat in a state,
been Blocked, or sat in a state while Blocked, with the state's name on the two kinds that have one. A reason of
a kind this client does not know yet is left out; the Work Item is still read, and still stale.
