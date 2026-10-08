# Skills

Agent skills that teach an AI assistant to use the Lighthouse clients. Each sub-folder is one skill and
ships on its own; the files directly in this folder (this README and the tests) are not part of any skill.

## Layout

```
skills/
  <name>/
    SKILL.md          frontmatter `name: <name>` and a `description`
    references/*.md   optional; loaded by the skill when it says so
    evals/            cases.json and fixtures/*.json; never shipped
```

| Folder | What it is for | Release asset |
|---|---|---|
| `lighthouse` | Reaching Lighthouse over MCP or `lh`, every tool and command, reading flow metrics | `lighthouse-skill.zip` |
| `lighthouse-refinement` | Getting a Team ready for its next Refinement | `lighthouse-refinement-skill.zip` |
| `lighthouse-daily-flow-review` | Walking the board in the daily | `lighthouse-daily-flow-review-skill.zip` |

A skill whose folder does not exist yet has no zip. Its eval cases wait under
`test-support/pending-skill-evals/<name>/` and move into `skills/<name>/evals/` with its `SKILL.md`.

## Packing

```
bash scripts/pack-skills.sh <out-dir>
```

zips the contents of every `skills/<name>/` folder into `<out-dir>/<name>-skill.zip`, with `SKILL.md` at the
root of the zip and `evals/` left out, and prints what each zip holds. It fails, and leaves no zip behind,
when a folder has no `SKILL.md`, when the frontmatter `name` is not the folder's name, or when a written
zip lacks a root `SKILL.md` or carries `evals/`. It needs `zip` and `unzip`.

CI runs it twice: the `verify` job on every push, into a temp folder, also checking that the zip of every
skill that should exist is there; and the `release` job, into `release-assets/`, before npm publish. The
GitHub release attaches `release-assets/*-skill.zip`. The zip names are what the docs and the website link
to, so renaming a folder breaks those links.

## The drift check

`skills/skills.drift.test.ts` runs with `pnpm test`. It reads what exists the way a user meets it: the MCP
tool names from the list `createMcpCoreRuntime(...).listTools()` announces, and the `lh` groups,
subcommands and `--metrics` keys from the help `runCliCommand` prints. Against that it checks that

- the `lighthouse` skill (`SKILL.md` and its `references/`) names every tool, subcommand and metric key;
- no skill names a tool, `lh` command or metric key that does not exist (in backticks or code blocks);
- every skill's frontmatter `name` is its folder's name, and it has a `description`.

Each failure lists the names at fault, with the file and line where a skill uses one. When you add a tool,
subcommand or metric key, the check stays red until the `lighthouse` skill says when to use it.

`skills/skills.evals.test.ts` reads every eval case and fixture on every commit, so a renamed tool or a
missing fixture shows up then and not in the middle of an eval run.

## Running the evals

The cases are run by hand, before a release, on the skill text that will ship. Re-run a skill's cases after
any change to its text.

1. Start the case's fixture: `node scripts/eval-fixture.mjs skills/<name>/evals/fixtures/<fixture>.json`.
   It prints its address and logs every request it receives.
2. Point the case's surface at that address: MCP stdio with `LIGHTHOUSE_URL=<address>`, or
   `lh connection connect --mode server --url <address>`.
3. Install only the skill under test, plus `lighthouse` when testing one of the others.
4. Start a fresh conversation for every run. Send the case's `prompt`, then each of its `followUps`.
5. Score the run against the case: the tools or commands that must and must not be called (and not before
   which turn), and what the answer must and must not contain. Read the calls from the assistant's
   transcript and the writes from the fixture's log, where they show as `POST`, `PUT` or `DELETE`.
   `checks` are properties you judge by reading the answer.
6. Run every case three times. A skill passes when every guardrail case passes 3 of 3 and the rest pass at
   least 90 % of their runs.

Record each skill's results in the Lighthouse repository, as
`docs/feature/story-6217-lighthouse-skills/evals/<yyyy-mm-dd>-<name>.md`: one row per case and run, pass
or fail, with one line on why.
