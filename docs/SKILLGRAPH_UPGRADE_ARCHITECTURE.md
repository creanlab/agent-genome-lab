# SkillGraph upgrade architecture

## Principle
Add the skill layer beside the Failure Genome layer, not inside it and not instead of it.

## Canonical flow
```text
Incidents
  -> Experience Units
  -> Failure Genomes
      -> nve-skill-extract
          -> Candidate Skills
              -> nve-skill-index
                  -> Admitted / Candidate / Quarantined / Rejected
                  -> Skill Relations
                  -> Skill Packages
                      -> publish to .agents/skills/<package>/SKILL.md
```

## Directory layout
```text
.evolution/
  incidents/
  experience_units/
  failure_genomes/
  skills/
  skill_packages/
  skill_relations/
  audits/
  manifests/
  exports/
.agents/
  rules/
  workflows/
  skills/
```

## Layer responsibilities
- `incidents/`: concrete events
- `experience_units/`: distilled lessons
- `failure_genomes/`: family-level verified prevention memory
- `skills/`: reusable execution patterns derived from memory
- `skill_relations/`: semantic and dependency graph
- `skill_packages/`: task-oriented bundles for runtime activation
- `.agents/skills/`: published runtime view for the model

## Retrieval model
1. search metadata,
2. select the smallest relevant skill or package,
3. open full instructions only on match,
4. execute with a real verification step,
5. capture new evidence if behavior changes.
