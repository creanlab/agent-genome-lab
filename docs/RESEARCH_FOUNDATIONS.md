# Research Foundations

## Product thesis
A good self-evolving agent product should not start by collecting raw logs from the world.
It should start by giving each user immediate local value:
- repo audit,
- missing guardrails,
- repeat-failure awareness,
- structured learning units,
- safe export when the user is ready.

## Memory stack

### 1. Incident Event
A structured record of one failure or prevention event.

### 2. Experience Unit
A distilled, reusable lesson derived from one or more incidents.

### 3. Failure Genome
A family-level reusable unit that captures:
- context fingerprint,
- failure family,
- violated invariant,
- repair operator,
- verifier evidence,
- transferability tags,
- utility,
- replay outcome.

## Why this is stronger than journal-first systems
- stories are hard to reuse,
- giant prompt patches drift,
- naive retrieval returns noisy examples,
- one-off fixes do not automatically create prevention.

Failure Genome makes the reusable abstraction explicit.

## Promotion model
A mutation may be proposed as:
- `rule_patch`
- `workflow_patch`
- `skill_patch`
- `verifier_patch`
- `doc_patch`

A mutation is only promoted when:
1. the current issue is actually fixed,
2. replay on relevant family members is good enough,
3. holdout regression risk is acceptable,
4. evidence is stored.
