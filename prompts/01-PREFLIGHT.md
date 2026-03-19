# Agent Prompt — Preflight for Genome Toolkit Migration

You are inspecting this repository before any structural migration.

## Read first
Read these files from the Agent Genome Lab toolkit:
- `README.md`
- `AGENTS.md`
- `docs/UNIVERSAL_ARCHITECTURE.md`
- `docs/SAFE_MIGRATION_PLAYBOOK.md`
- `docs/FAILURE_GENOME_HYPOTHESIS_V1.md`

## Mission
Inspect the current repo and produce a safe migration plan.

## Hard constraints
1. Do not perform structural edits yet.
2. Do not delete any existing files.
3. Do not flatten current docs or workflows into a giant replacement.
4. Assume the repo may currently keep too much inside `.agents/workflows/`.
5. Preserve current project assets, docs, scripts, tests, and deploy files.

## Required output
Produce a clear plan that includes:
- current structure summary,
- target structure summary,
- old-to-new mapping for current `.agents/workflows/*` files,
- which files should be copied into `docs/legacy/`,
- which files should become wrappers,
- what to create under `.agents/rules/`, `.agents/workflows/`, `.agents/skills/`, `.evolution/`, `schemas/`, `templates/`, `cli/`,
- a low-risk execution order,
- any repo-specific risks.

## Do not apply changes yet
Stop after the plan.
