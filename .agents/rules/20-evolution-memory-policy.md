# 20 — Evolution Memory Policy

> Always-on. Canonical memory contract with Failure Genome layer.

## Source of Truth Hierarchy

1. **Primary**: `.evolution/incidents/*.json` — structured incident events
2. **Primary**: `.evolution/experience_units/*.json` — distilled reusable lessons
3. **Primary**: `.evolution/failure_genomes/*.json` — family-level failure DNA
4. **Index**: `.evolution/failure_genomes/FAMILY_INDEX.json` — genome family clustering
5. **Rendered view**: Markdown journal — view layer (generated, not primary)
6. **Legacy compatible**: Old journal format with `<!-- STATUS_JSON -->` blocks

## Failure Genome Contract

### What Is a Failure Genome?

A compact, verifiable learning unit:
```
(context fingerprint,   ← WHERE it happens
 failure family,        ← WHAT class of failure
 violated invariant,    ← WHICH rule was broken
 repair operator,       ← HOW to fix this class
 verifier evidence,     ← PROOF it works
 transferability tags,  ← WHERE ELSE it applies
 utility estimate,      ← HOW USEFUL is it
 replay outcome)        ← DID IT SURVIVE TESTING
```

### When to Create

- Impact ≥ 7 → ALWAYS create a failure genome
- Impact 5-6 → create if it's a NEW failure family
- Impact 1-4 → incident + EU only (no genome unless it reveals a pattern)

### Family-Level Thinking

We fix CLASSES of bugs, not individual bugs.
- One genome per incident
- Multiple genomes per family
- One repair operator per family (can be refined)
- Family-level prevention > incident-level fix

## When to Capture

Capture an incident after EVERY:
- Bug fix (any severity)
- Deployment failure
- User-reported regression
- Process failure (false done, missed step)
- Near-miss (caught before production)

## Capture Flow

```
1. CLASSIFY → Regression / Gap / Process / Near-miss
2. CREATE incident JSON in .evolution/incidents/
3. DISTIL experience unit in .evolution/experience_units/
4. IF Impact ≥ 7:
   a. RETRIEVE similar genomes from FAMILY_INDEX
   b. DISTIL failure genome in .evolution/failure_genomes/
   c. UPDATE FAMILY_INDEX
   d. PROPOSE patch (rule / workflow / skill / verifier / doc)
   e. RUN replay gate before promotion
5. UPDATE rendered journal (optional, for visualizer compatibility)
```

## Mutation Gate

A rule, workflow, or skill patch is only promoted if:
1. It fixes the current incident
2. It survives replay on similar failure genomes (≥60% pass rate)
3. No obvious regressions on holdouts
4. Evidence is recorded

**No auto-promotion of global prompt mutations without replay.**

## Utility Decay

Genome utility decays without use:
- 30 days idle: score *= 0.9
- 90 days idle: score *= 0.7
- Each reuse: score *= 1.1 (cap 1.0)
- Each prevention: score *= 1.2 (cap 1.0)
- Negative transfer: score *= 0.5

> See: `.agents/workflows/20-incident-capture.md` for full procedure
> See: `.agents/skills/incident-distiller/SKILL.md` for extraction logic
> See: `.agents/skills/genome-analyzer/SKILL.md` for analysis and replay
> See: `.agents/skills/rule-patcher/SKILL.md` for promotion gate
> See: `docs/FAILURE_GENOME_HYPOTHESIS_V1.md` for scientific basis
