---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
---

After a yes to usage data, `lh team create`, `lh team delete`, `lh team refresh`, `lh portfolio create`, `lh portfolio delete` and `lh portfolio refresh` are each counted once, under the same name Lighthouse already counts that action by in the web, but only after Lighthouse accepted the command; a refused or failed one counts nothing. Nothing about the Team or Portfolio is sent: no id, name, address or number, only which kind of action happened. Usage data still never changes what `lh` prints or its exit code.
