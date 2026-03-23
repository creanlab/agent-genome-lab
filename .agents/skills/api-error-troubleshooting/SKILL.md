---
name: API Error Troubleshooting
description: Guide users through resolving 4xx and 5xx API errors.
category: support
tags: [support, templates, best-practices]
version: 1.0.0
---
# API Error Troubleshooting

Guide users through resolving 4xx and 5xx API errors.

## When to use
- When operating in the `support` domain.
- When resolving incidents related to api error troubleshooting.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `api-error-troubleshooting`
- Keywords: support, api

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Ask the user for the exact endpoint, HTTP method, and payload they used.

### 2. Step 2
If 401/403, advise checking the Authorization header and token expiration.

### 3. Step 3
If 422, explain the validation error based on the response payload schema.

### 4. Step 4
If 500, escalate to engineering with a constructed cURL reproduction of the request.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
