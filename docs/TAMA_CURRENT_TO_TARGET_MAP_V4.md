# TAMA Current-to-Target Map V4

## Root

| Current | Action | Target / Result |
|---|---|---|
| `README.md` | Keep and update later | `README.md` remains |
| `package.json` | Keep | unchanged |
| `package-lock.json` | Keep | unchanged |
| `server.js` | Keep | unchanged unless product work needs it |
| `Dockerfile` | Keep | unchanged until ops pass |
| `cloudbuild.yaml` | Keep | unchanged until ops pass |
| `.env` | Keep local | not committed |
| `.env.example` | Keep | unchanged or extended |
| `.gcloudignore` | Keep | unchanged |
| `.gitignore` | Keep and extend | add `.evolution/exports/*.zip` if needed |
| `gcp-key.json` | Stop relying on it | local only; move to safer auth path later |
| `AGENTS.md` | Create | new root map |

## `.agents/workflows/`

| Current | Action | New source of truth | Compatibility path remains? |
|---|---|---|---|
| `anti-fallback-rules.md` | Backup then slim wrapper | `.agents/rules/10-truthfulness-and-no-fallbacks.md` | yes |
| `auto-evolution.md` | Backup then split | `.agents/rules/20-evolution-memory-policy.md` + `.agents/workflows/20-incident-capture.md` + `.evolution/` | yes |
| `cloud-run-deploy.md` | Backup then rewrite | `docs/ops/cloud-run.md` + workflow wrapper | yes |
| `code-review.md` | Backup then rewrite | `.agents/workflows/10-safe-change.md` and `.agents/workflows/30-repo-audit.md` | yes |
| `task-tracking.md` | Backup then rewrite | `docs/backlog_tama.md` + `docs/exec-plans/active/` | yes |

## New `.agents/rules/`

| New file | Purpose |
|---|---|
| `00-core-contract.md` | hard constraints, done definition, validation |
| `10-truthfulness-and-no-fallbacks.md` | preserve strongest anti-fallback logic |
| `20-evolution-memory-policy.md` | canonical memory contract |
| `30-docs-and-validation.md` | docs as system of record |
| `40-tama-project-focus.md` | scope control |
| `50-sharing-redaction.md` | research-pool safety |
| `60-legacy-compatibility.md` | compatibility guarantees |

## New `.agents/workflows/`

| New file | Purpose |
|---|---|
| `00-session-bootstrap.md` | start of session, read map, inspect memory |
| `10-safe-change.md` | normal implementation loop |
| `20-incident-capture.md` | classify, distill, verify, store incident |
| `30-repo-audit.md` | structural audit of repo and agent setup |
| `40-pack-and-share.md` | sanitized export flow |
| `tama-audit-and-share.md` | TAMA-specific user flow |

## New `.agents/skills/`

| New file/folder | Purpose |
|---|---|
| `incident-distiller/` | convert incidents into canonical events and experience units |
| `repo-auditor/` | repo structure and missing guardrails analysis |
| `research-packager/` | create sanitized export packs |
| `rule-patcher/` | propose rule, workflow, or skill patches |
| `tama-community-summarizer/` | summarize shared research pool |

## `cli/`

| Current | Action | Target |
|---|---|---|
| `tama-parse.js` | Keep | legacy parser |
| `tama-sync.js` | Keep | legacy sync/export |
| `nve-manifest.js` | Add | repo manifest builder |
| `nve-audit.js` | Add | local audit |
| `nve-pack.js` | Add | sanitized export pack builder |
| `tama-render-journal.js` | Add | render markdown view from canonical memory |
| `tama-pool-summary.js` | Add | summarize local research pool |

## `docs/`

| Current | Action | Target / Status |
|---|---|---|
| `backlog_legacy.md` | Keep but archive | `docs/legacy/backlog_legacy.md` copy recommended |
| `backlog_tama.md` | Keep as roadmap | primary roadmap |
| `MIGRATION_TAMAGOTCHI.md` | Backup then replace or archive | `docs/legacy/MIGRATION_TAMAGOTCHI.legacy.md`; new operator guide added |
| `POMDP_framework.md` | Keep | research/formalization doc |
| `research.md` | Keep | research base |
| `docs/exec-plans/active/` | Add | current implementation plans |
| `docs/exec-plans/completed/` | Add | historical execution plans |
| `docs/ops/cloud-run.md` | Add | stable deploy operations |
| `docs/TAMA_ARCHITECTURE_V4.md` | Add | current source-of-truth architecture |
| `docs/TAMA_USER_FLOW_AND_RESEARCH_POOL_V4.md` | Add | user flow |
| `docs/TAMA_KEEP_CHANGE_REMOVE_V4.md` | Add | maintenance guidance |
| `docs/FAILURE_GENOME_HYPOTHESIS_V1.md` | Add | new scientific layer |
| `docs/FAILURE_GENOME_EXPERIMENT_PLAN_V1.md` | Add | validation protocol |

## `TAMA_start/`

| Current | Action | Target |
|---|---|---|
| `.agents/workflows/auto-evolution.md` | Keep legacy | preserve as legacy starter |
| `visualizer/index.html` | Keep | preserve |
| `evolution_journal.md` | Keep | rendered-compatible example |
| `README.md` | Keep | legacy starter docs |
| `starter-v4/` | Add | new starter path |

## `web/`

| Current | Action | Target |
|---|---|---|
| `index.html` | Keep | unchanged |
| `vision.html` | Preserve then replace or keep legacy | `vision_legacy.html` + `vision_failure_genome_v4.html` |

## New top-level data areas

| New path | Purpose |
|---|---|
| `.evolution/` | canonical memory |
| `research-pool/` | local and hosted sharing pipeline |
| `schemas/` | data contracts |
| `supabase/` | additive research-plane and failure-genome migrations |
