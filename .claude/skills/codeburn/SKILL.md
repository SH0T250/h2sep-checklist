---
name: codeburn
description: Track and cut AI coding spend with CodeBurn, a local-first CLI that reads the session files Claude Code, Codex, Cursor, Gemini and ~40 other tools already write to disk, then breaks the spend down by model, project, task and tool. Use whenever Austin asks what he is spending on AI, where his tokens went, why a session or a day was expensive, whether he is wasting tokens, which model he should be using, how to spend less, or asks to set a budget cap or a spend alert — "what did Claude cost me this month", "where is my money going", "why is this burning so much", "am I wasting tokens", "cap me at $50 a day", "compare Opus vs Sonnet on my actual work". Also use when the numbers look wrong and need auditing against the raw provider fields.
---

# CodeBurn — where the AI spend actually went

## What this is

[CodeBurn](https://github.com/getagentseal/codeburn) (MIT, `npm i -g codeburn`) reads the
session logs your AI tools already write to disk and turns them into a cost breakdown by
**task, model, tool, and project**. No proxy, no API keys, no wrapper — nothing leaves the
machine. Pricing comes from LiteLLM, refreshed daily.

The bill tells you the total. CodeBurn tells you that half of it went to conversation
instead of code, or that Opus burned the budget on work Sonnet would have one-shot.

**Requires Node.js 22.13+.** Verify with `node --version` before blaming the tool.

## The one thing that will mislead you

**CodeBurn only sees the session files on the machine it runs on.** Run it inside a Claude
Code web/remote container and it reports that container's few sessions — not Austin's real
spend. The numbers will look absurdly low and they are not wrong, they are just local.

So: if you are running in a remote/ephemeral container, say so and hand Austin the command
to run on his own laptop instead of reporting the container's figure as his spend. Only
treat the output as his actual burn when you are running on his machine.

## Install

Nothing is required for a one-off — `npx codeburn <command>` works cold and is the right
call inside a throwaway container.

For a permanent command on his machine:

```bash
npm install -g codeburn        # or: brew install codeburn   (macOS)
```

To let Claude answer spend questions mid-conversation without shelling out, add the MCP
server **at user scope** — his spend is global, not per-repo, so this should be available in
every project, not just this one:

```bash
claude mcp add -s user codeburn -- npx -y codeburn mcp
```

That exposes two tools: `get_usage` (spend + breakdowns, fast) and `get_savings` (waste
findings, retry tax, routing waste — slower, deeper). Project names come back pseudonymized
unless the caller passes `include_project_names: true`.

To make this skill available in every repo instead of just this one:
`cp -r .claude/skills/codeburn ~/.claude/skills/`.

## Answering the question he actually asked

Reach for the narrowest command that answers it. Most accept `--provider`, `--project` /
`--exclude`, and a period flag (`-p today|week|30days|month|all|lifetime`).

| He asks | Run |
|---|---|
| "what am I at today / this month" | `codeburn status` (add `--format json` to parse it) |
| "give me the month, something I can paste" | `codeburn overview --no-color` |
| "where did it all go" | `codeburn overview` — totals, by tool, top models, top projects, best days |
| an exact window | `codeburn report --from 2026-06-01 --to 2026-06-15` |
| "show me the dashboard" | `codeburn` (interactive TUI) or `codeburn web` (charts, localhost:4747) |
| "which model is eating it" | `codeburn models --top 10`, `--by-task`, or `--by-agent` |
| "Opus or Sonnet for this" | `codeburn compare` — his real sessions, not benchmarks |
| "am I wasting tokens" | `codeburn optimize` (last 30 days) |
| "why was that session so expensive" | `codeburn context` — what filled the context window |
| "did any of this actually ship" | `codeburn yield` — productive vs reverted/abandoned, against git |
| "these numbers look wrong" | `codeburn doctor` first, then `codeburn audit` |
| a table for a PR or Slack | add `--format markdown` (models) or `--format json` (most) |

When you are scripting or summarizing rather than showing him a terminal, prefer
`--format json` and read the fields — do not scrape the pretty tables.

## Cutting the spend

`codeburn optimize` scans sessions and the `~/.claude/` setup for waste patterns — files
re-read across sessions, a low Read:Edit ratio, retry tax, expensive-model routing — and
prints copy-paste fixes.

The config-class fixes can be applied for him:

```bash
codeburn optimize --apply --dry-run     # always this first — prints the plan, changes nothing
codeburn optimize --apply               # interactive, backed up and journaled
codeburn optimize --apply --only <ids>  # just the ones he picked
```

**`--apply` edits his config files. Show him the `--dry-run` plan and get a yes before
running it for real. Never pass `--yes`** — that applies everything unprompted, and it is
his setup, not yours.

Everything applied is reversible:

```bash
codeburn act list          # every change codeburn made, newest first
codeburn act undo --last   # roll back the most recent
codeburn act report        # realized vs estimated savings
```

## Budget caps

Two halves: `budget` sets the numbers, `guard` enforces them at session time. Setting a
budget alone does not stop anything — it only gives `--check` something to compare against.

```bash
codeburn budget --daily 50 --monthly 800   # in the active display currency
codeburn budget --list
codeburn budget --check                    # exits 1 if any budget is over — scriptable
codeburn budget --remove daily
```

```bash
codeburn guard install     # hooks into Claude Code settings — this project by default
codeburn guard install --global --statusline
codeburn guard status      # caps, install locations, flagged projects
codeburn guard allow       # lift the hard cap for the current session
codeburn guard uninstall   # removes codeburn's hooks, leaves his own alone
```

`guard install` writes hooks into his Claude Code settings. Confirm scope before running it
— `--global` changes behavior in every repo he opens. If a session dies against a hard cap
later, `codeburn guard allow` is the escape hatch, not reinstalling.

## Ground rules

1. **Read commands are free — run them.** `status`, `overview`, `models`, `optimize`,
   `doctor`, `audit`, `compare` and `yield` only read. Don't ask permission to look.
2. **Write commands need a yes.** `optimize --apply`, `guard install`, `guard uninstall`,
   `sync setup`, and the `budget` / `price-override` / `model-alias` config setters all
   change his machine. Confirm first, and prefer `--dry-run` where it exists. (`budget`
   with only `--list` or `--check` is a read — just run it.)
3. **Don't push his usage anywhere.** `codeburn sync` ships telemetry to a remote endpoint.
   It is preview-grade and it is his call — never run it on your own initiative.
4. **Lead with the number.** He wants "you're at $2,795 this month, 95% of it Claude, and
   $340 of that was re-reading the same six files" — not a tour of the dashboard.
5. **Empty output is a detection problem, not a zero.** Run `codeburn doctor` before
   telling him he spent nothing; it prints every path probed and what parsed.
