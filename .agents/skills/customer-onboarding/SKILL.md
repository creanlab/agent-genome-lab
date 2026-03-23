---
name: Customer Onboarding Assistance
description: Walk new users through the initial setup and configuration.
category: support
tags: [support, templates, best-practices]
version: 1.0.0
---
# Customer Onboarding Assistance

Walk new users through the initial setup and configuration.

## When to use
- When operating in the `support` domain.
- When resolving incidents related to customer onboarding assistance.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `customer-onboarding`
- Keywords: support, customer

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Welcome the user and confirm they have access to the dashboard.

### 2. Step 2
Provide step-by-step instructions for creating their first project.

### 3. Step 3
Explain how to invite team members.

### 4. Step 4
Share links to the quickstart documentation and video tutorials.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
