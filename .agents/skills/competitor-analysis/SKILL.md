---
name: Competitor Analysis Synthesis
description: Framework to analyze and summarize competitor features and market positioning.
category: research
tags: [research, templates, best-practices]
version: 1.0.0
---
# Competitor Analysis Synthesis

Framework to analyze and summarize competitor features and market positioning.

## When to use
- When operating in the `research` domain.
- When resolving incidents related to competitor analysis synthesis.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `competitor-analysis`
- Keywords: research, competitor

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Identify top 3 competitors in the specific niche.

### 2. Step 2
Scrape or review their pricing pages, feature lists, and target audience.

### 3. Step 3
Create a matrix comparing your product against competitors on key features.

### 4. Step 4
Identify the 'kill feature' or unique value proposition that differentiates your product.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
