#!/usr/bin/env node
/**
 * nve-knowledge-graph — Temporal Knowledge Graph
 *
 * Inspired by MemPalace knowledge_graph.py (MIT).
 * Stores (subject, predicate, object) triples with temporal validity windows.
 * Supports as_of queries, invalidation (preserves history), and timeline views.
 *
 * Storage: .evolution/knowledge_graph.json
 *
 * Commands:
 *   nve-knowledge-graph add <subj> <pred> <obj>   — Add a fact
 *   nve-knowledge-graph query <subject>            — Query facts about subject
 *   nve-knowledge-graph invalidate <id>            — Mark fact as no longer valid
 *   nve-knowledge-graph timeline [--subject <s>]   — Show chronological history
 *   nve-knowledge-graph stats                      — Graph overview
 *   nve-knowledge-graph export                     — Export as JSON
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'stats';
const ROOT = findProjectRoot();
const KG_PATH = path.join(ROOT, '.evolution', 'knowledge_graph.json');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] || null;
}

// ─── Knowledge Graph Core ────────────────────────────────────────────────────

/**
 * Load graph from disk.
 */
function loadGraph() {
  if (!fs.existsSync(KG_PATH)) {
    return { version: '1.0.0', triples: [], next_id: 1 };
  }
  try {
    return JSON.parse(fs.readFileSync(KG_PATH, 'utf8'));
  } catch {
    return { version: '1.0.0', triples: [], next_id: 1 };
  }
}

/**
 * Save graph to disk.
 */
function saveGraph(graph) {
  const dir = path.dirname(KG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(KG_PATH, JSON.stringify(graph, null, 2), 'utf8');
}

/**
 * Add a triple to the graph.
 * @param {string} subject
 * @param {string} predicate
 * @param {string} object
 * @param {object} options - { valid_from, valid_to, source, confidence }
 * @returns {object} The created triple
 */
function addTriple(subject, predicate, object, options = {}) {
  const graph = loadGraph();
  const id = graph.next_id++;

  const triple = {
    id,
    subject: subject.toLowerCase().trim(),
    predicate: predicate.toLowerCase().trim(),
    object: object.trim(),
    valid_from: options.valid_from || new Date().toISOString(),
    valid_to: options.valid_to || null,
    source: options.source || 'manual',
    confidence: options.confidence || 1.0,
    created_at: new Date().toISOString(),
  };

  graph.triples.push(triple);
  saveGraph(graph);
  return triple;
}

/**
 * Query triples by subject, optionally filtered by as_of date.
 * @param {string} subject
 * @param {object} options - { predicate, as_of, include_invalid }
 * @returns {Array} Matching triples
 */
function queryTriples(subject, options = {}) {
  const graph = loadGraph();
  const subjectLower = subject.toLowerCase().trim();
  const asOf = options.as_of ? new Date(options.as_of).toISOString() : null;

  return graph.triples.filter(t => {
    // Subject match (exact or partial)
    if (t.subject !== subjectLower && !t.subject.includes(subjectLower)) return false;

    // Predicate filter
    if (options.predicate && t.predicate !== options.predicate.toLowerCase()) return false;

    // Temporal filter
    if (!options.include_invalid && t.valid_to !== null) {
      if (asOf) {
        if (t.valid_from > asOf || t.valid_to < asOf) return false;
      } else {
        return false; // Skip invalidated triples by default
      }
    }

    if (asOf && t.valid_from > asOf) return false;

    return true;
  });
}

/**
 * Query triples by object (reverse lookup).
 */
function queryByObject(object, options = {}) {
  const graph = loadGraph();
  const objectLower = object.toLowerCase().trim();

  return graph.triples.filter(t => {
    if (!t.object.toLowerCase().includes(objectLower)) return false;
    if (!options.include_invalid && t.valid_to !== null) return false;
    return true;
  });
}

/**
 * Invalidate a triple (set valid_to = now). Preserves history.
 * @param {number} tripleId
 * @returns {object|null} Updated triple or null
 */
function invalidateTriple(tripleId) {
  const graph = loadGraph();
  const triple = graph.triples.find(t => t.id === tripleId);
  if (!triple) return null;
  if (triple.valid_to) return triple; // Already invalidated

  triple.valid_to = new Date().toISOString();
  saveGraph(graph);
  return triple;
}

/**
 * Get timeline for a subject — all triples sorted chronologically.
 */
function getTimeline(subject, options = {}) {
  const graph = loadGraph();
  let triples = graph.triples;

  if (subject) {
    const subjectLower = subject.toLowerCase().trim();
    triples = triples.filter(t =>
      t.subject === subjectLower || t.subject.includes(subjectLower) ||
      t.object.toLowerCase().includes(subjectLower)
    );
  }

  return triples.sort((a, b) => a.valid_from.localeCompare(b.valid_from));
}

/**
 * Get graph statistics.
 */
function getStats() {
  const graph = loadGraph();
  const active = graph.triples.filter(t => t.valid_to === null);
  const invalidated = graph.triples.filter(t => t.valid_to !== null);

  const subjects = new Set(graph.triples.map(t => t.subject));
  const predicates = new Set(graph.triples.map(t => t.predicate));
  const objects = new Set(graph.triples.map(t => t.object));

  return {
    total_triples: graph.triples.length,
    active: active.length,
    invalidated: invalidated.length,
    unique_subjects: subjects.size,
    unique_predicates: predicates.size,
    unique_objects: objects.size,
    sources: [...new Set(graph.triples.map(t => t.source))],
  };
}

/**
 * Auto-populate graph from genomes and skills.
 */
function populateFromEvolution() {
  const added = [];

  // From genomes
  const genomesDir = path.join(ROOT, '.evolution', 'failure_genomes');
  if (fs.existsSync(genomesDir)) {
    for (const f of fs.readdirSync(genomesDir).filter(f => f.endsWith('.json'))) {
      try {
        const g = JSON.parse(fs.readFileSync(path.join(genomesDir, f), 'utf8'));
        if (g.genome_id && g.family) {
          // Check if already exists
          const existing = queryTriples(g.genome_id, { include_invalid: true });
          if (existing.length === 0) {
            added.push(addTriple(g.genome_id, 'belongs_to_family', g.family, { source: 'genome' }));
            if (g.violated_invariant) {
              added.push(addTriple(g.genome_id, 'violates', g.violated_invariant, { source: 'genome' }));
            }
            if (g.repair_operator) {
              added.push(addTriple(g.genome_id, 'repaired_by', g.repair_operator, { source: 'genome' }));
            }
            if (g.promotion_decision) {
              added.push(addTriple(g.genome_id, 'status', g.promotion_decision, {
                source: 'genome',
                confidence: g.utility?.score || 0.5,
              }));
            }
            for (const tag of (g.context_fingerprint?.stack_tags || [])) {
              added.push(addTriple(g.genome_id, 'uses_stack', tag, { source: 'genome' }));
            }
          }
        }
      } catch {}
    }
  }

  // From skills
  const skillsDir = path.join(ROOT, '.agents', 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const d of fs.readdirSync(skillsDir)) {
      const skillMd = path.join(skillsDir, d, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        const existing = queryTriples(d, { include_invalid: true });
        if (existing.length === 0) {
          added.push(addTriple(d, 'is_a', 'skill', { source: 'skill_registry' }));
          const content = fs.readFileSync(skillMd, 'utf8');
          const appliesMatch = content.match(/applies_to:\s*\[([^\]]*)\]/);
          if (appliesMatch) {
            const targets = appliesMatch[1].split(',').map(s => s.trim().replace(/"/g, '')).filter(Boolean);
            for (const t of targets) {
              added.push(addTriple(d, 'applies_to', t, { source: 'skill_registry' }));
            }
          }
        }
      }
    }
  }

  return added;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function cmdAdd() {
  const [, subj, pred, ...rest] = args;
  const obj = rest.filter(a => !a.startsWith('--')).join(' ');
  if (!subj || !pred || !obj) {
    console.error('Usage: nve-knowledge-graph add <subject> <predicate> <object>');
    process.exit(1);
  }
  const triple = addTriple(subj, pred, obj, { source: getFlag('--source') || 'manual' });
  console.log(`${C.green}✓${C.reset} Added triple #${triple.id}: ${triple.subject} → ${triple.predicate} → ${triple.object}`);
}

function cmdQuery() {
  const subject = args[1];
  if (!subject) { console.error('Usage: nve-knowledge-graph query <subject>'); process.exit(1); }
  const results = queryTriples(subject, { include_invalid: args.includes('--all') });
  if (results.length === 0) { console.log(`${C.dim}No facts about "${subject}"${C.reset}`); return; }
  console.log(`\n${C.bold}Facts about "${subject}"${C.reset} (${results.length})\n`);
  for (const t of results) {
    const valid = t.valid_to ? `${C.red}(invalidated)${C.reset}` : `${C.green}(active)${C.reset}`;
    console.log(`  #${t.id} ${t.subject} ${C.cyan}${t.predicate}${C.reset} ${t.object} ${valid}`);
  }
  console.log();
}

function cmdInvalidate() {
  const id = parseInt(args[1], 10);
  if (!id) { console.error('Usage: nve-knowledge-graph invalidate <id>'); process.exit(1); }
  const result = invalidateTriple(id);
  if (!result) { console.log(`${C.red}Triple #${id} not found${C.reset}`); return; }
  console.log(`${C.yellow}✓${C.reset} Invalidated #${id}: ${result.subject} → ${result.predicate} → ${result.object}`);
}

function cmdTimeline() {
  const subject = getFlag('--subject');
  const timeline = getTimeline(subject);
  if (timeline.length === 0) { console.log(`${C.dim}No timeline data${C.reset}`); return; }
  console.log(`\n${C.bold}Timeline${subject ? ` for "${subject}"` : ''}${C.reset} (${timeline.length})\n`);
  for (const t of timeline) {
    const date = t.valid_from.split('T')[0];
    const status = t.valid_to ? `${C.red}✗${C.reset}` : `${C.green}✓${C.reset}`;
    console.log(`  ${date} ${status} ${t.subject} ${C.cyan}${t.predicate}${C.reset} ${t.object}`);
  }
  console.log();
}

function cmdStats() {
  const stats = getStats();
  console.log(`\n${C.bold}Knowledge Graph Stats${C.reset}\n`);
  console.log(`  Total triples:     ${stats.total_triples}`);
  console.log(`  Active:            ${C.green}${stats.active}${C.reset}`);
  console.log(`  Invalidated:       ${C.dim}${stats.invalidated}${C.reset}`);
  console.log(`  Unique subjects:   ${stats.unique_subjects}`);
  console.log(`  Unique predicates: ${stats.unique_predicates}`);
  console.log(`  Unique objects:    ${stats.unique_objects}`);
  console.log(`  Sources:           ${stats.sources.join(', ') || 'none'}`);
  console.log();
}

function cmdPopulate() {
  console.log(`${C.cyan}Populating from .evolution/ ...${C.reset}`);
  const added = populateFromEvolution();
  console.log(`${C.green}✓${C.reset} Added ${added.length} triples from genomes and skills\n`);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  loadGraph, saveGraph,
  addTriple, queryTriples, queryByObject,
  invalidateTriple, getTimeline, getStats,
  populateFromEvolution,
};

// CLI
if (require.main === module) {
  try {
    switch (cmd) {
      case 'add': cmdAdd(); break;
      case 'query': cmdQuery(); break;
      case 'invalidate': cmdInvalidate(); break;
      case 'timeline': cmdTimeline(); break;
      case 'stats': cmdStats(); break;
      case 'populate': cmdPopulate(); break;
      case 'export': console.log(JSON.stringify(loadGraph(), null, 2)); break;
      default:
        console.error('Usage: nve-knowledge-graph [add|query|invalidate|timeline|stats|populate|export]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
