---
name: Accessibility WCAG Audit
description: Auditing frontend components for WCAG AA compliance.
category: compliance
tags: [compliance, templates, best-practices]
version: 1.0.0
---
# Accessibility WCAG Audit

Auditing frontend components for WCAG AA compliance.

## When to use
- When operating in the `compliance` domain.
- When resolving incidents related to accessibility wcag audit.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `accessibility-wcag-audit`
- Keywords: compliance, accessibility

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Run automated tools like axe-core or Lighthouse on key user flows.

### 2. Step 2
Manually check keyboard navigation (Tab, Enter, Space, Escape) for interactive elements.

### 3. Step 3
Verify color contrast ratios using a contrast checker tool.

### 4. Step 4
Ensure all images carry descriptive `alt` attributes and form inputs have `labels`.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
