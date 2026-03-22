# AGENTS.md

This repository uses the **NVE Universal Failure Genome + SkillGraph superstructure** (v2.3.0).

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
- `docs/SKILLGRAPH_UPGRADE_ARCHITECTURE.md`
- `docs/SKILLGRAPH_OPERATING_GUIDE.md`
- `docs/SKILLNET_GAP_MAP.md`

## Operating contract
1. Do not delete valuable existing assets without explicit approval.
2. Use docs as the system of record. This file is only a table of contents.
3. Keep canonical memory structured in `.evolution/`.
4. Prefer small verifiable changes over sweeping rewrites.
5. **Read `.evolution/MEMORY.md` at session start** — it contains verified lessons and anti-patterns.
6. For each significant failure or prevention event, create an incident event **immediately** (see `.agents/rules/25-incident-auto-capture.md` for trigger events).
7. For repeated or high-value failures, create or update a Failure Genome.
8. Only ask the user when the action is destructive, security-sensitive, or schema-breaking.
9. Never share raw code, secrets, or full logs by default.
10. Legacy paths may remain as wrappers until migration is stable.
11. **Before every commit**: check "were there uncaptured incidents since last commit?"
12. **Skill layer**: follow `.agents/rules/35-skill-admission-and-quarantine.md` for skill governance.
13. **Metadata-first**: search skill INDEX before loading full skill content (see `.agents/workflows/35-skill-capture-and-admission.md`).

## Canonical homes
- `.agents/rules/` — always-on constraints
- `.agents/workflows/` — repeatable routines
- `.agents/skills/` — reusable specialized knowledge
- `.evolution/incidents/` — canonical incident events
- `.evolution/experience_units/` — distilled reusable knowledge
- `.evolution/failure_genomes/` — family-level learning units
- `.evolution/skills/` — canonical skill registry (candidate/admitted/quarantined/rejected)
- `.evolution/skill_packages/` — task-oriented skill bundles
- `.evolution/skill_relations/` — semantic and dependency graph
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
