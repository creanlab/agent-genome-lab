# 00 — Core Contract

> Always-on. Every task, every session.

## Done Definition

A task is DONE only when:
1. The change is deployed or committed to the target branch.
2. The output is verified in the target environment (not just in code).
3. Docs are updated if behavior changed.
4. If an error was fixed: an incident is captured in `.evolution/incidents/`.

## Validation Before Commit

1. No secrets in staged files.
2. No unintended file deletions (check `git status`).
3. Old compatibility paths still work.
4. **Were there uncaptured incidents since the last commit?** If yes — create them first.

## Session Start

At session start, read in this order:
1. `AGENTS.md`
2. `.evolution/MEMORY.md` — compact memory with verified lessons and anti-patterns
3. `.agents/rules/` (all numbered rules)
4. `.evolution/manifests/` (latest manifest if exists)
