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

`lh feature workitems --id <id>` now heads its list with the Feature it belongs to,
`OE-002 Deep-sea camera stream · 3 Work Items`, and shows each Work Item's ID, name, type and state. When
the Feature's name cannot be read, the heading says `Feature [id: 2]` instead and the list still shows.
`--json` / `--toon` still ask for the Work Items alone.

The Feature tools state their answer

`lighthouse_feature_get` keeps its facts block and adds a second block counting the Features in the
instance's words: `summary: 3 Features`, `summary: 1 Feature`, or `summary: No Features`.
`lighthouse_feature_workitems` adds the heading `lh feature workitems` prints,
`summary: OE-002 Deep-sea camera stream · 3 Work Items`, or `summary: Feature [id: 2] · 3 Work Items` when
the Feature's name cannot be read. When the answer is in a shape the summary cannot read, the facts go out
exactly as before, and the tool never fails because of it.

`--pretty` is for people and its layout may change in any minor release; `--json`, `--toon` and the MCP
tools' facts are the contract that scripts and agents read.

The client package gains `readFeatureList`, `describeFeatureListCount`, `describeFeatureListHeadings`,
`describeFeatureProgress`, `describeFeatureStart`, `describeFeatureCompletion`, `describeFeatureRow`,
`readFeatureWorkItems`, `describeFeatureTitle`, `describeFeatureWorkItemsHeading`,
`describeFeatureWorkItemHeadings`, `describeFeatureWorkItemRow` and the `FeatureListItem`, `FeatureStart`
and `FeatureWorkItem` types.
