# Subagent Guide

## Default Subagents (5)

| Name | Tools | Isolation | Purpose |
|------|-------|-----------|---------|
| `retriever` | Read, Grep, Glob | none | Find relevant genomes, skills, code chunks |
| `critic` | Read, Grep, Glob | none | Adversarial review of hypotheses/candidates |
| `patcher` | Read, Edit, Grep, Glob, Bash | worktree | Apply repair operators from genomes |
| `replayer` | Read, Bash, Grep | none | Run replay gate checks |
| `skill-distiller` | Read, Grep, Glob | none | Convert incidents → lessons → genomes |

## Register a New Subagent

Create a JSON file:

```json
{
  "name": "my-checker",
  "description": "Custom code quality checker",
  "allowed_tools": ["Read", "Grep", "Glob"],
  "system_prompt": "You are a code quality checker. Review the given files for common issues: unused imports, console.log statements, TODO comments. Report findings as a structured list.",
  "source_skill": null,
  "source_genome": null,
  "max_tokens": 4096,
  "isolation": "none"
}
```

Then register:

```bash
nve-subagent register my-checker.json
```

## Schema Requirements

Required fields:
- `name` — unique identifier
- `description` — what this subagent does
- `allowed_tools` — array of permitted tools (Read, Edit, Grep, Glob, Bash, Write)
- `system_prompt` — the prompt that defines subagent behavior

Optional fields:
- `source_skill` — which skill this subagent was derived from
- `source_genome` — which genome this subagent was derived from
- `max_tokens` — context window limit
- `isolation` — `"none"` or `"worktree"` (use worktree for destructive operations)

## Tool Restrictions

Subagents declare allowed tools but **enforcement is not yet runtime-enforced** (see Known Limitations). The restriction serves as documentation and intent for future runtime integration.

Safe tool sets:
- **Read-only**: `["Read", "Grep", "Glob"]` — for analysis, search, review
- **Edit-capable**: `["Read", "Edit", "Grep", "Glob"]` — for modifications
- **Full**: `["Read", "Edit", "Grep", "Glob", "Bash"]` — use with `isolation: "worktree"`

## CLI Commands

```bash
nve-subagent list       # Show all registered subagents
nve-subagent register <file.json>  # Register new subagent
nve-subagent invoke <name>         # Dry-run invocation
nve-subagent validate   # Validate all subagent schemas
nve-subagent init       # Create default 5 subagents
```
