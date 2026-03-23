# 🧬 Backlog Legacy — Completed Tasks Archive

> All 109 completed tasks from phases 1–G.

---

## Phases 1–8, V4, A (82 tasks) ✅

Core platform: AGENTS.md, rules/workflows/skills structure, CLI tools (audit, validate, manifest, pack, fg-summary), backend (12 API endpoints, Supabase), dashboard (3000+ lines), multi-user support, XP system, community features, and V4 structural migration.

## Phase B: Auto Distillation (4/4) ✅

| # | Task | Description |
|---|------|-------------|
| B.1 | incident → genome trigger | `nve-distill.js` — auto-classify incidents (10 families) → FG JSON |
| B.2 | auto-evolution.md V2 | Workflow 20-incident-capture.md — Steps 1-7 |
| B.3 | FAMILY_INDEX auto-update | nve-distill.js auto-updates FAMILY_INDEX.json |
| B.4 | Utility scoring | `nve-utility.js` — reuse*0.3 + prevent*0.5 - neg*0.8 + decay |

## Phase C: Replay Gate Automation (4/4) ✅

| # | Task | Description |
|---|------|-------------|
| C.1 | CLI: nve-replay.js | 6-step gate: incident fixed → family → pass rate → holdout → promote/reject |
| C.2 | Promotion workflow | `.agents/workflows/50-failure-genome-review.md` — 6 steps + rollback |
| C.3 | Patch generation | replay=passed → proposed_patch_types → rule/workflow/skill/verifier/doc |
| C.4 | Regression detection | Holdout check on 2 unrelated genomes |

## Phase D: Dashboard V2 (5/5) ✅

| # | Task | Description |
|---|------|-------------|
| D.1 | Ingest .evolution/ JSON | Tab "📦 JSON Pack": drag & drop nve-pack + individual FG/INC/EXP |
| D.2 | Audit Panel | 5-axis widget with animated bars + overall score |
| D.3 | Replay Gate Viz | Timeline: promoted ✅ / rejected ❌ / pending ⏳ |
| D.4 | Manifest Panel | Repo manifest: stack tags, counts, badges |
| D.5 | JSON-native parser | handleJsonPackFiles() — FG, INC, EU JSON → dashboard data |

## Phase E: Distribution (4/4) ✅

| # | Task | Description |
|---|------|-------------|
| E.1 | npm package | package.json — 12 bin commands, schemas, templates |
| E.2 | Init wizard | `nve-init.js` — creates .evolution/, copies schemas/CLI, runs audit |
| E.3 | VS Code extension | 4 sidebar panels, 5 commands, file watcher |
| E.4 | GitHub Action | nve-audit.yml — validate + audit + replay on PR |

## Phase F: Community Intelligence (4/5) 🟡

| # | Task | Description |
|---|------|-------------|
| F.1 | 3+ pilot projects | 🟡 EXTERNAL — Need real users |
| F.2 | Cross-repo genome transfer | ✅ /api/pack + /api/community/genomes |
| F.3 | Genome similarity engine | ✅ /api/community/similar |
| F.4 | Community leaderboard | ✅ /api/community/leaderboard |
| F.5 | Suggested patches | ✅ /api/community/suggestions |

## Phase G: EvoCore Integration (6/6) ✅

| # | Task | Description |
|---|------|-------------|
| G.1 | nve-scaffold.js | Scaffold CLI for incident/EU/FG with auto-ID, timestamp |
| G.2 | nve-memory.js | MEMORY.md generator — top-K promoted genomes, anti-patterns |
| G.3 | config.toml | `.evolution/config.toml` + `cli/nve-config.js` shared reader |
| G.4 | Offline dashboard | `nve-export-dashboard.js` → `web/data.js`. file:// mode |
| G.5 | i18n 4 languages | Dashboard: EN/RU/DE/JP with auto-detect |
| G.6 | TAMA_start sync | v2.2.0 with 12 bin commands, 63 files |

## Phase H: SkillGraph Core (8/8) ✅

| # | Task | Description |
|---|------|-------------|
| H.1 | SKILL.md + schema | Markdown + YAML schema, JSON spec |
| H.2 | nve-skill-extract.js | Promoted genomes, EUs → candidate skills |
| H.3 | nve-skill-index.js | 5-axis eval, deduplication, admission |
| H.4 | SkillGraph relations | RELATIONS.json (runtime_requires, subsumes, etc.) |
| H.5 | nve-skill-package.js | Packages → runtime SKILL.md bundles |
| H.6 | Extension Panels | Skills & Packages sidebars in VS Code |
| H.7 | Audit Update | SkillGraph as extension score in `nve-audit` |

## Phase J: Narrative & Presentation (4/7) 🟡

| # | Task | Description |
|---|------|-------------|
| J.1 | Migration Playbook | SAFE_MIGRATION_PLAYBOOK.md |
| J.2 | Overview Presentations | AGENT_GENOME_LAB_Overview.html + Full_RU |
| J.3 | Open-Source Repo | Init `agent-genome-lab` + sync 80 files |
| J.5 | GitHub Actions | `nve-audit.yml` runs on PR/push |

## Phase K: Skills Ecosystem (9/12) 🟡

| # | Task | Description |
|---|------|-------------|
| K.1 | Web SkillGraph Tab | (Merged with I.1) Web Dashboard visual integration |
| K.2 | nve-skill-export | Export to CC-1C/skills.sh format |
| K.3 | Enhanced nve-skill-search | Fuzzy + Jaccard matcher + Colored Output |
| K.4 | Audit skill cards | Top-5 skills in `nve-audit` |
| K.5 | nve-skill-import | Import skills from GitHub / local config |
| K.6 | Security import audit | Built into `nve-skill-import` via safety eval |
| K.7 | Domain packs | 15 templates across 5 domains |
| K.8 | Usage tracking | Feed utility decay from search |

