---
description: Code review — COMPATIBILITY WRAPPER → safe-change + repo-audit
---

# Code Review & Implementation Workflow

> **V4**: This file is a compatibility wrapper.
> The source of truth is split between:
> - `.agents/workflows/10-safe-change.md` — standard implementation flow
> - `.agents/workflows/30-repo-audit.md` — deep structural review
>
> **Behavior change in V4**: No universal "pause after every section."
> Pause only for HIGH risk changes or explicit user request.

## When to Use Which

| Situation | Workflow |
|-----------|----------|
| Normal feature / fix / refactor | `10-safe-change.md` |
| Architecture review or migration | `30-repo-audit.md` |
| Schema/auth/billing/destructive change | `10-safe-change.md` (HIGH risk → pause) |

## Engineering Principles (unchanged)

- **DRY** — flag duplication
- **Well-tested** — better too many tests than too few
- **Correctness over speed** — optimize for edge cases
- **Explicit over clever** — prefer readable solutions

## Legacy backup → `docs/legacy/workflows/code-review.legacy.md`
