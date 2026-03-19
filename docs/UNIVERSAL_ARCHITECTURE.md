# Universal Architecture

## Why this exists
Putting everything into `.agents/workflows/` forces the agent to parse too much through the wrong channel.
A stronger pattern is:
- short `AGENTS.md`,
- always-on rules,
- on-demand skills,
- canonical structured memory,
- explicit audit and export tooling,
- Failure Genome as a family-level self-evolution layer.

## Target shape
```text
AGENTS.md
README.md
docs/
  UNIVERSAL_ARCHITECTURE.md
  INSTALL_INTO_ANTIGRAVITY.md
  SAFE_MIGRATION_PLAYBOOK.md
  RESEARCH_FOUNDATIONS.md
  USER_FLOW_AUDIT_AND_SHARE.md
  FAILURE_GENOME_HYPOTHESIS_V1.md
  FAILURE_GENOME_EXPERIMENT_PLAN_V1.md
  OLD_TO_NEW_MAP.md
  ANTIGRAVITY_PROMPT_SEQUENCE.md
.agents/
  rules/
  workflows/
  skills/
.evolution/
  incidents/
  experience_units/
  failure_genomes/
  audits/
  manifests/
  exports/
schemas/
templates/
cli/
```

## Design principles

### 1. Short contract, deep docs
`AGENTS.md` stays short and points to deeper docs.

### 2. Canonical JSON, optional markdown views
Incidents, experience units, manifests, audits, and genomes live in JSON.
Markdown journals are rendered views.

### 3. Local value before sharing
Users should get a repo audit and hardening recommendations before they are ever asked to share anything.

### 4. Sharing by tiers
- `private`
- `manifest`
- `distilled`
- `research`

### 5. Preservation over destruction
When migrating a repo:
- keep old assets,
- move intent into the new structure,
- leave wrappers or renderers,
- delete only after the new flow is stable.

### 6. Replay-gated promotion
Do not promote a global patch because it worked once.
Promote it only when it survives replay on related failures or holdout checks.

## Closed loop
```text
change or failure
  -> verify
  -> incident event
  -> experience distillation
  -> optional Failure Genome
  -> optional rule/workflow/skill/verifier patch
  -> replay gate
  -> optional share pack
  -> later retrieval and prevention
```
