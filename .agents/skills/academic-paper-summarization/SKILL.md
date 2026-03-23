---
name: Academic Paper Summarization
description: Extracting key findings from AI/ML research papers.
category: research
tags: [research, templates, best-practices]
version: 1.0.0
---
# Academic Paper Summarization

Extracting key findings from AI/ML research papers.

## When to use
- When operating in the `research` domain.
- When resolving incidents related to academic paper summarization.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `academic-paper-summarization`
- Keywords: research, academic

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Read the abstract and conclusion to grasp the primary contribution.

### 2. Step 2
Identify the baseline models and the proposed novel architecture.

### 3. Step 3
Extract the core metrics (e.g., accuracy, BLEU, latency) from the results tables.

### 4. Step 4
Summarize the limitations and potential applications for current projects.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
