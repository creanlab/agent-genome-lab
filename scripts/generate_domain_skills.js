const fs = require('fs');
const path = require('path');

const skillsData = {
  devops: [
    {
      id: "kubernetes-pod-debugging",
      name: "Kubernetes Pod Debugging",
      desc: "Methodology for identifying and fixing CrashLoopBackOff and OOMKilled in K8s.",
      steps: [
        "Check pod status with `kubectl get pods` and identify the failing pod.",
        "Inspect previous logs with `kubectl logs <pod-name> --previous` to find the panic or exception.",
        "Check pod events using `kubectl describe pod <pod-name>` to look for OOMKilled or readiness probe failures.",
        "If OOMKilled, review resource limits in the deployment manifest and suggest an increase based on current usage estimates."
      ]
    },
    {
      id: "docker-image-optimization",
      name: "Docker Image Optimization",
      desc: "Strategies for reducing builder image size and securing production containers.",
      steps: [
        "Analyze the current Dockerfile for multi-stage build support.",
        "Move compilation and heavy dependencies to the builder stage.",
        "Use a distroless or alpine base image for the final runtime stage.",
        "Clear package manager caches (e.g., `apt-get clean` or `rm -rf /var/cache/apk/*`) in the same layer they are installed."
      ]
    },
    {
      id: "ci-cd-pipeline-troubleshooting",
      name: "CI/CD Pipeline Troubleshooting",
      desc: "Diagnosing failed GitHub Action or GitLab CI runs.",
      steps: [
        "Identify the exact pipeline step that failed from the CI dashboard.",
        "Review the console output for dependency resolution errors, test failures, or syntax errors.",
        "If a flaky test is suspected, check the test history for non-deterministic behavior.",
        "Provide a fix or patch to the pipeline configuration or failing test."
      ]
    }
  ],
  support: [
    {
      id: "ticket-triage",
      name: "Ticket Triage and Routing",
      desc: "Evaluate incoming user support tickets and route them to the proper department.",
      steps: [
        "Read the support ticket to extract key entities: user ID, error code, and affected feature.",
        "Determine the severity: P1 (System Down), P2 (Major Bug), P3 (Minor Bug), P4 (Feature Request).",
        "If it's a billing issue, route to `billing`. If technical, route to `engineering`.",
        "Draft a polite acknowledgment message to the user confirming receipt and priority."
      ]
    },
    {
      id: "api-error-troubleshooting",
      name: "API Error Troubleshooting",
      desc: "Guide users through resolving 4xx and 5xx API errors.",
      steps: [
        "Ask the user for the exact endpoint, HTTP method, and payload they used.",
        "If 401/403, advise checking the Authorization header and token expiration.",
        "If 422, explain the validation error based on the response payload schema.",
        "If 500, escalate to engineering with a constructed cURL reproduction of the request."
      ]
    },
    {
      id: "customer-onboarding",
      name: "Customer Onboarding Assistance",
      desc: "Walk new users through the initial setup and configuration.",
      steps: [
        "Welcome the user and confirm they have access to the dashboard.",
        "Provide step-by-step instructions for creating their first project.",
        "Explain how to invite team members.",
        "Share links to the quickstart documentation and video tutorials."
      ]
    }
  ],
  security: [
    {
      id: "secret-leak-remediation",
      name: "Secret Leak Remediation",
      desc: "Standard operating procedure for handling accidentally committed secrets.",
      steps: [
        "Immediately revoke the compromised API key or secret in the provider's dashboard.",
        "Identify the commit(s) where the secret was introduced.",
        "Use BFG Repo-Cleaner or git filter-repo to scrub the secret from the repository history.",
        "Generate a new secret, update the environment variables, and verify application functionality."
      ]
    },
    {
      id: "dependency-audit-resolution",
      name: "Dependency Audit Resolution",
      desc: "Resolving npm audit or Dependabot high/critical alerts.",
      steps: [
        "Review the vulnerability report to identify the vulnerable package and affected versions.",
        "Check if a patch is available and update the package using the package manager.",
        "If no patch is available, assess if the vulnerable code path is actually reachable in the current architecture.",
        "Run the test suite to ensure the update didn't introduce breaking changes."
      ]
    },
    {
      id: "owasp-validation",
      name: "OWASP Input Validation",
      desc: "Ensuring user input is safe from XSS and SQL injection.",
      steps: [
        "Identify all input vectors (forms, API payloads, URL parameters).",
        "Implement strict type checking and schema validation (e.g., using Zod or Joi).",
        "Sanitize inputs before rendering them in HTML to prevent XSS.",
        "Use parameterized queries or ORMs to prevent SQL injection."
      ]
    }
  ],
  research: [
    {
      id: "competitor-analysis",
      name: "Competitor Analysis Synthesis",
      desc: "Framework to analyze and summarize competitor features and market positioning.",
      steps: [
        "Identify top 3 competitors in the specific niche.",
        "Scrape or review their pricing pages, feature lists, and target audience.",
        "Create a matrix comparing your product against competitors on key features.",
        "Identify the 'kill feature' or unique value proposition that differentiates your product."
      ]
    },
    {
      id: "academic-paper-summarization",
      name: "Academic Paper Summarization",
      desc: "Extracting key findings from AI/ML research papers.",
      steps: [
        "Read the abstract and conclusion to grasp the primary contribution.",
        "Identify the baseline models and the proposed novel architecture.",
        "Extract the core metrics (e.g., accuracy, BLEU, latency) from the results tables.",
        "Summarize the limitations and potential applications for current projects."
      ]
    },
    {
      id: "tech-stack-evaluation",
      name: "Technology Stack Evaluation",
      desc: "Evaluate new frameworks or libraries for adoption.",
      steps: [
        "Define the core requirements: performance, community support, learning curve.",
        "Compare the proposed technology against 2 alternatives.",
        "Review GitHub stars, recent commit frequency, and open issues.",
        "Build a small proof-of-concept (PoC) to validate developer experience."
      ]
    }
  ],
  compliance: [
    {
      id: "gdpr-data-mapping",
      name: "GDPR Data Mapping",
      desc: "Process for identifying and documenting PII across data stores.",
      steps: [
        "Inventory all databases, third-party APIs, and log files.",
        "Identify columns or fields containing PII (names, emails, IPs).",
        "Document the lawful basis for processing each piece of PII.",
        "Ensure data retention policies are applied to the identified PII."
      ]
    },
    {
      id: "accessibility-wcag-audit",
      name: "Accessibility WCAG Audit",
      desc: "Auditing frontend components for WCAG AA compliance.",
      steps: [
        "Run automated tools like axe-core or Lighthouse on key user flows.",
        "Manually check keyboard navigation (Tab, Enter, Space, Escape) for interactive elements.",
        "Verify color contrast ratios using a contrast checker tool.",
        "Ensure all images carry descriptive `alt` attributes and form inputs have `labels`."
      ]
    },
    {
      id: "soc2-policy-verification",
      name: "SOC2 Policy Verification",
      desc: "Verifying engineering practices align with SOC2 requirements.",
      steps: [
        "Ensure all PRs require at least one approving review before merging.",
        "Verify that branch protection rules are enforced on the main branch.",
        "Check that access to production databases requires MFA and VPN.",
        "Confirm that deployment logs are immutable and stored in a centralized system."
      ]
    }
  ]
};

function buildMarkdown(domain, skill) {
  const yaml = `---
name: ${skill.name}
description: ${skill.desc}
category: ${domain}
tags: [${domain}, templates, best-practices]
version: 1.0.0
---
`;
  let stepsMd = '';
  skill.steps.forEach((step, i) => {
    stepsMd += `### ${i + 1}. Step ${i + 1}\n${step}\n\n`;
  });

  const md = `# ${skill.name}

${skill.desc}

## When to use
- When operating in the \`${domain}\` domain.
- When resolving incidents related to ${skill.name.toLowerCase()}.

## When not to use
- If the issue requires manual human intervention.
- If the domain does not apply.

## Triggers
- Pattern: \`${skill.id}\`
- Keywords: ${domain}, ${skill.name.split(' ')[0].toLowerCase()}

## Inputs
- Context from the current user session or incident report.

## Steps
${stepsMd.trim()}

## Success signals
- The task is resolved without regressions.
- Logs confirm the procedure was successfully applied.

## Failure modes
- Incorrect application of the steps leading to side effects.

## Safety notes
- Always verify changes in a staging environment before applying to production.
- Do not execute destructive commands without explicit authorization.
`;
  return yaml + md;
}

const outDir = path.join(__dirname, '../.agents/skills');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let count = 0;
for (const [domain, skills] of Object.entries(skillsData)) {
  for (const skill of skills) {
    const dirPath = path.join(outDir, skill.id);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, 'SKILL.md'), buildMarkdown(domain, skill));
    count++;
  }
}

console.log(`Generated ${count} domain template skills in .agents/skills/`);
