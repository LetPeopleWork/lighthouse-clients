---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
---

`lh` now asks once, after a command's answer, whether to share anonymous usage data with your Lighthouse; nothing is sent until you say yes. The question appears only in a terminal (never in scripts or CI, never under `DO_NOT_TRACK`), on stderr, so the command's output is unchanged. After a yes, `lh forecast manual` is counted as a manual forecast run from the command line. The voter key file's locking and safe writing now live in one shared place; voting behaves as before.
