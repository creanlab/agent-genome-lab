---
name: CI/CD Pipeline Troubleshooting
description: Diagnosing failed GitHub Action or GitLab CI runs.
category: devops
tags: [devops, templates, best-practices]
version: 1.0.0
---
# CI/CD Pipeline Troubleshooting

Diagnosing failed GitHub Action or GitLab CI runs.

## When to use
- When operating in the `devops` domain.
- When resolving incidents related to ci/cd pipeline troubleshooting.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `ci-cd-pipeline-troubleshooting`
- Keywords: devops, ci/cd

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Identify the exact pipeline step that failed from the CI dashboard.

### 2. Step 2
Review the console output for dependency resolution errors, test failures, or syntax errors.

### 3. Step 3
If a flaky test is suspected, check the test history for non-deterministic behavior.

### 4. Step 4
Provide a fix or patch to the pipeline configuration or failing test.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
