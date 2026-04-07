# Operator Guide — Genome Graph Agent OS

## Quick Start

```bash
# Install globally
npm install -g agent-genome-lab

# Initialize in your project
cd your-project
nve-init

# Run health check
nve-doctor

# Auto-detect best provider profile
nve-profile auto
```

## Profile Setup

```bash
nve-profile list              # See all 5 profiles
nve-profile auto              # Auto-detect from environment
nve-profile init --profile competition-safe  # Set specific profile
nve-provider check            # Verify provider is reachable
```

## Daily Workflow

### 1. Start of session
```bash
nve-doctor                    # Pre-flight check
nve-bridge inject             # Load genome context
nve-self-check smoke          # Quick structural check
```

### 2. During work
- Event hooks auto-fire on tool use (PreToolUse, PostToolUse)
- Dangerous commands auto-blocked
- Secret exposure auto-detected
- Incidents auto-captured on tool failures

### 3. End of session
```bash
nve-compact run               # Compress session context
nve-report generate           # Health score report
nve-handoff                   # Generate handoff artifact
```

### 4. Learning cycle (periodic)
```bash
nve-auto-capture              # Collect incidents
nve-distill                   # Extract lessons
nve-replay                    # Run replay gate
nve-skill-extract             # Create skill packages
```

## All CLI Tools (35)

### Core Pipeline
| Tool | Description |
|------|-------------|
| `nve-init` | Initialize .evolution/ in project |
| `nve-scaffold` | Scaffold project structure |
| `nve-memory` | MEMORY.md management |
| `nve-audit` | Audit .evolution/ structure |
| `nve-validate` | Validate JSON against schemas |

### Genome Lifecycle
| Tool | Description |
|------|-------------|
| `nve-auto-capture` | Auto-capture incidents from events |
| `nve-distill` | Extract lessons from incidents |
| `nve-replay` | Replay gate evaluation (Γ function) |
| `nve-fg-summary` | Failure genome summaries |
| `nve-utility` | Utility score calculations |

### Skill System
| Tool | Description |
|------|-------------|
| `nve-skill-extract` | Extract skills from genomes |
| `nve-skill-index` | Skill index management |
| `nve-skill-package` | Package skills for sharing |
| `nve-skill-search` | Search skill registry |
| `nve-skill-export` | Export skills |
| `nve-skill-import` | Import skills |

### Runtime Shell (v3.0)
| Tool | Description |
|------|-------------|
| `nve-provider` | Provider abstraction (5 providers) |
| `nve-doctor` | Runtime health (10 checks) |
| `nve-profile` | Profile management (5 profiles) |
| `nve-hooks` | Event bus + policy hooks |
| `nve-memory-tree` | 5-layer memory compiler |
| `nve-subagent` | Subagent registry (5 defaults) |
| `nve-bridge` | Runtime↔Genome bridge |
| `nve-worktree` | Git worktree isolation |
| `nve-compact` | Context compaction |
| `nve-serve` | Local HTTP API + SSE |

### Hardening (v3.1)
| Tool | Description |
|------|-------------|
| `nve-self-check` | Smoke + strict validation |
| `nve-report` | Session health reports |

### Operations
| Tool | Description |
|------|-------------|
| `nve-handoff` | Session handoff artifacts |
| `nve-contract` | Contract management |
| `nve-plan` | Plan management |
| `nve-analytics` | Usage analytics |
| `nve-manifest` | Manifest generation |
| `nve-pack` | Package for distribution |
| `nve-export-dashboard` | Dashboard data export |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `nve-doctor` fails provider check | Set API key: `export ANTHROPIC_API_KEY=...` |
| Placeholder key detected | Replace `sk-...` with real key |
| `.evolution/` not found | Run `nve-init` in project root |
| Hook timeout | Check hooks in `.evolution/hooks/`, max 3s per hook |
| Memory stale warning | Run `nve-memory update` |
| Worktree orphaned | Run `nve-worktree cleanup` |
| Bridge disconnected | Run `nve-bridge inject` first |

## FAQ

**Q: Do I need API keys to use this?**
A: No. Use `competition-safe` or `local-fast` profiles with Ollama for fully local operation.

**Q: How do I add genomes from another project?**
A: Use `nve-skill-import` to import skill packages, or copy genome JSONs to `.evolution/failure_genomes/`.

**Q: What's the replay gate?**
A: A quality filter: `Γ(g) = w_r·p_replay + w_t·p_transfer + w_v·q_verifier − w_h·h_risk − w_l·l_leak`. Only genomes passing threshold get promoted to memory.

**Q: Can I use this with Claude Code?**
A: Yes. The event bus hooks align with Claude Code's hook system. Memory tree compiles MEMORY.md for any agent.

**Q: How do I share genomes across projects?**
A: Use `nve-skill-package` to create portable skill bundles, then `nve-skill-import` in the target project.

**Q: What data is stored?**
A: All data in `.evolution/` — incidents, genomes, skills, configs. No cloud sync, fully local.

**Q: Is there a web dashboard?**
A: Yes. Run `nve-serve` and connect to `http://localhost:8099`. The VS Code extension also integrates.

**Q: How to reset everything?**
A: Delete `.evolution/` and run `nve-init` again. All state is in that directory.

**Q: Zero dependencies — really?**
A: Yes. Pure Node.js >=18, no npm install needed for the CLI tools themselves.

**Q: How to contribute?**
A: Open issues/PRs at https://github.com/creanlab/agent-genome-lab
