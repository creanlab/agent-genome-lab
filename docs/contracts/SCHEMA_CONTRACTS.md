# Schema Contracts — Genome Graph Agent OS

> All data exchanged between tools uses JSON Schema v7 contracts.

## Schema Index

### Runtime Schemas (`schemas/runtime/`)

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `query_task.schema.json` | Fast loop entry point | task_id, input, context, genome_package, constraints |
| `retrieval_bundle.schema.json` | Retrieval output with trust tiers | bundle_id, chunks[], graph_neighbors[] |
| `hypothesis.schema.json` | One candidate from multi-sampling | hypothesis_id, reasoning, proposed_action, genome_alignment |
| `ranked_decision.schema.json` | Ranking + execution plan | decision_id, ranking[], execution_plan, incident_candidate |

### Genome Schemas (`schemas/genome/`)

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `lesson_candidate.schema.json` | Unverified learning pre-replay | candidate_id, lesson_type, distilled, replay_gate_result |
| `memory_digest.schema.json` | Structured MEMORY.md | digest_id, sections, rendered_markdown, ttl_seconds |
| `replay_result.schema.json` | Full Γ(g) evaluation | gate_inputs, weights, gate_score, passed, decision |

### Core Schema

| Schema | Purpose | Key Fields |
|--------|---------|------------|
| `failure-genome.schema.json` | Failure/Success/Strategy genome | genome_id, kind, family, violated_invariant, repair_operator, adversarial_review |

## Validation

```bash
# Validate a genome file
nve-validate genome path/to/genome.json

# Validate all .evolution/ data
nve-self-check strict
```

## Contract Rules

1. **Backwards compatible** — new fields are additive only
2. **Breaking changes** — require major version bump (schema_version)
3. **Required fields** — cannot be removed in minor versions
4. **Enums** — new values can be added but existing values cannot be renamed
5. **$id** — all schemas use `https://creanlab.com/schemas/` namespace

## Migration Notes: v2 → v3

- Added `kind` field to failure-genome.schema.json (`failure|success|strategy`)
- Added `success_pattern` field for success/strategy genomes
- Added `adversarial_review` object (reviewer, verdict, critique, confidence)
- Added `applicability` object for context-aware genome matching
- genome_id pattern changed to `^(FG|SG|TG)-[0-9]{6}`
- 7 new schemas added (4 runtime, 3 genome)
