---
description: Repo audit — structural review for consistency and missing guardrails
---

# 30 — Repo Audit

> Run periodically or when repo structure may have drifted.

## What to Check

### 1. Structure Integrity
- [ ] `AGENTS.md` exists and is current
- [ ] `.agents/rules/` has all numbered rules
- [ ] `.agents/workflows/` has all expected workflows
- [ ] `.agents/skills/` has all expected skills
- [ ] `.evolution/` directories exist
- [ ] `schemas/` has all required schemas

### 2. Memory Health
- [ ] Recent incidents in `.evolution/incidents/` (< 7 days old)
- [ ] Experience units match incidents
- [ ] Failure genomes exist for high-impact incidents
- [ ] No orphaned files

### 3. Compatibility
- [ ] Old workflow paths still resolve (5 wrappers)
- [ ] `web/index.html` can parse demo data
- [ ] `TAMA_start/` is functional
- [ ] `docs/research.md` and `docs/POMDP_framework.md` present

### 4. Security
- [ ] No secrets in tracked files
- [ ] `gcp-key.json` in `.gitignore`
- [ ] `.env` not committed
- [ ] Export packs are redacted

## Output

Save audit to `.evolution/audits/AUDIT-YYYYMMDD.json`:
```json
{
  "audit_date": "2026-03-18",
  "structure_ok": true,
  "memory_health": { "incidents": 14, "experience_units": 14, "genomes": 5 },
  "compatibility_ok": true,
  "security_ok": true,
  "issues_found": []
}
```

> See: `.agents/skills/repo-auditor/SKILL.md`
