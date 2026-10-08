---
---

Refactoring of usage data from the clients; no package changes.
The usage data tests' comments say why, without pointing at planning documents.
Parameterised usage data test titles name the case they run, not an argument list or "undefined".
The one-verdict test counts the verdicts lh reports, not only the batches.
lh wires its usage data steps for a Lighthouse in one place.
The reporter test drops a token check that could not fail; lh's own tests check its output never shows the token.
lh's tests pin its config file, terminal question, credentials and certificate checks.
