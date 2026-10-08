---
---

Refactoring of usage data from the clients; no package changes.
The usage data tests' comments say why, without pointing at planning documents.
Parameterised usage data test titles name the case they run, not an argument list or "undefined".
The one-verdict test counts the verdicts lh reports, not only the batches.
lh wires its usage data steps for a Lighthouse in one place.
The reporter test drops a token check that could not fail; lh's own tests check its output never shows the token.
lh's tests pin its config file, terminal question, credentials and certificate checks.
The client's tests pin its usage data calls, answers file and reporter outcomes.
The MCP servers' tests pin how they resolve their Lighthouse and settle usage data.
lh's tests count a scripted forecast and take end of input at the question as no answer.
