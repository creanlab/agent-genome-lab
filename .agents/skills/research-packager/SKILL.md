---
name: research-packager
description: Create sanitized export packs from canonical memory for research pool
---

# Research Packager

> Produces redacted, shareable packs from incident data.

## When to Use

When user wants to contribute data to the research pool or share with trusted users.

## Procedure

### 1. Select Incidents
Choose which incidents and genomes to include.

### 2. Redact
For each item, strip:
- agent_id
- project name
- file paths (absolute or relative)
- dates (keep only month-year)
- code snippets > 3 lines
- API keys, URLs with credentials

Keep:
- failure family
- violated invariant
- repair operator
- verifier evidence TYPE
- transferability tags
- utility scores

### 3. Package
Create pack file:
```json
{
  "pack_id": "PACK-YYYYMMDD-NNN",
  "source_hash": "sha256 of repo manifest (for dedup)",
  "redaction_version": "v1",
  "genomes": [...],
  "experience_units": [...],
  "metadata": {
    "total_incidents": 14,
    "total_genomes": 5,
    "stack_tags": ["node", "supabase", "cloud-run"],
    "repo_maturity": "hybrid"
  }
}
```

### 4. Save
Output to `.evolution/exports/PACK-YYYYMMDD-NNN.json`

### 5. Human Review
ALWAYS ask for human confirmation before sharing.
