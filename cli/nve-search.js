#!/usr/bin/env node
/**
 * nve-search — TF-IDF Semantic Search for Genomes & Skills
 *
 * Replaces simple Jaccard matching with proper TF-IDF scoring.
 * Zero dependencies — pure Node.js implementation.
 *
 * Commands:
 *   nve-search <query>                — Search genomes + skills
 *   nve-search --type genome <query>  — Search genomes only
 *   nve-search --type skill <query>   — Search skills only
 *   nve-search --top <N> <query>      — Return top N results (default: 10)
 *   nve-search index                  — Rebuild search index
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const ROOT = findProjectRoot();

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Flag Parsing ────────────────────────────────────────────────────────────

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] || null;
}

function hasFlag(name) {
  return args.includes(name);
}

function getQuery() {
  return args.filter(a => !a.startsWith('--') && a !== 'index' &&
    a !== getFlag('--type') && a !== getFlag('--top')).join(' ');
}

// ─── Text Processing ─────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'not', 'no', 'if', 'then', 'else',
  'when', 'where', 'how', 'what', 'which', 'who', 'whom', 'why',
  'all', 'each', 'every', 'any', 'some', 'such', 'only', 'own',
  'so', 'than', 'too', 'very', 'just', 'also', 'about', 'up', 'out',
]);

/**
 * Tokenize text into normalized terms, removing stop words.
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Compute term frequency (TF) for a token array.
 * Uses augmented frequency: 0.5 + 0.5 * (f / maxF)
 */
function computeTF(tokens) {
  const freq = {};
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }
  const maxF = Math.max(...Object.values(freq), 1);
  const tf = {};
  for (const [term, count] of Object.entries(freq)) {
    tf[term] = 0.5 + 0.5 * (count / maxF);
  }
  return tf;
}

/**
 * Compute IDF from a corpus (array of token arrays).
 * IDF(t) = log(N / (1 + df(t)))
 */
function computeIDF(corpus) {
  const N = corpus.length;
  const df = {};
  for (const doc of corpus) {
    const seen = new Set(doc);
    for (const term of seen) {
      df[term] = (df[term] || 0) + 1;
    }
  }
  const idf = {};
  for (const [term, count] of Object.entries(df)) {
    idf[term] = Math.log(N / (1 + count));
  }
  return idf;
}

/**
 * Compute TF-IDF vector for a document given precomputed IDF.
 */
function tfidfVector(tokens, idf) {
  const tf = computeTF(tokens);
  const vector = {};
  for (const [term, tfVal] of Object.entries(tf)) {
    vector[term] = tfVal * (idf[term] || 0);
  }
  return vector;
}

/**
 * Cosine similarity between two sparse vectors.
 */
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (const [term, val] of Object.entries(vecA)) {
    if (vecB[term]) dot += val * vecB[term];
    normA += val * val;
  }
  for (const val of Object.values(vecB)) {
    normB += val * val;
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  return (normA > 0 && normB > 0) ? dot / (normA * normB) : 0;
}

// ─── Document Loading ────────────────────────────────────────────────────────

/**
 * Load genome documents from .evolution/failure_genomes/.
 */
function loadGenomeDocs() {
  const genomesDir = path.join(ROOT, '.evolution', 'failure_genomes');
  if (!fs.existsSync(genomesDir)) return [];

  return fs.readdirSync(genomesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const g = JSON.parse(fs.readFileSync(path.join(genomesDir, f), 'utf8'));
        const text = [
          g.family, g.violated_invariant, g.repair_operator,
          g.success_pattern, g.description,
          ...(g.transferability_tags || []),
          ...(g.context_fingerprint?.stack_tags || []),
        ].filter(Boolean).join(' ');
        return {
          type: 'genome',
          id: g.genome_id || path.basename(f, '.json'),
          name: g.family || path.basename(f, '.json'),
          text,
          tokens: tokenize(text),
          source: g,
          utility: g.utility?.score || 0,
        };
      } catch { return null; }
    })
    .filter(Boolean);
}

/**
 * Load skill documents from .agents/skills/.
 */
function loadSkillDocs() {
  const skillsDir = path.join(ROOT, '.agents', 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  return fs.readdirSync(skillsDir)
    .filter(d => fs.existsSync(path.join(skillsDir, d, 'SKILL.md')))
    .map(d => {
      try {
        const content = fs.readFileSync(path.join(skillsDir, d, 'SKILL.md'), 'utf8');
        const tokens = tokenize(content);
        const titleMatch = content.match(/^#\s+(.+)/m);
        const descMatch = content.match(/description:\s*"?(.+?)"?\s*$/m);
        return {
          type: 'skill',
          id: d,
          name: titleMatch ? titleMatch[1] : d,
          description: descMatch ? descMatch[1].trim() : '',
          text: content,
          tokens,
          source: { name: d, path: path.join('.agents', 'skills', d) },
        };
      } catch { return null; }
    })
    .filter(Boolean);
}

// ─── Search Engine ───────────────────────────────────────────────────────────

/**
 * Build search index from all documents.
 */
function buildIndex(typeFilter) {
  const docs = [];
  if (!typeFilter || typeFilter === 'genome') docs.push(...loadGenomeDocs());
  if (!typeFilter || typeFilter === 'skill') docs.push(...loadSkillDocs());

  const corpus = docs.map(d => d.tokens);
  const idf = computeIDF(corpus);

  // Precompute TF-IDF vectors
  for (const doc of docs) {
    doc.vector = tfidfVector(doc.tokens, idf);
  }

  return { docs, idf };
}

/**
 * Search documents using TF-IDF + cosine similarity.
 * Returns ranked results with scores.
 */
function search(query, options = {}) {
  const { topK = 10, typeFilter = null } = options;

  const index = buildIndex(typeFilter);
  if (index.docs.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const queryVector = tfidfVector(queryTokens, index.idf);

  const results = index.docs
    .map(doc => {
      let score = cosineSimilarity(queryVector, doc.vector);
      // Boost genomes by utility score (0-1)
      if (doc.type === 'genome' && doc.utility > 0) {
        score = score * 0.8 + doc.utility * 0.2;
      }
      return { ...doc, score };
    })
    .filter(r => r.score > 0.001)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results.map(r => ({
    type: r.type,
    id: r.id,
    name: r.name,
    description: r.description || '',
    score: Math.round(r.score * 1000) / 1000,
    source: r.source,
  }));
}

/**
 * Save index to .evolution/search_index.json for faster subsequent searches.
 */
function saveIndex() {
  const index = buildIndex();
  const indexPath = path.join(ROOT, '.evolution', 'search_index.json');
  const serializable = {
    version: 1,
    built_at: new Date().toISOString(),
    document_count: index.docs.length,
    idf: index.idf,
    documents: index.docs.map(d => ({
      type: d.type,
      id: d.id,
      name: d.name,
      token_count: d.tokens.length,
    })),
  };
  const dir = path.dirname(indexPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(serializable, null, 2), 'utf8');
  return serializable;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function cmdSearch() {
  const query = getQuery();
  if (!query) {
    console.error('Usage: nve-search <query> [--type genome|skill] [--top N]');
    process.exit(1);
  }

  const typeFilter = getFlag('--type');
  const topK = parseInt(getFlag('--top') || '10', 10);

  const results = search(query, { topK, typeFilter });

  if (results.length === 0) {
    console.log(`${C.dim}No results for "${query}"${C.reset}`);
    return;
  }

  console.log(`\n${C.bold}Search: "${query}"${C.reset} ${C.dim}(${results.length} results)${C.reset}\n`);
  for (const r of results) {
    const icon = r.type === 'genome' ? '🧬' : '⚡';
    const score = r.score.toFixed(3);
    console.log(`  ${icon} ${C.bold}${r.name}${C.reset} ${C.dim}[${r.type}]${C.reset} — score: ${C.green}${score}${C.reset}`);
    if (r.description) console.log(`    ${C.dim}${r.description.slice(0, 80)}${C.reset}`);
  }
  console.log();
}

function cmdIndex() {
  console.log(`${C.cyan}Building search index...${C.reset}`);
  const index = saveIndex();
  console.log(`${C.green}✓${C.reset} Index built: ${index.document_count} documents, saved to .evolution/search_index.json`);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  tokenize,
  computeTF,
  computeIDF,
  tfidfVector,
  cosineSimilarity,
  search,
  buildIndex,
  saveIndex,
  loadGenomeDocs,
  loadSkillDocs,
};

// CLI
if (require.main === module) {
  try {
    const cmd = args[0] === 'index' ? 'index' : 'search';
    switch (cmd) {
      case 'index': cmdIndex(); break;
      default: cmdSearch(); break;
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
