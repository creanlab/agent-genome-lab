# Workflow 35 — Skill capture and admission

## Goal
Turn repeated, grounded lessons into reusable skills without weakening the Failure Genome loop.

## Sequence
1. Capture incidents as usual.
2. Distill experience units and failure genomes as usual.
3. Run `node cli/nve-skill-extract.js` to create candidate skills from promoted or replay-passed genomes and high-confidence experience units.
4. Run `node cli/nve-skill-index.js` to evaluate, deduplicate, categorize, and connect skills.
5. Review `quarantined` skills before admitting them.
6. Run `node cli/nve-skill-package.js --auto --publish` to produce task-oriented packages and publish concise runtime skills under `.agents/skills/`.
7. Regenerate `MEMORY.md` and the audit after changes.

## Outputs
- `.evolution/skills/*.json`
- `.evolution/skills/INDEX.json`
- `.evolution/skill_relations/RELATIONS.json`
- `.evolution/skill_packages/*.json`
- `.agents/skills/<package>/SKILL.md`

## Guardrails
- Keep lineage to incidents, experience units, or genomes.
- Do not auto-admit everything extracted.
- Preserve backward compatibility and wrapper paths until stability is proven.
- Use metadata-first retrieval: search the INDEX first, then open the full skill only when it matches.

## What `--publish` does
When `nve-skill-package.js --publish` is used, each package generates a concise `SKILL.md`
under `.agents/skills/<package>/SKILL.md`. This file is the runtime surface for the model.
It contains purpose, activation guidance, included skills, guardrails, and a suggested flow.
The canonical data stays in `.evolution/skill_packages/`.
