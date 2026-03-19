# NVE Genome Explorer — VS Code Extension

Sidebar extension for Visual Studio Code. Shows:

- **5-Axis Audit** — current score across all 5 axes
- **Genome Families** — collapsible tree with family members
- **Replay Gate** — latest replay results (promoted/rejected/skipped)
- **Quick Actions** — buttons to run CLI tools

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

| Command | Description |
|---------|-------------|
| `NVE: Run 5-Axis Audit` | `node cli/nve-audit.js` |
| `NVE: Distill Genomes` | `node cli/nve-distill.js` |
| `NVE: Run Replay Gate` | `node cli/nve-replay.js --dry-run --verbose` |
| `NVE: Export Pack` | `node cli/nve-pack.js distilled` |
| `NVE: Refresh All` | Refresh all panels |

## File Watcher

Panels auto-refresh when files in `.evolution/` change.
