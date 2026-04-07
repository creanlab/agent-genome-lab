#!/usr/bin/env node
/**
 * nve-skill-enrich — Enrich skills with gotchas.md + references/
 *
 * Generates Anthropic-style skill documentation:
 *   - gotchas.md: common pitfalls and edge cases (M.4)
 *   - references/: example JSON + real cases (M.5)
 *
 * Commands:
 *   nve-skill-enrich generate [--skill <name>]  — Generate gotchas + references for skill(s)
 *   nve-skill-enrich list                        — List skills and enrichment status
 *   nve-skill-enrich validate                    — Check all skills have required docs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'list';
const ROOT = findProjectRoot();
const SKILLS_DIR = path.join(ROOT, '.agents', 'skills');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] || null;
}

// ─── Skill Parsing ───────────────────────────────────────────────────────────

function parseSkillMd(content) {
  const result = {
    name: '', description: '', version: '', applies_to: [],
    invariants: [], repair_operators: [], context: '',
  };

  // Frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fm = fmMatch[1];
    const nameMatch = fm.match(/name:\s*(.+)/);
    if (nameMatch) result.name = nameMatch[1].trim();
    const descMatch = fm.match(/description:\s*"?(.+?)"?\s*$/m);
    if (descMatch) result.description = descMatch[1].trim();
    const appliesMatch = fm.match(/applies_to:\s*\[([^\]]*)\]/);
    if (appliesMatch) result.applies_to = appliesMatch[1].split(',').map(s => s.trim().replace(/"/g, ''));
  }

  // Invariants
  const invMatches = content.match(/✅\s*\*\*(.+?)\*\*/g);
  if (invMatches) result.invariants = invMatches.map(m => m.replace(/✅\s*\*\*|\*\*/g, '').trim());

  // Repair operators
  const repMatches = content.match(/🔧\s*(.+)/g);
  if (repMatches) result.repair_operators = repMatches.map(m => m.replace(/🔧\s*/, '').trim());

  // Context section
  const ctxMatch = content.match(/## Context & Applicability\n([\s\S]*?)(?=\n##|$)/);
  if (ctxMatch) result.context = ctxMatch[1].trim();

  return result;
}

// ─── Gotchas Generator ───────────────────────────────────────────────────────

function generateGotchas(skill) {
  const lines = [
    `# Gotchas — ${skill.name}`,
    '',
    `> Common pitfalls and edge cases when applying this skill.`,
    '',
    '## When This Skill Fires False Positives',
    '',
  ];

  if (skill.applies_to.length > 0) {
    lines.push(`This skill targets: ${skill.applies_to.join(', ')}. It may **not apply** when:`);
    lines.push(`- The stack doesn't use ${skill.applies_to[0] || 'the target technology'}`);
    lines.push('- The invariant is already enforced by a framework-level guarantee');
    lines.push('- The codebase has a custom solution that handles this differently');
    lines.push('');
  }

  lines.push('## Edge Cases');
  lines.push('');
  for (const inv of skill.invariants) {
    lines.push(`### "${inv}":`);
    lines.push(`- May conflict with: caching layers, proxy configurations, CI-specific overrides`);
    lines.push(`- Watch out for: partial application where the fix is applied but not verified`);
    lines.push(`- In monorepos: check if the invariant applies to all packages or just the root`);
    lines.push('');
  }

  lines.push('## Anti-Patterns to Avoid');
  lines.push('');
  lines.push('- **Blind application**: Don\'t apply the repair operator without verifying the root cause matches');
  lines.push('- **Missing verification**: Always run the verifier after applying — a silent failure is worse than a loud one');
  lines.push('- **Over-scoping**: Apply only to the specific files/modules affected, not globally');
  lines.push('');

  if (skill.repair_operators.length > 0) {
    lines.push('## Repair Operator Notes');
    lines.push('');
    for (const op of skill.repair_operators) {
      lines.push(`- **${op}**: Verify this actually resolves the issue in your specific environment`);
    }
    lines.push('');
  }

  lines.push('## When to Escalate');
  lines.push('');
  lines.push('If the skill\'s repair operator doesn\'t resolve the issue:');
  lines.push('1. Check if the root cause is actually a different failure family');
  lines.push('2. Look for interfering genomes that may conflict');
  lines.push('3. Create a new incident — the skill may need refinement');
  lines.push('');

  return lines.join('\n');
}

// ─── References Generator ────────────────────────────────────────────────────

function generateReferenceExample(skill) {
  return JSON.stringify({
    skill_name: skill.name,
    description: skill.description,
    example_scenario: {
      trigger: `Detected invariant violation: ${skill.invariants[0] || 'unknown'}`,
      context: `In a project using: ${skill.applies_to.join(', ') || 'general stack'}`,
      applied_repair: skill.repair_operators[0] || 'manual investigation',
      outcome: 'Issue resolved after applying repair operator and running verifier',
    },
    related_genomes: [],
    related_skills: [],
    notes: 'This is an auto-generated example. Replace with real cases as they occur.',
  }, null, 2);
}

function generateReferenceSchema(skill) {
  return JSON.stringify({
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": `${skill.name} Reference`,
    "type": "object",
    "properties": {
      "skill_name": { "type": "string" },
      "scenario": {
        "type": "object",
        "properties": {
          "trigger": { "type": "string" },
          "context": { "type": "string" },
          "applied_repair": { "type": "string" },
          "outcome": { "type": "string" },
          "verified": { "type": "boolean" }
        }
      },
      "related_genomes": { "type": "array", "items": { "type": "string" } },
      "notes": { "type": "string" }
    },
    "required": ["skill_name", "scenario"]
  }, null, 2);
}

// ─── Commands ────────────────────────────────────────────────────────────────

function cmdGenerate() {
  const targetSkill = getFlag('--skill');
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log(`${C.yellow}No skills directory at ${SKILLS_DIR}${C.reset}`);
    return;
  }

  const skills = fs.readdirSync(SKILLS_DIR).filter(d =>
    fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md'))
  );

  let generated = 0;
  for (const skillName of skills) {
    if (targetSkill && skillName !== targetSkill) continue;

    const skillDir = path.join(SKILLS_DIR, skillName);
    const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
    const parsed = parseSkillMd(skillMd);
    parsed.name = parsed.name || skillName;

    // Generate gotchas.md
    const gotchasPath = path.join(skillDir, 'gotchas.md');
    if (!fs.existsSync(gotchasPath)) {
      fs.writeFileSync(gotchasPath, generateGotchas(parsed), 'utf8');
      console.log(`  ${C.green}✓${C.reset} ${skillName}/gotchas.md`);
      generated++;
    }

    // Generate references/
    const refsDir = path.join(skillDir, 'references');
    if (!fs.existsSync(refsDir)) {
      fs.mkdirSync(refsDir, { recursive: true });
      fs.writeFileSync(path.join(refsDir, 'example.json'), generateReferenceExample(parsed), 'utf8');
      fs.writeFileSync(path.join(refsDir, 'schema.json'), generateReferenceSchema(parsed), 'utf8');
      console.log(`  ${C.green}✓${C.reset} ${skillName}/references/`);
      generated++;
    }
  }

  console.log(`\n${generated > 0 ? `${C.green}${generated} artifacts generated${C.reset}` : `${C.dim}All skills already enriched${C.reset}`}\n`);
}

function cmdList() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log(`${C.dim}No skills directory.${C.reset}`);
    return;
  }

  const skills = fs.readdirSync(SKILLS_DIR).filter(d =>
    fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md'))
  );

  console.log(`\n${C.bold}Skills Enrichment Status${C.reset} (${skills.length})\n`);
  for (const name of skills) {
    const dir = path.join(SKILLS_DIR, name);
    const hasGotchas = fs.existsSync(path.join(dir, 'gotchas.md'));
    const hasRefs = fs.existsSync(path.join(dir, 'references'));
    const status = hasGotchas && hasRefs ? `${C.green}✓${C.reset}` :
                   hasGotchas || hasRefs ? `${C.yellow}~${C.reset}` : `${C.red}✗${C.reset}`;
    const details = [
      hasGotchas ? 'gotchas' : null,
      hasRefs ? 'references' : null,
    ].filter(Boolean).join(', ') || 'none';
    console.log(`  ${status} ${name} ${C.dim}(${details})${C.reset}`);
  }
  console.log();
}

function cmdValidate() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log(`${C.red}No skills directory.${C.reset}`);
    process.exit(1);
  }

  const skills = fs.readdirSync(SKILLS_DIR).filter(d =>
    fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md'))
  );

  let valid = 0, incomplete = 0;
  for (const name of skills) {
    const dir = path.join(SKILLS_DIR, name);
    const hasAll = fs.existsSync(path.join(dir, 'gotchas.md')) &&
                   fs.existsSync(path.join(dir, 'references'));
    if (hasAll) valid++;
    else {
      incomplete++;
      console.log(`  ${C.yellow}!${C.reset} ${name}: missing ${!fs.existsSync(path.join(dir, 'gotchas.md')) ? 'gotchas.md ' : ''}${!fs.existsSync(path.join(dir, 'references')) ? 'references/' : ''}`);
    }
  }

  console.log(`\n${C.green}${valid} complete${C.reset}, ${C.yellow}${incomplete} incomplete${C.reset}\n`);
  if (incomplete > 0) console.log(`${C.dim}Run: nve-skill-enrich generate${C.reset}\n`);
}

// Export
module.exports = { parseSkillMd, generateGotchas, generateReferenceExample };

// CLI
if (require.main === module) {
  try {
    switch (cmd) {
      case 'generate': cmdGenerate(); break;
      case 'list': cmdList(); break;
      case 'validate': cmdValidate(); break;
      default:
        console.error('Usage: nve-skill-enrich [generate|list|validate] [--skill <name>]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
