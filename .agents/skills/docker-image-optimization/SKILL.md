---
name: Docker Image Optimization
description: Strategies for reducing builder image size and securing production containers.
category: devops
tags: [devops, templates, best-practices]
version: 1.0.0
---
# Docker Image Optimization

Strategies for reducing builder image size and securing production containers.

## When to use
- When operating in the `devops` domain.
- When resolving incidents related to docker image optimization.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: `docker-image-optimization`
- Keywords: devops, docker

## Inputs
- Context from the current user session or incident report.

## Steps
### 1. Step 1
Analyze the current Dockerfile for multi-stage build support.

### 2. Step 2
Move compilation and heavy dependencies to the builder stage.

### 3. Step 3
Use a distroless or alpine base image for the final runtime stage.

### 4. Step 4
Clear package manager caches (e.g., `apt-get clean` or `rm -rf /var/cache/apk/*`) in the same layer they are installed.

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
