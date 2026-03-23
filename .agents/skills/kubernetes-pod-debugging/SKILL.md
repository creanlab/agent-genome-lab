---
name: Kubernetes Pod Debugging
description: Methodology for identifying and fixing CrashLoopBackOff and OOMKilled in K8s.
category: devops
tags: [devops, templates, best-practices]
version: 1.0.0
---
# Kubernetes Pod Debugging

Methodology for identifying and fixing CrashLoopBackOff and OOMKilled in K8s.

## When to use
- When operating in the `devops` domain.
- When resolving incidents related to kubernetes pod debugging.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `kubernetes-pod-debugging`
- Keywords: devops, kubernetes

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Check pod status with `kubectl get pods` and identify the failing pod.

### 2. Step 2
Inspect previous logs with `kubectl logs <pod-name> --previous` to find the panic or exception.

### 3. Step 3
Check pod events using `kubectl describe pod <pod-name>` to look for OOMKilled or readiness probe failures.

### 4. Step 4
If OOMKilled, review resource limits in the deployment manifest and suggest an increase based on current usage estimates.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
