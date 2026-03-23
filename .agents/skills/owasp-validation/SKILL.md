---
name: OWASP Input Validation
description: Ensuring user input is safe from XSS and SQL injection.
category: security
tags: [security, templates, best-practices]
version: 1.0.0
---
# OWASP Input Validation

Ensuring user input is safe from XSS and SQL injection.

## When to use
- When operating in the `security` domain.
- When resolving incidents related to owasp input validation.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `owasp-validation`
- Keywords: security, owasp

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Identify all input vectors (forms, API payloads, URL parameters).

### 2. Step 2
Implement strict type checking and schema validation (e.g., using Zod or Joi).

### 3. Step 3
Sanitize inputs before rendering them in HTML to prevent XSS.

### 4. Step 4
Use parameterized queries or ORMs to prevent SQL injection.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
