# 50 — Sharing & Redaction

> Always-on. Research pool safety.

## Before Sharing Any Data

1. **Strip**: agent_id, project name, repo paths, absolute file paths
2. **Strip**: dates more precise than month-year
3. **Strip**: code snippets > 3 lines
4. **Strip**: API keys, tokens, URLs with credentials
5. **Keep**: failure family, violated invariant, repair operator, stack tags
6. **Keep**: evidence TYPE (not content), utility scores, transferability tags

## Export Flow

Use `.agents/workflows/40-pack-and-share.md`:
1. Run `cli/nve-audit.js` — produces audit report
2. Run `cli/nve-pack.js` — strips sensitive data
3. Review pack manually before upload
4. Never auto-upload without human review

## What Goes to research-pool/

- `research-pool/incoming/` — raw packs waiting for review
- `research-pool/summaries/` — aggregated summaries

## What Goes to Supabase

Only sanitized packs after human approval.
Never raw incidents or full code.
