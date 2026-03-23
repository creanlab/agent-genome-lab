---
description: How to track tasks and features for Evolution Tamagotchi
---

# Task Tracking Workflow

## Backlog
The main backlog is maintained at `docs/backlog_tama.md`.
It contains:
- A table of all active tasks with status (🔴 TODO / 🟡 IN PROGRESS / ✅ DONE / ⏸️ DEFERRED)
- Phase breakdown (TAMA-1/2/3 + Research R1-R6 + Proposals P1-P14)
- Sprint history

## Feature Documentation
Each significant feature gets documented in the backlog with:
1. **What** — feature description
2. **Why** — user benefit
3. **How** — implementation approach
4. **Status** — current state
5. **Impact** — what depends on this

## Before Starting Work
1. Read `docs/backlog_tama.md`
2. Identify which tasks are relevant to current phase
3. Update task status to 🟡 IN PROGRESS
4. Check `.agents/workflows/auto-evolution.md` for known patterns

## After Completing Work
1. Mark task as ✅ DONE in backlog
2. Update evolution journal if error was learned from
3. Commit with descriptive message
4. Push to GitHub (evolution-tamagotchi branch)
5. Verify in browser

## Version Convention
- Increment minor version for bug fixes (v2.1)
- Increment major version for feature additions (v3.0)
- Current: v2.0 (Multi-User)
