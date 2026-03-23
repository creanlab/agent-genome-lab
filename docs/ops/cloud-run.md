# Cloud Run Operations — Evolution Tamagotchi

> Stable operational knowledge for Cloud Run deployment.

## Infrastructure

| Resource | Value |
|----------|-------|
| GCP Project | `evolution-tamagotchi` |
| Region | `europe-west1` |
| Service | `tama-frontend` |
| Container | Node.js 22 + Express |
| Memory | 512Mi |
| CPU | 1 |
| URL | `https://tama-frontend-819335696518.europe-west1.run.app` |

## Environment Variables

| Variable | Source | Required |
|----------|--------|----------|
| `GEMINI_API_KEY` | Cloud Run env / Secret Manager | Yes (for AI Insights) |
| `PORT` | Auto (Cloud Run) | No (defaults to 8080) |

## Deploy via Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml --project evolution-tamagotchi
```

`cloudbuild.yaml` builds Docker image and deploys to Cloud Run with env vars.

## Deploy Manually

```bash
gcloud run deploy tama-frontend \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 512Mi --cpu 1 \
  --set-env-vars="GEMINI_API_KEY=***" \
  --project evolution-tamagotchi
```

## Rollback

```bash
# List revisions
gcloud run revisions list --service tama-frontend --region europe-west1

# Route to previous revision
gcloud run services update-traffic tama-frontend \
  --to-revisions=REVISION_NAME=100 \
  --region europe-west1
```

## Windows / PowerShell Gotchas

| Issue | Solution |
|-------|----------|
| `&&` chaining fails | Use `;` (semicolon) |
| `gcloud.ps1` blocked | Use `cmd /c "gcloud ..."` |
| Secret Manager `\r\n` | Always `.strip()` env vars |

## Monitoring

```bash
# Logs
gcloud run services logs tail tama-frontend --region europe-west1

# Health check
curl https://tama-frontend-819335696518.europe-west1.run.app/
```

## Security

- API keys NEVER in code or tracked files
- `.env` gitignored
- `gcp-key.json` gitignored — use `gcloud auth` instead
