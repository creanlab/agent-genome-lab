---
description: Incident capture — classify, distill, store, genome distillation, propose patch
---

# 20 — Incident Capture

> Run after EVERY significant error, bug fix, or near-miss.
> This replaces the old RULE 8 from `auto-evolution.md`.
> V4: now includes Failure Genome distillation and replay-gated promotion.

## Trigger Conditions

- Bug was fixed
- Deployment failed
- User reported regression
- Process failure (false done, missed step)
- Near-miss caught before production
- Repeated anti-pattern detected

## Capture Steps

### Step 1: Classify
```
Type: Regression | Gap | Process | Near-miss | Documentation Drift
Severity: 1-10
Category: Preventive | Reactive | Structural | Paradigm Shift
```

### Step 2: Create Incident File

Save to `.evolution/incidents/INC-YYYYMMDD-NNN.json`:

```json
{
  "incident_id": "INC-20260318-001",
  "created_at": "2026-03-18T14:30:00+03:00",
  "title": "Short descriptive title",
  "type": "Regression",
  "severity": 7,
  "category": "Preventive",
  "what_happened": "Description of the issue",
  "why_it_happened": "Root cause analysis",
  "fix_applied": "What was done",
  "pattern_extracted": "PAT-NNN: One sentence rule",
  "anti_pattern": "AP-NNN: What to never do",
  "related_incidents": ["INC-xxx"],
  "verified": true,
  "evidence": "deploy healthcheck passed / screenshot / test output"
}
```

### Step 3: Distil Experience Unit

Save to `.evolution/experience_units/EU-YYYYMMDD-NNN.json`:

```json
{
  "eu_id": "EU-20260318-001",
  "source_incident": "INC-20260318-001",
  "pattern": "Quality ≠ Presence",
  "anti_pattern": "CSS Variable Blindness",
  "repair_operator": "Add resolvability check to fidelity gate",
  "applicability": ["css-extraction", "style-mirror", "fidelity-gate"],
  "impact": 8,
  "xp_awarded": 13
}
```

### Step 4: Distil Failure Genome (Impact ≥ 7)

> **This is the V4 Failure Genome layer.**
> Use skill: `.agents/skills/incident-distiller/SKILL.md`
> Schema: `schemas/failure-genome.schema.json`

For every incident with Impact ≥ 7, create a Failure Genome:

#### 4a. Propose Failure Family

Look at `.evolution/failure_genomes/FAMILY_INDEX.json` for existing families.

**Known families**:
| Family | Invariant | Example |
|--------|-----------|---------|
| `credential-drift-after-refactor` | `deploy_requires_all_env_vars_verified` | API key moved during refactor |
| `verification-skipped-before-done` | `done_means_verified_on_production` | Task closed without prod check |
| `silent-fallback-introduced` | `no_silent_fallbacks` | try/except returns empty |
| `data-quality-gate-bypass` | `presence_does_not_equal_quality` | var(--x) passes fidelity gate |
| `write-read-contract-mismatch` | `write_format_must_match_read_format` | Write flat, read nested |
| `llm-output-structural-bias` | `never_trust_single_llm_number` | LLM rounds all scores to 83 |
| `command-shell-mismatch` | `check_os_before_shell_commands` | bash && in PowerShell |

If the incident fits an existing family → use that family name.
If it's new → create a new family using the pattern: `{noun}-{noun}-{action}`.

#### 4b. Extract Violated Invariant

The invariant is the rule that **should never have been broken**.
Format: `snake_case` noun phrase (e.g., `docs_follow_architecture`).

#### 4c. Propose Repair Operator

The smallest reusable action that fixes this class of failure.
Format: `verb-noun-phrase` (e.g., `add-pre-commit-blocker`).

#### 4d. Collect Verifier Evidence

References to proof that the fix works:
```json
"verifier_evidence": [
  { "kind": "test", "ref": "test_style_extraction_rejects_css_vars", "summary": "Unit test passes" },
  { "kind": "healthcheck", "ref": "production URL responds 200", "summary": "Deployed OK" },
  { "kind": "screenshot", "ref": "artifacts/style_comparison.png", "summary": "Before/after screenshot" }
]
```

Evidence kinds: `test | command_output | screenshot | healthcheck | diff | replay_report | other`

#### 4e. Set Transferability Tags

```json
"transferability_tags": [
  "applies_to=css-extraction",
  "applies_to=data-validation",
  "risk=high"
]
```

#### 4f. Initial Utility Estimate

```json
"utility": {
  "score": impact / 10,
  "reuse_count": 0,
  "prevention_count": 0,
  "negative_transfer_count": 0,
  "last_used_at": null
}
```

#### 4g. Emit Genome File

Save to `.evolution/failure_genomes/FG-NNNNNN.json`.
Update `.evolution/failure_genomes/FAMILY_INDEX.json` with the new genome.

### Step 5: Retrieve Similar Genomes

Before proposing a patch, check if similar genomes exist:

1. Read `FAMILY_INDEX.json` → find genomes in same family
2. Read those genome files → check their repair operators
3. If a repair operator already exists → reuse or adapt it
4. If none exist → propose a new one

### Step 6: Propose Patch with Replay Gate

Use skill: `.agents/skills/rule-patcher/SKILL.md`

#### Patch Types (treat separately):
| Type | Target | Example |
|------|--------|---------|
| `rule_patch` | `.agents/rules/*.md` | Add new invariant to rule |
| `workflow_patch` | `.agents/workflows/*.md` | Add check step |
| `skill_patch` | `.agents/skills/*/SKILL.md` | Extend extraction logic |
| `verifier_patch` | Checklist or test | Add verification check |
| `doc_patch` | `docs/*.md` | Update architecture doc |

#### Replay-Gated Promotion:

```
1. IS the current incident fixed?
   NO → do NOT promote. Fix first.
   YES ↓

2. ARE there similar genomes in the same family?
   NO → promote with "replay: not_run" (first in family)
   YES ↓

3. WOULD the proposed patch have prevented the similar incidents?
   Check each family member:
   - Read genome → read incident → would patch have caught it?
   - Score: pass/fail for each

4. PASS RATE ≥ 60%?
   NO → reject or refine the patch
   YES ↓

5. OBVIOUS REGRESSIONS on holdouts?
   Check 1-2 unrelated genomes: does patch break them?
   YES → reject
   NO ↓

6. PROMOTE the patch.
   Record in genome: promotion_decision = "promoted"
   Apply the patch to the target file.
   Commit: "🧬 genome-promoted: [family] → [patch_type]"
```

### Step 7: Update Rendered Journal (optional)

If maintaining a markdown journal, add EVO entry with STATUS_JSON update.
This keeps `web/index.html` visualizer compatible.

## XP Calculation (legacy compatible)

| Impact | XP |
|--------|-----|
| 1-2 | +3 |
| 3-4 | +5 |
| 5-6 | +8 |
| 7-8 | +13 |
| 9-10 | +21 |

Streak bonus: +5 XP if 3+ consecutive entries.

> Legacy reference: `docs/legacy/workflows/auto-evolution.legacy.md`
> Failure Genome hypothesis: `docs/FAILURE_GENOME_HYPOTHESIS_V1.md`
> Experiment plan: `docs/FAILURE_GENOME_EXPERIMENT_PLAN_V1.md`
