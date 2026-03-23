---
description: Anti-fallback rules - NEVER introduce silent fallbacks or simulated data
---

# ⛔ Anti-Fallback & Anti-Fake Rules

## NEVER Do These Things

### 1. Silent Fallbacks (try/except → empty result)
```python
# ❌ FORBIDDEN — hides real errors from the user
try:
    result = expensive_llm_call(...)
except Exception:
    result = []  # "non-fatal"

# ✅ CORRECT — let it crash, fix the root cause
result = expensive_llm_call(...)  # crash = visible error = fix it
```

**If LLM call times out:**
- Increase timeout_sec (600s → 900s)
- Reduce input size (3 articles → 1)
- Simplify the prompt
- DO NOT wrap in try/except and return empty

### 2. Simulated/Fake Data for UI
```python
# ❌ FORBIDDEN — manufactured curves, fake optimization steps
base_score = coverage * 2 + nodes * 3
for strategy in ["coverage_first", "authority_weighted", ...]:
    score = base_score + delta  # FAKE

# ✅ CORRECT — show real per-engine data, even if it's zero
for engine, stats in real_engine_stats.items():
    cite_ratio = stats["cited"] / stats["total"]  # REAL
```

**If real data looks bad (Coverage=0%):**
- Show 0% — that's the truth
- Add UI tooltip explaining why (new site, first run)
- DO NOT manufacture a fake improvement curve

### 3. "Non-fatal" Comments
The phrase "non-fatal" in a comment is a RED FLAG. It means:
- Someone decided an error is acceptable
- The root cause was NOT fixed
- The user will not see the error

**Instead:** Fix the root cause. If the operation is truly optional,
mark the output explicitly: `generation_method: "fallback_static"`.

## Root Cause History

| Date | Commit | What Happened | Anti-Pattern |
|------|--------|---------------|-------------|
| 2026-03-11 | 7a5202b | Fake SONAR scoring trace created | Simulated data for UI |
| 2026-03-12 | 83ab077 | Publication articles wrapped in try/except | Silent fallback |
| 2026-03-15 | c101b79 | Both removed (Fallback Purge P12) | ✅ Fixed |

## When Fallbacks ARE Acceptable

1. **Static templates with explicit marking**: `generation_method: "static"` visible in UI
2. **Feature disabled via env**: `FEATURE_X_ENABLED=false` → skip entirely, log it
3. **Non-LLM enrichments**: Adding readability scores, heatmaps — if they fail, the core artifact still works

## Checklist Before Committing

- [ ] No new `try/except` around LLM calls that return empty on failure
- [ ] No `# Simulate` or `# Fallback` comments in new code
- [ ] No `"non-fatal"` in new log messages
- [ ] All scores/metrics come from real data, not formulas
- [ ] If Coverage=0%, UI shows 0% (not a manufactured curve)
