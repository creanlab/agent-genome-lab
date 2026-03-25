#!/usr/bin/env node
/**
 * nve-handoff.js — Generate/update HANDOFF.md for structured run state
 *
 * Usage:
 *   node cli/nve-handoff.js --task "Add payment integration" --status in_progress
 *   node cli/nve-handoff.js --complete                     # mark current run as done
 *   node cli/nve-handoff.js                                # show current handoff state
 *
 * Produces .evolution/HANDOFF.md — the "what is happening RIGHT NOW" complement
 * to MEMORY.md ("what we learned from ALL past work").
 *
 * Anthropic Harness Design (Mar 2026) showed that structured handoff artifacts
 * are essential for multi-session agent work. Unlike context resets (model-specific
 * workaround), HANDOFF.md is model-agnostic and human-readable.
 */

const fs = require('fs');
const path = require('path');

const ROOT = findProjectRoot(process.cwd());
const EVO = path.join(ROOT, '.evolution');
const HANDOFF_PATH = path.join(EVO, 'HANDOFF.md');
const INCIDENTS_DIR = path.join(EVO, 'incidents');
const GENOMES_DIR = path.join(EVO, 'failure_genomes');
const MEMORY_PATH = path.join(EVO, 'MEMORY.md');

function findProjectRoot(dir) {
  let d = dir;
  while (d !== path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.evolution'))) return d;
    d = path.dirname(d);
  }
  return dir;
}

// Parse CLI args
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const val = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[i + 1] : true;
    flags[key] = val;
    if (val !== true) i++;
  }
}

// Ensure .evolution exists
if (!fs.existsSync(EVO)) {
  console.error('❌ No .evolution/ directory found. Run nve-init first.');
  process.exit(1);
}

// Load existing handoff if present
let handoff = {};
if (fs.existsSync(HANDOFF_PATH)) {
  handoff = parseHandoff(fs.readFileSync(HANDOFF_PATH, 'utf8'));
}

// Handle --complete flag
if (flags.complete) {
  handoff.status = 'completed';
  handoff.completed_at = new Date().toISOString();
  writeHandoff(handoff);
  console.log('\n✅ Run marked as completed');
  console.log(`   Task: ${handoff.task || '(none)'}`);
  console.log(`   Completed at: ${handoff.completed_at}`);
  process.exit(0);
}

// Handle --show or no args (display current state)
if (args.length === 0 || flags.show) {
  if (!fs.existsSync(HANDOFF_PATH)) {
    console.log('\n📋 No active HANDOFF.md found.');
    console.log('   Start a new run with: node cli/nve-handoff.js --task "your task"');
    process.exit(0);
  }
  console.log('\n📋 Current HANDOFF.md:');
  console.log('━'.repeat(50));
  console.log(fs.readFileSync(HANDOFF_PATH, 'utf8'));
  process.exit(0);
}

// Create or update handoff
if (flags.task) handoff.task = flags.task;
if (flags.status) handoff.status = flags.status;
if (flags.files) handoff.files_modified = flags.files.split(',').map(f => f.trim());
if (flags.completed) {
  const items = flags.completed.split(',').map(f => f.trim());
  handoff.completed_items = [...(handoff.completed_items || []), ...items];
}
if (flags.remaining) {
  handoff.remaining_items = flags.remaining.split(',').map(f => f.trim());
}
if (flags.blocker) {
  handoff.blockers = [...(handoff.blockers || []), flags.blocker];
}
if (flags.context) handoff.context_for_next = flags.context;

// Set defaults for new runs
if (!handoff.started_at) handoff.started_at = new Date().toISOString();
if (!handoff.status) handoff.status = 'in_progress';
if (!handoff.run_id) handoff.run_id = 'RUN-' + new Date().toISOString().slice(0, 10).replace(/-/g, '');

// Auto-detect related genomes from task description
const relatedGenomes = findRelatedGenomes(handoff.task || '');

writeHandoff(handoff, relatedGenomes);

console.log('\n📋 HANDOFF.md generated');
console.log(`   Path:    ${HANDOFF_PATH}`);
console.log(`   Run ID:  ${handoff.run_id}`);
console.log(`   Task:    ${handoff.task || '(not set)'}`);
console.log(`   Status:  ${handoff.status}`);
if (relatedGenomes.length > 0) {
  console.log(`   ⚠️  Related genomes: ${relatedGenomes.map(g => g.family).join(', ')}`);
}
console.log(`\n   The agent should read this file alongside MEMORY.md at session start.`);

// --- Functions ---

function findRelatedGenomes(taskDesc) {
  if (!taskDesc || !fs.existsSync(GENOMES_DIR)) return [];
  const words = taskDesc.toLowerCase().split(/\s+/);
  const keywords = new Set(words.filter(w => w.length > 3));
  
  const genomes = [];
  for (const file of fs.readdirSync(GENOMES_DIR)) {
    if (!file.startsWith('FG-') || !file.endsWith('.json')) continue;
    try {
      const g = JSON.parse(fs.readFileSync(path.join(GENOMES_DIR, file), 'utf8'));
      const gText = `${g.family || ''} ${g.violated_invariant || ''} ${g.surface || ''} ${(g.tags || []).join(' ')}`.toLowerCase();
      const matches = [...keywords].filter(k => gText.includes(k));
      if (matches.length >= 2 || (g.tags || []).some(t => keywords.has(t))) {
        genomes.push({ id: g.genome_id, family: g.family, invariant: g.violated_invariant, matches });
      }
    } catch (e) { /* skip bad files */ }
  }
  return genomes;
}

function writeHandoff(h, relatedGenomes = []) {
  const lines = [];
  lines.push('# HANDOFF.md — Current Run State');
  lines.push(`<!-- Generated by nve-handoff.js on ${new Date().toISOString().slice(0, 10)} -->`);
  lines.push(`<!-- This file describes the CURRENT run. MEMORY.md describes accumulated knowledge. -->`);
  lines.push('');
  lines.push('## Run Info');
  lines.push(`- **Run ID**: ${h.run_id || 'unknown'}`);
  lines.push(`- **Task**: ${h.task || '(not specified)'}`);
  lines.push(`- **Status**: ${h.status || 'unknown'}`);
  lines.push(`- **Started**: ${h.started_at || 'unknown'}`);
  if (h.completed_at) lines.push(`- **Completed**: ${h.completed_at}`);
  lines.push('');

  if (h.files_modified && h.files_modified.length > 0) {
    lines.push('## Files Modified');
    for (const f of h.files_modified) lines.push(`- \`${f}\``);
    lines.push('');
  }

  if (h.completed_items && h.completed_items.length > 0) {
    lines.push('## ✅ Completed');
    for (const item of h.completed_items) lines.push(`- [x] ${item}`);
    lines.push('');
  }

  if (h.remaining_items && h.remaining_items.length > 0) {
    lines.push('## 🔲 Remaining');
    for (const item of h.remaining_items) lines.push(`- [ ] ${item}`);
    lines.push('');
  }

  if (h.blockers && h.blockers.length > 0) {
    lines.push('## 🚫 Blockers');
    for (const b of h.blockers) lines.push(`- ⚠️ ${b}`);
    lines.push('');
  }

  if (relatedGenomes.length > 0) {
    lines.push('## ⚡ Related Genomes (auto-detected)');
    lines.push('> These failure patterns from MEMORY.md are relevant to the current task.');
    for (const g of relatedGenomes) {
      lines.push(`- **${g.id}** [${g.family}]: ${g.invariant}`);
    }
    lines.push('');
  }

  if (h.context_for_next) {
    lines.push('## 📝 Context for Next Agent');
    lines.push(h.context_for_next);
    lines.push('');
  }

  fs.writeFileSync(HANDOFF_PATH, lines.join('\n'));
}

function parseHandoff(content) {
  const h = {};
  const runIdMatch = content.match(/\*\*Run ID\*\*:\s*(.+)/);
  const taskMatch = content.match(/\*\*Task\*\*:\s*(.+)/);
  const statusMatch = content.match(/\*\*Status\*\*:\s*(.+)/);
  const startedMatch = content.match(/\*\*Started\*\*:\s*(.+)/);
  
  if (runIdMatch) h.run_id = runIdMatch[1].trim();
  if (taskMatch) h.task = taskMatch[1].trim();
  if (statusMatch) h.status = statusMatch[1].trim();
  if (startedMatch) h.started_at = startedMatch[1].trim();

  // Parse completed items
  const completedItems = [];
  const completedRegex = /- \[x\] (.+)/g;
  let m;
  while ((m = completedRegex.exec(content)) !== null) completedItems.push(m[1]);
  if (completedItems.length) h.completed_items = completedItems;

  // Parse remaining items
  const remainingItems = [];
  const remainingRegex = /- \[ \] (.+)/g;
  while ((m = remainingRegex.exec(content)) !== null) remainingItems.push(m[1]);
  if (remainingItems.length) h.remaining_items = remainingItems;

  return h;
}
