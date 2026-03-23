---
description: Quick genome health check — run audit, show genome count, skill count, and system status
---

# /genome-status — Quick Health Check

> Run this any time to see the current state of the evolution system.

## Steps

// turbo
1. Run `node cli/nve-audit.js` in the project root directory

2. Read `.evolution/MEMORY.md` and count the rules listed

3. Count genomes: `ls .evolution/genomes/` (count .json files)

4. Count skills: `ls .evolution/skills/registry/` (count .json files)

5. Report to user in this format:

```
🧬 Genome Lab Status:
━━━━━━━━━━━━━━━━━━━━
📊 Audit Grade: [A/B/C/D/F]
🧬 Genomes: [N] (promoted: X, pending: Y)
🧩 Skills: [N] (admitted: X, quarantined: Y)
📋 MEMORY.md: [N] rules loaded
⚡ Last incident: [date/ID]
```
