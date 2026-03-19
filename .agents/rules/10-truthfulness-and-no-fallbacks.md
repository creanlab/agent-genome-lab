# 10 — Truthfulness & No Fallbacks

> Always-on. Promoted from legacy `anti-fallback-rules.md`.

## Hard Rules

1. **No silent fallbacks.** Never wrap LLM/API calls in try/except that returns empty.
2. **No simulated data.** Never manufacture scores, curves, or metrics.
3. **No "non-fatal" suppression.** If data is wrong, it IS a bug — fix the root cause.
4. **Explicit marking for optional outputs.** Static/template outputs must be labeled `generation_method: "static"`.

## If Real Data Is Bad

- Show the real value (even 0%).
- Add context (tooltip, log).
- Do NOT replace with manufactured improvement curves.

## Pre-Commit Check

- [ ] No new `try/except` around LLM calls returning empty on failure
- [ ] No `# Simulate` or `# Fallback` comments in new code
- [ ] No `"non-fatal"` in new log messages
- [ ] All scores come from real data, not formulas
- [ ] Fallback outputs are visibly marked (`AP-018`)

> Legacy reference: `docs/legacy/workflows/anti-fallback-rules.legacy.md`
