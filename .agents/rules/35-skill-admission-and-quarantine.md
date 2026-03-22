# Rule 35 — Skill admission and quarantine

## Purpose
Protect the repository from turning `.evolution/skills/` into an unreviewed pile of vague prompts.

## Always-on rules
1. `.evolution/skills/` is the canonical skill registry.
2. `.agents/skills/` is a published runtime surface, not the source of truth.
3. New skills start as `candidate`.
4. `admitted` requires strong safety and executability.
5. `quarantined` is the default state for weak, risky, incomplete, or stale skills.
6. `rejected` is correct for exact duplicates, unsafe skills, or skills with poor execution evidence.
7. Failure Genomes remain the canonical root-cause memory layer.
8. Do not replace replay-gated genomes with softer skill text.
9. Prefer metadata-first retrieval; do not dump the whole registry into model context.
   Loading all skills wastes context window budget, increases negative transfer risk,
   and makes the model harder to audit. Search → select → open is the correct flow.
10. Only publish packages built from admitted skills.

## Status lifecycle
- `candidate` → extracted and plausible, awaiting evaluation.
- `quarantined` → too weak, risky, or incomplete for routine use; safe to review later.
- `admitted` → stable, safe, and executable enough for runtime activation and packaging.
- `rejected` → duplicate, unsafe, or non-executable; kept for lineage but never activated.

## Admission bar
A skill may be admitted only when it has:
- clear lineage,
- explicit trigger conditions,
- concrete steps,
- a verification step,
- safety notes,
- and no strong duplicate already covering the same behavior.

## Quarantine triggers
Quarantine when the skill:
- has unclear scope,
- lacks a real verification step,
- mixes unrelated families,
- is too costly for routine use,
- or looks like a temporary one-off patch.
