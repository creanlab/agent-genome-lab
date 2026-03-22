# Skill Curator

## Purpose
Evaluate candidate skills for safety, completeness, executability, maintainability, cost-awareness, and duplicate risk.

## Use when
- a new skill was extracted,
- a skill looks too broad or too vague,
- a duplicate might exist,
- or a quarantined skill needs review.

## Inputs
- candidate skill JSON,
- related experience units and failure genomes,
- nearby admitted skills,
- real verification surface for the target task.

## Procedure
1. Confirm lineage and source evidence.
2. Check whether the skill has a narrow, reusable scope.
3. Ensure there is at least one concrete verification step.
4. Compare against admitted skills for exact or near duplicates.
5. Decide: admit, keep candidate, quarantine, or reject.
6. Update the relation graph when semantic overlap is strong.

## Guardrails
- Prefer quarantine over optimistic admission.
- Never admit a skill that hides destructive actions without explicit approval language.
- Never let the skill layer replace the replay gate.
