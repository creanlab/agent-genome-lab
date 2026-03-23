# 🧬 Agent Genome Lab — Backlog

> **Product**: Agent Genome Lab (formerly NVE Failure Genome Pack v2)
> **Repo**: evolution-tamagotchi (monorepo: pack + dashboard + backend)
> **Open-Source**: https://github.com/creanlab/agent-genome-lab
> **Updated**: 2026-03-23 15:07 MSK

---

## 📊 Project Status

- **Version**: ✅ v2.3.0 (SkillGraph layer installed)
- **Audit Score**: ✅ 100% on all 5 axes + SkillGraph extension
- **Backend**: ✅ 12 REST endpoints + Supabase
- **Dashboard**: ✅ 3000+ lines, 4 languages (EN/RU/DE/JP)
- **Starter Kit**: ✅ 85 files in TAMA_start/ (v2.3.0)
- **CLI Tools**: ✅ 16 bin commands (incl. 4 SkillGraph)
- **Deployed**: ✅ Cloud Run → https://tama-frontend-819335696518.europe-west1.run.app
- **VS Code Extension**: ✅ v0.2.0 — 6 panels, 9 commands, file watcher
- **Open-Source**: ✅ https://github.com/creanlab/agent-genome-lab
- **npm**: ✅ `npx agent-genome-lab` ready
- **CI/CD**: ✅ 2 GitHub Actions

---

## 📊 Completion Statistics

| Phase | Tasks | Done | Status |
|-------|-------|------|--------|
| **Phases 1–8, V4, A** | 82 | 82 | ✅ DONE |
| **Phase B: Auto Distillation** | 4 | 4 | ✅ DONE |
| **Phase C: Replay Automation** | 4 | 4 | ✅ DONE |
| **Phase D: Dashboard V2** | 5 | 5 | ✅ DONE |
| **Phase E: Distribution** | 4 | 4 | ✅ DONE |
| **Phase F: Community** | 5 | 4 | 🟡 F.1 = external |
| **Phase G: EvoCore Integration** | 6 | 6 | ✅ DONE |
| **Phase H: SkillGraph Core** | 8 | 8 | ✅ DONE |
| **Phase J: Narrative & Presentation** | 7 | 4 | 🟡 J.1-J.3, J.5 DONE |
| **Phase K: Skills Ecosystem** | 12 | 9 | 🟡 K.2-K.8, I.1+K.1, I.2 DONE |
| **Total** | **137** | **130** | 🏆 95% |

---

## 🟡 Active / Pending — Phase L: Frontend V3

> Tasks for the next major iteration of the frontend/dashboard.
> Legacy completed tasks (Phases 1-K) have been archived to `backlog_legacy.md`.

### 🔴 HIGH — Next Sprint (Frontend focus)

| # | Task | Status | Effort | Description |
| L.1 | **Frontend Architecture (React/Vite)** | ✅ DONE | S | Replaced 3000-line vanilla JS file with a new modular React + Vite setup in `frontend/`. Builds directly to `web/index.html` via `vite-plugin-singlefile` keeping the zero-dependency promise. |
| L.2 | **Premium UI/UX Redesign** | ✅ DONE | M | Implemented glassmorphism aesthetics, dark mode flares, Outfit & JetBrains Mono fonts, and Lucide-React icons in `App.jsx` and `index.css`. |
| L.3 | **Skills Leaderboard Component** | ✅ DONE | M | Built the Global Leaderboard directly in the web dashboard (All Time utility ranking, nice list styling, dynamic mapping). (Replaces K.10). |

### 🟡 MEDIUM — Following Sprint

| # | Task | Status | Effort | Description |
|---|------|--------|--------|-------------|
| J.4 | **npm publish** | 🟡 READY | S | `package.json` is ready. User needs to run `npm login` and `npm publish --access public` locally. |

### 🟢 LOW — Future

| # | Task | Status | Effort | Description |
|---|------|--------|--------|-------------|
| K.9 | **nve-serve (local API)** | 📋 TODO | L | Local HTTP server: `node cli/nve-serve.js --port 8042`. Endpoints: `GET /skills`, `/genomes`, `/audit`, `/memory`. JSON responses compatible with skillsbd.ru API. |
| K.11 | **Publish to skills.sh** | ✅ DONE | M | CLI: `nve-skill-publish` — push admitted skill package as GitHub repo, compatible with `npx skills add`. Auto-generates `SKILL.md`, `README`, `LICENSE`. |
| K.12 | **Webhook integrations** | 📋 TODO | L | nve-serve endpoints for incoming webhooks: GitHub Issues → incident, Jira → incident, Slack → EU. Ingestion connectors. |
| J.6 | **Landing page deploy** | 📋 TODO | S | Deploy updated HTML presentation as landing page. |
| J.7 | **Community feedback loop** | 📋 TODO | S | Collect issues/PRs from open-source users. |
| F.1 | **3+ pilot projects** | 🟡 EXTERNAL | — | Need real users to test cross-repo sharing — pack ready. |

---

## 🔬 Research Backlog (from SkillNet analysis, for future phases)

> These items come from the SkillNet paper study (arxiv.org/abs/2603.04448) and positioning analysis.
> They inform where the project goes after current surface is polished, NOT immediate todos.

| # | Item | Priority | Description |
|---|------|----------|-------------|
| R.1 | **PROJECT_POSITIONING.md** | ✅ DONE (in README + presentations) | Canonical answer to "what is this" beyond coding-only framing |
| R.2 | **TERMINOLOGY_GLOSSARY.md** | ✅ DONE | Normalize terms: incident, EU, genome, skill, package, export pack, replay gate, utility |
| R.3 | **nve-self-check.js** | MEDIUM | Structural smoke-test: counts, files, prompts, schemas, publication, consistency |
| R.4 | **APPLICATION_MATRIX.md** | ✅ DONE (in presentations) | Use cases beyond bugs: 8 domains documented |
| R.5 | **Domain-agnostic templates** | → K.7 | Merged into K.7 Domain templates pack |
| R.6 | **Episode/case terminology** | LOW | Add neutral upper-layer naming |
| R.7 | **Ingestion connectors** | → K.12 | Merged into K.12 Webhook integrations |
| R.8 | **Policy/admission tiers** | LOW | Admission layer for different knowledge classes |
| R.9 | **Dashboard ROI metrics** | LOW | Show prevented repeats, time saved |
| R.10 | **Graph/discovery UI** | → K.1 | Merged into K.1 Web SkillGraph tab |
| R.11 | **Non-coding reference demos** | LOW | 2-3 worked examples outside coding |
| R.12 | **Semantic search upgrade** | LOW | Move from Jaccard to embedding-based search |

---

## 📋 All Completed Work → legacy

See `docs/backlog_legacy.md` for the full history of 117 completed tasks across phases 1–H.
