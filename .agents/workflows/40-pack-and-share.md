---
description: Pack and share — sanitized export for research pool
---

# 40 — Pack & Share

> Prepare sanitized data for sharing to research-pool or Supabase.

## Flow

1. **Audit** — run `cli/nve-audit.js` → generates audit report
2. **Select** — choose which incidents/genomes to share
3. **Redact** — run `cli/nve-pack.js`:
   - Strips: agent_id, project name, file paths, dates, code > 3 lines
   - Keeps: failure family, invariant, repair operator, evidence type, tags
4. **Review** — human reviews pack before upload
5. **Export** — save to `research-pool/incoming/` or upload to Supabase

## Pack Format

```json
{
  "pack_id": "PACK-YYYYMMDD-NNN",
  "created_at": "2026-03-18",
  "source_hash": "sha256 of repo manifest",
  "genomes": [...],
  "experience_units": [...],
  "redaction_applied": true
}
```

## Safety

- Never auto-upload without human `[Y/N]` confirmation
- Never include raw code (only repair operator descriptions)
- Follow rule 50 (sharing redaction)
