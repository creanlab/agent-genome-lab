---
description: Cloud Run / Firebase deployment — WRAPPER → docs/ops/cloud-run.md
---

# Deployment — Evolution Tamagotchi

> **V4**: This file is a compatibility wrapper and project-specific entrypoint.
> Stable operational knowledge: `docs/ops/cloud-run.md`

## Quick Deploy

```bash
# Build & deploy via Cloud Build
gcloud builds submit --config cloudbuild.yaml --project evolution-tamagotchi
```

## Environment Variables (Cloud Run)

```
GEMINI_API_KEY=*** (from env or Secret Manager)
PORT=8080 (auto by Cloud Run)
```

## Current Stack

| Component | Technology |
|-----------|-----------|
| Frontend + API | Express.js (server.js) on Cloud Run |
| Database | Supabase |
| LLM | Gemini 3.1 Pro |
| Container | Node.js 22 + Dockerfile |

## Windows / PowerShell Gotchas

- Use `;` not `&&` for command chaining
- Use `cmd /c "gcloud ..."` if gcloud.ps1 fails
- `.strip()` env vars from Secret Manager (trailing `\r\n`)

## Full operations doc → `docs/ops/cloud-run.md`
## Legacy backup → `docs/legacy/workflows/cloud-run-deploy.legacy.md`
