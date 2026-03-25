# Safe Migration Playbook

## Core rule
Treat migration as **additive first**.
Do not start by deleting or flattening current files.

## Preserve first
Before changing old agent files:
- copy them into `docs/legacy/` or a clear legacy location,
- preserve recognizable names,
- keep wrappers where discoverability matters.

## High-risk areas
Ask before changing:
- auth,
- billing,
- external integrations,
- destructive data migrations,
- secrets handling,
- major schema changes.

## Rollback strategy
You should always be able to revert to a clean point by:
1. resetting the migration branch,
2. comparing the preflight plan against the applied changes,
3. restoring legacy workflow files if wrappers are broken.

## Compatibility strategy
Old repos often have one or more of these:
- `.agents/workflows/*.md` only,
- hand-edited markdown journals,
- no canonical `.evolution/` memory,
- product docs mixed with operational docs.

The safe answer is not deletion.
The safe answer is:
- separate concerns,
- keep compatibility paths,
- gradually move source of truth.

## Migration smell list
Stop and review if the agent tries to:
- delete current workflow files immediately,
- turn `AGENTS.md` into a giant encyclopedia,
- upload raw code into a research pool,
- replace all docs without preserving intent,
- introduce Failure Genome without a replay gate,
- mutate global prompts without evidence.
