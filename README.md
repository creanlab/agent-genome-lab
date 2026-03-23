# 🧬 Agent Genome Lab

> **Enterprise-Grade AI Agent Evolution Toolkit** — Turn AI hallucinations, timeouts, and logic failures into reusable, community-shared skills (EUs) powered by continuous auto-distillation, a React/Vite Dashboard, and the Anthropic Skills Ecosystem.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CLI Tools](https://img.shields.io/badge/CLI_Tools-19-blue.svg)](#-command-line-interface-cli)
[![Open Source](https://img.shields.io/badge/Open_Source-creanlab-purple.svg)](https://github.com/creanlab/agent-genome-lab)

---

## 🔥 The Problem

Every AI coding assistant (Copilot, Claude, Cursor, Antigravity) starts **every session from scratch**. No memory of past failures, no learning from mistakes. Research shows agents repeat the same error classes **every 3–5 sessions**.

**Agent Genome Lab solves this.** It's a **verifiable experience layer** that lives in your repository — turning failures into structured, tested, reusable knowledge.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🧬 **Failure Genomes** | Structured DNA of every failure: family, invariant, repair operator, verification evidence |
| 🧪 **Auto-Distillation** | LLM auto-extracts Evolutionary Units (EUs) from raw incident journals |
| 🔄 **Replay Gates** | "Clinical trials" — validates fixes against historical failure scenarios |
| 🧩 **SkillGraph** | Semantic network linking genomes, EUs, and skills with force-directed visualization |
| 📊 **React Dashboard** | Premium glassmorphism UI: Overview, Leaderboard, Genome Cards, Interactive Graph |
| 🖥️ **VS Code Extension** | 6 panels, 9 commands, live refresh on JSON changes |
| 🤖 **Antigravity Integration** | Native `.agents/skills` + `/workflows` — zero-install IDE integration |
| 📦 **Anthropic Skills Export** | `nve-skill-publish` generates `SKILL.md` compatible with `npx skills add` |
| 🛡️ **4-Tier Privacy** | Full → Distilled → Anonymized → Metadata redaction for safe sharing |
| 🔬 **Science-Backed** | Architecture based on 10+ peer-reviewed papers (2025–2026) |

---

## 🚀 Quick Start

### Option 1: Clone & Init (2 minutes)

```bash
git clone https://github.com/creanlab/agent-genome-lab.git
cd agent-genome-lab

# Initialize (zero dependencies — no npm install needed!)
node cli/nve-init.js --yes

# Record your first incident
node cli/nve-scaffold.js incident --slug broken-import --severity 8

# Fill TODO fields in the generated JSON, then:
node cli/nve-memory.js

# ✅ Done! Your agent reads MEMORY.md next session.
```

### Option 2: npx

```bash
npx agent-genome-lab init my-project
```

### Dashboard

Open `web/index.html` in your browser — it runs **100% offline** using `data.js`. Full React application embedded in a single HTML file!

**Live Demo:** [tama-frontend-819335696518.europe-west1.run.app](https://tama-frontend-819335696518.europe-west1.run.app/)

---

## 🛠 Command Line Interface (CLI)

**19 CLI tools**, all zero-dependency. Just `node cli/tool.js`.

### Core Pipeline

| Command | What it does | Simple explanation |
|---------|-------------|-------------------|
| `nve-init --yes` | Creates `.evolution/` | "Install the brain" — all memory folders in 5 seconds |
| `nve-scaffold incident` | Incident template | "Record an event" — generates JSON with fields to fill |
| `nve-memory` | Regenerates MEMORY.md | "Update the cheat sheet" — all lessons → one compact file |
| `nve-distill` | Incidents → EU → FG | "Refine raw material" — from raw facts to lessons to genomes |
| `nve-replay` | Replay gate | "Clinical trials" — does the fix work on similar cases? |
| `nve-audit` | 5-axis audit | "Health check" — 5 axes + SkillGraph score |
| `nve-validate` | JSON schema validation | "Format check" — 28 structural checks |
| `nve-utility` | Recalculate utility | "Update rankings" — decay + boost for each genome |
| `nve-pack distilled` | Export package | "Pack and share" — with 4-level redaction |
| `nve-export-dashboard` | Export for dashboard | "Data for visualization" → web/data.js |

### SkillGraph Pipeline

| Command | What it does |
|---------|-------------|
| `nve-skill-extract` | Genomes → skill candidates |
| `nve-skill-index` | Scoring + dedup + graph |
| `nve-skill-package --auto` | Build packages |
| `nve-skill-search "query"` | Fuzzy + Jaccard search |
| `nve-skill-import` | Import from GitHub |
| `nve-skill-export` | Export to SKILL.md (CC-1C) |
| `nve-skill-publish <name>` | Full Anthropic-compatible package |

### Full Pipeline (8 commands)

```bash
node cli/nve-distill.js                        # incidents → EU → FG
node cli/nve-replay.js                         # replay gate (promote/reject)
node cli/nve-skill-extract.js                  # genomes → skill candidates
node cli/nve-skill-index.js                    # scoring + dedup + graph
node cli/nve-skill-package.js --auto --publish # packages + publish
node cli/nve-memory.js                         # regenerate MEMORY.md
node cli/nve-audit.js                          # 5-axis + SkillGraph score
node cli/nve-skill-publish.js my-skill         # export to Anthropic Skills
```

---

## 🤖 Antigravity Integration (Google AI Agent)

Agent Genome Lab includes **native Antigravity support** via `.agents/` directory — no extension install needed!

### Installed Components

| Type | Path | Description |
|------|------|-------------|
| **Main Skill** | `.agents/skills/nve-genome-explorer/SKILL.md` | Full equivalent of VS Code Extension's 6 panels |
| **6 Rules** | `.agents/rules/00-*.md` to `60-*.md` | Core contract, truthfulness, memory policy, promotion |
| **6 Core Skills** | `.agents/skills/` | genome-analyzer, incident-distiller, repo-auditor, etc. |
| **9 Workflows** | `.agents/workflows/` | Session bootstrap, incident capture, audit, sharing |

### Slash Commands

| Command | What it does |
|---------|-------------|
| `/genome-status` | Quick health check — audit grade, genome count, skill count |
| `/capture-incident` | One-shot: describe bug → scaffold JSON → distill → update MEMORY |
| `/publish-skill` | Export a learned pattern as Anthropic-compatible SKILL.md |

### How It Works

Antigravity reads `.agents/` automatically at session start:

1. **Rules** define behavior (no fallbacks, always verify, memory-first)
2. **Skills** provide capabilities (genome analysis, distillation, auditing)
3. **Workflows** define step-by-step processes (session bootstrap, incident capture)

The agent reads `MEMORY.md` → knows all past failures → avoids repeating them.

```
# Minimal integration: 3 lines in any agent config
1. Before task: read .evolution/MEMORY.md
2. After fixing bug: node cli/nve-scaffold.js incident --slug <description>
3. After recording: node cli/nve-memory.js
```

---

## 🏗 Architecture

### 5-Layer Experience Pipeline

```
📝 Incident → 🧪 Experience Unit → 🧬 Failure Genome → 🔄 Replay Gate → 🧩 SkillGraph → 🔒 Admission → ✅ MEMORY.md
```

Each level refines raw failure data into verified, reusable knowledge. Two gates ensure quality:
- **Replay Gate**: Validates fix effectiveness (≥60% success rate required)
- **Admission Gate**: Controls what enters MEMORY.md (only the best patterns)

### Tech Stack

- **Frontend**: React 19 + Vite → single-file `web/index.html` (via `vite-plugin-singlefile`)
- **Backend**: Node.js + Express + Supabase (optional, for global leaderboards)
- **AI Core**: Gemini 3.1 Pro for high-context distillation
- **Visualization**: Recharts (charts) + Custom SVG Force Graph (SkillGraph)
- **Icons**: Lucide React
- **Deployment**: Google Cloud Run

### Project Structure

```
agent-genome-lab/
├── .agents/                 ← Antigravity integration (rules, skills, workflows)
│   ├── rules/       (7)     Behavioral rules + skill admission
│   ├── skills/      (7)     Genome analyzer, incident distiller, NVE explorer
│   └── workflows/   (12)    Session bootstrap, capture, audit, publish
├── cli/             (19)    CLI tools (zero dependencies)
├── frontend/                React + Vite source code
├── web/                     Pre-compiled dashboard (index.html + data.js)
├── schemas/         (9)     JSON Schema (incident, genome, skill, package, relation)
├── templates/       (5)     JSON templates
├── vscode-extension/        VS Code Extension (6 panels, 9 commands)
├── docs/                    Research, architecture, presentations
├── TAMA_start/              Starter kit for new users
└── server.js                Cloud Run Express server
```

---

## 🤝 Agent Compatibility

Works with **any** AI agent — completely agent-agnostic:

| Agent | Config File | Integration |
|-------|------------|-------------|
| GitHub Copilot | `.github/copilot-instructions.md` | Add "read MEMORY.md" instruction |
| Claude (Anthropic) | `CLAUDE.md` | Same principle |
| **Google Antigravity** | `.agents/` directory | **Native** — rules, skills, workflows included |
| Cursor | `.cursorrules` | Cursor rules format |
| Any other | `.evolution/MEMORY.md` | Universal — just "read this file" |

---

## 📚 Scientific Foundation

Architecture based on **10+ peer-reviewed papers** (2025–2026):

| Paper | Key Idea | Component |
|-------|----------|-----------|
| Survey of Self-Evolving Agents | f(Π,τ,r)=Π' formalism | Overall architecture |
| Group-Evolving Agents (GEA) | Evolution unit = group | Cross-project sharing |
| Darwin Gödel Machine | Self-modification with proofs | Rule Patcher |
| SEAD | GRPO + adaptive curriculum | XP system |
| SEPGA | Constrained MDP + policy penalties | Replay Gate |
| **SkillNet** (arxiv 2603.04448) | 3-layer skill ontology + reuse graph | SkillGraph layer |

---

## 📖 Terminology

See [TERMINOLOGY_GLOSSARY.md](docs/TERMINOLOGY_GLOSSARY.md) for full definitions:
- **Incident** — raw failure event
- **EU (Evolutionary Unit)** — extracted lesson (pattern + anti-pattern)
- **Genome** — structured failure DNA with verification evidence
- **Skill** — actionable capability derived from EUs
- **Replay Gate** — automated validation ("clinical trials")
- **Utility Score** — dynamic value metric (decays without use, grows with prevention)

---

## 📦 Publishing Skills

Share your agent's learned patterns with the community:

```bash
node cli/nve-skill-publish.js my-amazing-skill
cd exports/my-amazing-skill
gh repo create my-amazing-skill --public --source=. --remote=origin --push
```

Now anyone can install: `npx skills add <your-username>/my-amazing-skill`

---

## 📜 License

MIT — use freely in personal and commercial projects.

---

<p align="center">
  <strong>Stop losing experience. Start accumulating it. 🧬</strong>
  <br>
  <a href="https://github.com/creanlab/agent-genome-lab">github.com/creanlab/agent-genome-lab</a>
</p>
