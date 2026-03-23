---
description: Auto-evolution protocol — learning from mistakes, preventing regressions
---

# Auto-Evolution Protocol

> **Purpose**: Systematic learning from deployment errors to prevent recurrence.
> Never repeat the same mistake twice.
> **Project**: Evolution Tamagotchi (standalone)

---

## 🔴 RULE 1: Never Deploy Without Verifying Against Baseline

Before deploying ANY code change:

1. **Run ALL tests** — not just new ones. Full suite must pass.
2. **Compare output** with baseline build — visually inspect key artifacts.
3. **If changing frontend** — verify all pages render correctly in browser.
4. **If changing backend/API** — test endpoints with real data.

---

## 🔴 RULE 2: One Change → One Deploy → One Verify

**DO NOT** batch multiple features into one deploy without intermediate verification.

Each atomic change should follow:
```
Code change → Build → Deploy → Verify on prod → Commit
```

**NOT**:
```
Change A → Change B → Change C → Deploy → "hope it works"
```

---

## 🔴 RULE 3: Observe User Feedback Patterns

### Known Recurring Issues

| Pattern | Root Cause | Prevention |
|---------|-----------|------------|
| **PowerShell `&&` command chaining** | Agent uses bash-style `&&` but PowerShell doesn't support it | **ALWAYS use `;` (semicolon) in PowerShell.** Check OS metadata first. |
| **Tasks falsely marked done** | Sprint tasks closed without end-to-end verification | **Task DOD = works on PRODUCTION, not just in code.** |
| **Cloud Run ephemeral FS** | Files saved to disk disappear between requests | **ALWAYS persist to Supabase/storage**, never rely on disk state. |
| **Secret Manager trailing whitespace** | API keys with `\r\n` cause header errors | **ALWAYS `.strip()` env vars from Secret Manager.** |
| **gcloud.ps1 execution policy** | PowerShell blocks unsigned scripts | Use `cmd /c "gcloud ..."` wrapper on Windows. |
| **ripgrep encoding issues** | ripgrep may fail on UTF-8 files with BOM or special chars | Fallback to `Select-String` on Windows. |
| **Gemini model name mismatch** | Model names have preview/version suffixes that change | **ALWAYS verify model name against API docs.** Current: `gemini-3.1-pro-preview`. |

---

## 🔴 RULE 4: Regression Checklist After Every Sprint

Before closing a sprint, verify EACH of these MANUALLY:

1. ☐ Visualizer loads correctly in browser
2. ☐ Solo mode: demo data renders all sections
3. ☐ Multi-user mode: leaderboard, health scores, GEA working
4. ☐ File upload parses STATUS_JSON and EVO_JSON correctly
5. ☐ Back button returns to input
6. ☐ Responsive design works on mobile
7. ☐ Fitness Dashboard renders 6 metric cards with animated bars
8. ☐ Danger Zone shows risk categories from anti-patterns
9. ☐ DNA Mutation Log displays chronological entries
10. ☐ Gist tab loads data from GitHub API
11. ☐ Toast notifications fire on state changes
12. ☐ localStorage resume button appears after first load

---

## 🟡 RULE 5: Error Documentation

When an error occurs:

1. **Document immediately** — add to this file under "Known Recurring Issues"
2. **Root cause** — find the exact line(s) that caused it
3. **Write a test** — if the error is testable, add a unit test
4. **Update workflow** — add prevention steps to relevant workflow file
5. **Tag the fix** — commit message must reference the error pattern

---

## 🟡 RULE 6: User Feedback Processing

When user gives negative feedback:

1. **Acknowledge honestly** — don't deflect or minimize
2. **Categorize** — is it a regression (broke something) or a gap (never worked)?
3. **If regression** — find the commit that introduced it, revert if critical
4. **If gap** — add to backlog with proper priority
5. **Update this doc** — add the feedback pattern so it's not repeated

### Feedback History

> **Full history**: `TAMA_start/evolution_journal.md` → "Журнал Эволюции"
> **Anti-Patterns**: `TAMA_start/evolution_journal.md` → "Anti-Pattern Registry"
> **Patterns**: `TAMA_start/evolution_journal.md` → "Pattern Registry"

---

## 🟢 RULE 7: Safe Deployment Checklist

```
Before Deploy:
☐ All tests pass
☐ git diff against baseline — no unintended changes
☐ If frontend: test in incognito browser

After Deploy:
☐ All pages load without console errors
☐ Demo data renders correctly
☐ File upload works
☐ Multi-user comparison works
```

---

## 🔵 Anti-Pattern Registry

| # | Anti-Pattern | Fix |
|---|-------------|-----|
| AP-001 | Feature Sprint Blindness | Verify after EACH feature, not batch |
| AP-002 | Test-Only Validation | Visual verification required |
| AP-003 | Fallback Addiction | NO FALLBACKS. Retry → crash → debug |
| AP-004 | Documentation Drift | Update migration docs when updating workflows |
| AP-005 | Bash `&&` in PowerShell | PowerShell uses `;` not `&&`. Check shell env. |
| AP-006 | False Done Status | Verify on PRODUCTION, not just in code |

---

## 🧬 RULE 8: Post-Fix Evolution Algorithm

> **Journal**: `TAMA_start/evolution_journal.md` or your project's journal

### Algorithm after EVERY significant fix or error:

```
1. CLASSIFY → Regression / Gap / Process failure / Documentation Drift
      ↓
2. EXTRACT PATTERN → 1 sentence to prevent recurrence
      ↓
3. UPDATE DOCS → migration map / known bugs
      ↓
4. UPDATE WORKFLOW → this file
      ↓
5. JOURNAL ENTRY → evolution_journal.md (EVO-NNN, Impact, XP)
```

### How documents relate:

```
auto-evolution.md (this file)     evolution_journal.md (user's project)
┌─────────────────────────┐       ┌─────────────────────────┐
│  RULES (how to behave)  │       │  DATA (what happened)   │
│                         │       │                         │
│  Rule 1: Verify Before  │       │  EVO entries            │
│  Rule 2: One Deploy     │       │  Pattern Registry       │
│  Rule 3: Observe Users  │──────→│  Anti-Pattern Registry  │
│  Rule 4: Regression List│       │  XP / Level / Metrics   │
│  Rule 5: Error Docs     │       │                         │
│  Rule 6: User Feedback  │       │  JSON for Tamagotchi 🎮 │
│  Rule 7: Deploy Check   │       │                         │
│  Rule 8: Evolution Algo │──────→│                         │
│                         │       │                         │
│  Anti-Pattern Summary   │←──────│                         │
└─────────────────────────┘       └─────────────────────────┘
```
