---
description: Cloud Run / Firebase deployment rules for Evolution Tamagotchi
---

# Deployment — Rules & Checklist

## 🎯 Current Stack

| Component | Technology | Phase |
|-----------|-----------|-------|
| Frontend (static) | Firebase Hosting or Cloud Run | Phase 4+ |
| Backend (API) | Cloud Run (Python/Node) | Phase 5+ |
| Database | Supabase | Phase 4+ |
| LLM | Gemini 3.1 Pro, Perplexity | Phase 5+ |

---

## 🟢 Phase 2 (Current) — No Deploy Needed

The visualizer is a single HTML file. Users open `web/index.html` locally.

---

## 🟡 Phase 4 — Firebase Hosting (Static Frontend)

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Init hosting (select evolution-tamagotchi project)
firebase init hosting
# Public directory: web
# Single-page app: No
# Overwrite: No

# 4. Deploy
firebase deploy --only hosting
```

### Post-Deploy Checklist
- ☐ Site loads at generated Firebase URL
- ☐ Solo demo data works
- ☐ Multi-user demo works
- ☐ File upload works
- ☐ Mobile responsive

---

## 🔴 Phase 5+ — Cloud Run Backend

```bash
# 1. Build and deploy
gcloud run deploy tama-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --memory 512Mi --cpu 1 \
  --set-env-vars="SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_KEY=$SUPABASE_SERVICE_KEY" \
  --project evolution-tamagotchi

# 2. Verify
curl https://tama-api-XXXX.run.app/health
```

### Environment Variables for Cloud Run
```
SUPABASE_URL=https://cjdteaeeuejgjoymtibl.supabase.co
SUPABASE_SERVICE_KEY=*** (from Secret Manager)
GEMINI_API_KEY=*** (from Secret Manager)
PERPLEXITY_API_KEY=*** (from Secret Manager)
```

> ⚠️ **ALWAYS `.strip()` env vars from Secret Manager** — trailing `\r\n` breaks API calls (EVO-005 lesson).

---

## 📋 Common Mistakes to Avoid

1. **Not deploying after changes** — local changes don't appear until redeployed
2. **Committing .env or gcp-key.json** — gitignored! Never commit secrets
3. **PowerShell `&&`** — use `;` in PowerShell terminal (EVO-006)
4. **Marking task done without production verification** — always check deployed version (EVO-007)
