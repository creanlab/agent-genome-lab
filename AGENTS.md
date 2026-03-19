# AGENTS.md

This repository uses the **NVE Universal Failure Genome superstructure**.

## Read first
Before changing architecture, memory, workflows, sharing, or Failure Genome behavior, read:
- `README.md`
- `docs/UNIVERSAL_ARCHITECTURE.md`
- `docs/INSTALL_INTO_ANTIGRAVITY.md`
- `docs/SAFE_MIGRATION_PLAYBOOK.md`
- `docs/RESEARCH_FOUNDATIONS.md`
- `docs/USER_FLOW_AUDIT_AND_SHARE.md`
- `docs/FAILURE_GENOME_HYPOTHESIS_V1.md`
- `docs/FAILURE_GENOME_EXPERIMENT_PLAN_V1.md`
- `docs/OLD_TO_NEW_MAP.md`
- `docs/ANTIGRAVITY_PROMPT_SEQUENCE.md`

## Operating contract
1. Do not delete valuable existing assets without explicit approval.
2. Use docs as the system of record. This file is only a table of contents.
3. Keep canonical memory structured in `.evolution/`.
4. Prefer small verifiable changes over sweeping rewrites.
5. For each significant failure or prevention event, create an incident event.
6. For repeated or high-value failures, create or update a Failure Genome.
7. Only ask the user when the action is destructive, security-sensitive, or schema-breaking.
8. Never share raw code, secrets, or full logs by default.
9. Legacy paths may remain as wrappers until migration is stable.

## Canonical homes
- `.agents/rules/` — always-on constraints
- `.agents/workflows/` — repeatable routines
- `.agents/skills/` — reusable specialized knowledge
- `.evolution/incidents/` — canonical incident events
- `.evolution/experience_units/` — distilled reusable knowledge
- `.evolution/failure_genomes/` — family-level learning units
- `.evolution/audits/` — local audit outputs
- `.evolution/manifests/` — repo manifests
- `.evolution/exports/` — shareable research packs

## Done criteria
Architecture work is done only when:
- docs are updated,
- the structure exists,
- schemas match payloads,
- legacy value remains discoverable,
- and a future agent can understand the repo quickly.
