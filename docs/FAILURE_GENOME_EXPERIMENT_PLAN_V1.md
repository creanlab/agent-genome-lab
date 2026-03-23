# Failure Genome Experiment Plan V1

## Goal

Test whether the Failure Genome approach is actually better than the current journal-first baseline.

This is a falsifiable plan.

---

## Main hypothesis

Agents that retrieve and evolve from **Failure Genome families** will beat agents that evolve from:

- raw markdown journals,
- semantic retrieval only,
- prompt patches without replay gates.

---

## Baselines

### B0 — Current journal-first baseline

- old `evolution_journal.md`
- manual or semi-manual pattern extraction
- no replay gate
- no family-level abstraction

### B1 — Canonical incidents only

- structured incident events
- no failure-genome distillation
- no utility scoring
- no replay gating

### B2 — Semantic retrieval only

- structured incidents
- retrieve similar incidents by embeddings or tags
- no utility estimate
- no family-level mutation

### B3 — Failure Genome V1

- structured incidents
- failure-genome distillation
- similarity + utility retrieval
- family-level replay gate
- patch promotion only after replay

---

## Metrics

## Primary metrics

1. **repeat_rate**
   - fraction of incidents whose failure family was already known
   - lower is better

2. **time_to_verified_fix**
   - from first failure detection to verified fix
   - lower is better

3. **cross_repo_transfer_success**
   - fraction of imported shared lessons that survive local replay
   - higher is better

4. **regression_rate_after_mutation**
   - how often a promoted patch breaks unrelated tasks
   - lower is better

## Secondary metrics

5. **memory_precision_at_k**
   - among top-k retrieved items, how many were actually useful

6. **patch_promotion_yield**
   - fraction of proposed patches that pass replay and are promoted

7. **prevention_lift**
   - reduction in family-level repeats after patch promotion

8. **reasoning_cost_per_verified_fix**
   - tokens, time, or tool calls per verified fix

---

## Data sources

Use three sources:

1. local TAMA incidents,
2. replay packs from friendly users,
3. curated synthetic replay cases derived from known anti-pattern families.

Do not start with public raw logs.
Start with sanitized structured packs.

---

## Unit of evaluation

The evaluation unit is **not** “a whole session.”
It is:

- one incident,
- one failure genome,
- one candidate mutation,
- one matched replay family.

This makes the experiment measurable and debuggable.

---

## Matching policy for replay

A genome belongs to the same family if it overlaps on:

- failure family,
- violated invariant,
- stack tags,
- environment tags,
- repair operator neighborhood.

Replay family size for V1:

- current incident + up to 5 similar genomes + up to 2 unrelated holdouts.

---

## Patch types to compare

Each proposed mutation must be labeled as one of:

- `rule_patch`
- `workflow_patch`
- `skill_patch`
- `verifier_patch`
- `doc_patch`

The system should learn which patch type works best for which family.

---

## Promotion policy

A mutation is promoted only if:

1. current incident passes,
2. at least 60% of matched replays pass in V1,
3. no catastrophic holdout regression is found,
4. verifier evidence exists.

Suggested stricter V2 rule later:

- weighted Pareto ranking across repeat_rate reduction, regression risk, and cost.

---

## Expected failure modes

1. **over-clustering**
   - different failures get merged into one family
2. **under-clustering**
   - one family fragments into too many tiny buckets
3. **utility lock-in**
   - old useful genomes dominate retrieval forever
4. **negative transfer**
   - imported shared genome looks relevant but harms the local repo
5. **replay poverty**
   - not enough matched examples for confident promotion

Mitigation:

- keep family assignment editable,
- decay utility when stale,
- require local replay for imported genomes,
- keep human-readable evidence.

---

## MVP experiment sequence

### Stage 1 — Local only

- convert 20 to 50 historical TAMA incidents into genomes,
- tag families manually or semi-automatically,
- compare B0 vs B1 vs B3 on replay.

### Stage 2 — Friendly cohort

- collect 10 to 20 sanitized packs from trusted users,
- cluster genomes,
- test transfer success and negative transfer.

### Stage 3 — Hosted pool

- ingest research-pool uploads into Supabase,
- generate patch-pack candidates,
- test cross-project lift.

---

## Success thresholds for V1

Treat V1 as promising if, relative to B0:

- repeat_rate drops by at least 20%,
- time_to_verified_fix drops by at least 15%,
- cross_repo_transfer_success is meaningfully above zero,
- regression_rate_after_mutation does not rise.

These thresholds are heuristics, not guarantees.

---

## Publishable angle

A publishable technical report would be:

**Failure Genomes for Self-Evolving Coding Agents: Family-Level Memory, Utility-Aware Retrieval, and Replay-Gated Mutation**

Core claims to test:

- transfer works better with genomes than with raw logs,
- replay-gated promotion prevents brittle self-modification,
- utility-aware retrieval beats semantic-only retrieval on useful memory precision.

---

## What to instrument immediately

- family id,
- violated invariant,
- repair operator,
- verifier outcome,
- replay coverage,
- promotion decision,
- negative transfer flag.

Without these fields, you cannot test the hypothesis honestly.
