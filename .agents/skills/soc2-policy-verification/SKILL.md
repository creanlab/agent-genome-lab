---
name: SOC2 Policy Verification
description: Verifying engineering practices align with SOC2 requirements.
category: compliance
tags: [compliance, templates, best-practices]
version: 1.0.0
---
# SOC2 Policy Verification

Verifying engineering practices align with SOC2 requirements.

## When to use
- When operating in the `compliance` domain.
- When resolving incidents related to soc2 policy verification.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `soc2-policy-verification`
- Keywords: compliance, soc2

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Ensure all PRs require at least one approving review before merging.

### 2. Step 2
Verify that branch protection rules are enforced on the main branch.

### 3. Step 3
Check that access to production databases requires MFA and VPN.

### 4. Step 4
Confirm that deployment logs are immutable and stored in a centralized system.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
