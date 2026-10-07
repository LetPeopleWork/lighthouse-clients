---
"@letpeoplework/lighthouse-client": minor
"@letpeoplework/lighthouse-cli": minor
"@letpeoplework/lighthouse-mcp-core": minor
---

`lh team list` and `lh portfolio list` read like the Overview's tables, and `lh team get` and `lh portfolio get` like their pages

Under `--pretty`, `lh team list` now prints the title `Teams` and a table with the Overview's columns:
the Team's name with its id beside it (`Gravity [id: 3]`), how many Features it owns (`1 Feature`,
`6 Features`), its tags, and when it was last updated, in the reader's own time zone
(`Tue 6 Oct 2026, 07:14`). A Team never updated says `—`, and the Tags cell stays empty when
Lighthouse sends no tags. An instance that renamed its terms sees its own words. A list in which any
Team arrives without its name or id still prints the generic view, exit 0, as before. `--json` and
`--toon` are unchanged.

Under `--pretty`, `lh team get` states the Team as its page does: its name and id, when it was last
updated, then its settings one per line — the Service Level Expectation (`85% of Work Items within 12
days or less`), the System WIP Limit (`10 Work Items`), the Feature WIP (`1 Feature`, `2 Features`),
the Throughput dates with `(rolling)` or `(fixed dates)`, the Portfolios it works for, how many
Features it owns, its tags when it has some, and its Work Item Types. A setting left unset reads
`Not set`, as on the web, and an instance that renamed its terms sees its own words. A Team that
arrives without its name or id prints the generic view, exit 0. `--json` and `--toon` are unchanged.

Under `--pretty`, `lh portfolio list` prints the title `Portfolios` and the same table, then one line
pointing at each Portfolio's Deliveries: `Deliveries per Portfolio: lh delivery list --portfolio-id <id>`.
The web shows the Deliveries in the table; the CLI points at them instead, so the list stays a single
read however many Portfolios there are.

Under `--pretty`, `lh portfolio get` states the Portfolio as its page does: its name and id, when it
was last updated, then the Service Level Expectation (`85% of Features within 45 days or less`), the
System WIP Limit (`5 Features`), the Feature WIP as the number of Teams working on it (`3 Teams`, or
`Not set` when no Team does), those Teams by name and id, and how many Features it owns. An instance
that renamed its terms sees its own words. A Portfolio that arrives without its name or id prints the
generic view, exit 0. `--json` and `--toon` are unchanged.

Over MCP, `lighthouse_team_list` and `lighthouse_portfolio_list` return their facts block exactly as
before, then a second text block counting them in the instance's words: `summary: 7 Teams`,
`summary: 1 Team`, `summary: No Portfolios`. When the instance's terms cannot be read the count uses the
seeded words, and the tool never fails for it. A list in which any Team or Portfolio arrives without its
name or id returns only the facts block, as before.

Over MCP, `lighthouse_team_get` and `lighthouse_portfolio_get` return the same facts as before with one
more field, `summary`: the page's heading and settings, one per line, as `lh team get` and
`lh portfolio get` print them (`Gravity [id: 3]`, `Service Level Expectation: 85% of Work Items within
12 days or less`, `Feature WIP: 3 Teams`), in the instance's words. When the instance's terms cannot be
read the summary uses the seeded words; a Team or Portfolio that arrives without its name or id returns
the facts alone, and the tool never fails for its summary. The descriptions of all four tools say what
`summary` holds.

The client package gains `readOwnerList`, `describeOwnerListTitle`, `describeOwnerListHeadings`, `describeOwnerCount`,
`describeOwnerName`, `describeFeatureCount`, `describeTags`, `describeLastUpdated`, `NOT_SENT`,
`readTeam`, `describeTeamSummary`, `readPortfolio`, `describePortfolioSummary`, `NOT_SET` and the
`TeamSummary`, `PortfolioSummary`, `ThroughputDates` and `OwnerReference` types.
