# Antigravity Prompt — Install Universal Failure Genome Superstructure v2

Assume preflight is complete and the plan is approved.

## Read first
Read these files from `_migration_inputs/NVE_universal_failure_genome_v2/`:
- `README.md`
- `AGENTS.md`
- `docs/UNIVERSAL_ARCHITECTURE.md`
- `docs/INSTALL_INTO_ANTIGRAVITY.md`
- `docs/SAFE_MIGRATION_PLAYBOOK.md`
- `docs/RESEARCH_FOUNDATIONS.md`
- `docs/USER_FLOW_AUDIT_AND_SHARE.md`
- `docs/OLD_TO_NEW_MAP.md`
- `docs/FAILURE_GENOME_HYPOTHESIS_V1.md`
- `docs/FAILURE_GENOME_EXPERIMENT_PLAN_V1.md`
- `schemas/incident-event.schema.json`
- `schemas/experience-unit.schema.json`
- `schemas/repo-manifest.schema.json`
- `schemas/audit-report.schema.json`
- `schemas/share-batch.schema.json`
- `schemas/failure-genome.schema.json`

## Mission
Install the universal superstructure into the current repo without destroying existing value.

## Hard constraints
1. Do not delete valuable files without explicit approval.
2. Keep legacy workflow paths if they already exist, but convert them into wrappers where appropriate.
3. Canonical memory must live in `.evolution/`.
4. Use docs as the system of record.
5. Prefer small verifiable edits.
6. Ask only for destructive, security-sensitive, or schema-breaking choices.
7. If the repo already has `.agents/workflows/anti-fallback-rules.md`, `auto-evolution.md`, `cloud-run-deploy.md`, `code-review.md`, or `task-tracking.md`, preserve their intent and names where helpful.

## What to create
Create if missing:
- `AGENTS.md`
- `.agents/rules/`
- `.agents/workflows/`
- `.agents/skills/`
- `.evolution/incidents/`
- `.evolution/experience_units/`
- `.evolution/failure_genomes/`
- `.evolution/audits/`
- `.evolution/manifests/`
- `.evolution/exports/`
- `schemas/`
- `templates/`
- `cli/`
- `docs/legacy/`
- `docs/exec-plans/active/`
- `docs/exec-plans/completed/`

## What to install from the pack
Install or merge:
- the rule files,
- the workflow files,
- the skill folders,
- the schema files,
- the template files,
- the CLI utilities,
- the architecture and install docs.

## Execution protocol
1. Create archived or copied legacy versions before rewriting old workflow files.
2. Move persistent policy into `.agents/rules/`.
3. Keep old workflow entrypoints as wrappers when the repo already depends on them.
4. Install canonical memory under `.evolution/`.
5. Install the docs and scripts.
6. Run:
   - `node cli/nve-manifest.js`
   - `node cli/nve-audit.js`
7. Summarize what changed, what stayed compatible, and what still needs manual review.
8. Leave full validation for the post-migration validation prompt after Failure Genome installation.

## Success criteria
The migration is successful only if:
- legacy value is preserved,
- rules/workflows/skills are split cleanly,
- `.evolution/` exists as canonical memory,
- the repo can generate a manifest, audit, validation report, and share pack,
- future agents can understand the structure quickly.
