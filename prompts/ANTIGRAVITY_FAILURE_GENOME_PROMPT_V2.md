# Antigravity Prompt — Install Failure Genome Layer v2

Assume the structural migration is already complete.

## Read first
Read these files from `_migration_inputs/NVE_universal_failure_genome_v2/`:
- `docs/FAILURE_GENOME_HYPOTHESIS_V1.md`
- `docs/FAILURE_GENOME_EXPERIMENT_PLAN_V1.md`
- `schemas/failure-genome.schema.json`
- `.agents/rules/20-evolution-memory-policy.md`
- `.agents/rules/60-failure-genome-promotion.md`
- `.agents/workflows/20-incident-capture.md`
- `.agents/workflows/50-failure-genome-review.md`
- `.agents/skills/failure-genome-lab/SKILL.md`

## Goal
Add Failure Genome as a stable, family-level memory layer on top of canonical incidents.

## Required changes
1. Ensure `.evolution/failure_genomes/` exists.
2. Update incident capture so repeated or high-value failures can emit a Failure Genome.
3. Make the repo able to summarize genomes with `node cli/nve-fg-summary.js`.
4. Ensure patch proposals are separated into:
   - `rule_patch`
   - `workflow_patch`
   - `skill_patch`
   - `verifier_patch`
   - `doc_patch`
5. Ensure a patch is not promoted unless replay evidence is recorded.

## Safety constraints
- Do not expose secrets.
- Do not upload raw code into the research pool by default.
- Do not auto-promote global prompt mutations without replay.
- Do not destabilize the current working system.

## Deliverable summary
At the end, provide:
1. files added,
2. files updated,
3. replay-gate logic,
4. how to test locally.
