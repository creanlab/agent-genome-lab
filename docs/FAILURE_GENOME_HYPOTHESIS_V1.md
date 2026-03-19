# Failure Genome Hypothesis V1

## One-sentence claim
The portable unit of self-evolution for coding agents is not the raw chat log or the giant prompt patch.
It is a compact, verifiable **Failure Genome**:

```text
context fingerprint
+ failure family
+ violated invariant
+ repair operator
+ verifier evidence
+ transferability tags
+ utility estimate
+ replay outcome
```

If agents evolve on families of Failure Genomes, retrieve them by similarity plus utility, and promote mutations only after replay, they should learn faster and repeat fewer mistakes than journal-first systems.

## Practical loop
```text
error or near-miss
  -> incident capture
  -> genome distillation
  -> retrieve similar genomes by similarity + utility
  -> propose patch types
  -> replay gate
  -> promote only winning patch
  -> store replay result back into genome utility
```

## Prediction
A repo using Failure Genome should improve in three ways:
- lower repeat rate,
- better cross-repo transfer,
- cheaper retrieval and reasoning.
