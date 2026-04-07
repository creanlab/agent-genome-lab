#!/usr/bin/env node
/**
 * nve-entity-detect — 2-Pass Entity Detection for Genome Enrichment
 *
 * Inspired by MemPalace entity_detector.py (MIT).
 * Detects people, projects, technologies in text using pattern matching.
 * No LLM needed — pure heuristics.
 *
 * Commands:
 *   nve-entity-detect <file>            — Detect entities in a file
 *   nve-entity-detect --text "..."      — Detect entities in text
 *   nve-entity-detect enrich            — Enrich all genomes with entities
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'help';
const ROOT = findProjectRoot();

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Pass 1: Candidate Extraction ────────────────────────────────────────────

/**
 * Extract entity candidates from text.
 * Returns: Map<string, { count, positions }>
 */
function extractCandidates(text) {
  const candidates = new Map();

  // Capitalized single words (2+ chars)
  const capWords = text.match(/\b[A-Z][a-z]{1,29}\b/g) || [];
  for (const w of capWords) {
    if (!candidates.has(w)) candidates.set(w, { count: 0, positions: [] });
    candidates.get(w).count++;
  }

  // Multi-word proper nouns (e.g., "Memory Palace")
  const multiWord = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
  for (const mw of multiWord) {
    if (!candidates.has(mw)) candidates.set(mw, { count: 0, positions: [] });
    candidates.get(mw).count++;
  }

  // Technical identifiers (hyphenated, dotted)
  const techTerms = text.match(/\b[a-zA-Z][\w]*[-.][\w]+(?:[-.][\w]+)*\b/g) || [];
  for (const t of techTerms) {
    if (t.length > 3) {
      if (!candidates.has(t)) candidates.set(t, { count: 0, positions: [] });
      candidates.get(t).count++;
    }
  }

  // Filter: must appear 2+ times (or 1x for multi-word)
  const filtered = new Map();
  for (const [name, data] of candidates) {
    if (data.count >= 2 || (name.includes(' ') && data.count >= 1)) {
      filtered.set(name, data);
    }
  }

  return filtered;
}

// ─── Pass 2: Scoring & Classification ────────────────────────────────────────

const PERSON_SIGNALS = [
  { pattern: /\b(?:said|asked|told|replied|wrote|mentioned|suggested)\b/i, weight: 2 },
  { pattern: /\b(?:he|she|they|him|her|their)\b/i, weight: 2 },
  { pattern: /\bhey\s+/i, weight: 4 },
  { pattern: />\s*\w+:/m, weight: 3 }, // Dialogue format
  { pattern: /\b\w+\s+said\b/i, weight: 3 },
];

const PROJECT_SIGNALS = [
  { pattern: /\b(?:building|shipping|deployed|launched|released|developing)\b/i, weight: 2 },
  { pattern: /v\d+\.\d+|@\d+\.\d+/i, weight: 3 },
  { pattern: /\.(?:js|ts|py|rs|go|rb|java|json|yaml|toml)\b/i, weight: 3 },
  { pattern: /\b(?:repo|repository|package|module|library|framework)\b/i, weight: 2 },
];

const TECH_SIGNALS = [
  { pattern: /\b(?:Node\.?js|React|Python|Docker|Kubernetes|PostgreSQL|Redis|AWS|GCP)\b/i, weight: 3 },
  { pattern: /\b(?:API|CLI|SDK|HTTP|REST|GraphQL|gRPC)\b/i, weight: 2 },
  { pattern: /\b(?:database|server|client|frontend|backend|middleware)\b/i, weight: 2 },
];

/**
 * Classify an entity candidate.
 * Returns: { type: person|project|technology|unknown, confidence }
 */
function classifyEntity(name, text) {
  // Get context window around entity (200 chars before/after)
  const idx = text.indexOf(name);
  const start = Math.max(0, idx - 200);
  const end = Math.min(text.length, idx + name.length + 200);
  const context = text.slice(start, end);

  let personScore = 0, projectScore = 0, techScore = 0;

  for (const { pattern, weight } of PERSON_SIGNALS) {
    if (pattern.test(context)) personScore += weight;
  }
  for (const { pattern, weight } of PROJECT_SIGNALS) {
    if (pattern.test(context)) projectScore += weight;
  }
  for (const { pattern, weight } of TECH_SIGNALS) {
    if (pattern.test(context) || pattern.test(name)) techScore += weight;
  }

  const total = personScore + projectScore + techScore;
  if (total === 0) return { type: 'unknown', confidence: 0.3 };

  const scores = { person: personScore, project: projectScore, technology: techScore };
  const maxType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  return {
    type: maxType[0],
    confidence: Math.min(maxType[1] / Math.max(total, 1), 1.0),
  };
}

// ─── Full Detection Pipeline ─────────────────────────────────────────────────

/**
 * Detect and classify entities in text (2-pass).
 */
function detectEntities(text) {
  const candidates = extractCandidates(text);
  const entities = [];

  for (const [name, data] of candidates) {
    const classification = classifyEntity(name, text);
    entities.push({
      name,
      type: classification.type,
      confidence: classification.confidence,
      occurrences: data.count,
    });
  }

  // Sort by confidence * occurrences
  entities.sort((a, b) => (b.confidence * b.occurrences) - (a.confidence * a.occurrences));
  return entities;
}

/**
 * Enrich genomes with detected entities.
 */
function enrichGenomes() {
  const genomesDir = path.join(ROOT, '.evolution', 'failure_genomes');
  if (!fs.existsSync(genomesDir)) return [];

  const enriched = [];
  for (const f of fs.readdirSync(genomesDir).filter(f => f.endsWith('.json'))) {
    try {
      const filePath = path.join(genomesDir, f);
      const g = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Skip if already has entities
      if (g.detected_entities && g.detected_entities.length > 0) continue;

      const text = [g.family, g.violated_invariant, g.repair_operator,
        g.success_pattern, g.safe_summary, g.safe_root_cause,
        ...(g.transferability_tags || [])].filter(Boolean).join(' ');

      const entities = detectEntities(text);
      if (entities.length > 0) {
        g.detected_entities = entities.slice(0, 10);
        fs.writeFileSync(filePath, JSON.stringify(g, null, 2), 'utf8');
        enriched.push({ genome: g.genome_id || f, entities: entities.length });
      }
    } catch {}
  }

  return enriched;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function cmdDetect() {
  const textFlag = args.indexOf('--text');
  let text;

  if (textFlag !== -1) {
    text = args.slice(textFlag + 1).join(' ');
  } else {
    const filePath = args[0];
    if (!filePath || !fs.existsSync(filePath)) {
      console.error('Usage: nve-entity-detect <file> or --text "..."');
      process.exit(1);
    }
    text = fs.readFileSync(path.resolve(filePath), 'utf8');
  }

  const entities = detectEntities(text);
  if (entities.length === 0) { console.log(`${C.dim}No entities detected${C.reset}`); return; }

  console.log(`\n${C.bold}Detected Entities${C.reset} (${entities.length})\n`);
  for (const e of entities) {
    const icon = e.type === 'person' ? '👤' : e.type === 'project' ? '📦' : e.type === 'technology' ? '⚙️' : '❓';
    console.log(`  ${icon} ${C.bold}${e.name}${C.reset} ${C.dim}[${e.type}]${C.reset} conf: ${e.confidence.toFixed(2)} (×${e.occurrences})`);
  }
  console.log();
}

function cmdEnrich() {
  console.log(`${C.cyan}Enriching genomes with entities...${C.reset}`);
  const results = enrichGenomes();
  console.log(`${C.green}✓${C.reset} Enriched ${results.length} genomes`);
  for (const r of results) {
    console.log(`  ${r.genome}: ${r.entities} entities`);
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { extractCandidates, classifyEntity, detectEntities, enrichGenomes };

if (require.main === module) {
  try {
    switch (cmd) {
      case 'enrich': cmdEnrich(); break;
      case '--text': cmdDetect(); break;
      default:
        if (fs.existsSync(args[0] || '')) cmdDetect();
        else { console.error('Usage: nve-entity-detect [<file>|--text "..."|enrich]'); process.exit(1); }
    }
  } catch (e) { console.error(`Error: ${e.message}`); process.exit(1); }
}
