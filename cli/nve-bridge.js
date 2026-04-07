#!/usr/bin/env node
/**
 * nve-bridge — Runtime ↔ Genome Bridge
 *
 * Two adapters connecting the fast loop (runtime) to the slow loop (genome):
 *
 * Runtime → Genome:
 *   - After each task: trace + incident candidates → .evolution/
 *   - PostToolUse errors → auto-capture incident candidate
 *
 * Genome → Runtime:
 *   - On SessionStart: inject MEMORY.md + top genomes + relevant skills
 *   - Given task description → top-K relevant genomes (retrieval API)
 *   - Trust tier enforcement: only promoted genomes injected, not candidates
 *
 * Commands:
 *   nve-bridge inject [--task <desc>]     — Genome→Runtime: assemble context injection
 *   nve-bridge capture [--file <path>]    — Runtime→Genome: capture trace as incident candidate
 *   nve-bridge retrieve <query>           — Retrieve top-K relevant genomes for a query
 *   nve-bridge status                     — Show bridge connectivity status
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');
const { compileMemoryTree } = require('./nve-memory-tree');

let aaak;
try { aaak = require('./nve-aaak'); } catch { aaak = null; }

const args = process.argv.slice(2);
const cmd = args[0] || 'status';
const ROOT = findProjectRoot();

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Genome Retrieval ─────────────────────────────────────────────────────────

/**
 * Load all promoted genomes from .evolution/failure_genomes/.
 */
function loadPromotedGenomes() {
  const genomesDir = path.join(ROOT, '.evolution', 'failure_genomes');
  if (!fs.existsSync(genomesDir)) return [];

  return fs.readdirSync(genomesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const g = JSON.parse(fs.readFileSync(path.join(genomesDir, f), 'utf8'));
        if (g.promotion_decision !== 'promoted') return null;
        return g;
      } catch { return null; }
    })
    .filter(Boolean);
}

/**
 * Simple Jaccard-based relevance scoring between query tokens and genome fields.
 */
function scoreGenome(genome, queryTokens) {
  const genomeTokens = new Set([
    ...(genome.family || '').toLowerCase().split(/\W+/),
    ...(genome.violated_invariant || '').toLowerCase().split(/\W+/),
    ...(genome.repair_operator || '').toLowerCase().split(/\W+/),
    ...(genome.success_pattern || '').toLowerCase().split(/\W+/),
    ...(genome.transferability_tags || []).map(t => t.toLowerCase()),
    ...(genome.context_fingerprint?.stack_tags || []).map(t => t.toLowerCase()),
  ]);

  const intersection = queryTokens.filter(t => genomeTokens.has(t)).length;
  const union = new Set([...queryTokens, ...genomeTokens]).size;
  const jaccard = union > 0 ? intersection / union : 0;

  // Boost by utility score
  const utilityBoost = genome.utility?.score || 0;
  return jaccard * 0.7 + utilityBoost * 0.3;
}

/**
 * Retrieve top-K genomes relevant to a query.
 */
function retrieveGenomes(query, topK = 5) {
  const genomes = loadPromotedGenomes();
  const queryTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

  const scored = genomes
    .map(g => ({ genome: g, score: scoreGenome(g, queryTokens) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

/**
 * Load promoted skills metadata.
 */
function loadSkills(topK = 5) {
  const skillsDir = path.join(ROOT, '.agents', 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  return fs.readdirSync(skillsDir)
    .filter(d => fs.existsSync(path.join(skillsDir, d, 'SKILL.md')))
    .slice(0, topK)
    .map(d => {
      const content = fs.readFileSync(path.join(skillsDir, d, 'SKILL.md'), 'utf8');
      const titleMatch = content.match(/^#\s+(.+)/m);
      return { name: d, title: titleMatch ? titleMatch[1] : d };
    });
}

// ─── Genome → Runtime: Context Injection ──────────────────────────────────────

function assembleInjection(taskDescription) {
  const result = {
    timestamp: new Date().toISOString(),
    task: taskDescription || null,
    memory_tree: null,
    top_genomes: [],
    top_skills: [],
    anti_patterns: [],
    aaak_wakeup: null,
    rendered: '',
  };

  // Compile memory tree
  const memoryBundle = compileMemoryTree(ROOT);
  result.memory_tree = {
    layers: memoryBundle.layers_count,
    rules_count: memoryBundle.merged.rules.length,
    anti_patterns_count: memoryBundle.merged.anti_patterns.length,
  };
  result.anti_patterns = memoryBundle.merged.anti_patterns.map(a => a.text);

  // Retrieve relevant genomes
  if (taskDescription) {
    const retrieved = retrieveGenomes(taskDescription, 5);
    result.top_genomes = retrieved.map(r => ({
      genome_id: r.genome.genome_id,
      kind: r.genome.kind || 'failure',
      family: r.genome.family,
      summary: r.genome.kind === 'failure'
        ? `AVOID: ${r.genome.violated_invariant} → FIX: ${r.genome.repair_operator}`
        : `${(r.genome.kind || 'success').toUpperCase()}: ${r.genome.success_pattern || r.genome.family}`,
      score: r.score,
    }));
  }

  // Top skills
  result.top_skills = loadSkills(5);

  // AAAK wake-up context (P.1+P.2)
  if (aaak) {
    try {
      const wakeup = aaak.generateWakeUp();
      result.aaak_wakeup = wakeup;
    } catch { /* aaak optional */ }
  }

  // Render combined injection
  const lines = [];
  lines.push('[GENOME CONTEXT INJECTION]');
  lines.push('');

  // Prepend AAAK wake-up if available
  if (result.aaak_wakeup) {
    lines.push(result.aaak_wakeup.combined);
    lines.push('');
  }

  if (memoryBundle.rendered) {
    lines.push(memoryBundle.rendered.trim());
    lines.push('');
  }

  if (result.top_genomes.length > 0) {
    lines.push('## Relevant Genomes');
    for (const g of result.top_genomes) {
      lines.push(`- [${g.genome_id}] ${g.summary} (relevance: ${(g.score * 100).toFixed(0)}%)`);
    }
    lines.push('');
  }

  if (result.top_skills.length > 0) {
    lines.push('## Available Skills');
    for (const s of result.top_skills) {
      lines.push(`- ${s.name}: ${s.title}`);
    }
    lines.push('');
  }

  result.rendered = lines.join('\n');
  return result;
}

// ─── Runtime → Genome: Trace Capture ──────────────────────────────────────────

function captureTrace(traceData) {
  const incidentsDir = path.join(ROOT, '.evolution', 'incidents');
  if (!fs.existsSync(incidentsDir)) fs.mkdirSync(incidentsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const eventId = `INC-${Date.now().toString(36).toUpperCase()}`;

  const incident = {
    schema_version: '1.0.0',
    event_id: eventId,
    project_id: path.basename(ROOT),
    occurred_at: new Date().toISOString(),
    status: 'observed',
    stage: traceData.stage || 'runtime',
    failure_class: traceData.failure_class || 'runtime_error',
    safe_title: traceData.title || 'Auto-captured incident from bridge',
    safe_summary: traceData.summary || 'Incident auto-captured during task execution',
    safe_root_cause: traceData.root_cause || null,
    impact_score: traceData.impact_score || 3,
    stack_tags: traceData.stack_tags || [],
    repeat_detected: false,
    verifier: { type: 'auto_capture', outcome: 'not_run' },
    privacy: { sharing_tier: 'private', contains_code: false, contains_secrets: false },
    bridge_metadata: {
      source: 'runtime_bridge',
      task_id: traceData.task_id || null,
      tool_name: traceData.tool_name || null,
      exit_code: traceData.exit_code || null,
    },
  };

  const outFile = path.join(incidentsDir, `${eventId}-${timestamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(incident, null, 2), 'utf8');
  return { event_id: eventId, path: outFile };
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] || null;
}

function cmdInject() {
  const task = getFlag('--task') || args[1];
  const injection = assembleInjection(task);

  if (args.includes('--json')) {
    console.log(JSON.stringify(injection, null, 2));
  } else {
    console.log(`\n${C.bold}Genome → Runtime Injection${C.reset}\n`);
    console.log(`  Memory layers: ${injection.memory_tree.layers}`);
    console.log(`  Rules: ${injection.memory_tree.rules_count}`);
    console.log(`  Anti-patterns: ${injection.memory_tree.anti_patterns_count}`);
    console.log(`  Relevant genomes: ${injection.top_genomes.length}`);
    console.log(`  Skills: ${injection.top_skills.length}`);
    console.log();
    console.log(injection.rendered);
  }
}

function cmdCapture() {
  const filePath = getFlag('--file');
  let traceData = {};

  if (filePath && fs.existsSync(filePath)) {
    traceData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else {
    // Capture from stdin args
    traceData = {
      title: getFlag('--title') || 'Manual bridge capture',
      summary: getFlag('--summary') || 'Incident captured via nve-bridge capture',
      stage: getFlag('--stage') || 'runtime',
      failure_class: getFlag('--class') || 'runtime_error',
      stack_tags: (getFlag('--tags') || '').split(',').filter(Boolean),
    };
  }

  const result = captureTrace(traceData);
  console.log(`${C.green}✓${C.reset} Captured incident: ${result.event_id}`);
  console.log(`  ${C.dim}${result.path}${C.reset}`);
}

function cmdRetrieve() {
  const query = args.slice(1).join(' ');
  if (!query) { console.error('Usage: nve-bridge retrieve <query>'); process.exit(1); }

  const topK = parseInt(getFlag('--top') || '5', 10);
  const results = retrieveGenomes(query, topK);

  if (args.includes('--json')) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`\n${C.bold}Genome Retrieval${C.reset}: "${query}" (top ${topK})\n`);
    if (results.length === 0) {
      console.log(`  ${C.dim}No relevant genomes found.${C.reset}\n`);
      return;
    }
    for (const r of results) {
      const g = r.genome;
      const kind = g.kind || 'failure';
      const summary = kind === 'failure'
        ? `AVOID: ${g.violated_invariant} → FIX: ${g.repair_operator}`
        : `${kind.toUpperCase()}: ${g.success_pattern || g.family}`;
      console.log(`  ${C.cyan}●${C.reset} ${C.bold}${g.genome_id}${C.reset} (${(r.score * 100).toFixed(0)}%)`);
      console.log(`    ${summary}`);
      console.log(`    ${C.dim}Family: ${g.family} | Tags: ${(g.transferability_tags || []).join(', ') || 'none'}${C.reset}`);
      console.log();
    }
  }
}

function cmdStatus() {
  const genomes = loadPromotedGenomes();
  const skills = loadSkills(100);
  const memBundle = compileMemoryTree(ROOT);
  const hooksDir = path.join(ROOT, '.evolution', 'hooks');
  const hookCount = fs.existsSync(hooksDir) ? fs.readdirSync(hooksDir).filter(f => f.endsWith('.json')).length : 0;
  const subagentsDir = path.join(ROOT, '.evolution', 'subagents');
  const subagentCount = fs.existsSync(subagentsDir) ? fs.readdirSync(subagentsDir).filter(f => f.endsWith('.json')).length : 0;

  console.log(`\n${C.bold}Bridge Status${C.reset}\n`);
  console.log(`  ${C.bold}Genome → Runtime:${C.reset}`);
  console.log(`    Promoted genomes:  ${genomes.length}`);
  console.log(`    Available skills:  ${skills.length}`);
  console.log(`    Memory layers:     ${memBundle.layers_count}`);
  console.log(`    Memory rules:      ${memBundle.merged.rules.length}`);
  console.log(`    Anti-patterns:     ${memBundle.merged.anti_patterns.length}`);
  console.log();
  console.log(`  ${C.bold}Runtime → Genome:${C.reset}`);
  const incDir = path.join(ROOT, '.evolution', 'incidents');
  const incCount = fs.existsSync(incDir) ? fs.readdirSync(incDir).filter(f => f.endsWith('.json')).length : 0;
  console.log(`    Incidents captured: ${incCount}`);
  console.log(`    Hooks registered:   ${hookCount}`);
  console.log(`    Subagents ready:    ${subagentCount}`);
  console.log();

  const healthy = genomes.length > 0 || memBundle.layers_count > 0;
  if (healthy) {
    console.log(`  ${C.green}${C.bold}Bridge operational.${C.reset}\n`);
  } else {
    console.log(`  ${C.yellow}Bridge initialized but no promoted genomes yet.${C.reset}`);
    console.log(`  ${C.dim}Run: nve-distill + nve-replay to promote genomes.${C.reset}\n`);
  }
}

// Export for programmatic use
module.exports = { assembleInjection, captureTrace, retrieveGenomes, scoreGenome, loadPromotedGenomes, loadSkills };

// CLI entry — only run when invoked directly
if (require.main === module) {
  try {
    switch (cmd) {
      case 'inject': cmdInject(); break;
      case 'capture': cmdCapture(); break;
      case 'retrieve': cmdRetrieve(); break;
      case 'status': cmdStatus(); break;
      default:
        console.error('Usage: nve-bridge [inject|capture|retrieve|status]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
