# SkillGraph upgrade plan

## Phase 1 — canonical registry scaffolding
Add:
- `.evolution/skills/`
- `.evolution/skill_packages/`
- `.evolution/skill_relations/`
- skill schemas and templates
- updated `nve-init`, `nve-audit`, and `nve-memory`

## Phase 2 — extraction
Add `cli/nve-skill-extract.js` to derive candidate skills from:
- promoted or replay-passed failure genomes,
- high-confidence experience units.

## Phase 3 — evaluation and dedupe
Add `cli/nve-skill-index.js` to:
- score Safety / Completeness / Executability / Maintainability / Cost-awareness,
- compute canonical hashes and semantic fingerprints,
- assign admitted / candidate / quarantined / rejected,
- write the relation graph.

## Phase 4 — packages and runtime publication
Add:
- `cli/nve-skill-package.js`
- `cli/nve-skill-search.js`

Packages should be built from admitted skills only and optionally published into `.agents/skills/`.

## Phase 5 — operating docs
Add:
- rule for admission and quarantine,
- workflow for capture and publication,
- two specialized runtime skills for curation and packaging.

## Day-to-day command sequence
```bash
node cli/nve-distill.js
node cli/nve-skill-extract.js
node cli/nve-skill-index.js
node cli/nve-skill-package.js --auto --publish
node cli/nve-memory.js
node cli/nve-audit.js
```

## Merge strategy
1. merge scaffolding,
2. merge extraction and indexing,
3. merge packages and runtime publication,
4. only then connect any dashboard or editor integration.
