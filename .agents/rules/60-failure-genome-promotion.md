---
description: Always-on rule — never promote a genome mutation without replay gate evidence
---

# Rule 60 — Failure Genome Promotion Gate

## Invariant

**No mutation (rule, workflow, skill, verifier, doc) may be promoted from a Failure Genome
without evidence that it passes the replay gate.**

## What this means

1. A genome with `promotion_decision = "pending"` is a CANDIDATE, not a fact.
2. Before applying any patch derived from a genome, run `node cli/nve-replay.js`.
3. Only genomes with `promotion_decision = "promoted"` may generate patches.
4. Genomes with `promotion_decision = "rejected"` must be refined or abandoned.

## Replay gate requirements

- Source incident must be FIXED
- Family pass rate ≥ 60% (or first in family)
- No holdout regression detected
- Evidence recorded in genome JSON (`replay` field)

## Violation response

If a mutation is applied without replay gate:
1. Revert the mutation immediately
2. Record an incident (type: Process, severity: 8)
3. Create a genome in family `unsafe-mutation-applied`
4. Run replay gate on the reverted genome

## Exceptions

- Emergency hotfixes may skip replay gate if:
  - Impact ≥ 9
  - Production is down
  - Replay gate is run retroactively within 24 hours
  - A post-mortem genome is created
