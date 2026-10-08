---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
---

`lh` now asks once per Lighthouse, on stderr after a command that reached it, whether to send anonymous usage data to that Lighthouse. **Nothing is sent without a yes**: only `y` or `yes` counts, and anything else is a No kept on your machine and never sent. `lh` asks only when stdin, stdout and stderr are all a terminal (never in scripts, pipes or CI), only a Lighthouse that takes usage data from `lh`, and never under `DO_NOT_TRACK` (set to anything but `0`, `false` or empty), which always wins. After a yes, `lh forecast manual` is counted as a manual forecast run from the command line. Answers are kept in `usage-data.json` beside `voter-keys.json`, readable by you only. `lh config usage-data` shows your answer and what your Lighthouse allows; `lh config usage-data on` says yes without a question (also on a build agent), and `lh config usage-data off` withdraws a yes at your Lighthouse and keeps a No. Usage data never changes what `lh` prints or its exit code, and a Lighthouse slow to answer about it delays a command by at most a second. Details: https://docs.lighthouse.letpeople.work/settings/usagedata.html

When a yes cannot be recorded, `lh` names the Lighthouse as `lh config usage-data` does: its URL, or "the standalone Lighthouse".

A yes turned off with `lh config usage-data off` while another `lh` was renewing it stays off: the renewal sends nothing and withdraws the grant it was given.

A yes Lighthouse granted but your machine could not keep (another answer was kept first, or the answers file could not be written) is withdrawn at Lighthouse rather than left granted with nobody holding it.

A yes whose confirmation date lies in the future, as after a clock set wrong, is checked with Lighthouse again like a day-old one instead of counting as confirmed forever.
