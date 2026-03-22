# 60 — Legacy Compatibility

> Always-on. Guarantees for old formats and paths.

## Guaranteed Paths

These paths MUST continue to exist and resolve:
- `.agents/workflows/auto-evolution.md` (wrapper)
- `.agents/workflows/anti-fallback-rules.md` (wrapper)
- `.agents/workflows/code-review.md` (wrapper)
- `.agents/workflows/task-tracking.md` (wrapper)
- `.agents/workflows/cloud-run-deploy.md` (wrapper)
- `web/index.html` (main dashboard)
- `TAMA_start/evolution_journal.md` (starter template)
- `TAMA_start/.agents/workflows/auto-evolution.md` (starter rules)
- `docs/research.md` (research base)
- `docs/POMDP_framework.md` (formalization)
- `docs/backlog_tama.md` (roadmap)

## Journal Format

The old markdown journal format with `<!-- STATUS_JSON -->`, `<!-- EVO_JSON -->`,
`<!-- PATTERN_JSON -->`, `<!-- AP_JSON -->` blocks MUST remain parseable by `web/index.html`.

New canonical memory (`.evolution/`) is primary, but the markdown format is a valid view.

## Starter Kit

`TAMA_start/` must remain functional as-is for legacy users.
New V4 starter is at `TAMA_start/starter-v4/`.

## Legacy Backups

Original workflow files are preserved at `docs/legacy/workflows/*.legacy.md`.
