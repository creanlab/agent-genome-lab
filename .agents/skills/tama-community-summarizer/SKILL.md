---
name: tama-community-summarizer
description: Summarize shared research pool for community insights
---

# TAMA Community Summarizer

> Aggregates and summarizes research pool data for community intelligence.

## When to Use

After receiving packs in `research-pool/incoming/` or when querying community data.

## Procedure

### 1. Collect Packs
Read all files in `research-pool/incoming/`.

### 2. Aggregate
Count by:
- Failure family (which families are most common?)
- Violated invariant (which rules are broken most?)
- Repair operator (which fixes are most reusable?)
- Stack tags (which stacks have most issues?)

### 3. Identify Patterns
- Most common failure families → community anti-patterns
- Most effective repair operators → community best practices
- Transferability hotspots → universally applicable lessons

### 4. Generate Summary
Save to `research-pool/summaries/SUMMARY-YYYYMMDD.json`:
```json
{
  "summary_date": "2026-03-18",
  "total_packs": 5,
  "total_genomes": 42,
  "top_families": [
    { "family": "verification-skipped-before-done", "count": 12 },
    { "family": "silent-fallback-introduced", "count": 9 }
  ],
  "top_repair_operators": [
    { "operator": "add-e2e-verification-step", "count": 8 }
  ],
  "transfer_recommendations": [...]
}
```

### 5. For Dashboard
If integrated with frontend, provide community data via `/api/community` endpoint.
