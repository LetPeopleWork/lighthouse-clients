---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

`lh feature get` reads like the Feature list

Under `--pretty`, `lh feature get --ids` and `--refs` now print one row per Feature as the web's Feature
list shows it: its reference, name, how much of its work is done over every Team (`8 of 13 Work Items`),
its Forecasted Start, the date it is 85% likely to be done by, and its state. The Forecasted Start follows
the web: a day work already began outranks `Cannot forecast`; otherwise the 85% start, `—` when nothing is
known. Every term follows the instance's own Terminology. A Lighthouse whose answer lacks a Feature's
per-Team work gets today's generic view, and `--json` / `--toon` are unchanged.
