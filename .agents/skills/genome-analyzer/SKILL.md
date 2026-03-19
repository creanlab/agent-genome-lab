---
name: genome-analyzer
description: Cluster genomes into families, retrieve by similarity+utility, run replay, propose patches
---

# Genome Analyzer

> Family-level analysis, retrieval, replay, and patch proposal for Failure Genomes.

## When to Use

1. After creating a new genome → cluster it into a family
2. After fixing a bug → retrieve similar genomes to check for patterns
3. Before promoting a patch → run replay on family members
4. Periodically → generate health report

## Capabilities

### 1. Family Clustering

**Input**: A new genome file (FG-NNNNNN.json)
**Process**:
1. Read `FAMILY_INDEX.json` for existing families
2. For each family, compute match score:
   ```
   match_score = 0
   + 3 if same failure_family
   + 2 if same violated_invariant
   + 1 per overlapping stack_tag
   + 1 per overlapping surface_tag
   + 2 if repair_operator in same neighborhood
   ```
3. If best match_score ≥ 5 → assign to that family
4. If best match_score < 5 → create new family

**Output**: Updated `FAMILY_INDEX.json`

### 2. Similarity + Utility Retrieval

**Input**: Current incident context (stack tags, surface, failure type)
**Process**:
1. Filter genomes by overlapping context fingerprint
2. Score each by: `relevance_score = similarity * 0.4 + utility_score * 0.6`
3. Sort descending
4. Return top 5

**Why utility matters**:
Semantic similarity alone returns "looks similar" genomes.
Utility-weighted retrieval returns "similar AND useful" genomes.
A genome with utility 0.9 that matches 3 tags beats a genome with utility 0.2 that matches 5 tags.

### 3. Replay Before Promotion

**Input**: Proposed patch + genome + family members
**Process**:

```
FOR EACH family member genome:
  1. Read the incident that caused it
  2. Mentally simulate: would the proposed patch have caught this?
  3. Score: PASS (would have prevented) or FAIL (would not have helped)

FOR 1-2 holdout genomes (different family):
  1. Check: does the patch obviously break this scenario?
  2. Score: SAFE (no regression) or REGRESS (patch causes harm)

COMPUTE:
  family_pass_rate = pass_count / family_total
  holdout_safe = all holdouts are SAFE

DECISION:
  IF family_pass_rate >= 0.6 AND holdout_safe → PROMOTE
  IF family_pass_rate >= 0.6 AND NOT holdout_safe → REVIEW (manual)
  IF family_pass_rate < 0.6 → REJECT or REFINE
```

**Output**: Updated genome `replay` field + `promotion_decision`

### 4. Patch Type Recommendation

Based on the failure genome, recommend which patch type is most effective:

| Family Pattern | Recommended Patch |
|---------------|-------------------|
| Invariant violation (rule was clear) | `verifier_patch` — add check |
| Missing knowledge (no rule existed) | `rule_patch` — add rule |
| Process gap (steps were skipped) | `workflow_patch` — add step |
| Capability gap (can't do X) | `skill_patch` — add capability |
| Stale documentation | `doc_patch` — update docs |

### 5. Health Report Generation

Run `cli/tama-genome-report.js` to generate:

```json
{
  "report_date": "2026-03-18",
  "total_genomes": 7,
  "total_families": 7,
  "families_by_count": [
    { "family": "verification-skipped-before-done", "count": 1, "avg_utility": 0.9 }
  ],
  "repair_operators_by_reuse": [
    { "operator": "add-production-verification-step", "reuse_count": 5 }
  ],
  "patch_types_by_win_rate": [
    { "type": "rule_patch", "promoted": 6, "rejected": 0, "win_rate": 1.0 }
  ],
  "stale_genomes": [],
  "low_utility_genomes": [],
  "transferred_genomes": {
    "successful": 0,
    "failed": 0
  }
}
```

## Utility Decay Formula

```
After 30 days without use: score *= 0.9
After 90 days without use: score *= 0.7
After each reuse:          score *= 1.1 (cap 1.0)
After prevention:          score *= 1.2 (cap 1.0)
After negative transfer:   score *= 0.5
```

## Anti-Patterns for Genome Analysis

1. **Over-clustering**: Different failures merged into one family → keep families narrow
2. **Under-clustering**: One family fragmented into tiny buckets → merge if same invariant
3. **Utility lock-in**: Old genomes dominate → apply decay
4. **Negative transfer**: Imported genome harms local repo → track and penalize
5. **Replay poverty**: Not enough family members → promote with caveat "replay: not_run"
