---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
---

After a yes to usage data, more `lh` commands are counted, each under the name the web already counts the same action by, and only once Lighthouse accepted it; a refused or failed command counts nothing.

- `lh team create`, `lh team delete`, `lh portfolio create` and `lh portfolio delete` count as a Team or Portfolio created or deleted; `lh team refresh` and `lh portfolio refresh` as a refresh by hand. Nothing about the Team or Portfolio is sent: no id, name or number.
- `lh refinement vote` counts as a sizing vote cast, and also as a Work Item made Ready when Lighthouse says this vote made it Ready. Each says only whether it happened on the Team's Refinement day, on another day, or for a Team with no Refinement cadence, as Lighthouse's answer tells it, never this machine's clock.
- `lh refinement get` on a Team's Refinement day, with at least one Work Item listed, counts as the Refinement day's verdict shown (below, in or above the range, or no number).

Every other command counts nothing. Usage data still never changes what `lh` prints or its exit code, and it asks Lighthouse for nothing beyond the usage data itself: the usage data calls no longer check the version first.
