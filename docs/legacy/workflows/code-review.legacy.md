---
description: Engineering review workflow - mandatory before any code implementation
---

# Code Review & Implementation Workflow

## Pre-Implementation Gate

Before writing ANY code, review the plan thoroughly.  
Do NOT start implementation until the review is complete and approval is given.

For every issue or recommendation:
- Explain the concrete tradeoffs
- Give an opinionated recommendation
- Ask for input before proceeding

## Engineering Principles

- **DRY** — aggressively flag duplication
- **Well-tested** — better too many tests than too few
- **"Engineered enough"** — not fragile/hacky, not over-engineered
- **Correctness over speed** — optimize for edge cases
- **Explicit over clever** — prefer readable solutions

## Review Sections

### 1. Architecture Review
- Overall system design and component boundaries
- Dependency graph and coupling risks
- Data flow and potential bottlenecks
- Scaling characteristics and single points of failure
- Security boundaries (auth, data access, API limits)

### 2. Code Quality Review
- Project structure and module organization
- DRY violations
- Error handling patterns and missing edge cases
- Technical debt risks
- Over-engineered or under-engineered areas

### 3. Test Review
- Test coverage (unit, integration, e2e)
- Quality of assertions
- Missing edge cases
- Untested failure scenarios

### 4. Performance Review
- N+1 queries or inefficient I/O
- Memory usage risks
- CPU hotspots
- Caching opportunities
- Latency and scalability

## For Each Issue Found

1. Clear description
2. Why it matters
3. 2-3 options (including "do nothing")
4. For each option: Effort, Risk, Impact, Maintenance cost
5. Recommended option and why

## Workflow Rules

- Do NOT assume priorities or timelines
- After each section, pause and ask for feedback
- Do NOT implement until confirmed

## Change Size Protocol

**BIG change**: Review all 4 sections, top 3-4 issues per section
**SMALL change**: 1 focused question per section, keep concise
