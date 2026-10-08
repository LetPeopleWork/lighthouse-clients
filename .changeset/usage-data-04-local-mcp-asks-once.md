---
"@letpeoplework/lighthouse-mcp-core": minor
"@letpeoplework/lighthouse-mcp-stdio": minor
---

The local MCP server asks once, through the assistant, whether Lighthouse may receive usage data

The first tool call that succeeds against a Lighthouse nobody on this machine has answered for asks the
person once, through their assistant, when the assistant can ask (MCP elicitation). The tool's own answer
reaches them unchanged either way. Accepting turns usage data on, declining keeps a final No; closing the
question, an error or 50 seconds without an answer keeps nothing, and the server does not ask again until
it is restarted. Calls made while the question is open neither wait for it nor ask a second time.

The answer is the one `lh` keeps for the same Lighthouse, so answering in either place stops both asking.
With a yes, a manual forecast, a Team refresh and a Portfolio refresh are reported with the source `Mcp`,
after the result is returned, so a slow Lighthouse never delays a tool. `DO_NOT_TRACK` is honoured.

An assistant that cannot ask is never asked through, and nothing is sent for it until someone answers:
after `lh config usage-data on` for that Lighthouse, its tool calls are reported with the source `Mcp` all
the same. The server reads the kept answer again just before it would ask, so an answer given with `lh`
while it is running is honoured without a question. Nothing is asked or sent when the Lighthouse's
administrator has stopped usage data, it was installed less than three days ago, or it does not take
usage data from an MCP server.

`mcp-core`'s `registerMcpTools` takes an optional `usageData` port; without one, every tool behaves as
before.
