# 🧬 Agent Genome Lab

### Give your AI coding agent a DNA of learned mistakes — so it never repeats them.

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)](#)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visualstudiocode)](#-vs-code-extension)
[![Agent Agnostic](https://img.shields.io/badge/Works_with-Claude%20%7C%20Gemini%20%7C%20GPT%20%7C%20Codex-blueviolet)](#-works-with-any-ai-coding-agent)

---

> **The problem:** AI coding agents repeat the same mistakes across sessions. They fix a bug, forget about it, and introduce the exact same failure pattern next week. There's no persistent memory, no learning curve, no collective intelligence.
>
> **The solution:** Agent Genome Lab captures every mistake as structured DNA — incident → distilled lesson → verified genome. Your agent reads a compact `MEMORY.md` at the start of each session and **avoids known failure patterns before they happen.**

---

## ⚡ Who is this for?

| If you are... | This toolkit... |
|---|---|
| 🧑‍💻 **Developer using AI agents** (Copilot, Claude, Cursor, etc.) | Stops your agent from repeating the same bugs |
| 🏗️ **Team running multiple projects** | Shares verified lessons across repos (collective intelligence) |
| 🔬 **Researcher studying AI agent behavior** | Provides structured failure classification + replay gates |
| 🎮 **Curious about agent evolution** | Gamified dashboard with XP, levels, achievements, family trees |

---

## 🚀 Quick Start (2 minutes, zero dependencies)

```bash
git clone https://github.com/creanlab/agent-genome-lab.git
cd agent-genome-lab
node cli/nve-init.js --yes
```

That's it. Your project now has a `.evolution/` memory layer. No npm install, no Docker, no API keys.

### First incident in 30 seconds:

```bash
# 1. Record a bug your agent introduced
node cli/nve-scaffold.js incident --slug broken-import --severity 8

# 2. Fill in the TODO fields in the generated JSON file
# 3. Generate compact memory
node cli/nve-memory.js

# 4. Your agent reads .evolution/MEMORY.md next session → bug class prevented ✅
```

---

## 🧠 How It Works: 3-Layer Failure DNA

```
                    ┌─────────────────────────────────────┐
                    │          YOUR AI AGENT               │
                    │  Reads MEMORY.md at session start     │
                    │  "Don't do X, always verify Y"       │
                    └────────────────┬────────────────────┘
                                     │ reads
                    ┌────────────────▼────────────────────┐
   Layer 3          │        MEMORY.md (30 lines)         │
   (compact)        │  Top-K verified lessons + warnings   │
                    └────────────────┬────────────────────┘
                                     │ generated from
                    ┌────────────────▼────────────────────┐
   Layer 2          │      FAILURE GENOMES (verified)      │
   (verified)       │  FG-000001.json — utility: 0.92     │
                    │  family: "partial-import-missing"    │
                    │  invariant: "every call needs import"│
                    │  promotion: "promoted" ✅            │
                    └────────────────┬────────────────────┘
                                     │ distilled from
                    ┌────────────────▼────────────────────┐
   Layer 1          │       INCIDENTS (raw records)        │
   (raw)            │  INC-000001.json — severity: 8      │
                    │  "html module not imported"          │
                    │  root_cause, fix_applied, evidence   │
                    └─────────────────────────────────────┘
```

**Key concepts:**
- **Incident** — raw failure record. What broke, why, how it was fixed
- **Experience Unit** — distilled lesson: anti-pattern + preventive pattern
- **Failure Genome** — verified, transferable unit with utility score
- **Family** — cluster of related genomes (e.g., all "import" errors group together)
- **Replay Gate** — deterministic check: does this genome actually prevent failures?
- **Promotion** — genome passes replay → promoted. Fails → rejected. Not enough data → pending

---

## 🛠️ 13 CLI Tools

All tools are standalone Node.js scripts. **Zero npm dependencies.** Just `node cli/tool.js`.

| Command | Description |
|---------|-------------|
| `nve-init --yes` | Setup wizard. Creates `.evolution/` structure in 5 seconds |
| `nve-scaffold incident --slug name` | Create JSON scaffold with auto-ID, timestamp, all fields |
| `nve-scaffold genome --slug name` | Create Failure Genome scaffold |
| `nve-scaffold eu --slug name` | Create Experience Unit scaffold |
| `nve-memory` | Generate `MEMORY.md` — compact top-K memory for agent |
| `nve-audit` | **5-axis health audit**: Structure, Memory, Verification, Shareability, Evolution |
| `nve-validate` | 28 structural checks: files, folders, schema compliance |
| `nve-distill` | Auto-pipeline: incidents → experience units → failure genomes |
| `nve-replay` | Replay gate: deterministic pass/fail for genome promotion |
| `nve-utility` | Calculate utility score per genome (reuse, prevention, transfer) |
| `nve-pack distilled` | Export redacted pack for cross-project sharing |
| `nve-fg-summary` | Aggregated genome family report |
| `nve-manifest` | Repo manifest snapshot (stack, maturity, metrics) |
| `nve-export-dashboard` | Export data for offline web dashboard |

### Full pipeline in 4 commands:

```bash
node cli/nve-distill.js       # auto-classify incidents → EU → FG
node cli/nve-replay.js        # replay gate (promote/reject)
node cli/nve-memory.js        # regenerate compact memory
node cli/nve-audit.js         # check health (target: 100%)
```

---

## 📊 5-Axis Audit System

Every project gets a health score across 5 dimensions:

```
🧬 5-Axis Audit — 2026-03-19

  Overall: ████████████████████ 100%

  Structure:      ████████████████████ 100%  (rules, workflows, schemas)
  Memory:         ████████████████████ 100%  (incidents, EUs, genomes)
  Verification:   ████████████████████ 100%  (replay gate, security)
  Shareability:   ████████████████████ 100%  (6/6 schemas valid)
  Evolution:      ████████████████████ 100%  (genome families growing)
```

Use in CI/CD: `node cli/nve-audit.js --ci` → exit code 1 if score < 70%.

---

## 🖥️ VS Code Extension

Sidebar extension with **4 live panels** — no terminal needed.

### Install:

```bash
# Copy to VS Code extensions
# Windows:
xcopy /E /I "vscode-extension" "%USERPROFILE%\.vscode\extensions\nve-genome-explorer"
# Mac/Linux:
cp -r vscode-extension ~/.vscode/extensions/nve-genome-explorer

# Restart VS Code → open project with .evolution/ → 🧪 icon appears
```

### What you get:

```
🧪 FAILURE GENOME (sidebar)
├── 📊 5-Axis Audit          ← live scores with colored icons
│   ├── ✅ Overall: 94%
│   ├── Structure: 100%
│   └── Evolution: 84%
│
├── 🧬 Genome Families       ← expandable tree, click to open JSON
│   ├── partial-import (2 genomes)
│   │   ├── FG-000001  utility: 0.92 | promoted
│   │   └── FG-000002  utility: 0.78 | pending
│   └── silent-fallback (1 genome)
│
├── 🔄 Replay Gate           ← promotion status per genome
│   └── 3 promoted, 0 rejected, 2 skipped
│
└── ⚡ Quick Actions          ← one-click CLI execution
    ├── 🧬 Run Audit
    ├── ⚗️ Distill Genomes
    ├── 🔄 Replay Gate
    └── 📦 Export Pack
```

**Auto-refresh:** panels update when any `.evolution/*.json` changes.  
**Command Palette:** `Ctrl+Shift+P` → type `NVE` → 5 commands available.

---

## 🌐 Web Dashboard

A gamified 3000+ line dashboard with XP, levels, achievements, and visual evolution tracking.

### Offline mode (no server needed):

```bash
node cli/nve-export-dashboard.js    # → generates web/data.js
# Open web/index.html in any browser
```

### Features:

- 🎮 **Agent Profile**: XP, level, streak, adaptive growth curve
- 🏆 **Achievements & Badges**: unlocked by hitting milestones  
- 📊 **5-Axis Audit**: animated progress bars per axis
- 📈 **XP Timeline**: canvas-rendered historical graph
- 🧬 **Replay Gate Status**: promoted/rejected/pending per genome
- 📋 **Repo Manifest**: stack tags, badge chips, maturity level
- 📦 **JSON Pack Import**: drag & drop `.evolution/` files
- 🌍 **4 Languages**: 🇬🇧 EN / 🇷🇺 RU / 🇩🇪 DE / 🇯🇵 JP
- 🏆 **Multi-User Comparison**: compare agent evolution across projects

---

## 🤝 Works with ANY AI Coding Agent

This toolkit is **agent-agnostic**. It works with:

| Agent | Integration |
|-------|-------------|
| **GitHub Copilot** | Add rule to `.github/copilot-instructions.md` |
| **Claude Code** | Add rule to `CLAUDE.md` |
| **Google Gemini / Antigravity** | Use `AGENTS.md` + `.agents/rules/` |
| **OpenAI Codex** | Add rule to system prompt |
| **Cursor** | Add to `.cursorrules` |
| **Any agent** | Just tell it to read `.evolution/MEMORY.md` first |

### Minimal integration (3 lines):

```
Before each task: read .evolution/MEMORY.md
After fixing a bug: node cli/nve-scaffold.js incident --slug <describe-bug>
After scaffolding: node cli/nve-memory.js
```

### Full integration — copy the `.agents/` folder into your project:

```
.agents/
├── rules/            ← 7 behavioral rules for the agent
│   ├── 00-core-contract.md
│   ├── 10-truthfulness-and-no-fallbacks.md
│   ├── 20-evolution-memory-policy.md
│   ├── 30-docs-and-validation.md
│   ├── 50-sharing-redaction.md
│   ├── 60-failure-genome-promotion.md
│   └── 60-legacy-compatibility.md
├── skills/           ← 6 specialized skills
│   ├── genome-analyzer/
│   ├── incident-distiller/
│   ├── repo-auditor/
│   ├── research-packager/
│   ├── rule-patcher/
│   └── tama-community-summarizer/
└── workflows/        ← 9 step-by-step workflows
    ├── 00-session-bootstrap.md
    ├── 10-safe-change.md
    ├── 20-incident-capture.md
    ├── 30-repo-audit.md
    ├── 40-pack-and-share.md
    ├── 50-failure-genome-review.md
    └── ... more
```

---

## 🔒 Privacy & Cross-Project Sharing

Share lessons without exposing source code. 4-tier redaction:

| Tier | What's shared | Use case |
|------|--------------|----------|
| `private` | Nothing | Sensitive/proprietary projects |
| `manifest` | Repo name + family names only | "What failure families exist?" |
| `distilled` | Safe titles + repair operators (no code/paths) | Default — learn from others safely |
| `research` | Full data including root causes | Open-source / academic collaboration |

```bash
node cli/nve-pack.js distilled    # → .evolution/exports/PACK-*.json
```

Auto-redaction strips: code snippets, file paths, API keys, environment variables, logs.

---

## 📈 Example MEMORY.md (what your agent reads)

```markdown
# MEMORY.md — Compact Agent Memory

## Quick Stats
- Incidents: 11 | Experience Units: 5 | Failure Genomes: 7
- Promoted: 7 | Pending: 0 | Families: 7

## ✅ Verified Lessons (Do This)
- **FG-000003** [build-time-env-var-loss]: always-use-cloudbuild-yaml-with-build-args (utility: 0.95)
- **FG-000001** [partial-import-missing-module]: add-import-statement-and-verify (utility: 0.92)
- **FG-000005** [auto-style-extraction-unreliable]: pivot-to-client-provided-css (utility: 0.90)

## 🚫 Anti-Patterns (Don't Do This)
- **EXP-000001**: Adding module.method() without checking if import exists
- **EXP-000002**: Updating .env but forgetting cloudbuild.yaml

## ⚡ Recent High-Impact (severity ≥ 7)
- **INC-000011** [sev:9]: Pipeline crash — style fidelity below threshold

## 🧬 Known Failure Families
- **partial-import-missing-module** (1 genomes): Missing import for calls
- **silent-fallback-introduced** (1 genomes): Agent adds fallbacks instead of fixing
- **command-shell-mismatch** (1 genomes): Shell commands for wrong OS
```

Your agent reads this in **5 seconds**. That's 7 verified lessons preventing known failures.

---

## ⚙️ Configuration

Edit `.evolution/config.toml` (auto-created by `nve-init`):

```toml
[thresholds]
min_audit_score = 70           # CI gate
auto_distill_severity = 7      # Auto-distill high-severity incidents
memory_min_confidence = 0.6    # MEMORY.md confidence threshold
memory_top_k = 8               # Max entries per section

[promotion]
replay_pass_rate = 0.7         # Promote genome if pass_rate ≥ 0.7
replay_reject_rate = 0.3       # Reject if pass_rate < 0.3

[sharing]
default_tier = "distilled"     # Privacy tier for exports
redact_code = true             # Strip code from shared packs
redact_paths = true            # Strip file paths
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                  YOUR PROJECT                     │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │             .evolution/                      │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐   │ │
│  │  │ INC  │→ │  EU  │→ │  FG  │→ │MEMORY│   │ │
│  │  │ raw  │  │lesson│  │verify│  │.md   │   │ │
│  │  └──────┘  └──────┘  └──────┘  └──────┘   │ │
│  │    ↑ scaffold    distill    replay   ↓      │ │
│  │                                  agent reads│ │
│  └─────────────────────────────────────────────┘ │
│         ↕ nve-audit              ↕ nve-pack     │
│  ┌──────────────┐         ┌──────────────┐      │
│  │ 5-Axis Score │         │ Shared Pack  │      │
│  │   (100%)     │         │ (redacted)   │      │
│  └──────┬───────┘         └──────┬───────┘      │
│         ↓                        ↓              │
│  VS Code Extension        Other Projects        │
│  Web Dashboard             (collective IQ)      │
└──────────────────────────────────────────────────┘
```

---

## 📁 What's Included

```
agent-genome-lab/
├── README.md                   ← You are here
├── AGENTS.md                   ← Agent operating contract
├── LICENSE                     ← MIT
├── package.json                ← 12 npm bin commands
├── .agents/
│   ├── rules/    (7 files)     ← Behavioral rules for agents
│   ├── skills/   (6 skills)    ← Specialized agent capabilities
│   └── workflows/ (9 files)    ← Step-by-step procedures
├── cli/          (13 tools)    ← Zero-dependency CLI tools
├── schemas/      (6 schemas)   ← JSON Schema validation
├── templates/    (3 examples)  ← Example JSON files
├── docs/         (6 docs)      ← Architecture, research, guides
├── prompts/      (4 prompts)   ← Migration prompts for agents
├── vscode-extension/           ← VS Code sidebar extension
│   ├── extension.js
│   └── package.json
└── web/
    └── index.html              ← 3000+ line gamified dashboard
```

**Total: 63 files. Zero external dependencies.**

---

## 🔬 Research Foundations

This toolkit is grounded in published research on AI agent behavior:

- **Failure Genome Hypothesis**: Coding failures follow discoverable, classifiable patterns ("genomes") that can be prevented through structured memory
- **3-Layer Memory Model**: Raw → Distilled → Verified — each layer adds confidence
- **Replay Gate**: A deterministic verification mechanism inspired by hold-out testing in ML
- **Utility Scoring**: Genomes are scored by reuse count, prevention count, and negative transfer rate
- **Family Clustering**: Related failures are grouped into families for cross-incident learning

See [docs/RESEARCH_FOUNDATIONS.md](docs/RESEARCH_FOUNDATIONS.md) and [docs/FAILURE_GENOME_HYPOTHESIS_V1.md](docs/FAILURE_GENOME_HYPOTHESIS_V1.md) for detailed theory.

---

## 🌟 Why Agent Genome Lab?

| Feature | Without this toolkit | With this toolkit |
|---------|---------------------|-------------------|
| **Bug repetition** | Agent repeats same mistake every 3-5 sessions | Agent reads MEMORY.md → class prevented |
| **Knowledge loss** | New session = blank slate | 3-layer persistent memory survives restarts |
| **Cross-project learning** | Every project starts from zero | Shared packs transfer verified lessons |
| **Team collaboration** | No way to share agent learnings | 4-tier privacy + redacted exports |
| **Quality tracking** | No metrics | 5-axis audit with trend data |
| **Failure patterns** | Invisible | Classified into families with utility scores |
| **IDE integration** | None | VS Code extension with live sidebar |
| **Visualization** | None | Gamified dashboard with XP, levels, achievements |

---

## 🏆 Credits

Built by [CreanLab](https://github.com/creanlab) — researching self-evolving AI agent architectures.

**Star ⭐ this repo** if you believe AI agents should learn from their mistakes.

**License:** MIT — use freely, modify, distribute, build upon.

---

## 📚 Related Links

- [Architecture Deep Dive](docs/UNIVERSAL_ARCHITECTURE.md)
- [Research Foundations](docs/RESEARCH_FOUNDATIONS.md)
- [Failure Genome Hypothesis](docs/FAILURE_GENOME_HYPOTHESIS_V1.md)
- [Migration Playbook](docs/SAFE_MIGRATION_PLAYBOOK.md)
- [Experiment Plan](docs/FAILURE_GENOME_EXPERIMENT_PLAN_V1.md)
- [User Flow: Audit & Share](docs/USER_FLOW_AUDIT_AND_SHARE.md)

---

<p align="center">
  <strong>Stop repeating mistakes. Start evolving. 🧬</strong>
</p>

