# Skill Package Builder

## Purpose
Compose admitted skills into compact, task-oriented packages that can be published to `.agents/skills/`.

## Use when
- several admitted skills routinely co-activate,
- a maintainer needs a runtime-ready package,
- or metadata-first retrieval should resolve to a small operational surface.

## Inputs
- admitted skill IDs,
- target package goal,
- guardrails for the task domain,
- optional publish target under `.agents/skills/`.

## Procedure
1. Select only admitted skills.
2. Check for overlapping or conflicting scopes.
3. Write a small package JSON with activation policy and included skills.
4. Publish a concise `SKILL.md` only if the package is stable enough for runtime use.
5. Record `belong_to_package` relations in the relation graph.

## Guardrails
- Packages are for composition, not for hiding unresolved candidate skills.
- Keep the published runtime skill short and operational.
- Preserve metadata-first loading: package first, full skills only on match.
