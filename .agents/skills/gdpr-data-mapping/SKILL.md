---
name: GDPR Data Mapping
description: Process for identifying and documenting PII across data stores.
category: compliance
tags: [compliance, templates, best-practices]
version: 1.0.0
---
# GDPR Data Mapping

Process for identifying and documenting PII across data stores.

## When to use
- When operating in the `compliance` domain.
- When resolving incidents related to gdpr data mapping.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `gdpr-data-mapping`
- Keywords: compliance, gdpr

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Inventory all databases, third-party APIs, and log files.

### 2. Step 2
Identify columns or fields containing PII (names, emails, IPs).

### 3. Step 3
Document the lawful basis for processing each piece of PII.

### 4. Step 4
Ensure data retention policies are applied to the identified PII.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
