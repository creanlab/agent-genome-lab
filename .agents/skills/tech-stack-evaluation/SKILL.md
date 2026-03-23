---
name: Technology Stack Evaluation
description: Evaluate new frameworks or libraries for adoption.
category: research
tags: [research, templates, best-practices]
version: 1.0.0
---
# Technology Stack Evaluation

Evaluate new frameworks or libraries for adoption.

## When to use
- When operating in the `research` domain.
- When resolving incidents related to technology stack evaluation.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `tech-stack-evaluation`
- Keywords: research, technology

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Define the core requirements: performance, community support, learning curve.

### 2. Step 2
Compare the proposed technology against 2 alternatives.

### 3. Step 3
Review GitHub stars, recent commit frequency, and open issues.

### 4. Step 4
Build a small proof-of-concept (PoC) to validate developer experience.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
