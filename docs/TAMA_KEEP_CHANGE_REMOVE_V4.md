# TAMA Keep / Change / Remove V4

> Maintenance guidance: what to keep, what to evolve, what to deprecate.

## ✅ KEEP (do not touch without explicit task)

| Item | Reason |
|------|--------|
| `web/index.html` | Working dashboard, many users |
| `docs/research.md` | Academic foundation (10 papers) |
| `docs/POMDP_framework.md` | Formal framework |
| `docs/backlog_tama.md` | Active roadmap |
| `TAMA_start/` (all files) | Legacy starter kit |
| `server.js` | Working Gemini proxy |
| `package.json` | Dependencies |
| `Dockerfile` | Working container |
| `cloudbuild.yaml` | Working deploy pipeline |
| Old journal format (STATUS_JSON, EVO_JSON) | Visualizer compatibility |

## 🔄 CHANGE (evolving actively)

| Item | Current → Target |
|------|------------------|
| `.agents/workflows/*.md` | Monolithic → wrappers + new workflows |
| `auto-evolution.md` | RULE 1-8 → rules/ + incident-capture + skills |
| Memory storage | Markdown journal → `.evolution/` canonical JSON |
| Sharing | None → research-pool pipeline |
| Incident capture | Manual → structured + genome distillation |
| Patch promotion | Immediate → replay-gated |

## ❌ REMOVE (after migration stabilizes)

| Item | When | Why |
|------|------|-----|
| Duplicate rules in old workflows | After V4 proven | Rules are in `.agents/rules/` now |
| `gcp-key.json` as auth method | When `gcloud auth` works | Security risk |
| Hardcoded demo data in index.html | When Supabase has real data | Temporary |

## ⏸ DEFER (not now)

| Item | When |
|------|------|
| TAMA-5.5 Adaptive XP | Phase 7 — needs ML data |
| Competition mode | After research pool validated |
| Full Supabase community tables | After local-first pipeline works |
