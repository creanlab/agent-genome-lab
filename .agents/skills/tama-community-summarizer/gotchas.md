# Gotchas — tama-community-summarizer

> Common pitfalls and edge cases when applying this skill.

## When This Skill Fires False Positives

## Edge Cases

## Anti-Patterns to Avoid

- **Blind application**: Don't apply the repair operator without verifying the root cause matches
- **Missing verification**: Always run the verifier after applying — a silent failure is worse than a loud one
- **Over-scoping**: Apply only to the specific files/modules affected, not globally

## When to Escalate

If the skill's repair operator doesn't resolve the issue:
1. Check if the root cause is actually a different failure family
2. Look for interfering genomes that may conflict
3. Create a new incident — the skill may need refinement
