# 🧬 Agent Genome Lab

> **Enterprise-Grade AI Agent Evolution Tracker** — Turn AI hallucinations, timeouts, and logic failures into reusable, community-shared skills (EUs) powered by continuous auto-distillation and a React/Vite Dashboard.

---

## 🚀 Features

- **Automated Root Cause Extraction**: AI auto-distills raw `MEMORY.md` failure journals into structured `001_failure_genome.md` files.
- **Skill Generation**: Turns extracted Evolutionary Units (EUs) into actionable skills compatible with the [Anthropic Skills Ecosystem](https://github.com/anthropics/skills).
- **Glassmorphism Dashboard**: A premium, zero-dependency generic HTML dashboard built with React + Vite, Recharts, and Lucide Icons.
- **SkillGraph Integration**: Semantically links failures and extracted patterns globally.
- **VS Code Extension**: Fully integrated into VS Code for continuous background evolution.
- **CLI Toolchain**: 17+ powerful CLI commands for managing your agent's knowledge offline.
- **Replay Gates**: Auto-validates models against historical failure scenarios (AI vaccines).

---

## 🚀 Quick Start

Agent Genome Lab operates natively on your local file system with optional cloud endpoints.

**Install via npm:**
```bash
npx agent-genome-lab init my-agent-project
```

Or clone and start locally:
```bash
git clone https://github.com/creanlab/agent-genome-lab.git
cd agent-genome-lab
node cli/nve-init.js
```

### Dashboard
Simply open `web/index.html` in your browser. It runs 100% offline using `data.js` compiled from your local genomes, featuring a full React application embedded in a single file!

---

## 🛠 Command Line Interface (CLI)

The toolkit provides numerous granular commands:

| Command | Description |
|---------|-------------|
| `nve-init` | Scaffolds the `.evolution/` structure in your project. |
| `nve-memory` | Captures a new incident into `MEMORY.md`. |
| `nve-distill` | Triggers the LLM to extract Genomes and EUs from `MEMORY.md`. |
| `nve-export-dashboard` | Compiles Genomes into `data.js` for the React dashboard. |
| `nve-skill-publish <name>` | Exports a learned EU as an Anthropic-compatible `SKILL.md`. |
| `nve-skillgraph-build` | Generates semantic relationships between EUs. |
| `nve-replay-runner` | Tests your agent against historical failure gates. |

---

## 🏗 Architecture & Stack

- **Frontend**: React 19 + Vite (built via `vite-plugin-singlefile` into `web/index.html`).
- **Backend API**: Node.js + Express + Supabase (for optional global leaderboards).
- **Agent Integration**: Standard Markdown files (`.evolution/genomes/*.md`).
- **AI Core**: Gemini 3.1 Pro for high-context distillation and extraction.

```text
agent-genome-lab/
├── cli/                     ← Core execution engine (17+ commands)
├── frontend/                ← React + Vite source code for Dashboard 
├── web/                     ← Pre-compiled single-file Dashboard (index.html, data.js)
├── docs/                    ← Backlog, Research (10+ papers), & Terminology Glossary
├── server.js                ← Cloud Run Express server for Community Sync
└── TAMA_start/              ← Starter kit for users without the CLI
```

---

## 📖 Terminology & Ecosystem

To fully understand the ecosystem, please review [TERMINOLOGY_GLOSSARY.md](docs/TERMINOLOGY_GLOSSARY.md). It covers concepts like **EU (Evolutionary Unit)**, **Genome**, **Replay Gate**, and more.

## 🤝 Community & Publishing Skills

Once your agent learns a powerful new pattern, you can publish it directly to the open-source community:

```bash
node cli/nve-skill-publish.js my-new-skill
cd exports/my-new-skill
gh repo create my-new-skill --public --push
```
Your skill is now compatible with `npx skills add <your-username>/my-new-skill`!

---

## 📜 License
MIT
