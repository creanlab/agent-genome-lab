# TAMA Architecture V4

> Source of truth for current system architecture.
> Updated: 2026-03-18

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     USER LAYER                               │
│  web/index.html (Dashboard)   web/vision*.html (Positioning) │
│  Drag & drop ↠ File upload ↠ Gist fetch ↠ Demo data         │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    SERVER LAYER                               │
│  server.js (Express)                                         │
│  ├── GET /          → static files (web/)                    │
│  ├── POST /api/gemini → Gemini 3.1 Pro proxy                │
│  ├── POST /api/journal → community contribution (planned)    │
│  └── GET /api/community → aggregated insights (planned)      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    DATA LAYER                                │
│                                                              │
│  Canonical Memory (.evolution/)                              │
│  ├── incidents/         ← structured incident events         │
│  ├── experience_units/  ← distilled reusable lessons         │
│  ├── failure_genomes/   ← family-level failure DNA           │
│  ├── manifests/         ← repo-level identity snapshots      │
│  ├── audits/            ← structural audit results           │
│  └── exports/           ← sanitized research packs           │
│                                                              │
│  Supabase (remote)                                           │
│  ├── agents, agent_status, evo_entries                       │
│  ├── patterns, anti_patterns, leaderboard                    │
│  └── failure_genomes (V4 extension)                          │
│                                                              │
│  Legacy Format (compatible)                                  │
│  └── evolution_journal.md ← rendered view with EVO_JSON etc  │
└─────────────────────────────────────────────────────────────┘
```

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT HARNESS                             │
│                                                              │
│  AGENTS.md              ← root contract                      │
│  .agents/rules/         ← always-on constraints (7 rules)   │
│  .agents/workflows/     ← task procedures (11 workflows)    │
│  .agents/skills/        ← reusable capabilities (5 skills)  │
│                                                              │
│  Flow:                                                       │
│  Session Start → Bootstrap → Read Rules → Read Backlog       │
│       ↓                                                      │
│  Work → Safe Change Loop → Incident Capture                  │
│       ↓                                                      │
│  Incident → Distil → Genome → Propose Patch → Promote/Reject│
│       ↓                                                      │
│  Share → Redact → Pack → Research Pool                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Contracts

| Schema | Purpose | Location |
|--------|---------|----------|
| `incident-event.schema.json` | Structured incident | `schemas/` |
| `experience-unit.schema.json` | Distilled lesson | `schemas/` |
| `failure-genome.schema.json` | Family-level failure DNA | `schemas/` |
| `repo-manifest.schema.json` | Repo identity & health | `schemas/` |

## Key Files

| File | Role |
|------|------|
| `AGENTS.md` | Root contract |
| `server.js` | Express backend |
| `web/index.html` | Dashboard UI |
| `web/vision_failure_genome_v4.html` | V4 positioning |
| `docs/backlog_tama.md` | Product roadmap |
| `docs/research.md` | Research base (10 papers) |
| `docs/POMDP_framework.md` | Formal framework |
| `docs/FAILURE_GENOME_HYPOTHESIS_V1.md` | V4 hypothesis |
