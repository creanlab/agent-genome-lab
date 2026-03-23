# 40 — TAMA Project Focus

> Always-on. Scope control.

## This Repo Is

Evolution Tamagotchi — a standalone gamified AI agent evolution tracker.

## This Repo Is NOT

- NVE-beta (the parent project lives at `<external-project>`)
- A general-purpose coding assistant
- A benchmark harness (competition mode is future work)

## Boundaries

1. Do not modify files in `<external-project>` from this repo.
2. Do not import NVE-specific modules.
3. Evolution journal data from NVE is INPUT to TAMA, not vice versa.
4. Each deployment manages its own credentials.

## Key Dependencies

- Express.js (server.js) — Gemini proxy
- Supabase — data storage (project: evolution-tamagotchi)
- Cloud Run — deployment (project: evolution-tamagotchi)
- Gemini 3.1 Pro — AI Insights
