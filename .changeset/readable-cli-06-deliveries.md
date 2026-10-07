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

`lh delivery metrics --delivery-id <id>` reads day by day

Under `--pretty`, `lh delivery metrics --delivery-id <id>` heads the view with the Delivery, its Delivery
Date and the first recorded day (`Delivery [id: 11] · Delivery Date Tue 15 Dec 2026 · recorded since Tue
15 Sep 2026`; the read carries no Delivery name, so its id stands in), then prints one row per recorded
day: Date, Done, Remaining, Total, how many Features, and the likelihood. With `--detail epics` it adds the
latest recorded day in detail: `On Tue 6 Oct 2026`, a table of its Features (name, done, likelihood, size,
with `(default size)` where Lighthouse assumed one), and the four chances with the day each is likely done
by. The flag keeps its name; the output says Features. Every day's detail stays in `--json`. A Delivery
with no recorded day prints the heading, then `No data yet.` A history in a shape the view cannot fully
read prints the generic view, exit 0, as before. `--json` and `--toon` are unchanged.

The Delivery tools state their answer

`lighthouse_delivery_list` keeps its facts block and adds a second block counting the Deliveries in the
instance's words: `summary: 4 Deliveries`, `summary: 1 Delivery`, or `summary: No Deliveries`.
`lighthouse_delivery_metrics` states the Delivery, its Delivery Date and its first recorded day as
`lh delivery metrics` heads them: in a second block beside the day-by-day rows, or as a `summary` field
beside the facts when `detail` is `"epics"`. When the answer is in a shape the summary cannot read, the
facts go out exactly as before, and the tool never fails because of it.

The client package gains `readDeliveryList`, `describeDeliveryListTitle`, `describeNoDeliveries`, `describeDeliveryCount`,
`describeDeliveryListHeadings`, `describeDeliveryDone`, `describeDeliveryLikelihood`,
`describeDeliveryRow`, `deliveryLikelihoodAnswer`, `OVERDUE_SHORT` and the `DeliveryListItem` and
`DeliveryListOwner` types, and for the recorded days `readDeliveryMetricsHistory`, `latestRecordedDay`,
`describeDeliveryMetricsHeading`, `describeRecordedDayHeadings`, `describeRecordedDayRow`,
`describeRecordedDayTitle`, `describeDeliveryFeatureHeadings`, `describeDeliveryFeatureRow`,
`describeDeliveryChanceHeadings` and `describeDeliveryChanceRow`.
