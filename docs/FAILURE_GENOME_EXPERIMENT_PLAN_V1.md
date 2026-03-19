# Failure Genome Experiment Plan V1

## Goal
Test whether a Failure Genome layer improves repeat prevention and transfer compared with incident-only memory.

## Baselines
### Baseline A
Incidents only.

### Baseline B
Incidents plus experience units.

### Experimental condition
Incidents plus experience units plus Failure Genomes with replay-gated promotion.

## Metrics
- repeat incident rate,
- verified fix rate,
- transfer success across repos,
- patch promotion win rate,
- negative transfer rate,
- retrieval precision.

## Minimal local experiment
1. Collect at least 10 incidents.
2. Distill at least 5 experience units.
3. Distill at least 3 Failure Genomes from repeated or high-impact failures.
4. Apply replay-gated patch proposals.
5. Compare later sessions against the earlier baseline.
