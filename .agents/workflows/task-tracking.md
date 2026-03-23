---
description: Task tracking — COMPATIBILITY WRAPPER → backlog + exec-plans
---

# Task Tracking Workflow

> **V4**: This file is a compatibility wrapper.
> Backlog and execution tracking are now split:
> - `docs/backlog_tama.md` — product roadmap (WHAT to do)
> - `docs/exec-plans/active/*.md` — current implementation plans (HOW to do it)
> - `docs/exec-plans/completed/*.md` — historical plans

## Before Starting Work

1. Read `docs/backlog_tama.md` — find relevant tasks
2. Read or create execution plan in `docs/exec-plans/active/`
3. Update task status to 🟡 IN PROGRESS
4. Read `.agents/rules/20-evolution-memory-policy.md` for memory protocol

## After Completing Work

1. Mark task as ✅ DONE in `docs/backlog_tama.md`
2. Move completed tasks to `docs/backlog_legacy.md`
3. Move execution plan to `docs/exec-plans/completed/`
4. Capture incident if error was learned from (`.agents/workflows/20-incident-capture.md`)
5. Commit with descriptive message
6. Verify in production

## Legacy backup → `docs/legacy/workflows/task-tracking.legacy.md`
