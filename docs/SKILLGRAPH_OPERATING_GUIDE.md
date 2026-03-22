# SkillGraph operating guide

## First-time setup
```bash
node cli/nve-init.js --yes
```

## Normal operator loop
### 1. Build or update source memory
```bash
node cli/nve-distill.js
```

### 2. Extract reusable candidate skills
```bash
node cli/nve-skill-extract.js
```

### 3. Evaluate and connect the registry
```bash
node cli/nve-skill-index.js
```

### 4. Search locally
```bash
node cli/nve-skill-search.js "verification before done"
```

### 5. Build packages and publish runtime skills
```bash
node cli/nve-skill-package.js --auto --publish
```

### 6. Refresh compact memory and audit
```bash
node cli/nve-memory.js
node cli/nve-audit.js
```

## Status meanings
- `candidate`: extracted and plausible, but not fully admitted
- `quarantined`: too weak, risky, or incomplete for routine runtime use
- `admitted`: stable enough to compose and publish
- `rejected`: duplicate, unsafe, or not executable enough

## Guardrails
- Failure Genomes stay canonical.
- Packages must use admitted skills only.
- Metadata-first retrieval is mandatory when the registry grows.

## Useful flags

### Dry-run extraction
```bash
node cli/nve-skill-extract.js --dry-run
```
Shows what would be extracted without writing files.

### Filter extraction source
```bash
node cli/nve-skill-extract.js --from=genomes
node cli/nve-skill-extract.js --from=experience_units
```

### Custom package
```bash
node cli/nve-skill-package.js --name=my-bundle --skills=SK-000001,SK-000004 --publish
```

### Search with filters
```bash
node cli/nve-skill-search.js "schema migration" --status=admitted --top=5
node cli/nve-skill-search.js "fallback" --json
node cli/nve-skill-search.js "verification" --category=verification --tag=replay
```

## After merging the upgrade
```bash
node cli/nve-init.js --yes       # creates new dirs if missing
node cli/nve-audit.js            # confirm structure is intact
node cli/nve-memory.js           # regenerate MEMORY.md
```
All existing commands continue to work unchanged.
