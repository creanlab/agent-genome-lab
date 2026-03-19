# 30 — Docs & Validation

> Always-on.

## Docs as System of Record

1. `docs/backlog_tama.md` — product roadmap (update task status here)
2. `docs/exec-plans/active/*.md` — current implementation plans
3. `docs/exec-plans/completed/*.md` — historical plans
4. `docs/ops/cloud-run.md` — deployment operations

## When to Update Docs

- Changed behavior → update architecture docs
- Changed deploy process → update ops docs
- Completed task → move from backlog to legacy
- New incident → update rendered journal if maintained

## Validation

Before closing any work session:
1. `docs/backlog_tama.md` reflects current state
2. No stale "IN PROGRESS" tasks left without update
3. Completed plans moved to `docs/exec-plans/completed/`
