---
description: Standard implementation loop — plan, implement, verify, commit
---

# 10 — Safe Change

> Use for normal implementation tasks (features, fixes, refactors).

## Flow

```
1. PLAN
   - Read relevant code/docs
   - State what you will change and why
   - Identify risk level (low / medium / high)
   
2. IMPLEMENT
   - Make changes (one logical unit per commit)
   - Follow rule 10 (no fallbacks)
   - Follow rule 20 (capture incidents if errors occur)

3. VERIFY
   - Test locally if possible
   - For frontend: check in browser
   - For backend: check endpoint responses
   - For deploy: verify on production

4. COMMIT
   - Descriptive commit message
   - Push to branch
   - Update backlog status
```

## Risk Levels

| Risk | Examples | Extra Steps |
|------|----------|-------------|
| **Low** | CSS fix, doc update, config change | No pause needed |
| **Medium** | New feature, API change, dependency update | State plan before implementing |
| **High** | Schema migration, auth change, deploy config, destructive ops | Pause and get explicit approval |

## When to Pause

Only pause for explicit user approval when:
- Risk is HIGH
- User explicitly asked for review
- Change affects auth, billing, or data deletion
- Migration or schema change

Do NOT pause after every section — that was the old `code-review.md` behavior.
