---
description: TAMA-specific user flow — audit journal, share anonymized data, view community
---

# TAMA Audit & Share

> User-facing flow for Evolution Tamagotchi community participation.

## User Journey

### Step 1: Upload Journal
User uploads `evolution_journal.md` to the web dashboard (`web/index.html`).
Dashboard parses and displays: Level, XP, Patterns, Anti-Patterns, Health Score.

### Step 2: Generate AI Insights
User clicks "✨ Generate AI Insights" → Gemini 3.1 Pro analyzes patterns.
Returns: impact re-scoring, risk prediction, strategic recommendations, pattern gaps.

### Step 3: Opt-In Share
User clicks "🧠 Contribute to Collective Intelligence":
- Frontend sends anonymized patterns + anti-patterns to `POST /api/journal`
- Server strips agent_id, project name
- Saves to Supabase community tables

### Step 4: Receive Community Intelligence
After sharing, user sees aggregated insights:
- Top patterns across all users
- Most common anti-patterns
- Personalized recommendations from other users' patterns

## Data Privacy

- Agent ID and project name NEVER shared
- Only pattern names, AP names, categories, and aggregate stats
- Full redaction per rule 50
