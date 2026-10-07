---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

`lh delivery list` reads like the Portfolio's Delivery cards

Under `--pretty`, `lh delivery list --portfolio-id <id>` now heads the list with the Portfolio's name
(`Ocean Explorer · Deliveries`) and prints one row per Delivery: its name with its id beside it, its
Delivery Date, how many Features it holds, how much of its work is done (`34 of 55 Work Items`), the
card's likelihood answer, and the date it is 85% likely to be done by. The likelihood reads as the card's
does: the percentage (`78%`, capped at `>95%` while work remains), `Not enough data` on thin history,
`Cannot forecast` when a Team has no throughput or Lighthouse gives no likelihood, and `Overdue` once the
Delivery's date has passed (`Overdue · Cannot forecast` when both hold). An older Lighthouse that does not
say whether a Delivery is overdue never shows `Overdue`, and a Delivery without an 85% date shows `—`. A
Portfolio without Deliveries prints the heading, then `No Deliveries`. When the Portfolio's name cannot be
read the heading names it by its id, and the list still prints. An instance that renamed its terms sees
its own words. A list in which any Delivery arrives without its name, id, date or work prints the generic
view, exit 0, as before. `--json` and `--toon` are unchanged.

The client package gains `readDeliveryList`, `describeDeliveryListTitle`, `describeNoDeliveries`,
`describeDeliveryListHeadings`, `describeDeliveryDone`, `describeDeliveryLikelihood`,
`describeDeliveryRow`, `deliveryLikelihoodAnswer`, `OVERDUE_SHORT` and the `DeliveryListItem` and
`DeliveryListOwner` types.
