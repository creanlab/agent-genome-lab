# Evolution Tamagotchi as POMDP: A Formal Framework for AI Agent Evolution

> **Authors**: Evolution Tamagotchi Team
> **Version**: 1.0 — 2026-03-17
> **Status**: TAMA-5.10 — Formal Metrics Paper
> **Source**: PROP-10 (P1 Survey on Evolutionary Approaches)

---

## Abstract

We present Evolution Tamagotchi as a **Partially Observable Markov Decision Process (POMDP)** framework for tracking and optimizing AI coding agent evolution. By modeling bug-fixing patterns, anti-patterns, and experience accumulation as states, actions, and observations, we formalize the gamified learning process and demonstrate that the system naturally implements concepts from evolutionary computation, curriculum learning, and metacognitive monitoring.

---

## 1. POMDP Formulation

### 1.1 State Space (S)

The agent's true state is partially hidden. Observable proxies:

| Symbol | State Variable | Range | Description |
|--------|---------------|-------|-------------|
| s_level | Agent Level | [1, ∞) | Current evolution tier |
| s_xp | Experience Points | [0, ∞) | Cumulative learning weight |
| s_pat | Pattern Count | [0, ∞) | Extracted reusable solutions |
| s_ap | Anti-Pattern Count | [0, ∞) | Identified failure modes |
| s_health | Health Score | [0, 100] | Composite fitness metric |
| s_streak | Session Streak | [0, ∞) | Consecutive productive sessions |

**Hidden state**: True competence, which is only partially observable through these metrics.

### 1.2 Action Space (A)

```
A = {
  a_evo:    Create evolution entry (bug fix / pattern discovery)
  a_pat:    Extract pattern from entry
  a_ap:     Register anti-pattern
  a_prev:   Preventive action (before bug occurs)
  a_react:  Reactive action (after bug occurs)
  a_share:  Share pattern with another agent (cross-pollination)
}
```

### 1.3 Observation Space (Ω)

The agent observes:
- **o_impact**: Impact score of last action [1-10]
- **o_xp**: XP gained from last action
- **o_badge**: Achievement unlocked (binary)
- **o_health_delta**: Change in health score
- **o_recurrence**: Whether similar AP was seen before (binary)
- **o_ai_insight**: LLM-generated analysis of current state

### 1.4 Transition Function T(s'|s,a)

$$P(s_{t+1} | s_t, a_t) = \begin{cases} s_{level} + 1 & \text{if } s_{xp} \geq threshold(s_{level}) \\ s_{health} + \delta_{preventive} & \text{if } a_t = a_{prev} \\ s_{health} - \delta_{reactive} & \text{if } a_t = a_{react} \text{ and recurrence} \end{cases}$$

Key transitions:
- **Preventive actions** increase health score
- **Reactive actions** with recurrence decrease health
- **Pattern extraction** provides permanent state improvement
- **Cross-pollination** creates shared knowledge state

### 1.5 Reward Function R(s, a)

| Action Type | Base XP | Impact Multiplier | Level Decay | Streak Bonus |
|-------------|---------|-------------------|-------------|--------------|
| Preventive | impact × 1.5 | ×(1 + impact/10) | ×decay(level) | +5 if streak ≥ 3 |
| Reactive | impact × 1.0 | ×(1 + impact/10) | ×decay(level) | +5 if streak ≥ 3 |
| Pattern Extract | +3 flat | — | — | — |
| Anti-Pattern | +1 flat | — | — | — |

**Decay function** (curriculum learning, cf. SEAD):
```
decay(level) = {
  1.0    if level ≤ 10
  0.8    if level ≤ 20
  0.6    if level ≤ 50
  0.4    if level > 50
}
```

---

## 2. Fitness Function (Multi-Objective)

Inspired by SEPGA (P6) and EvoConfig (P8), we define a composite fitness:

```
F(agent) = w₁·health_score + w₂·pattern_coverage + w₃·prevention_ratio + w₄·streak_factor
```

Where:
- **health_score** = f(preventive_ratio, repeat_rate, pattern_reuse, freshness) ∈ [0, 100]
- **pattern_coverage** = |patterns| / |entries| ∈ [0, 1]
- **prevention_ratio** = |preventive_entries| / |total_entries| ∈ [0, 1]
- **streak_factor** = min(streak / 10, 1.0) ∈ [0, 1]

### 2.1 Health Score Decomposition

```
health_score = 0.3 × preventive_ratio
             + 0.25 × (1 - repeat_rate)
             + 0.25 × pattern_reuse_ratio
             + 0.2 × freshness_score
```

| Metric | Formula | Meaning |
|--------|---------|---------|
| preventive_ratio | preventive_entries / total_entries | Proactive vs reactive |
| repeat_rate | recurring_APs / total_APs | How often same bugs repeat |
| pattern_reuse | entries_with_patterns / total_entries | Knowledge extraction rate |
| freshness | entries_last_7d / total_entries | Recency of learning |

---

## 3. Evolutionary Operators

### 3.1 Selection (from GEA, P2)

In multi-user mode, agents are ranked by fitness. Top agents' patterns become candidates for cross-pollination.

```
selection_probability(agent_i) = F(agent_i) / Σ F(agent_j)
```

### 3.2 Crossover (Cross-Pollination, TAMA-5.4/5.9)

When Agent A has pattern P that could prevent Agent B's anti-pattern AP:

```
crossover(A, B) = {
  if similarity(P.name, AP.name) > threshold:
    suggest P → B
}
```

Word-level similarity: overlap of significant words (length > 3) between pattern name and anti-pattern name.

### 3.3 Mutation (from DGM, P3)

The evolution journal itself evolves. Each new EVO entry potentially mutates the agent's rule set:

```
mutation(rules, entry) = {
  if entry.impact ≥ 8:
    rules.add(new_check from entry.pattern)
  if entry.type == anti_pattern_repeat:
    rules.strengthen(matching_rule)
}
```

---

## 4. Metacognitive Layer

### 4.1 Self-Questioning Engine (TAMA-5.8)

Implements metacognitive monitoring (cf. P9 AgentEvolver):

```
for each anti_pattern AP:
  generate: "What if AP occurs in different module?"
  generate: "Could automated testing prevent AP?"
  generate: "Is there a structural prevention for AP?"
```

### 4.2 Danger Zone Predictor (TAMA-5.7)

Categorizes anti-patterns by keyword clustering into risk domains:

| Domain | Keywords | Risk Assessment |
|--------|----------|-----------------|
| Deploy/Infra | deploy, docker, cloud, build | Count APs × recurrence |
| Data/API | api, key, credential, token | Count × sensitivity |
| Code Quality | drift, naming, mismatch | Count × blast radius |
| Process | done, status, verification | Count × historical |

Risk level = category_count / max_category_count:
- **HIGH**: ≥ 70% of maximum
- **MEDIUM**: ≥ 40% of maximum
- **LOW**: < 40% of maximum

### 4.3 LLM-Augmented Analysis (TAMA-5.6)

Gemini 3.1 Pro analyzes the full journal context:
- Impact re-scoring based on downstream effects
- Pattern gap identification (APs without corresponding PATs)
- Strategic recommendations

---

## 5. Comparison with Related Work

| Framework | TAMA Mapping | Key Difference |
|-----------|-------------|----------------|
| AlphaEvolve (DeepMind) | generate→evaluate→select→mutate | TAMA operates on human+AI hybrid data, not pure code |
| MAE (Multi-Agent) | Proposer/Solver/Judge | Multi-user mode = natural MAE with human agents |
| EvolveR | Experience → Principles | EVO entries → PAT extraction is identical |
| SE-Agent | Trajectory Optimization | Journal = trajectory; evolution = optimization |
| SEAD | Curriculum Learning | Adaptive XP decay = curriculum difficulty |

---

## 6. Metrics & Evaluation

### 6.1 Individual Agent Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Evolution Rate | entries_per_session | ≥ 1.0 |
| Pattern Density | patterns / entries | ≥ 0.5 |
| Prevention Shift | Δ(preventive_ratio) over time | Positive trend |
| AP Recurrence | repeat_APs / total_APs | Decreasing trend |
| Health Trajectory | Δ(health_score) over 7 days | Positive |

### 6.2 Group Metrics (Multi-User)

| Metric | Formula | Meaning |
|--------|---------|---------|
| Knowledge Overlap | shared_patterns / total_patterns | Team alignment |
| Cross-Pollination Rate | adopted_suggestions / total_suggestions | Knowledge transfer |
| Coverage Gap | APs_without_PATs / total_APs | Blind spots |

---

## 7. Architecture

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND (Static)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ Parser   │ │ Renderer │ │ Analytics Engine     │ │
│  │ (MD→JSON)│ │ (DOM)    │ │ (Health, Fitness,    │ │
│  │          │ │          │ │  Danger, Questions)  │ │
│  └────┬─────┘ └────┬─────┘ └──────────┬───────────┘ │
│       └─────────────┴─────────────────┘             │
│                      │                               │
│              ┌───────┴───────┐                       │
│              │  /api/gemini  │ ← Express proxy       │
│              └───────┬───────┘                       │
└──────────────────────┼───────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │  Gemini 3.1 Pro     │
            │  (Impact Scoring,   │
            │   Risk Prediction,  │
            │   Pattern Gaps)     │
            └─────────────────────┘
```

---

## 8. Future Work

1. **Prompt Evolution (TAMA-6.1)**: GA-based optimization of auto-evolution.md rules
2. **Agent Genealogy (TAMA-6.2)**: Visual species tree of rule set versions
3. **Self-Play (TAMA-6.3)**: Current rules vs historical rules testing
4. **Collective Intelligence (TAMA-6.5)**: Aggregated anonymized patterns across all users → "Megabrain"

---

## Appendix A: XP Level Thresholds

| Level Range | XP per Level | Tier | Emoji |
|-------------|-------------|------|-------|
| 1-5 | 10 | Novice | 🟢 |
| 6-10 | 15 | Learner | 🔵 |
| 11-20 | 20 | Operative | 🟣 |
| 21-35 | 30 | Specialist | 🟡 |
| 36-50 | 40 | Expert | 🟠 |
| 51-70 | 60 | Master | 🔴 |
| 71-85 | 80 | Shadow | ⚫ |
| 86-95 | 100 | Star | 🌟 |
| 96-99 | 150 | Diamond | 💎 |
| 100 | — | Champion | 🏆 |
| 100+ | 200 | Legend | 👑 |

## Appendix B: Achievement Badges

| Badge | Condition | XP Bonus |
|-------|-----------|----------|
| 🔥 First Blood | 1st EVO entry | +5 |
| 🐉 Pattern Hunter | 3 patterns | +10 |
| 🧪 Pattern Master | 10 patterns | +20 |
| 🛡️ Shield Bearer | 50% preventive | +15 |
| 💥 High Impact | Impact ≥ 9 | +10 |
| 🔥 On Fire | 5 streak | +15 |
| 🔥 Inferno | 10 streak | +25 |
| 🐣 Hatched | Level 5 | +5 |
| 🐲 Dragon Blood | Level 20 | +20 |
| 🦅 Soaring Eagle | Level 50 | +50 |
| 🚫 Anti-Pattern Aware | 10 APs | +10 |
| 💯 Century | 100 XP | +10 |
| 👑 Grand Master | Level 100 | +100 |
