---
name: codeburn
description: Analyze AI coding usage with CodeBurn, a local-first CLI that reads session files from Claude Code, Codex, Cursor, Gemini and other tools, then estimates API-equivalent cost by model, project, task and tool. Use when Austin asks about AI usage, modeled cost, token waste, model choice, or usage caps. Never present CodeBurn estimates as provider-billed spend or subscription fees; check the user's billing arrangement and label every dollar figure.
---

# CodeBurn — where the AI usage went

## What this is

[CodeBurn](https://github.com/getagentseal/codeburn) (MIT, `npm i -g codeburn`) reads the
session logs your AI tools already write to disk and turns them into a usage breakdown and
modeled cost by **task, model, tool, and project**. No proxy, no API keys, no wrapper —
nothing leaves the machine. Pricing comes from LiteLLM, refreshed daily.

CodeBurn can show that half of the modeled cost went to conversation instead of code, or
that Opus used more API-equivalent value than work Sonnet might have handled. It does not,
by itself, show what the provider charged.

## Cost means an estimate, not necessarily spend

**Treat every CodeBurn dollar value as an estimated API-equivalent cost unless a provider
bill independently confirms it.** CodeBurn applies model/token prices to locally recorded
usage. For fixed-price Claude Code, Codex, Cursor, Gemini, or similar subscriptions, that
usage does not record the subscription fee or the amount actually charged. A $2,795
CodeBurn result can therefore coexist with a much smaller fixed monthly subscription bill.

Before answering with dollars, ask or establish whether the usage was API-billed,
subscription-based, employer-paid, credit-funded, or mixed:

- For subscription, bundled, employer-paid, or unknown billing, say **"estimated
  API-equivalent cost"** (or **"modeled cost"**), never "spent," "charged," "bill," or
  "actual burn."
- For direct API usage, still label the result **"CodeBurn estimate"** until it is
  reconciled against the provider invoice or billing export. Only the provider's billing
  record may be described as billed spend.
- For mixed usage, split the report by billing arrangement when possible. Do not add a
  subscription fee to modeled API-equivalent cost and call the sum total spend.
- If actual spend is requested, report known subscription fees and provider-billed amounts
  separately from CodeBurn's modeled figure. If those records are unavailable, say that
  actual spend cannot be determined from session logs alone.

**Requires Node.js 22.13+.** Verify with `node --version` before blaming the tool.

## The one thing that will mislead you

**CodeBurn only sees the session files on the machine it runs on.** Run it inside a Claude
Code web/remote container and it reports that container's few sessions — not Austin's real
usage. The numbers will look absurdly low and they are not wrong, they are just local.

So: if you are running in a remote/ephemeral container, say so and hand Austin the command
to run on his own laptop instead of reporting the container's figure as his usage. Running
on his machine makes the usage scope relevant; it does **not** turn modeled cost into billed
spend.

## Install

Nothing is required for a one-off — `npx codeburn <command>` works cold and is the right
call inside a throwaway container.

For a permanent command on his machine:

```bash
npm install -g codeburn        # or: brew install codeburn   (macOS)
```

To let Claude answer spend questions mid-conversation without shelling out, add the MCP
server **at user scope** — his usage is global, not per-repo, so this should be available in
every project, not just this one:

```bash
claude mcp add -s user codeburn -- npx -y codeburn mcp
```

That exposes two tools: `get_usage` (modeled cost + breakdowns, fast) and `get_savings`
(estimated findings, retry tax, routing waste — slower, deeper). Project names come back
pseudonymized unless the caller passes `include_project_names: true`.

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

The command names and output fields may call these values "cost," "spend," or "savings."
That does not change their provenance: relabel them as modeled/estimated in the answer and
state the billing basis. Never repeat an unqualified dollar total from CLI or MCP output.

When you are scripting or summarizing rather than showing him a terminal, prefer
`--format json` and read the fields — do not scrape the pretty tables.

## Cutting modeled cost and usage

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

## Modeled-cost budget caps

Two halves: `budget` sets the numbers, `guard` enforces them at session time. Setting a
budget alone does not stop anything — it only gives `--check` something to compare against.
These thresholds use CodeBurn's modeled cost; they do not cap a subscription invoice or
guarantee a matching provider-billing limit.

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
4. **Lead with provenance, then the number.** For example: "CodeBurn estimates $2,795 in
   API-equivalent usage this month; this is not your subscription bill. 95% was Claude,
   with an estimated $340 attributable to re-reading the same six files." If provider
   billing records are available, report billed spend as a separate figure.
5. **Empty output is a detection problem, not a zero.** Run `codeburn doctor` before
   telling him he spent nothing; it prints every path probed and what parsed.
