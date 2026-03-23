# Failure Genome Hypothesis V1

## One-sentence claim

The portable unit of self-evolution for coding agents is **not** the raw chat log, the full trajectory, or the giant prompt patch.
It is a compact, verifiable **Failure Genome**:

```text
(context fingerprint, failure family, violated invariant,
 repair operator, verifier evidence, transferability tags,
 utility estimate, replay outcome)
```

If agents evolve on **families of failure genomes**, retrieve them by both similarity and utility, and promote mutations only after **counterfactual replay**, they should learn faster, repeat fewer mistakes, and transfer lessons across repositories better than journal-first or prompt-only systems.

---

## Why this matters

Most self-evolving coding systems still waste information in one of four ways:

1. **Raw journals are too verbose** and hard to reuse.
2. **Prompt patches are too global** and drift easily.
3. **Semantic retrieval alone** often returns superficially similar but low-value examples.
4. **One-off fixes** solve individual bugs without creating family-level prevention.

Failure Genome addresses all four.

---

## Core idea

Each solved or repeated incident is distilled into a small structured object.
The object is designed to answer four questions quickly:

1. What kind of failure was this?
2. Which invariant was violated?
3. What repair operator worked?
4. Has this fix survived replay on similar incidents?

That object becomes the real unit of transfer across:

- chats,
- repos,
- users,
- models,
- competitions.

---

## Genome structure

## 1. Context fingerprint

Minimal repo/task fingerprint, not raw code.

Examples:

- stack tags: `node`, `supabase`, `cloud-run`, `static-html`
- surface: `deploy`, `ui`, `cli`, `data-contract`, `docs`
- environment: `windows-powershell`, `linux`, `gcp`
- repo maturity: `greenfield`, `legacy`, `hybrid`

## 2. Failure family

A reusable class, not a one-off title.

Examples:

- `command-shell-mismatch`
- `ephemeral-state-assumption`
- `stale-docs-after-change`
- `silent-fallback-introduced`
- `verification-skipped-before-done`

## 3. Violated invariant

The rule that should never have been broken.

Examples:

- `done_means_verified`
- `no-silent-fallbacks`
- `docs-follow-architecture`
- `external-state-must-be-persistent`

## 4. Repair operator

The smallest reusable repair action.

Examples:

- `replace-bash-chain-with-powershell-safe-command`
- `persist-state-to-supabase`
- `split-source-of-truth-from-rendered-view`
- `add-pre-commit-blocker`

## 5. Verifier evidence

A fix is not trusted without evidence.

Examples:

- command output,
- test result,
- screenshot proof,
- deploy health check,
- diff against baseline,
- replay success.

## 6. Transferability tags

Where the genome is likely useful.

Examples:

- `applies_to=windows-shell`
- `applies_to=agent-doc-drift`
- `applies_to=supabase-storage`
- `risk=high`

## 7. Utility estimate

A learned estimate of whether this genome is worth retrieving again.

Suggested factors:

- prevented repeat bugs,
- cross-repo reuse,
- low regression rate,
- replay success on family members,
- cheap application cost.

## 8. Replay outcome

Did the proposed mutation survive:

- the current incident,
- similar historical incidents,
- a small holdout set?

---

## Scientific prediction

A coding agent using Failure Genome should outperform a journal-only baseline in three ways:

### P1 — Lower repeat rate

Family-level prevention should reduce repeated incidents because the mutation targets the failure class, not only the last symptom.

### P2 — Better transfer

Lessons should transfer better across users and repos because the genome stores invariants and repair operators, not project-specific prose.

### P3 — Better reasoning economy

Retrieval should become cheaper and more precise because the agent reasons over compact families instead of replaying long chats.

---

## What is novel here

The novelty is not “use memory.”
The novelty is the combination of:

1. **family-level causal abstraction**,
2. **utility-aware retrieval**,
3. **counterfactual replay before promotion**,
4. **mutation of rules, workflows, and skills as separate patch types**.

In plain language:

- do not memorize stories,
- memorize reusable failure DNA,
- do not promote a clever patch because it worked once,
- promote it only if it survives replay on the failure family.

---

## Why it fits TAMA perfectly

TAMA already has the right seeds:

- anti-pattern registry,
- pattern registry,
- repeat-rate thinking,
- health score thinking,
- POMDP formalization,
- closed-loop aspiration,
- starter-kit distribution.

Failure Genome upgrades this from a journaled reflection system into a **family-level mutation system**.

That is the bridge from “interesting product” to “serious self-evolution research system.”

---

## The practical loop

```text
error or near-miss
  -> incident capture
  -> genome distillation
  -> retrieve similar genomes by similarity + utility
  -> propose patch types
       - rule patch
       - workflow patch
       - skill patch
       - verifier patch
  -> counterfactual replay on family members
  -> promote only winning patch
  -> store replay result back into genome utility
```

---

## What not to do

- Do not dump raw logs into the research pool as the main asset.
- Do not mutate the global prompt after every incident.
- Do not trust semantic similarity alone.
- Do not trust “felt useful” reflections without replay evidence.
- Do not merge failure classes and success recipes into one undifferentiated memory bucket.

---

## Minimal viable implementation

V1 only needs:

1. incident schema,
2. failure-genome schema,
3. family clustering by tags + heuristics,
4. replay on a small matched set,
5. patch promotion gates.

No expensive RL training is required at the start.

---

## If the hypothesis is true

Then the strongest self-evolving coding agents will eventually look like this:

- short root contract,
- skill bank,
- canonical incident memory,
- failure-genome families,
- replay-gated mutation pipeline,
- shared research pool of sanitized genomes,
- competition mode built on top of the same harness.

That is a much stronger path than “bigger prompt” or “more reflection.”
