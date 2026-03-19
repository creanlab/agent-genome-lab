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

## Quick Reference

After EVERY significant fix or error:
```
1. CLASSIFY → Regression / Gap / Process / Near-miss
2. CREATE incident → .evolution/incidents/INC-YYYYMMDD-NNN.json
3. DISTIL experience unit → .evolution/experience_units/
4. IF Impact ≥ 7 → DISTIL failure genome → .evolution/failure_genomes/
5. UPDATE rendered journal (optional, for visualizer)
6. PROPOSE patch (rule / workflow / skill / doc)
```

## Known Recurring Patterns (examples)

| Pattern | Root Cause | Prevention |
|---------|-----------|------------|
| Shell syntax mismatch | bash-style `&&` used in PowerShell | Use `;` in PowerShell, `&&` in bash |
| Tasks falsely marked done | No e2e verification | DOD = works on production |
| Environment variable whitespace | `\r\n` in keys | `.trim()` / `.strip()` env vars |
| Encoding issues | UTF-8 BOM mismatches | Check encoding, use fallback reader |

## Full Flow → `.agents/workflows/20-incident-capture.md`
## Memory Policy → `.agents/rules/20-evolution-memory-policy.md`
