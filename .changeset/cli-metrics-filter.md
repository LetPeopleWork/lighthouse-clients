---
"@letpeoplework/lighthouse-cli": minor
---

Add optional `--metrics` flag to `lh metrics team` and `lh metrics portfolio` commands. Pass a comma-separated list of metric names to retrieve only those metrics (e.g. `--metrics throughput,wip,cycletime`). Omit the flag to get all metrics as before. Allowed values: `throughput`, `wip`, `cycleTime`, `workItemAge`, `totalWorkItemAge`, `arrivals`, `predictabilityScore`. Unknown values produce a clear error listing allowed names.
