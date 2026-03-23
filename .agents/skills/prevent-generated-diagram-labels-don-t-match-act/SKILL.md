---
name: prevent-generated-diagram-labels-don-t-match-act
description: Reusable prevention workflow for the failure family 'generated-diagram-labels-don-t-match-act', centered on invariant 'generated_diagram_labels_don_t_match_act' and repair operator 'fix-generated-diag
tags: [failure-genome, generated, quality, replay, skillgraph]
category: quality
metadata:
  source: agent-genome-lab
  version: 2.3.0
  skill_id: SK-000001
  status: admitted
  quality_score: 0.9625
  source_type: failure_genome
  exported_at: 2026-03-23T10:03:49.111Z
---

# Prevent generated-diagram-labels-don-t-match-act

Reusable prevention workflow for the failure family 'generated-diagram-labels-don-t-match-act', centered on invariant 'generated_diagram_labels_don_t_match_act' and repair operator 'fix-generated-diagram-labels-don-t-match-act'.

> ✅ **Verified by Agent Genome Lab** — Overall: 0.9625 | Safety: 0.85 | Completeness: 1 | Executability: 1

## When to Use
- Use when current work resembles the 'generated-diagram-labels-don-t-match-act' failure family.
- Use before marking a change as done when the repair touches production or a shared contract.

## When NOT to Use
- Do not use as a substitute for actual debugging when the failure pattern is unrelated.
- Do not auto-apply destructive changes without explicit approval.

## Triggers
- Signals of family: generated-diagram-labels-don-t-match-act
- Invariant at risk: generated_diagram_labels_don_t_match_act

## Inputs
- Current task summary
- Relevant diff / changed files
- Verification target (environment, contract, or test surface)

## Steps
### 1. Inspect family signals
Check whether the current task matches the 'generated-diagram-labels-don-t-match-act' pattern and restate the invariant 'generated_diagram_labels_don_t_match_act'.
**Expected output:** Clear yes/no match plus invariant statement.
**Risk:** low

### 2. Apply repair operator
Apply or adapt the repair operator 'fix-generated-diagram-labels-don-t-match-act' to the current context rather than copying a prior fix blindly.
**Expected output:** Targeted remediation plan tied to the current code path.
**Risk:** medium

### 3. Verify on the real surface
Run the smallest trustworthy verification on the real target surface (production-like env, actual schema path, or real contract boundary).
**Expected output:** Verification evidence tied to the touched surface.
**Risk:** medium

### 4. Holdout regression check
Check at least one adjacent family or holdout surface to reduce negative transfer and regression risk.
**Expected output:** Regression note or holdout pass result.
**Risk:** medium

## Success Signals
- Invariant 'generated_diagram_labels_don_t_match_act' is explicitly verified.
- Real target surface passes after the repair.
- No obvious holdout regression is introduced.

## Failure Modes
- Repair copied from the old incident without adapting to the new context.
- Verification performed only on a fake or incomplete surface.
- Regression introduced in an adjacent contract or family.

## Safety Notes
- Require explicit approval for destructive commands, auth changes, or billing-impacting actions.
- Preserve backward compatibility and wrappers until stability is proven.

## Cost Notes
- Prefer the smallest real verification that still proves the invariant.
- Avoid loading large context windows when a focused replay or diff is enough.

## Maintainability Notes
- Keep the skill tied to the originating genome for lineage and future replay review.
- Split the skill if multiple unrelated invariants accumulate.

## Source
- **Source type**: failure_genome
- **genome_id**: FG-000001
- **incident_id**: INC-000001
- **Extracted by**: Agent Genome Lab v2.3.0
- **Verification**: Replay-gated admission, 5-axis evaluation
