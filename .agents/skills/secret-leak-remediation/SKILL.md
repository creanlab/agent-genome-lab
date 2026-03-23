---
name: Secret Leak Remediation
description: Standard operating procedure for handling accidentally committed secrets.
category: security
tags: [security, templates, best-practices]
version: 1.0.0
---
# Secret Leak Remediation

Standard operating procedure for handling accidentally committed secrets.

## When to use
- When operating in the `security` domain.
- When resolving incidents related to secret leak remediation.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `secret-leak-remediation`
- Keywords: security, secret

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Immediately revoke the compromised API key or secret in the provider's dashboard.

### 2. Step 2
Identify the commit(s) where the secret was introduced.

### 3. Step 3
Use BFG Repo-Cleaner or git filter-repo to scrub the secret from the repository history.

### 4. Step 4
Generate a new secret, update the environment variables, and verify application functionality.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
