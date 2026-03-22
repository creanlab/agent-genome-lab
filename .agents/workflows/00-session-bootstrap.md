---
description: Start-of-session bootstrap — read context, inspect memory, plan
---

# 00 — Session Bootstrap

> Run this at the start of every new chat session.

## Steps

1. **Read root contract**: `AGENTS.md`
2. **Read compact memory**: `.evolution/MEMORY.md` — contains verified lessons, anti-patterns, and recent incidents. **This is the most important file for avoiding repeat mistakes.**
3. **Read rules**: all files in `.agents/rules/` (numbered order)
4. **Check recent incidents**: `ls .evolution/incidents/` — read the 3 most recent
5. **Check active exec plans**: `ls docs/exec-plans/active/` — read if any exist
6. **Set incident tracking mode**: From this moment, watch for trigger events listed in `.agents/rules/25-incident-auto-capture.md`. When a trigger fires → create an incident immediately, don't wait until end of session.
7. **Report to user**: "I've read the context. Incidents: X, last: Y, active plan: Z."

## If No Context Exists

If `.evolution/` doesn't exist yet, run `node cli/nve-init.js --yes` to create it.
If `.evolution/incidents/` is empty, say so. Do NOT fabricate context.

## Anti-Pattern: Context Amnesia

Every new chat MUST read the memory. Do not start coding without reading.
This prevents the #1 failure mode: repeating a mistake that was already solved.
