# Agent Prompt — Post-Migration Validation

The migration and Failure Genome installation were already applied.

## Mission
Validate the repo structure and repair drift without destructive cleanup.

## Check for
- `AGENTS.md` exists and is short,
- docs referenced by `AGENTS.md` actually exist,
- `.agents/rules/`, `.agents/workflows/`, `.agents/skills/` exist,
- `.evolution/` folders exist,
- schemas exist,
- CLI scripts exist and agree with docs,
- legacy workflow names are preserved when they mattered before,
- Failure Genome uses a replay gate,
- share-pack defaults remain safe.

## Run
- `node cli/nve-manifest.js`
- `node cli/nve-audit.js`
- `node cli/nve-validate.js`
- `node cli/nve-fg-summary.js`

## Output
Provide:
1. pass/fail per major area,
2. any drift fixed,
3. any remaining risks,
4. exact next recommended actions.
