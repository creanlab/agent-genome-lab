---
name: rule-patcher
description: Propose, test, and promote patches to rules, workflows, and skills via replay-gated promotion
---

# Rule Patcher

> Proposes mutations to the agent's rules, workflows, and skills based on incident data.
> V4: includes Failure Genome replay-gated promotion.

## When to Use

After a high-impact incident (Impact ≥ 7) or when a failure family is detected.

## Patch Types

| Type | Target | Example | When to Use |
|------|--------|---------|-------------|
| `rule_patch` | `.agents/rules/*.md` | Add new invariant | Missing knowledge — no rule existed |
| `workflow_patch` | `.agents/workflows/*.md` | Add new check step | Process gap — steps skipped |
| `skill_patch` | `.agents/skills/*/SKILL.md` | Extend extraction | Capability gap |
| `verifier_patch` | Checklist or test | Add verification check | Invariant was clear but not enforced |
| `doc_patch` | `docs/*.md` | Update architecture | Documentation drift |

## Procedure

### 1. Identify Gap

From the incident and its failure genome:
- Which rule/workflow/skill would have PREVENTED this?
- Is it a new gap or a known family with no patch?

### 2. Draft Patch

Write the proposed change:
```yaml
patch_type: rule_patch
target_file: .agents/rules/10-truthfulness-and-no-fallbacks.md
change: Add CSS variable detection to pre-commit checklist
rationale: CSS var(--x) passes presence check but is unresolvable
source_genome: FG-000004
```

### 3. Replay-Gated Promotion

> **THIS IS THE CORE V4 MECHANISM**

```
┌─ 1. Is the current incident FIXED? ──────────────────┐
│   NO → STOP. Fix first.                              │
│   YES ↓                                              │
├─ 2. Are there SIMILAR genomes in the family? ────────┤
│   NO → Promote with "replay: not_run" (first member) │
│   YES ↓                                              │
├─ 3. Would this patch have PREVENTED similar ones? ───┤
│   For each family member:                            │
│   - Read its incident                                │
│   - Simulate: would patch have caught it?            │
│   - Score: PASS / FAIL                               │
│   ↓                                                  │
├─ 4. Pass rate ≥ 60%? ───────────────────────────────┤
│   NO → Reject or refine the patch                    │
│   YES ↓                                              │
├─ 5. Holdout regression? ────────────────────────────┤
│   Pick 1-2 genomes from DIFFERENT family             │
│   Does patch obviously break them?                   │
│   YES → Reject                                       │
│   NO ↓                                               │
├─ 6. PROMOTE ────────────────────────────────────────┤
│   Apply patch to target file                         │
│   Update genome: promotion_decision = "promoted"     │
│   Update genome: replay.status = "passed"            │
│   Update genome: replay.pass_rate = actual_rate      │
│   Commit: "🧬 genome-promoted: [family] → [type]"   │
└──────────────────────────────────────────────────────┘
```

### 4. Record Promotion Decision

Update the source genome file:
```json
{
  "promotion_decision": "promoted",
  "proposed_patch_types": ["rule_patch"],
  "replay": {
    "status": "passed",
    "family_sample_size": 3,
    "holdout_sample_size": 2,
    "pass_rate": 0.8,
    "notes": "Patch would have prevented 4/5 similar incidents. No holdout regressions."
  },
  "notes": "Added CSS var detection to rule 10 pre-commit checklist"
}
```

### 5. If Rejected

```json
{
  "promotion_decision": "rejected",
  "replay": {
    "status": "failed",
    "family_sample_size": 5,
    "holdout_sample_size": 2,
    "pass_rate": 0.4,
    "notes": "Only prevented 2/5 family members. Too narrow."
  },
  "notes": "Patch too specific — only catches exact CSS var pattern, not general quality gate bypass"
}
```

After rejection: refine the patch or propose a different patch type.

## What NOT to Do

1. **Don't auto-promote without replay** — even if it "feels right"
2. **Don't mutate the global prompt** — use targeted rules/workflows/skills
3. **Don't trust "felt useful" reflections** — require evidence
4. **Don't merge failures and successes** — they are different data types
5. **Don't overfit to last incident** — test against the family
