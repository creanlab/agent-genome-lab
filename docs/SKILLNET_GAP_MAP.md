# SkillNet gap map for agent-genome-lab

> Based on: *SkillNet: Learning to Navigate and Utilize Reusable Skills* (arxiv.org/abs/2603.04448).
> This is an adaptation to our Failure Genome architecture, not a literal port.

## What SkillNet adds
SkillNet contributes three ideas that are directly useful here:
1. a formal skill creation pipeline,
2. multi-axis skill evaluation,
3. a three-layer ontology: taxonomy, relation graph, package library.

## What agent-genome-lab already has
This repo already has the strongest prerequisite layer:
- incident capture,
- experience distillation,
- Failure Genomes,
- replay-gated promotion,
- compact memory generation,
- and local audit/export flows.

## Gap map
| SkillNet idea | Current repo surface | Recommended implementation |
|---|---|---|
| Skill creation from heterogeneous experience | incidents, experience units, failure genomes | `cli/nve-skill-extract.js` writes candidate skills into `.evolution/skills/` |
| Skill evaluation on 5 dimensions | replay gate exists for genomes, not skills | `cli/nve-skill-index.js` assigns admitted/candidate/quarantined/rejected |
| Taxonomy / metadata | `.agents/skills/` exists but is not canonical skill memory | add `category`, `tags`, triggers, usage boundaries to skill JSON |
| Relation graph | no canonical skill relation file | add `.evolution/skill_relations/RELATIONS.json` |
| Package library | runtime skills exist but no generated packages | add `.evolution/skill_packages/` + publish to `.agents/skills/<package>/SKILL.md` |
| Metadata-first activation | current repo relies on docs + memory | add search and package selection before loading full skill text |

## What should not be copied literally
- Do not replace Failure Genomes with skills.
- Do not make `.agents/skills/` the canonical storage layer.
- Do not auto-admit every extracted skill.
- Do not dump the whole skill registry into prompt context.

## Core recommendation
Treat Failure Genomes as verified root-cause memory and treat skills as reusable execution wrappers derived from that memory.
