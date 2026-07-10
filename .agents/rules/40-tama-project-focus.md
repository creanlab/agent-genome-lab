# 40 — TAMA Project Focus

> Always-on. Scope control.

## This Repo Is

Evolution Tamagotchi — a standalone gamified AI agent evolution tracker.

## This Repo Is NOT

- A downstream consumer project (parent projects live outside this repo)
- A general-purpose coding assistant
- A benchmark harness (competition mode is future work)

## Boundaries

1. Do not modify files outside this repository.
2. Do not import project-specific modules from other repos.
3. Evolution journal data from upstream projects is INPUT to TAMA, not vice versa.
4. Each deployment manages its own credentials; never hardcode API keys in this repo.

## Key Dependencies

- Express.js (server.js) — Gemini proxy
- Supabase — data storage
- Cloud Run — deployment
- Gemini — AI Insights
