# 🎮 Evolution Tamagotchi — Migration Map (for new chat session)

> **Created**: 2026-03-16
> **Updated**: 2026-03-16 22:50 MSK
> **Repository**: `creanlab/NVE-beta` branch `evolution-tamagotchi`
> **Local path**: `d:\Antigravity\evolution-tamagotchi\`
> **Purpose**: Standalone gamified AI agent evolution tracker

---

## 📍 Что уже сделано

### Phase 1 ✅ — MVP Single-User Visualizer
- `web/index.html` — полный визуализатор (HTML + CSS + JS, zero dependencies)
- Тамагочи-аватар с idle animation, XP progress bar, level badges
- EVO Timeline карточки, Pattern Registry, Anti-Pattern Registry
- Drag & drop + paste JSON input
- Demo data button
- Dark premium theme, glassmorphism, micro-animations

### Phase 2 ✅ — Multi-User Mode
- Solo / Multi-User tabs
- 3-slot multi-journal upload
- Leaderboard с rank medals (🥇🥈🥉)
- Side-by-side mini-card comparison
- Health Score calculation (preventive, repeat_rate, pattern_reuse, freshness)
- Experience Sharing (GEA) — shared/unique patterns + coverage gaps
- Demo Multi-User button (3 agents)

### Vision Document — `web/vision.html`
- Pitch document с архитектурными диаграммами
- Описание 14 proposals (R1-R6, P1-P14)
- Mermaid-подобные CSS диаграммы

### Research — `docs/research.md`
- 10+ peer-reviewed papers on AI agent self-evolution
- AlphaEvolve, MAE, EvolveR, SE-Agent, Artemis analysis
- Mapping to TAMA implementation
- Pre-research section with status table

### Starter Kit — `TAMA_start/`
- Ready-to-copy folder for new users
- `evolution_journal.md` — empty template with level system
- `visualizer/index.html` — standalone mini-visualizer
- `.agents/workflows/auto-evolution.md` — basic rules

---

## 🔑 Infrastructure

| Service | Status | Details |
|---------|--------|---------|
| **GitHub** | ✅ | `creanlab/NVE-beta` branch `evolution-tamagotchi` |
| **Supabase** | ✅ Tables created | URL: `https://cjdteaeeuejgjoymtibl.supabase.co` |
| **GCP** | ✅ Project created | Project: `evolution-tamagotchi` |
| **Firebase Hosting** | ⏸ Phase 4 | For public web UI |
| **Gemini API** | ⏸ Phase 5 | For pattern extraction |
| **Perplexity API** | ⏸ Phase 5 | For web search |

### Supabase Tables
- `agents` — user/agent registry
- `agent_status` — XP/level snapshots
- `evo_entries` — individual EVO records
- `patterns` — extracted patterns (PAT-NNN)
- `anti_patterns` — anti-patterns (AP-NNN)
- `leaderboard` — view (auto-calculated)

---

## 📋 Backlog

> **Full backlog**: `docs/backlog_tama.md`

| Phase | Tasks | Done | Description |
|-------|-------|------|-------------|
| **TAMA-1** | 11 | 11 | ✅ MVP Single-User |
| **TAMA-2** | 9 | 9 | ✅ Multi-User + Leaderboard |
| **TAMA-3** | 4 | 0 | CLI tools (evo-parse, evo-sync) |
| **Research** | 6 | 6 | R1-R6 papers |
| **Proposals** | 14 | 0 | P1-P14 (SEPGA, GEA, etc.) |

---

## 🏗 Architecture

### Data Format

Файл `evolution_journal.md` содержит JSON-блоки в HTML-комментариях:

```html
<!-- STATUS_JSON
{
  "agent_id": "my-agent-001",
  "project": "MyProject",
  "level": 25,
  "level_name": "Operative",
  "level_emoji": "🟣",
  "xp_current": 188,
  "xp_next_level": 220,
  "total_entries": 6,
  "total_patterns": 6,
  "total_anti_patterns": 13,
  "top_impact": 9,
  "streak": 6,
  "last_updated": "2026-03-16T21:28:00+03:00"
}
-->
```

Каждая EVO-запись:
```html
<!-- EVO_JSON
{"id":"EVO-001","date":"2026-03-16","impact":8,"xp":13,"category":"Preventive","type":"Documentation Drift","pattern":"PAT-001","title":"Auth Deploy Trap"}
-->
```

### Level System
- 10 уровней: 🟢 Novice → 👑 Transcendent
- XP за Impact Score: 1-2 (+3), 3-4 (+5), 5-6 (+8), 7-8 (+13), 9-10 (+21)
- Streak bonus: 3+ entries = +5 XP

### Avatar Map
| Level | Avatar |
|-------|--------|
| 1-10 | 🥚 Egg |
| 11-20 | 🐣 Chick |
| 21-30 | 🦊 Fox |
| 31-40 | 🐉 Dragon |
| 41-50 | 🦅 Eagle |
| 51-60 | 🐺 Wolf |
| 61-70 | 🦁 Lion |
| 71-80 | 🐲 Elder Dragon |
| 81-90 | 🦄 Unicorn |
| 91-100 | ⭐ Star |

---

## 🔗 Key Files (absolute paths in new project)

| File | Path | Description |
|------|------|-------------|
| Visualizer | `d:\Antigravity\evolution-tamagotchi\web\index.html` | Main UI |
| Vision | `d:\Antigravity\evolution-tamagotchi\web\vision.html` | Architecture pitch |
| Research | `d:\Antigravity\evolution-tamagotchi\docs\research.md` | Academic papers |
| Backlog | `d:\Antigravity\evolution-tamagotchi\docs\backlog_tama.md` | All tasks |
| Auto-Evolution | `d:\Antigravity\evolution-tamagotchi\.agents\workflows\auto-evolution.md` | 8 rules |
| Starter Kit | `d:\Antigravity\evolution-tamagotchi\TAMA_start\` | For new users |
| .env | `d:\Antigravity\evolution-tamagotchi\.env` | Secrets (gitignored) |

### User's journal (in their own project)
| File | Path | Description |
|------|------|-------------|
| Evolution Journal | User's project `work/evolution_journal.md` | Active journal data |

---

## ⚡ Quick Start for New Chat

1. Read this file first
2. Read `docs/backlog_tama.md` — current tasks
3. Read `.agents/workflows/auto-evolution.md` — rules
4. Open `web/index.html` in browser — see current state
5. Check `docs/research.md` for scientific background

## ⚠️ Known Anti-Patterns (from EVO history)

- **AP-005**: PowerShell uses `;` not `&&` for chaining commands
- **AP-006**: Never mark task done without production verification
- See full list in `.agents/workflows/auto-evolution.md`
