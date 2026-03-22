# Prompt 05 — Install SkillGraph into agent-genome-lab

You are editing `agent-genome-lab`.

## Hard constraints
1. Preserve the current Failure Genome loop and replay gate.
2. Keep changes additive-first and backward compatible.
3. Do not remove or rename existing CLI commands.
4. Keep `.evolution/skills/` as canonical skill storage and `.agents/skills/` as published runtime output.
5. Do not auto-admit new skills.
6. Do not dump the entire registry into prompt context.

## Goals
1. Add the canonical skill registry scaffolding.
2. Add extraction from promoted/replay-passed genomes and high-confidence experience units.
3. Add evaluation, dedupe, and a relation graph.
4. Add package generation and publish concise runtime skills.
5. Update memory and audit outputs.

## Required outputs
- updated `package.json`
- updated `cli/nve-init.js`
- updated `cli/nve-audit.js`
- updated `cli/nve-memory.js`
- new skill CLI files
- new schemas and templates
- new `.agents/` docs and skills
- new upgrade docs

## Validation sequence
```bash
node cli/nve-init.js --yes
node cli/nve-skill-extract.js
node cli/nve-skill-index.js
node cli/nve-skill-package.js --auto --publish
node cli/nve-memory.js
node cli/nve-audit.js
node cli/nve-skill-search.js "verification before done"
```
