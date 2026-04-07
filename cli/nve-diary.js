#!/usr/bin/env node
/**
 * nve-diary — Agent Session Diary (AAAK Format)
 *
 * Inspired by MemPalace journal system (MIT).
 * Records per-session agent activity in AAAK-compressed entries.
 * Enables cross-session recall and pattern detection.
 *
 * Storage: .evolution/diary/ (one JSONL per day)
 *
 * Commands:
 *   nve-diary log "text"                  — Log a diary entry
 *   nve-diary log --file <file>           — Log from file content
 *   nve-diary today                       — Show today's entries
 *   nve-diary search <query>              — Search diary entries
 *   nve-diary stats                       — Show diary stats
 *   nve-diary compact [--days N]          — Compact old entries to AAAK summaries
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'today';
const ROOT = findProjectRoot();
const DIARY_DIR = path.join(ROOT, '.evolution', 'diary');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

function getFlag(name, def) {
  const idx = args.indexOf(name);
  return idx === -1 ? def : args[idx + 1] || def;
}

// ─── Entry Creation ─────────────────────────────────────────────────────────

/**
 * Create a diary entry with optional AAAK compression.
 */
function createEntry(text, options = {}) {
  if (!text || text.trim().length === 0) return null;

  const entry = {
    id: `D${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    session_id: options.session_id || process.env.NVE_SESSION_ID || generateSessionId(),
    text: text.trim(),
    aaak: null,
    tags: options.tags || [],
    type: options.type || detectEntryType(text),
  };

  // AAAK compress if available
  try {
    const aaak = require('./nve-aaak');
    entry.aaak = aaak.compress(text, { id: entry.id });
  } catch {}

  return entry;
}

/**
 * Detect entry type from content.
 */
function detectEntryType(text) {
  const lower = text.toLowerCase();
  if (/\b(error|failed|bug|crash|exception)\b/.test(lower)) return 'incident';
  if (/\b(fixed|resolved|repaired|solved)\b/.test(lower)) return 'resolution';
  if (/\b(decided|chose|picked|selected)\b/.test(lower)) return 'decision';
  if (/\b(learned|discovered|realized|found out)\b/.test(lower)) return 'insight';
  if (/\b(started|began|initiated|kicked off)\b/.test(lower)) return 'start';
  if (/\b(finished|completed|done|shipped)\b/.test(lower)) return 'completion';
  return 'note';
}

function generateSessionId() {
  return 'S' + Date.now().toString(36).slice(-6).toUpperCase();
}

// ─── Storage ────────────────────────────────────────────────────────────────

/**
 * Get diary file path for a date.
 */
function diaryPath(date) {
  const d = date instanceof Date ? date : new Date(date);
  const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(DIARY_DIR, `${key}.jsonl`);
}

/**
 * Save an entry to today's diary file.
 */
function saveEntry(entry) {
  if (!entry) return null;
  if (!fs.existsSync(DIARY_DIR)) fs.mkdirSync(DIARY_DIR, { recursive: true });
  const filePath = diaryPath(new Date());
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
  return filePath;
}

/**
 * Load entries for a specific date.
 */
function loadEntries(date) {
  const filePath = diaryPath(date);
  if (!fs.existsSync(filePath)) return [];
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(line => JSON.parse(line));
  } catch { return []; }
}

/**
 * Load all diary entries.
 */
function loadAllEntries() {
  if (!fs.existsSync(DIARY_DIR)) return [];
  const entries = [];
  for (const f of fs.readdirSync(DIARY_DIR).filter(f => f.endsWith('.jsonl')).sort()) {
    try {
      const lines = fs.readFileSync(path.join(DIARY_DIR, f), 'utf8').split('\n').filter(Boolean);
      for (const line of lines) entries.push(JSON.parse(line));
    } catch {}
  }
  return entries;
}

// ─── Search ─────────────────────────────────────────────────────────────────

/**
 * Search diary entries by text query.
 */
function searchDiary(query, topK = 10) {
  const entries = loadAllEntries();
  if (entries.length === 0) return [];

  const qLower = query.toLowerCase();
  const qWords = qLower.split(/\W+/).filter(w => w.length > 2);

  const scored = entries.map(entry => {
    const text = entry.text.toLowerCase();
    let score = 0;

    // Exact substring match
    if (text.includes(qLower)) score += 5;

    // Word overlap
    for (const w of qWords) {
      if (text.includes(w)) score += 1;
    }

    // Tag match
    for (const tag of (entry.tags || [])) {
      if (qWords.some(w => tag.toLowerCase().includes(w))) score += 2;
    }

    // Type match
    if (qWords.includes(entry.type)) score += 2;

    return { entry, score };
  })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(s => ({
    id: s.entry.id,
    timestamp: s.entry.timestamp,
    type: s.entry.type,
    text: s.entry.text.slice(0, 200) + (s.entry.text.length > 200 ? '...' : ''),
    score: s.score,
    aaak: s.entry.aaak,
  }));
}

// ─── Compaction ──────────────────────────────────────────────────────────────

/**
 * Compact old diary entries into daily AAAK summaries.
 * Entries older than `days` are compressed to a single AAAK line per day.
 */
function compactDiary(days = 7) {
  if (!fs.existsSync(DIARY_DIR)) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const compacted = [];
  const files = fs.readdirSync(DIARY_DIR).filter(f => f.endsWith('.jsonl')).sort();

  for (const f of files) {
    const dateStr = f.replace('.jsonl', '');
    const fileDate = new Date(dateStr);
    if (isNaN(fileDate.getTime()) || fileDate >= cutoff) continue;

    const filePath = path.join(DIARY_DIR, f);
    const entries = loadEntries(dateStr);
    if (entries.length === 0) continue;

    // Combine all text for the day
    const allText = entries.map(e => e.text).join('. ');
    const types = [...new Set(entries.map(e => e.type))];

    // Create compacted summary
    let aaakSummary = null;
    try {
      const aaak = require('./nve-aaak');
      aaakSummary = aaak.compress(allText, { id: `DC${dateStr.replace(/-/g, '')}` });
    } catch {}

    const summary = {
      id: `DC${dateStr.replace(/-/g, '')}`,
      date: dateStr,
      entry_count: entries.length,
      types,
      aaak: aaakSummary,
      compacted_at: new Date().toISOString(),
    };

    // Replace file with compacted version
    fs.writeFileSync(filePath, JSON.stringify(summary) + '\n', 'utf8');
    compacted.push(summary);
  }

  return compacted;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

/**
 * Get diary statistics.
 */
function getStats() {
  const entries = loadAllEntries();
  const types = {};
  const sessions = new Set();
  const dates = new Set();

  for (const e of entries) {
    types[e.type] = (types[e.type] || 0) + 1;
    if (e.session_id) sessions.add(e.session_id);
    if (e.timestamp) dates.add(e.timestamp.slice(0, 10));
  }

  return {
    total_entries: entries.length,
    total_sessions: sessions.size,
    total_days: dates.size,
    types,
    has_aaak: entries.filter(e => e.aaak).length,
  };
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function cmdLog() {
  const fileFlag = getFlag('--file', null);
  let text;

  if (fileFlag) {
    if (!fs.existsSync(fileFlag)) { console.error(`File not found: ${fileFlag}`); process.exit(1); }
    text = fs.readFileSync(path.resolve(fileFlag), 'utf8');
  } else {
    text = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  }

  if (!text) { console.error('Usage: nve-diary log "text" or --file <file>'); process.exit(1); }

  const tags = (getFlag('--tags', '') || '').split(',').filter(Boolean);
  const entry = createEntry(text, { tags });
  saveEntry(entry);
  console.log(`${C.green}✓${C.reset} Logged [${entry.type}] ${entry.id}`);
  if (entry.aaak) console.log(`  ${C.dim}AAAK: ${entry.aaak.slice(0, 80)}...${C.reset}`);
}

function cmdToday() {
  const entries = loadEntries(new Date());
  if (entries.length === 0) { console.log(`${C.dim}No entries today${C.reset}`); return; }

  console.log(`\n${C.bold}Today's Diary${C.reset} (${entries.length} entries)\n`);
  for (const e of entries) {
    const time = e.timestamp ? e.timestamp.slice(11, 19) : '??:??:??';
    const icon = e.type === 'incident' ? '🔴' : e.type === 'resolution' ? '✅' :
      e.type === 'decision' ? '🎯' : e.type === 'insight' ? '💡' : '📝';
    console.log(`  ${icon} ${C.dim}${time}${C.reset} [${e.type}] ${e.text.slice(0, 100)}`);
  }
  console.log();
}

function cmdSearch() {
  const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  if (!query) { console.error('Usage: nve-diary search <query>'); process.exit(1); }
  const results = searchDiary(query);
  if (results.length === 0) { console.log(`${C.dim}No results${C.reset}`); return; }
  console.log(`\n${C.bold}Diary Search: "${query}"${C.reset}\n`);
  for (const r of results) {
    console.log(`  ${C.green}${r.score}${C.reset} [${r.type}] ${r.text.slice(0, 100)}`);
  }
  console.log();
}

function cmdStats() {
  const stats = getStats();
  console.log(`\n${C.bold}Diary Stats${C.reset}`);
  console.log(`  Entries:  ${stats.total_entries}`);
  console.log(`  Sessions: ${stats.total_sessions}`);
  console.log(`  Days:     ${stats.total_days}`);
  console.log(`  AAAK:     ${stats.has_aaak}/${stats.total_entries}`);
  if (Object.keys(stats.types).length > 0) {
    console.log(`  Types:`);
    for (const [t, c] of Object.entries(stats.types).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${t}: ${c}`);
    }
  }
  console.log();
}

function cmdCompact() {
  const days = parseInt(getFlag('--days', '7'), 10);
  console.log(`${C.cyan}Compacting entries older than ${days} days...${C.reset}`);
  const results = compactDiary(days);
  console.log(`${C.green}✓${C.reset} Compacted ${results.length} days`);
  for (const r of results) {
    console.log(`  ${r.date}: ${r.entry_count} entries → AAAK`);
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  createEntry, detectEntryType, saveEntry, loadEntries, loadAllEntries,
  searchDiary, compactDiary, getStats, diaryPath, generateSessionId,
};

if (require.main === module) {
  try {
    switch (cmd) {
      case 'log': cmdLog(); break;
      case 'today': cmdToday(); break;
      case 'search': cmdSearch(); break;
      case 'stats': cmdStats(); break;
      case 'compact': cmdCompact(); break;
      default:
        console.error('Usage: nve-diary [log|today|search|stats|compact]');
        process.exit(1);
    }
  } catch (e) { console.error(`Error: ${e.message}`); process.exit(1); }
}
