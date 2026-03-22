# 25 — Incident Auto-Capture Triggers

> Always-on. Defines concrete events that MUST produce an incident record.

## Why This Rule Exists

Declarative rules ("you should record incidents") don't work without concrete triggers.
Agents focus on the task and forget about incident capture unless specific events fire.
This rule converts passive advice into active triggers.

## Automatic Trigger Events

When ANY of these occur during a session, **immediately** create `.evolution/incidents/INC-NNNNNN.json`:

| Trigger | Example | Min Severity |
|---------|---------|-------------|
| **Command fails 2+ times** | build error, test crash, deploy failure | 3 |
| **Workaround applied** | skip test, use different approach, rename file to bypass | 5 |
| **Rollback / revert** | `git revert`, manual undo, restore from backup | 6 |
| **Silent data loss** | empty output, missing artifact, truncated result | 8 |
| **Wrong assumption corrected** | "function X is dead" → turns out it's used internally | 4 |
| **Test hangs or times out** | test stuck >60s on a single test | 5 |
| **API returns unexpected result** | 429, 500, rate limit, wrong response format | 4 |
| **User reports regression** | "this used to work" or "this is broken" | 7 |
| **Security-sensitive event** | key exposed, auth bypass, permission error | 9 |

## Quick Template

```json
{
  "event_id": "INC-NNNNNN",
  "event_type": "failure|prevention|observation",
  "stage": "code|test|build|deploy|runtime|review|docs|ops",
  "created_at": "ISO-8601",
  "safe_title": "One line, no secrets, no file paths",
  "safe_summary": "What happened",
  "safe_root_cause": "Why it happened",
  "failure_class": "descriptive-kebab-case",
  "impact_score": 1,
  "repair_class": "fix|workaround|deferred",
  "repair_actions": ["what was done"],
  "stack_tags": ["technology", "area"],
  "resolution_status": "resolved|workaround|open"
}
```

## Pre-Commit Check

Before EVERY commit, ask yourself:
> "Did anything unexpected happen since my last commit? Any retries, workarounds, wrong assumptions, or failures?"

If yes → create incident BEFORE committing.

## End-of-Session Check

Before ending a session:
1. Were there any uncaptured incidents?
2. Does `.evolution/MEMORY.md` need regenerating? (`node cli/nve-memory.js`)
3. Are there new lessons worth an experience unit?
