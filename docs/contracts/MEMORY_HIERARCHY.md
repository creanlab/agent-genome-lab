# Memory Hierarchy — 5-Layer Compilation

> Hierarchical memory with explicit precedence rules and provenance tracking.

## Layers

| # | Layer | Source | Priority |
|---|-------|--------|----------|
| 1 | **Global** | `~/.evolution/MEMORY.md` or `~/.claude/MEMORY.md` | Lowest |
| 2 | **Project** | `.evolution/MEMORY.md` | Medium |
| 3 | **Subtree** | Subdirectory `.evolution/MEMORY.md` overrides | High |
| 4 | **Session** | `.evolution/session_digest.md` (compact output) | Higher |
| 5 | **Promoted** | Promoted genomes + skills from `.evolution/failure_genomes/` | Highest |

## Precedence Rules

- **Level**: subtree > project > global
- **Type**: promoted > session > static
- **Same-level conflict**: later write wins (last-writer-wins)
- **Anti-patterns**: union across all layers (never dropped)

## Layer Discovery

```
~/.evolution/MEMORY.md          → Layer 1 (global)
~/.claude/MEMORY.md             → Layer 1 (fallback)
{project}/.evolution/MEMORY.md  → Layer 2 (project)
{subdir}/.evolution/MEMORY.md   → Layer 3 (subtree, walk up to project root)
{project}/.evolution/session_digest.md → Layer 4 (session)
{project}/.evolution/failure_genomes/*.json (promoted=true) → Layer 5
{project}/.agents/skills/*/SKILL.md → Layer 5
```

## Compilation

1. Discover all layers from target dir up to project root
2. Parse each MEMORY.md: extract `**key**: value` rules, anti-patterns from `## Anti-Patterns`/`## Avoid`
3. Merge into `ruleMap` (Map) — same key overwrites (last-writer-wins)
4. Union all anti-patterns
5. Track provenance: each fragment tagged with source layer + file path
6. Render to markdown for context injection

## Compiled Bundle Schema

```json
{
  "schema_version": "1.0.0",
  "compiled_at": "2026-04-07T...",
  "target_dir": "/path/to/project",
  "layers_count": 3,
  "layers": [
    { "level": "global", "path": "~/.evolution/MEMORY.md" },
    { "level": "project", "path": ".evolution/MEMORY.md" }
  ],
  "merged": {
    "context": "...",
    "rules": [{ "key": "rule_name", "value": "rule_text", "layer_level": "project" }],
    "anti_patterns": [{ "text": "...", "layer": "project" }]
  },
  "provenance": [{ "key": "rule_name", "layer": "project", "source": "/path/to/MEMORY.md" }],
  "rendered": "# Memory Context (compiled)\n..."
}
```

## CLI Commands

```bash
nve-memory-tree show                  # Print compiled memory
nve-memory-tree compile [--cwd <dir>] # Full compilation + save bundle
nve-memory-tree layers                # Show discovered layers
nve-memory-tree resolve <key>         # Which layer provides a key
```
