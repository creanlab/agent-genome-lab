# TAMA User Flow & Research Pool V4

## User Personas

### 1. Solo Developer
Uses TAMA to track own bugs → extracts patterns → sees health dashboard.

### 2. Team Lead
Compares multiple agents → identifies team-wide anti-patterns → cross-pollination.

### 3. Researcher
Collects anonymized failure genomes → tests hypothesis → publishes findings.

## User Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. ONBOARD                                                    │
│    Get TAMA_start/ kit → add to project → AI agent starts     │
│    writing evolution_journal.md entries automatically          │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. VISUALIZE                                                  │
│    Upload journal to dashboard → see Level, XP, Health        │
│    Generate AI Insights (Gemini) → impact, risks, gaps        │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. AUDIT (V4)                                                 │
│    Run local audit → check structure, memory, compatibility   │
│    Identify: stale journal, orphan incidents, missing genomes │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. DISTIL (V4)                                                │
│    Convert incidents → experience units → failure genomes     │
│    Cluster into families → identify violated invariants       │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. SHARE (opt-in)                                             │
│    Redact data → create pack → drop in research-pool/         │
│    Or: one-click anonymous share to Supabase community        │
└──────────────┬───────────────────────────────────────────────┘
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. COMMUNITY                                                  │
│    See: top patterns, common APs, personalized recommendations│
│    Import: relevant failure genomes from other users           │
│    Compete: optional leaderboard (replay-verified only)       │
└──────────────────────────────────────────────────────────────┘
```

## Research Pool Architecture

```
Local (.evolution/)                       Remote (Supabase)
├── incidents/*.json                      ├── failure_genomes
├── experience_units/*.json               ├── genome_replay_runs
├── failure_genomes/*.json                ├── promoted_patch_packs
├── exports/PACK-*.json     ──upload──►   └── ...
│
research-pool/
├── incoming/               ◄── receive from others
└── summaries/              ← aggregated analysis
```

## Research Pool Principles

1. **Local-first**: all data exists locally before any sharing
2. **Opt-in**: nothing is shared without explicit user action
3. **Redacted**: no agent_id, project names, or code in shared packs
4. **Replay-tested**: imported genomes must pass local replay before adoption
5. **Utility-ranked**: stale or low-value genomes naturally decay
