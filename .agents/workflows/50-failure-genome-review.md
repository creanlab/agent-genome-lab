---
description: Review pending Failure Genomes and apply replay-gated promotion
---

# 50 — Failure Genome Review & Promotion

> Run periodically or when new genomes accumulate.
> Automates the 6-step replay gate from workflow 20-incident-capture.

## When to run

- After `nve-distill.js` creates new genomes
- After significant incident batch
- Before a milestone or release
- On schedule (suggested: weekly)

## Steps

### Step 1: Run replay gate

```bash
node cli/nve-replay.js --dry-run --verbose
```

Review the output. Confirm decisions make sense.

### Step 2: Apply decisions

```bash
node cli/nve-replay.js --promote
```

This updates genome files with `promotion_decision` and `replay` outcomes.

### Step 3: Generate patches for promoted genomes

For each genome with `promotion_decision = "promoted"`, check `proposed_patch_types`:

| Patch Type | Target | Action |
|------------|--------|--------|
| `rule_patch` | `.agents/rules/*.md` | Add invariant as always-on rule |
| `workflow_patch` | `.agents/workflows/*.md` | Add verification step |
| `skill_patch` | `.agents/skills/*/SKILL.md` | Extend capability |
| `verifier_patch` | CI or checklist | Add automated check |
| `doc_patch` | `docs/*.md` | Update documentation |

### Step 4: Commit with genome tag

```
git add -A
git commit -m "🧬 genome-promoted: [family] → [patch_type]"
```

### Step 5: Update utility scores

```bash
node cli/nve-utility.js
```

### Step 6: Regenerate summary

```bash
node cli/nve-fg-summary.js
```

## Decision criteria

| Check | Threshold | Action if FAIL |
|-------|-----------|----------------|
| Source incident fixed? | YES required | Skip genome |
| Family members exist? | ≥ 1 for replay | Promote (first in family) |
| Pass rate | ≥ 60% | Reject or refine |
| Holdout regression | None | Reject |

## Rollback

If a promoted patch causes issues:
1. Revert the patch commit
2. Set genome `promotion_decision = "reverted"`
3. Increment `negative_transfer_count`
4. Run `nve-utility.js` to update scores
