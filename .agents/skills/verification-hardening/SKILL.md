---
name: verification-hardening
description: Bundle for done-means-verified discipline, regression checks, and contract-level proof.
tags: [contract, failure-genome, generated, quality, regression, replay, schema, skillgraph, testing, verification]
category: verification
metadata:
  source: agent-genome-lab
  version: 2.3.0
  package_id: PKG-verification-hardening
  skill_count: 1
  exported_at: 2026-03-23T10:03:49.115Z
---

# Verification Hardening

Bundle for done-means-verified discipline, regression checks, and contract-level proof.

## Purpose
This package bundles verified skills extracted from real operational experience.
Each skill has passed replay-gate verification and 5-axis evaluation.

## Activation
- Load metadata first; open full skill instructions only on match.
- Prefer admitted skills from this package before ad-hoc approaches.
- Keep the Failure Genome layer as the canonical root-cause memory.

## Included Skills (1)
### SK-000001: Prevent generated-diagram-labels-don-t-match-act [score: 0.9625]
Reusable prevention workflow for the failure family 'generated-diagram-labels-don-t-match-act', centered on invariant 'generated_diagram_labels_don_t_match_act' and repair operator 'fix-generated-diagram-labels-don-t-match-act'.
**When to use:** Use when current work resembles the 'generated-diagram-labels-don-t-match-act' failure family.; Use before marking a change as done when the repair touches production or a shared contract.

## Guardrails
- Do not auto-apply destructive changes without explicit approval.
- Do not replace replay-gated genomes with looser skill text.
- Verify on the real surface before calling the task done.
