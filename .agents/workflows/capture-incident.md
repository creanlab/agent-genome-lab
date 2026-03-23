---
description: Capture a failure incident, extract genome, and update MEMORY.md in one flow
---

# /capture-incident — One-Shot Incident → Genome Pipeline

> Use this after fixing any bug, error, or unexpected behavior.

## Steps

1. Ask the user: "Describe the incident in one sentence and rate severity (1-10)"

// turbo
2. Run: `node cli/nve-scaffold.js incident --slug <slug-from-description> --severity <severity>`

3. Read the generated JSON file and fill in the TODO fields based on the conversation context:
   - `safe_summary` — what happened
   - `safe_root_cause` — why it happened
   - `repair_class` — how it was fixed

4. Save the updated JSON file

// turbo  
5. Run: `node cli/nve-distill.js`

// turbo
6. Run: `node cli/nve-memory.js`

7. Report: "🧬 Incident captured → Genome extracted → MEMORY.md updated"
