---
name: repo-auditor
description: Audit repo structure, memory health, compatibility, and security
---

# Repo Auditor

> Performs structural audit of the Evolution Tamagotchi repository.

## When to Use

- At session start (lightweight check)
- After migration or structural change
- Periodically to check for drift

## Procedure

### 1. Structure Check
Verify these paths exist:
```
AGENTS.md
.agents/rules/*.md (7 files)
.agents/workflows/*.md (11 files)
.agents/skills/*/SKILL.md (5 skills)
.evolution/incidents/
.evolution/experience_units/
.evolution/failure_genomes/
docs/backlog_tama.md
docs/research.md
docs/POMDP_framework.md
schemas/failure-genome.schema.json
```

### 2. Memory Health
```
Count files in .evolution/incidents/
Count files in .evolution/experience_units/
Count files in .evolution/failure_genomes/
Check for orphans (EU without matching INC)
Check staleness (days since last incident)
```

### 3. Compatibility Check
```
Verify web/index.html exists (dashboard)
Verify TAMA_start/ exists (starter kit)
Verify 5 wrapper workflows exist
Verify web/vision.html or vision_legacy.html exists
```

### 4. Security Scan
```
grep for API key patterns in tracked files
Check .gitignore includes: .env, gcp-key.json
Check .evolution/exports/ for unredacted data
```

### Output

Save to `.evolution/audits/AUDIT-YYYYMMDD.json`
