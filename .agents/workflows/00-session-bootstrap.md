---
description: Start-of-session bootstrap — read context, inspect memory, plan
---

# 00 — Session Bootstrap

> Run this at the start of every new chat session.

## Steps

1. **Read root contract**: `AGENTS.md`
2. **Read rules**: all files in `.agents/rules/` (numbered order)
3. **Read current backlog**: `docs/backlog_tama.md`
4. **Check recent incidents**: `ls .evolution/incidents/` — read the 3 most recent
5. **Check active exec plans**: `ls docs/exec-plans/active/` — read if any exist
6. **Report to user**: "I've read the context. Current level: X, last incident: Y, active plan: Z."

## If No Context Exists

If `.evolution/incidents/` is empty or `docs/backlog_tama.md` is missing, say so.
Do NOT fabricate context.

## Anti-Pattern: Context Amnesia

Every new chat MUST read the memory. Do not start coding without reading.
This is GAP-5 from the autonomy audit.
