#!/usr/bin/env node
/**
 * nve-subagent — Subagent Registry & Invocation
 *
 * Promotes genome skills → specialized subagents with isolated context
 * and restricted tool access.
 *
 * Commands:
 *   nve-subagent list                  — Show all registered subagents
 *   nve-subagent register <file.json>  — Register a new subagent definition
 *   nve-subagent invoke <name> [args]  — Invoke a subagent (dry-run by default)
 *   nve-subagent validate              — Validate all registered subagent schemas
 *   nve-subagent init                  — Scaffold .evolution/subagents/ with 5 defaults
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'list';
const ROOT = findProjectRoot();
const SUBAGENTS_DIR = path.join(ROOT, '.evolution', 'subagents');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Subagent Schema ──────────────────────────────────────────────────────────

const REQUIRED_FIELDS = ['name', 'description', 'allowed_tools', 'system_prompt'];

function validateSubagent(def) {
  const errors = [];
  for (const field of REQUIRED_FIELDS) {
    if (!def[field]) errors.push(`Missing required field: ${field}`);
  }
  if (def.allowed_tools && !Array.isArray(def.allowed_tools)) {
    errors.push('allowed_tools must be an array');
  }
  if (def.source_genome && typeof def.source_genome !== 'string') {
    errors.push('source_genome must be a string');
  }
  if (def.source_skill && typeof def.source_skill !== 'string') {
    errors.push('source_skill must be a string');
  }
  return errors;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

function loadRegistry() {
  if (!fs.existsSync(SUBAGENTS_DIR)) return [];
  return fs.readdirSync(SUBAGENTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(SUBAGENTS_DIR, f), 'utf8'));
        return { ...raw, _file: f };
      } catch (e) {
        return { _file: f, _error: e.message };
      }
    });
}

// ─── Default Subagents ────────────────────────────────────────────────────────

const DEFAULTS = [
  {
    name: 'retriever',
    description: 'Vector retrieval + graph expansion subagent. Finds relevant genomes, skills, and code chunks for a given task.',
    allowed_tools: ['Read', 'Grep', 'Glob'],
    system_prompt: 'You are a retrieval specialist. Given a task description, search the codebase and .evolution/ for relevant failure genomes, skills, and code patterns. Return a ranked list of relevant chunks with relevance scores. Do NOT modify any files.',
    source_skill: null,
    source_genome: null,
    max_tokens: 4096,
    isolation: 'none',
  },
  {
    name: 'critic',
    description: 'Adversarial review subagent. Critiques hypothesis or genome candidate before ranking/promotion.',
    allowed_tools: ['Read', 'Grep', 'Glob'],
    system_prompt: 'You are an adversarial critic. Your job is to find flaws, risks, and edge cases in a proposed hypothesis or genome candidate. Consider: correctness, security, blast radius, transferability, and potential negative transfer. Output a structured verdict: approve/reject/revise with detailed critique.',
    source_skill: null,
    source_genome: null,
    max_tokens: 4096,
    isolation: 'none',
  },
  {
    name: 'patcher',
    description: 'Repair operator subagent. Applies repair operators from genomes to fix known failure patterns.',
    allowed_tools: ['Read', 'Edit', 'Grep', 'Glob', 'Bash'],
    system_prompt: 'You are a repair specialist. Given a failure genome with a repair_operator, apply the fix to the codebase. Follow the repair operator exactly. Verify the fix by running relevant tests if available. Report what changed and whether verification passed.',
    source_skill: null,
    source_genome: null,
    max_tokens: 8192,
    isolation: 'worktree',
  },
  {
    name: 'replayer',
    description: 'Replay gate evaluation subagent. Runs replay checks on genome candidates.',
    allowed_tools: ['Read', 'Bash', 'Grep'],
    system_prompt: 'You are a replay gate evaluator. Given a LessonCandidate or genome, evaluate the five replay gate components: p_replay (does the fix actually work?), p_transfer (does it generalize?), q_verifier (is the evidence reliable?), h_risk (hallucination risk), l_leak (privacy leak risk). Output a ReplayResult JSON.',
    source_skill: null,
    source_genome: null,
    max_tokens: 4096,
    isolation: 'none',
  },
  {
    name: 'skill-distiller',
    description: 'Auto-distill subagent. Converts incident → experience unit → genome candidate.',
    allowed_tools: ['Read', 'Grep', 'Glob'],
    system_prompt: 'You are a skill distiller. Given an incident event or raw observation, extract the key lesson, identify the failure family, formulate the violated invariant and repair operator, and output a structured LessonCandidate JSON ready for replay gate evaluation.',
    source_skill: null,
    source_genome: null,
    max_tokens: 4096,
    isolation: 'none',
  },
];

// ─── Commands ─────────────────────────────────────────────────────────────────

function cmdList() {
  const registry = loadRegistry();
  console.log(`\n${C.bold}Registered Subagents${C.reset} (${registry.length})\n`);

  if (registry.length === 0) {
    console.log(`  ${C.dim}No subagents registered. Run: nve-subagent init${C.reset}\n`);
    return;
  }

  for (const sa of registry) {
    if (sa._error) {
      console.log(`  ${C.red}✗${C.reset} ${sa._file}: ${sa._error}`);
      continue;
    }
    const tools = (sa.allowed_tools || []).join(', ');
    const source = sa.source_genome || sa.source_skill || 'manual';
    console.log(`  ${C.cyan}●${C.reset} ${C.bold}${sa.name}${C.reset}`);
    console.log(`    ${C.dim}${sa.description}${C.reset}`);
    console.log(`    Tools: ${tools} | Isolation: ${sa.isolation || 'none'} | Source: ${source}`);
    console.log();
  }
}

function cmdRegister() {
  const filePath = args[1];
  if (!filePath) { console.error('Usage: nve-subagent register <file.json>'); process.exit(1); }

  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) { console.error(`File not found: ${absPath}`); process.exit(1); }

  const def = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  const errors = validateSubagent(def);
  if (errors.length > 0) {
    console.error(`${C.red}Validation errors:${C.reset}`);
    errors.forEach(e => console.error(`  ${C.red}✗${C.reset} ${e}`));
    process.exit(1);
  }

  if (!fs.existsSync(SUBAGENTS_DIR)) fs.mkdirSync(SUBAGENTS_DIR, { recursive: true });
  const outFile = path.join(SUBAGENTS_DIR, `${def.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(def, null, 2), 'utf8');
  console.log(`${C.green}✓${C.reset} Registered: ${def.name} → ${outFile}`);
}

function cmdInvoke() {
  const name = args[1];
  if (!name) { console.error('Usage: nve-subagent invoke <name>'); process.exit(1); }

  const registry = loadRegistry();
  const sa = registry.find(s => s.name === name);
  if (!sa) { console.error(`Subagent not found: ${name}`); process.exit(1); }
  if (sa._error) { console.error(`Subagent ${name} has errors: ${sa._error}`); process.exit(1); }

  console.log(`\n${C.bold}Subagent Invocation (dry-run)${C.reset}\n`);
  console.log(`  Name:         ${sa.name}`);
  console.log(`  Tools:        ${(sa.allowed_tools || []).join(', ')}`);
  console.log(`  Isolation:    ${sa.isolation || 'none'}`);
  console.log(`  Max tokens:   ${sa.max_tokens || 'default'}`);
  console.log(`  System prompt:\n${C.dim}${sa.system_prompt}${C.reset}`);
  console.log(`\n${C.yellow}Dry-run mode: no model invocation.${C.reset}`);
  console.log(`${C.dim}To execute, integrate with nve-provider + event bus in your runtime.${C.reset}\n`);
}

function cmdValidate() {
  const registry = loadRegistry();
  let valid = 0, invalid = 0;

  console.log(`\n${C.bold}Validating Subagent Registry${C.reset}\n`);
  for (const sa of registry) {
    if (sa._error) {
      console.log(`  ${C.red}✗${C.reset} ${sa._file}: parse error — ${sa._error}`);
      invalid++;
      continue;
    }
    const errors = validateSubagent(sa);
    if (errors.length === 0) {
      console.log(`  ${C.green}✓${C.reset} ${sa.name}`);
      valid++;
    } else {
      console.log(`  ${C.red}✗${C.reset} ${sa.name}: ${errors.join('; ')}`);
      invalid++;
    }
  }
  console.log(`\n${valid} valid, ${invalid} invalid\n`);
  if (invalid > 0) process.exit(1);
}

function cmdInit() {
  if (!fs.existsSync(SUBAGENTS_DIR)) fs.mkdirSync(SUBAGENTS_DIR, { recursive: true });

  let created = 0;
  for (const def of DEFAULTS) {
    const outFile = path.join(SUBAGENTS_DIR, `${def.name}.json`);
    if (!fs.existsSync(outFile)) {
      fs.writeFileSync(outFile, JSON.stringify(def, null, 2), 'utf8');
      console.log(`${C.green}✓${C.reset} Created ${def.name}.json`);
      created++;
    } else {
      console.log(`${C.dim}  Skipped ${def.name}.json (exists)${C.reset}`);
    }
  }
  console.log(`\n${created > 0 ? `${created} subagents created` : 'All subagents already exist'} in ${SUBAGENTS_DIR}\n`);
}

// Export for programmatic use
module.exports = { DEFAULT_SUBAGENTS: DEFAULTS, validateSubagent, loadRegistry };

// CLI entry — only run when invoked directly
if (require.main === module) {
  try {
    switch (cmd) {
      case 'list': cmdList(); break;
      case 'register': cmdRegister(); break;
      case 'invoke': cmdInvoke(); break;
      case 'validate': cmdValidate(); break;
      case 'init': cmdInit(); break;
      default:
        console.error('Usage: nve-subagent [list|register|invoke|validate|init]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
