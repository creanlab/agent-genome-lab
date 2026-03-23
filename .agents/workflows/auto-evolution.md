---
description: Auto-evolution protocol — COMPATIBILITY WRAPPER → V4 incident capture + rules
---

# Auto-Evolution Protocol

> **V4**: This file is a compatibility wrapper.
> The old monolithic protocol has been split into:
> - `.agents/rules/20-evolution-memory-policy.md` — persistent memory rules
> - `.agents/workflows/20-incident-capture.md` — incident capture procedure
> - `.agents/skills/incident-distiller/SKILL.md` — extraction logic
> - `.evolution/` — canonical memory storage
>
> This file exists so old references still resolve.

## Quick Reference (RULE 8 equivalent)

After EVERY significant fix or error:
```
1. CLASSIFY → Regression / Gap / Process / Near-miss
2. CREATE incident → .evolution/incidents/INC-YYYYMMDD-NNN.json
3. DISTIL experience unit → .evolution/experience_units/
4. IF Impact ≥ 7 → DISTIL failure genome → .evolution/failure_genomes/
5. UPDATE rendered journal (optional, for visualizer)
6. PROPOSE patch (rule / workflow / skill / doc)
```

## Known Recurring Issues (preserved from legacy)

| Pattern | Root Cause | Prevention |
|---------|-----------|------------|
| PowerShell `&&` chaining | bash-style in PS | Use `;` in PowerShell |
| Tasks falsely marked done | No e2e verification | DOD = works on PRODUCTION |
| Cloud Run ephemeral FS | Disk state lost | Persist to Supabase |
| Secret Manager whitespace | `\r\n` in keys | `.strip()` env vars |
| gcloud.ps1 execution policy | PS blocks unsigned | `cmd /c "gcloud ..."` |
| ripgrep encoding | UTF-8 BOM issues | `Select-String` fallback |
| Gemini model name mismatch | Suffixes change | Verify against API docs |

## Full Flow → `.agents/workflows/20-incident-capture.md`
## Memory Policy → `.agents/rules/20-evolution-memory-policy.md`
## Legacy backup → `docs/legacy/workflows/auto-evolution.legacy.md`
