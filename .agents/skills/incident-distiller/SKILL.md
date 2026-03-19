---
name: incident-distiller
description: Convert raw incidents into canonical events, experience units, and failure genomes with family-level classification
---

# Incident Distiller

> Converts incidents into structured learning units.
> V4: includes Failure Genome distillation with family classification and utility scoring.

## When to Use

After any bug fix, deployment failure, or near-miss — when you need to create
structured memory from the event.

## Input

- Description of what happened
- Root cause analysis
- Fix applied
- Impact severity (1-10)
- Verification evidence

## Output

Three files (+ index update):
1. `.evolution/incidents/INC-YYYYMMDD-NNN.json`
2. `.evolution/experience_units/EU-YYYYMMDD-NNN.json`
3. (If Impact ≥ 7) `.evolution/failure_genomes/FG-NNNNNN.json`
4. (If genome created) Update `FAMILY_INDEX.json`

## Procedure

### 1. Create Incident Event

Validate against `schemas/incident-event.schema.json`:
```json
{
  "incident_id": "INC-YYYYMMDD-NNN",
  "created_at": "ISO8601",
  "title": "Short title (5+ chars)",
  "type": "Regression | Gap | Process | Near-miss | Documentation Drift",
  "severity": 7,
  "category": "Preventive | Reactive | Structural | Paradigm Shift",
  "what_happened": "What broke and what the user/system experienced",
  "why_it_happened": "Root cause — WHY, not just WHAT",
  "fix_applied": "Exact change made to fix it",
  "pattern_extracted": "PAT-NNN: One sentence learning",
  "anti_pattern": "AP-NNN: What to never do again",
  "related_incidents": [],
  "verified": true,
  "evidence": "How verification was done"
}
```

### 2. Distil Experience Unit

Validate against `schemas/experience-unit.schema.json`:
```json
{
  "eu_id": "EU-YYYYMMDD-NNN",
  "source_incident": "INC-YYYYMMDD-NNN",
  "pattern": "Reusable pattern name",
  "anti_pattern": "Anti-pattern name",
  "repair_operator": "Smallest reusable fix action",
  "applicability": ["tag1", "tag2", "tag3"],
  "impact": 7,
  "xp_awarded": 13
}
```

### 3. Distil Failure Genome (Impact ≥ 7)

Validate against `schemas/failure-genome.schema.json`.

#### 3a. Context Fingerprint

Describe the environment, NOT the specific bug:
```json
"context_fingerprint": {
  "stack_tags": ["python", "node", "supabase", "cloud-run", "gemini"],
  "surface_tags": ["deploy", "ui", "cli", "data-contract", "docs", "auth"],
  "environment_tags": ["windows-powershell", "linux", "gcp", "local"],
  "repo_maturity": "greenfield | legacy | hybrid | unknown"
}
```

Only include tags that are relevant. Don't tag everything.

#### 3b. Failure Family Classification

**Check existing families first**: Read `.evolution/failure_genomes/FAMILY_INDEX.json`.

**Matching rules** — a genome belongs to an existing family if it overlaps on:
- Failure family (same class of problem)
- Violated invariant (same rule broken)
- At least 2 stack/surface tags
- Same repair operator neighborhood

**Known families** (seed from NVE journal):

| Family | Invariant | Typical Repair |
|--------|-----------|----------------|
| `credential-drift-after-refactor` | `deploy_requires_all_env_vars_verified` | strip-and-verify-env-vars |
| `verification-skipped-before-done` | `done_means_verified_on_production` | add-production-verification-step |
| `silent-fallback-introduced` | `no_silent_fallbacks` | remove-fallback-fix-extraction |
| `data-quality-gate-bypass` | `presence_does_not_equal_quality` | add-resolvability-check |
| `write-read-contract-mismatch` | `write_format_must_match_read_format` | add-dual-path-lookup |
| `llm-output-structural-bias` | `never_trust_single_llm_number` | compute-structural-composite |
| `command-shell-mismatch` | `check_os_before_shell_commands` | replace-with-ps-safe-command |

**Creating a new family**: Use pattern `{noun}-{noun}-{action}`:
- `stale-docs-after-change`
- `ephemeral-state-assumption`
- `import-omission-in-partial-fix`

#### 3c. Violated Invariant

The rule that should NEVER have been broken. Format: `snake_case`.

Good invariants:
- `done_means_verified`
- `no_silent_fallbacks`
- `write_format_must_match_read_format`
- `external_state_must_be_persistent`
- `docs_follow_architecture`

Bad invariants (too vague):
- ❌ `code_should_work`
- ❌ `be_careful`
- ❌ `test_everything`

#### 3d. Repair Operator

The smallest reusable action. Format: `verb-noun-phrase`.

Good operators:
- `strip-and-verify-all-env-vars-before-deploy`
- `add-resolvability-check-to-fidelity-gate`
- `compute-structural-composite-from-sub-metrics`

Bad operators (too broad):
- ❌ `fix-the-bug`
- ❌ `be-more-careful`

#### 3e. Verifier Evidence

```json
"verifier_evidence": [
  {
    "kind": "test | command_output | screenshot | healthcheck | diff | replay_report | other",
    "ref": "path or command that produced proof",
    "summary": "one sentence describing what was verified"
  }
]
```

At least ONE evidence item is required for promoted genomes.

#### 3f. Transferability Tags

Format: `applies_to=<scope>` and `risk=<level>`:
```json
"transferability_tags": [
  "applies_to=cloud-run",
  "applies_to=env-var-management",
  "risk=high"
]
```

#### 3g. Initial Utility Estimate

```json
"utility": {
  "score": severity / 10,
  "reuse_count": 0,
  "prevention_count": 0,
  "negative_transfer_count": 0,
  "last_used_at": null
}
```

Utility score starts at `severity / 10` and decays if not used:
- After 30 days without use: multiply by 0.9
- After 90 days without use: multiply by 0.7
- After reuse: multiply by 1.1 (cap at 1.0)
- After preventing a repeat: multiply by 1.2 (cap at 1.0)
- After negative transfer: multiply by 0.5

#### 3h. Replay Status

Initially:
```json
"replay": {
  "status": "not_run",
  "family_sample_size": 0,
  "holdout_sample_size": 0
}
```

After replay:
```json
"replay": {
  "status": "passed | failed | partial",
  "family_sample_size": 5,
  "holdout_sample_size": 2,
  "pass_rate": 0.8,
  "notes": "4/5 family members would have been prevented"
}
```

### 4. Update Family Index

After creating a genome, update `.evolution/failure_genomes/FAMILY_INDEX.json`:
- Add genome ID to the family's `genomes` array
- Increment `member_count`
- Recalculate `avg_utility`
- If new family: add new entry

### 5. Update XP

| Impact | XP |
|--------|-----|
| 1-2 | +3 |
| 3-4 | +5 |
| 5-6 | +8 |
| 7-8 | +13 |
| 9-10 | +21 |

### 6. Naming Convention

- Incidents: `INC-YYYYMMDD-NNN` (e.g., `INC-20260318-001`)
- Experience Units: `EU-YYYYMMDD-NNN`
- Failure Genomes: `FG-NNNNNN` (6-digit sequential, zero-padded)
- Next available genome ID: Check existing files to determine next number.
