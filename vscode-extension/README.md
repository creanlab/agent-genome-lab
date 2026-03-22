# NVE Genome Explorer — VS Code Extension

Sidebar extension for Visual Studio Code with **6 live panels**:

- **5-Axis Audit** — current score across all 5 axes + SkillGraph extension score
- **Genome Families** — collapsible tree with family members (click to open JSON)
- **Replay Gate** — latest replay results (promoted/rejected/skipped)
- **Skill Registry** — all skills grouped by status (admitted/candidate/quarantined/rejected)
- **Skill Packages** — all packages with expandable skill lists
- **Quick Actions** — one-click buttons for all CLI tools

## Installation (dev mode)

```bash
# Windows:
xcopy /E /I "vscode-extension" "%USERPROFILE%\.vscode\extensions\nve-genome-explorer"

# Mac/Linux:
cp -r vscode-extension ~/.vscode/extensions/nve-genome-explorer

# Then restart VS Code
```

## Auto-Activation

The extension activates when the workspace contains `.evolution/failure_genomes`.

## Commands

### Core Pipeline
| Command | Description |
|---------|-------------|
| `NVE: Run 5-Axis Audit` | `node cli/nve-audit.js` |
| `NVE: Distill Genomes` | `node cli/nve-distill.js` |
| `NVE: Run Replay Gate` | `node cli/nve-replay.js --dry-run --verbose` |
| `NVE: Export Pack` | `node cli/nve-pack.js distilled` |

### SkillGraph Pipeline
| Command | Description |
|---------|-------------|
| `NVE: Extract Skills` | `node cli/nve-skill-extract.js` |
| `NVE: Index Skills` | `node cli/nve-skill-index.js` |
| `NVE: Package Skills` | `node cli/nve-skill-package.js --auto --publish` |
| `NVE: Search Skills` | Interactive search with input box |

### Utility
| Command | Description |
|---------|-------------|
| `NVE: Refresh All` | Refresh all 6 panels |

## File Watcher

All panels auto-refresh when files in `.evolution/` change (create, modify, or delete).

## Skill Registry Panel

Skills are grouped by admission status:
- ✅ **Admitted** — ready for use, passed evaluation
- ⏳ **Candidate** — awaiting full evaluation
- 🟡 **Quarantined** — needs review before use
- ❌ **Rejected** — failed evaluation or duplicate

Click any skill to open its JSON definition in the editor.

## Skill Packages Panel

Shows all skill packages with:
- Package ID, title, and skill count
- Expand to see included skills
- Tooltip shows category, tags, and publication path

## Audit Panel (SkillGraph Extension)

The audit panel now shows an additional **SkillGraph** line below the 5-axis scores:
- Skill count, package count
- Tooltip: admitted/candidate/quarantined breakdown + relation count
