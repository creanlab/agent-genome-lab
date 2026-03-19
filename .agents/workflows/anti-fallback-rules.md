---
description: Anti-fallback rules — COMPATIBILITY WRAPPER → rule 10
---

# ⛔ Anti-Fallback & Anti-Fake Rules

> **V4**: This file is a compatibility wrapper.
> The source of truth is `.agents/rules/10-truthfulness-and-no-fallbacks.md`.
> This file exists so old references still resolve.

## Quick Reference

1. No silent fallbacks — let it crash, fix root cause
2. No simulated data — show real values (even 0%)
3. No "non-fatal" suppression — wrong data IS a bug
4. Explicit marking for optional static outputs

## Examples (kept for project context)

```python
# ❌ FORBIDDEN
try:
    result = expensive_llm_call(...)
except Exception:
    result = []

# ✅ CORRECT
result = expensive_llm_call(...)
```

## Full Rule → `.agents/rules/10-truthfulness-and-no-fallbacks.md`
## Legacy backup → `docs/legacy/workflows/anti-fallback-rules.legacy.md`
