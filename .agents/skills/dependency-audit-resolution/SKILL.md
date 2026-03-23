---
name: Dependency Audit Resolution
description: Resolving npm audit or Dependabot high/critical alerts.
category: security
tags: [security, templates, best-practices]
version: 1.0.0
---
# Dependency Audit Resolution

Resolving npm audit or Dependabot high/critical alerts.

## When to use
- When operating in the `security` domain.
- When resolving incidents related to dependency audit resolution.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `dependency-audit-resolution`
- Keywords: security, dependency

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Review the vulnerability report to identify the vulnerable package and affected versions.

### 2. Step 2
Check if a patch is available and update the package using the package manager.

### 3. Step 3
If no patch is available, assess if the vulnerable code path is actually reachable in the current architecture.

### 4. Step 4
Run the test suite to ensure the update didn't introduce breaking changes.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
