---
name: nve-genome-explorer
description: Antigravity-native equivalent of VS Code NVE Extension — provides genome dashboard, skill audit, replay gate status, and quick actions directly in the agent context
---

# 🧬 NVE Genome Explorer (Antigravity Edition)

> Full equivalent of the VS Code NVE Extension, but for Google Antigravity agent.
> Instead of a sidebar UI with panels, the agent uses these skills and workflows at the start of each session.

## When to Use

**Always.** This skill should be loaded at session start (via `00-session-bootstrap` workflow) and used throughout the session whenever:
- You encounter an error that might have been seen before
- You complete a fix and need to record a genome
- You want to check the health of the evolution system
- You need to search for relevant skills/genomes

## Panel Equivalents

The VS Code Extension has 6 panels. Here is how each is replicated in Antigravity:

### Panel 1: 📊 Audit Dashboard

**What it does:** Shows a 5-axis audit score + SkillGraph extension score.

**How to invoke:**
```bash
node cli/nve-audit.js
```

**What to report to user:**
- Structure Score (0-100%)
- Coverage Score (0-100%)
- Quality Score (0-100%)
- Freshness Score (0-100%)
- SkillGraph Score (0-100%)
- Overall Grade (A/B/C/D/F)

### Panel 2: 🧬 Genome Families

**What it does:** Lists all Failure Genomes grouped by family.

**How to invoke:**
```bash
node cli/nve-fg-summary.js
```

**What to report:**
- Family name, member count, avg utility
- For each genome: ID, violated invariant, replay status, utility score

### Panel 3: 🔄 Replay Gate

**What it does:** Shows promoted/rejected/pending status for each genome.

**How to check:**
Read `.evolution/genomes/*.json` files, look at `replay.status` field:
- ✅ `passed` — genome is verified
- ❌ `rejected` — fix didn't work on similar cases
- ⏳ `pending` — not yet tested

### Panel 4: 🧩 Skill Registry

**What it does:** Lists all skills with their admission status.

**How to invoke:**
```bash
node cli/nve-skill-search.js ""
```
This returns all indexed skills with scores.

### Panel 5: 📦 Skill Packages

**What it does:** Shows assembled packages ready for sharing.

**How to check:**
```bash
ls .evolution/skills/packages/
```

### Panel 6: ⚡ Quick Actions

These are the 9 one-click actions. In Antigravity, invoke them via CLI:

| Action | Command |
|--------|---------|
| 📝 New Incident | `node cli/nve-scaffold.js incident --slug <description>` |
| 🧪 Distill to Genomes | `node cli/nve-distill.js` |
| 🔄 Run Replay Gate | `node cli/nve-replay.js` |
| 🧩 Extract Skills | `node cli/nve-skill-extract.js` |
| 📊 Run Audit | `node cli/nve-audit.js` |
| 📦 Build Package | `node cli/nve-skill-package.js --auto` |
| 🔎 Search Skills | `node cli/nve-skill-search.js "<query>"` |
| 📤 Export Dashboard | `node cli/nve-export-dashboard.js` |
| 📋 Regenerate MEMORY | `node cli/nve-memory.js` |

## Session Start Checklist

At the beginning of each session, the agent MUST:

1. Read `.evolution/MEMORY.md` — the compact knowledge base (~35 lines)
2. Run `node cli/nve-audit.js` — check system health
3. Check `docs/backlog_tama.md` — see current priorities
4. Report: "🧬 Memory loaded. Level X, Y genomes, Z skills. Audit: grade."

## After Fixing a Bug

1. `node cli/nve-scaffold.js incident --slug <description> --severity <1-10>`
2. Fill the TODO fields in the generated JSON
3. `node cli/nve-distill.js` — extract EUs and genomes
4. `node cli/nve-memory.js` — regenerate MEMORY.md
5. Report: "🧬 Genome captured: FG-NNNNNN (family: X, utility: Y)"

## After Completing a Feature

1. `node cli/nve-audit.js` — verify nothing degraded
2. `node cli/nve-export-dashboard.js` — update dashboard data
3. Commit changes

## Anti-Patterns

1. **Never skip MEMORY.md** — every session must start by reading it
2. **Never silently fix bugs** — always capture the incident first
3. **Never promote without replay** — run Replay Gate before marking as promoted
4. **Never ignore utility decay** — run `nve-utility.js` periodically
