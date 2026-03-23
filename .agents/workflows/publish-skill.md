---
description: Publish a learned skill to the Anthropic skills ecosystem as a GitHub-compatible SKILL.md package
---

# /publish-skill — Export Skill to Anthropic Ecosystem

> Use this when you want to share a high-utility genome/pattern with the community.

## Steps

1. Ask the user: "Which skill or genome would you like to publish? (name or ID)"

// turbo
2. Run: `node cli/nve-skill-publish.js <skill-name>`

3. Review the generated files in `exports/<skill-name>/`:
   - `SKILL.md` — Anthropic-compatible skill definition
   - `README.md` — Repository documentation
   - `LICENSE` — MIT license

4. Ask: "Ready to create a GitHub repo? Run these commands:"

```bash
cd exports/<skill-name>
git init
git add .
git commit -m "feat: skill extracted from Agent Genome Lab"
gh repo create <skill-name> --public --source=. --remote=origin --push
```

5. Report: "📦 Skill published! Users can install with: `npx skills add <username>/<skill-name>`"
