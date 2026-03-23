---
name: Ticket Triage and Routing
description: Evaluate incoming user support tickets and route them to the proper department.
category: support
tags: [support, templates, best-practices]
version: 1.0.0
---
# Ticket Triage and Routing

Evaluate incoming user support tickets and route them to the proper department.

## When to use
- When operating in the `support` domain.
- When resolving incidents related to ticket triage and routing.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `ticket-triage`
- Keywords: support, ticket

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Read the support ticket to extract key entities: user ID, error code, and affected feature.

### 2. Step 2
Determine the severity: P1 (System Down), P2 (Major Bug), P3 (Minor Bug), P4 (Feature Request).

### 3. Step 3
If it's a billing issue, route to `billing`. If technical, route to `engineering`.

### 4. Step 4
Draft a polite acknowledgment message to the user confirming receipt and priority.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
