#!/usr/bin/env node
/**
 * nve-drawers — Verbatim Drawer Storage
 *
 * Inspired by MemPalace searcher.py (MIT).
 * Stores verbatim text chunks (~800 chars, 100-char overlap) instead of summaries.
 * "Never summarize, store verbatim" — preserves original context for retrieval.
 *
 * Storage: .evolution/drawers/ (one JSONL file per source)
 *
 * Commands:
 *   nve-drawers ingest <file>           — Chunk and store a file
 *   nve-drawers ingest-dir <dir>        — Ingest all .md/.txt/.json files
 *   nve-drawers search <query>          — Search drawers (TF-IDF)
 *   nve-drawers stats                   — Show storage stats
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'stats';
const ROOT = findProjectRoot();
const DRAWERS_DIR = path.join(ROOT, '.evolution', 'drawers');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

const CHUNK_SIZE = 800;
const OVERLAP = 100;

// ─── Chunking ────────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks (~800 chars, 100 overlap).
 * Respects paragraph/line boundaries.
 */
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = OVERLAP) {
  if (!text || text.length <= chunkSize) return [text].filter(Boolean);

  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to break at paragraph or line boundary
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastPara = slice.lastIndexOf('\n\n');
      const lastLine = slice.lastIndexOf('\n');
      if (lastPara > chunkSize * 0.5) end = start + lastPara + 2;
      else if (lastLine > chunkSize * 0.5) end = start + lastLine + 1;
    }

    chunks.push(text.slice(start, end).trim());
    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end; // Ensure forward progress
    if (start >= text.length) break;
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Create drawer entries from chunks.
 */
function createDrawers(chunks, metadata) {
  return chunks.map((text, i) => ({
    id: `${metadata.source_id}_${String(i).padStart(3, '0')}`,
    text,
    chunk_index: i,
    char_count: text.length,
    source_file: metadata.source_file,
    source_id: metadata.source_id,
    wing: metadata.wing || 'default',
    room: metadata.room || 'general',
    created_at: new Date().toISOString(),
  }));
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/**
 * Save drawers to JSONL file.
 */
function saveDrawers(drawers, sourceId) {
  if (!fs.existsSync(DRAWERS_DIR)) fs.mkdirSync(DRAWERS_DIR, { recursive: true });
  const outPath = path.join(DRAWERS_DIR, `${sourceId}.jsonl`);
  const lines = drawers.map(d => JSON.stringify(d));
  fs.writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  return outPath;
}

/**
 * Load all drawers from storage.
 */
function loadAllDrawers() {
  if (!fs.existsSync(DRAWERS_DIR)) return [];
  const drawers = [];
  for (const f of fs.readdirSync(DRAWERS_DIR).filter(f => f.endsWith('.jsonl'))) {
    try {
      const lines = fs.readFileSync(path.join(DRAWERS_DIR, f), 'utf8').split('\n').filter(Boolean);
      for (const line of lines) {
        drawers.push(JSON.parse(line));
      }
    } catch {}
  }
  return drawers;
}

/**
 * Check if a source is already ingested.
 */
function isIngested(sourceId) {
  return fs.existsSync(path.join(DRAWERS_DIR, `${sourceId}.jsonl`));
}

// ─── Ingestion ───────────────────────────────────────────────────────────────

/**
 * Ingest a single file into drawers.
 */
function ingestFile(filePath) {
  if (!fs.existsSync(filePath)) return { error: `File not found: ${filePath}` };

  const content = fs.readFileSync(filePath, 'utf8');
  const sourceId = path.basename(filePath, path.extname(filePath))
    .replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

  if (isIngested(sourceId)) return { skipped: true, sourceId, reason: 'already ingested' };

  // Detect room from filename/content
  let room = 'general';
  try {
    const { detectRoom } = require('./nve-palace');
    const rooms = detectRoom(filePath + ' ' + content.slice(0, 500));
    room = rooms[0] || 'general';
  } catch {}

  const chunks = chunkText(content);
  const drawers = createDrawers(chunks, {
    source_file: filePath,
    source_id: sourceId,
    room,
  });

  const outPath = saveDrawers(drawers, sourceId);
  return { sourceId, chunks: chunks.length, chars: content.length, room, path: outPath };
}

/**
 * Ingest all eligible files in a directory.
 */
function ingestDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  const extensions = ['.md', '.txt', '.json', '.js', '.py', '.ts'];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (extensions.includes(path.extname(entry.name))) {
        results.push(ingestFile(full));
      }
    }
  }

  walk(dirPath);
  return results;
}

// ─── Search ──────────────────────────────────────────────────────────────────

/**
 * Search drawers using TF-IDF.
 */
function searchDrawers(query, topK = 5) {
  const drawers = loadAllDrawers();
  if (drawers.length === 0) return [];

  let searchMod;
  try { searchMod = require('./nve-search'); } catch { return []; }

  // Build mini-corpus from drawers
  const tokens = searchMod.tokenize;
  const { computeIDF, tfidfVector, cosineSimilarity } = searchMod;

  const corpus = drawers.map(d => tokens(d.text));
  const idf = computeIDF(corpus);
  const queryVec = tfidfVector(tokens(query), idf);

  const scored = drawers.map((d, i) => ({
    drawer: d,
    score: cosineSimilarity(queryVec, tfidfVector(corpus[i], idf)),
  }))
    .filter(s => s.score > 0.001)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(s => ({
    id: s.drawer.id,
    text: s.drawer.text.slice(0, 200) + (s.drawer.text.length > 200 ? '...' : ''),
    score: Math.round(s.score * 1000) / 1000,
    source: s.drawer.source_file,
    room: s.drawer.room,
  }));
}

/**
 * Get storage stats.
 */
function getStats() {
  const drawers = loadAllDrawers();
  const sources = new Set(drawers.map(d => d.source_id));
  const rooms = {};
  for (const d of drawers) {
    rooms[d.room] = (rooms[d.room] || 0) + 1;
  }
  return {
    total_drawers: drawers.length,
    total_sources: sources.size,
    total_chars: drawers.reduce((s, d) => s + d.char_count, 0),
    rooms,
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function cmdIngest() {
  const target = args[1];
  if (!target) { console.error('Usage: nve-drawers ingest <file>'); process.exit(1); }
  const result = ingestFile(path.resolve(target));
  if (result.error) console.log(`${C.yellow}${result.error}${C.reset}`);
  else if (result.skipped) console.log(`${C.dim}Skipped: ${result.sourceId} (${result.reason})${C.reset}`);
  else console.log(`${C.green}✓${C.reset} ${result.sourceId}: ${result.chunks} chunks, room: ${result.room}`);
}

function cmdIngestDir() {
  const dir = args[1] || ROOT;
  console.log(`${C.cyan}Ingesting from ${dir}...${C.reset}`);
  const results = ingestDirectory(path.resolve(dir));
  const ingested = results.filter(r => !r.error && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  console.log(`${C.green}✓${C.reset} ${ingested.length} ingested, ${skipped.length} skipped`);
}

function cmdSearch() {
  const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  if (!query) { console.error('Usage: nve-drawers search <query>'); process.exit(1); }
  const results = searchDrawers(query);
  if (results.length === 0) { console.log(`${C.dim}No results${C.reset}`); return; }
  console.log(`\n${C.bold}Drawer Search: "${query}"${C.reset}\n`);
  for (const r of results) {
    console.log(`  ${C.green}${r.score.toFixed(3)}${C.reset} [${r.room}] ${r.text}`);
  }
  console.log();
}

function cmdStats() {
  const stats = getStats();
  console.log(`\n${C.bold}Drawer Stats${C.reset}`);
  console.log(`  Drawers: ${stats.total_drawers}`);
  console.log(`  Sources: ${stats.total_sources}`);
  console.log(`  Chars:   ${stats.total_chars.toLocaleString()}`);
  if (Object.keys(stats.rooms).length > 0) {
    console.log(`  Rooms:`);
    for (const [r, c] of Object.entries(stats.rooms).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${r}: ${c}`);
    }
  }
  console.log();
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { chunkText, createDrawers, ingestFile, ingestDirectory, searchDrawers, loadAllDrawers, getStats };

if (require.main === module) {
  try {
    switch (cmd) {
      case 'ingest': cmdIngest(); break;
      case 'ingest-dir': cmdIngestDir(); break;
      case 'search': cmdSearch(); break;
      case 'stats': cmdStats(); break;
      default:
        console.error('Usage: nve-drawers [ingest|ingest-dir|search|stats]');
        process.exit(1);
    }
  } catch (e) { console.error(`Error: ${e.message}`); process.exit(1); }
}
