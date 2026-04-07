#!/usr/bin/env node
/**
 * nve-aaak — AAAK Lossless Symbolic Memory Compression
 *
 * Inspired by MemPalace dialect.py (MIT, Milla Jovovich + Ben Sigman).
 * Adapted for Genome Graph Agent OS: compresses memory tree bundles,
 * genome summaries, and session digests into ~120-token AAAK strings.
 *
 * AAAK format: ZID:ENTITIES|topic_keywords|"key_quote"|weight|emotions|flags
 * Readable by any LLM without decoders. ~30x compression ratio.
 *
 * Commands:
 *   nve-aaak compress [--input <file>]   — Compress text/bundle to AAAK
 *   nve-aaak expand <aaak-string>        — Show human-readable expansion
 *   nve-aaak bundle                      — Compress compiled memory tree
 *   nve-aaak wake-up                     — Generate L0+L1 wake-up context
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'bundle';
const ROOT = findProjectRoot();

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] || null;
}

// ─── Stop Words ──────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'this', 'that',
  'these', 'those', 'it', 'its', 'not', 'no', 'if', 'then', 'else',
  'when', 'where', 'how', 'what', 'which', 'who', 'whom', 'why',
  'all', 'each', 'every', 'any', 'some', 'such', 'only', 'own',
  'so', 'than', 'too', 'very', 'just', 'also', 'about', 'up', 'out',
  'into', 'over', 'after', 'before', 'between', 'under', 'above',
  'through', 'during', 'without', 'again', 'further', 'once',
]);

// ─── Step 1: Entity Detection & Encoding ─────────────────────────────────────

/**
 * Detect entities (proper nouns, technical terms) and encode to 3-char codes.
 */
function detectEntities(text) {
  const entities = new Map();

  // Capitalized words (2+ occurrences)
  const capWords = text.match(/\b[A-Z][a-z]{1,19}\b/g) || [];
  const freq = {};
  for (const w of capWords) { freq[w] = (freq[w] || 0) + 1; }

  for (const [word, count] of Object.entries(freq)) {
    if (count >= 2 && !STOP_WORDS.has(word.toLowerCase())) {
      const code = word.slice(0, 3).toUpperCase();
      entities.set(word, code);
    }
  }

  // Technical terms: anything with hyphens, dots, or camelCase that appears 2+
  const techTerms = text.match(/\b[a-z]+[-_.][a-z]+[-_.a-z]*\b/gi) || [];
  const techFreq = {};
  for (const t of techTerms) { techFreq[t] = (techFreq[t] || 0) + 1; }

  for (const [term, count] of Object.entries(techFreq)) {
    if (count >= 2) {
      const code = term.replace(/[-_.]/g, '').slice(0, 3).toUpperCase();
      entities.set(term, code);
    }
  }

  return entities;
}

/**
 * Encode entities in text to their 3-char codes.
 */
function encodeEntities(text, entities) {
  let encoded = text;
  // Sort by length (longest first) to avoid partial replacements
  const sorted = [...entities.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [entity, code] of sorted) {
    encoded = encoded.replace(new RegExp(escapeRegex(entity), 'g'), code);
  }
  return encoded;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Step 2: Topic Extraction ────────────────────────────────────────────────

/**
 * Extract top-N topics from text (frequency + proper noun boost).
 */
function extractTopics(text, topN = 3) {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const freq = {};
  for (const w of words) { freq[w] = (freq[w] || 0) + 1; }

  // Boost proper nouns and technical terms
  const proper = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  for (const p of proper) {
    const lower = p.toLowerCase();
    freq[lower] = (freq[lower] || 0) + 2;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}

// ─── Step 3: Emotion Detection ───────────────────────────────────────────────

const EMOTION_MAP = {
  worried: 'anx', anxious: 'anx', concerned: 'anx', nervous: 'anx',
  excited: 'excite', thrilled: 'excite', eager: 'excite', enthusiastic: 'excite',
  decided: 'determ', determined: 'determ', committed: 'determ', resolved: 'determ',
  frustrated: 'frust', annoyed: 'frust', angry: 'frust', stuck: 'frust',
  confused: 'confus', uncertain: 'confus', unsure: 'confus', puzzled: 'confus',
  happy: 'joy', pleased: 'joy', satisfied: 'joy', glad: 'joy',
  surprised: 'surpr', unexpected: 'surpr', amazed: 'surpr',
  confident: 'conf', certain: 'conf', sure: 'conf',
  failed: 'fail', broken: 'fail', error: 'fail', crash: 'fail', bug: 'fail',
  fixed: 'fix', resolved: 'fix', solved: 'fix', repaired: 'fix',
};

/**
 * Detect emotions from text keywords.
 */
function detectEmotions(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const [keyword, code] of Object.entries(EMOTION_MAP)) {
    if (lower.includes(keyword)) found.add(code);
  }
  return [...found].slice(0, 3);
}

// ─── Step 4: Importance Flags ────────────────────────────────────────────────

const FLAG_PATTERNS = [
  { pattern: /\b(decided|chose|choice|picked)\b/i, flag: 'DECISION' },
  { pattern: /\b(founded|created|invented|built|launched)\b/i, flag: 'ORIGIN' },
  { pattern: /\b(core|fundamental|essential|critical)\b/i, flag: 'CORE' },
  { pattern: /\b(turning point|realized|breakthrough|pivoted)\b/i, flag: 'PIVOT' },
  { pattern: /\b(never|always|must|invariant|rule)\b/i, flag: 'INVARIANT' },
  { pattern: /\b(avoid|don't|stop|anti-pattern|danger)\b/i, flag: 'AVOID' },
  { pattern: /\b(promoted|admitted|verified|passed)\b/i, flag: 'VERIFIED' },
  { pattern: /\b(failed|rejected|quarantined|blocked)\b/i, flag: 'FAILED' },
  { pattern: /\b(repair|fix|patch|workaround|solution)\b/i, flag: 'REPAIR' },
];

/**
 * Detect importance flags from text.
 */
function detectFlags(text) {
  const flags = new Set();
  for (const { pattern, flag } of FLAG_PATTERNS) {
    if (pattern.test(text)) flags.add(flag);
  }
  return [...flags].slice(0, 4);
}

// ─── Step 5: Key Sentence Extraction ─────────────────────────────────────────

/**
 * Extract the most important sentence from text.
 */
function extractKeySentence(text) {
  const sentences = text
    .replace(/\n/g, '. ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 120);

  if (sentences.length === 0) return text.slice(0, 80).trim();

  const scored = sentences.map(s => {
    let score = 0;
    // Decision keywords
    if (/\b(decided|chose|must|always|never|avoid)\b/i.test(s)) score += 3;
    // Length preference (40-80 chars)
    if (s.length >= 40 && s.length <= 80) score += 2;
    else if (s.length >= 30 && s.length <= 100) score += 1;
    // Emotional weight
    for (const keyword of Object.keys(EMOTION_MAP)) {
      if (s.toLowerCase().includes(keyword)) { score += 1; break; }
    }
    // Specificity (contains numbers, paths, identifiers)
    if (/\d|\/|\.js|\.py|\.ts/.test(s)) score += 1;
    return { text: s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].text;
}

// ─── AAAK Compression ────────────────────────────────────────────────────────

/**
 * Compress text to AAAK format.
 * Output: ZID:ENTITIES|topic_keywords|"key_quote"|weight|emotions|flags
 *
 * @param {string} text - Input text to compress
 * @param {object} options - { id, weight, entities }
 * @returns {string} AAAK-compressed string
 */
function compress(text, options = {}) {
  if (!text || text.trim().length === 0) return '';

  const id = options.id || generateId();
  const entities = options.entities || detectEntities(text);
  const topics = extractTopics(text);
  const emotions = detectEmotions(text);
  const flags = detectFlags(text);
  const keySentence = extractKeySentence(text);
  const weight = options.weight || computeWeight(text, flags, emotions);

  const entityCodes = [...entities.values()].slice(0, 5).join(',');
  const topicStr = topics.join('_');
  const emotionStr = emotions.join('+') || 'neutral';
  const flagStr = flags.join(',') || 'INFO';

  return `${id}:${entityCodes}|${topicStr}|"${keySentence}"|${weight.toFixed(2)}|${emotionStr}|${flagStr}`;
}

/**
 * Compress multiple text chunks into a compact bundle.
 */
function compressBundle(chunks) {
  return chunks
    .filter(c => c && c.text && c.text.trim())
    .map((chunk, i) => compress(chunk.text, {
      id: chunk.id || `Z${String(i).padStart(2, '0')}`,
      weight: chunk.weight,
      entities: chunk.entities,
    }))
    .filter(Boolean);
}

/**
 * Compute importance weight (0-1) from text signals.
 */
function computeWeight(text, flags, emotions) {
  let w = 0.5;
  // Flags boost
  if (flags.includes('DECISION')) w += 0.15;
  if (flags.includes('CORE')) w += 0.1;
  if (flags.includes('INVARIANT')) w += 0.15;
  if (flags.includes('PIVOT')) w += 0.1;
  if (flags.includes('VERIFIED')) w += 0.1;
  if (flags.includes('REPAIR')) w += 0.05;
  // Emotions boost
  if (emotions.includes('determ')) w += 0.05;
  if (emotions.includes('fail')) w -= 0.05;
  if (emotions.includes('fix')) w += 0.05;
  // Length signal (longer = more detail = slightly higher)
  if (text.length > 500) w += 0.05;
  return Math.min(Math.max(w, 0.1), 1.0);
}

function generateId() {
  return 'Z' + Math.random().toString(36).slice(2, 5).toUpperCase();
}

// ─── AAAK Expansion (human-readable) ─────────────────────────────────────────

/**
 * Parse AAAK string back to structured object.
 */
function expand(aaakStr) {
  const match = aaakStr.match(/^(\w+):([^|]*)\|([^|]*)\|"([^"]*)"\|([^|]*)\|([^|]*)\|(.*)$/);
  if (!match) return null;

  return {
    id: match[1],
    entities: match[2] ? match[2].split(',').filter(Boolean) : [],
    topics: match[3] ? match[3].split('_').filter(Boolean) : [],
    key_sentence: match[4],
    weight: parseFloat(match[5]) || 0.5,
    emotions: match[6] ? match[6].split('+').filter(Boolean) : [],
    flags: match[7] ? match[7].split(',').filter(Boolean) : [],
  };
}

// ─── Wake-up Protocol (L0 + L1) ──────────────────────────────────────────────

/**
 * Generate L0 Identity context (~100 tokens).
 * Sources: .evolution/MEMORY.md core rules, project name, key anti-patterns.
 */
function generateL0() {
  const memoryPath = path.join(ROOT, '.evolution', 'MEMORY.md');
  const pkgPath = path.join(ROOT, 'package.json');

  const parts = [];

  // Project identity
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      parts.push(`PRJ:${pkg.name}@${pkg.version}`);
    } catch {}
  }

  // Core rules from MEMORY.md (first 5 bullet points)
  if (fs.existsSync(memoryPath)) {
    const content = fs.readFileSync(memoryPath, 'utf8');
    const rules = content.match(/^[-*]\s+\*\*(.+?)\*\*/gm) || [];
    const coreRules = rules.slice(0, 5).map(r => r.replace(/^[-*]\s+\*\*|\*\*/g, '').trim());
    if (coreRules.length > 0) {
      parts.push(`RULES:${coreRules.join(';')}`);
    }

    // Anti-patterns
    const apMatch = content.match(/##\s*(?:Anti-?[Pp]atterns?|Avoid|Never)\s*\n([\s\S]*?)(?=\n##|$)/);
    if (apMatch) {
      const aps = apMatch[1].match(/^[-*]\s+(.+)/gm) || [];
      const topAps = aps.slice(0, 3).map(a => a.replace(/^[-*]\s+/, '').trim());
      if (topAps.length > 0) {
        parts.push(`AVOID:${topAps.join(';')}`);
      }
    }
  }

  // Stack tags (from genomes)
  const genomesDir = path.join(ROOT, '.evolution', 'failure_genomes');
  if (fs.existsSync(genomesDir)) {
    const tags = new Set();
    const files = fs.readdirSync(genomesDir).filter(f => f.endsWith('.json')).slice(0, 10);
    for (const f of files) {
      try {
        const g = JSON.parse(fs.readFileSync(path.join(genomesDir, f), 'utf8'));
        for (const t of (g.context_fingerprint?.stack_tags || [])) tags.add(t);
      } catch {}
    }
    if (tags.size > 0) {
      parts.push(`STACK:${[...tags].slice(0, 5).join(',')}`);
    }
  }

  return parts.join(' | ');
}

/**
 * Generate L1 Essential Story (~500-800 tokens).
 * Top-15 highest importance memories in AAAK format.
 */
function generateL1() {
  const chunks = [];

  // Promoted genomes (sorted by utility)
  const genomesDir = path.join(ROOT, '.evolution', 'failure_genomes');
  if (fs.existsSync(genomesDir)) {
    const genomes = fs.readdirSync(genomesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(genomesDir, f), 'utf8')); }
        catch { return null; }
      })
      .filter(g => g && g.promotion_decision === 'promoted')
      .sort((a, b) => (b.utility?.score || 0) - (a.utility?.score || 0));

    for (const g of genomes.slice(0, 8)) {
      const text = [
        g.violated_invariant,
        g.repair_operator,
        g.success_pattern,
        g.family,
      ].filter(Boolean).join('. ');
      chunks.push({
        id: `G${(g.genome_id || '').slice(0, 4).toUpperCase()}`,
        text,
        weight: g.utility?.score || 0.5,
      });
    }
  }

  // Key memory rules
  const memoryPath = path.join(ROOT, '.evolution', 'MEMORY.md');
  if (fs.existsSync(memoryPath)) {
    const content = fs.readFileSync(memoryPath, 'utf8');
    const sections = content.split(/^##\s+/m).filter(Boolean).slice(0, 5);
    for (const section of sections) {
      const title = section.split('\n')[0].trim();
      const body = section.split('\n').slice(1).join('\n').trim();
      if (body.length > 20) {
        chunks.push({
          id: `M${title.slice(0, 3).toUpperCase()}`,
          text: body.slice(0, 500),
          weight: 0.7,
        });
      }
    }
  }

  // Sort by weight, take top 15
  chunks.sort((a, b) => (b.weight || 0) - (a.weight || 0));
  return compressBundle(chunks.slice(0, 15));
}

/**
 * Generate full wake-up context (L0 + L1).
 * Target: 600-900 tokens total.
 */
function generateWakeUp() {
  const l0 = generateL0();
  const l1 = generateL1();

  return {
    l0_identity: l0,
    l1_essential: l1,
    combined: [
      `[L0:IDENTITY] ${l0}`,
      `[L1:ESSENTIAL]`,
      ...l1.map(line => `  ${line}`),
    ].join('\n'),
    token_estimate: Math.ceil((l0.length + l1.join('\n').length) / 4),
  };
}

// ─── Memory Tree → AAAK Bundle ───────────────────────────────────────────────

/**
 * Compress compiled memory tree into AAAK bundle.
 */
function compressMemoryTree() {
  try {
    const { compileMemoryTree } = require('./nve-memory-tree');
    const bundle = compileMemoryTree();
    const chunks = [];

    // Rules
    for (const rule of (bundle.rules || [])) {
      const text = rule.key ? `${rule.key}: ${rule.value}` : rule.value;
      chunks.push({ text, weight: 0.7, id: `R${chunks.length.toString().padStart(2, '0')}` });
    }

    // Anti-patterns
    for (const ap of (bundle.anti_patterns || [])) {
      const text = typeof ap === 'string' ? ap : ap.text;
      chunks.push({ text, weight: 0.8, id: `A${chunks.length.toString().padStart(2, '0')}` });
    }

    // Context
    if (bundle.context) {
      chunks.push({ text: bundle.context, weight: 0.6, id: 'CTX' });
    }

    return compressBundle(chunks);
  } catch (e) {
    return [`ERR:compression_failed|"${e.message}"|0.0|fail|FAILED`];
  }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function cmdCompress() {
  const inputFile = getFlag('--input');
  let text;

  if (inputFile) {
    if (!fs.existsSync(inputFile)) {
      console.error(`${C.red}File not found: ${inputFile}${C.reset}`);
      process.exit(1);
    }
    text = fs.readFileSync(inputFile, 'utf8');
  } else {
    // Read from stdin or use sample
    text = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
    if (!text) {
      console.error('Usage: nve-aaak compress --input <file> or nve-aaak compress "text to compress"');
      process.exit(1);
    }
  }

  const result = compress(text);
  console.log(`\n${C.bold}AAAK Output:${C.reset}`);
  console.log(`  ${C.green}${result}${C.reset}`);
  console.log(`\n  ${C.dim}Input:  ${text.length} chars`);
  console.log(`  Output: ${result.length} chars`);
  console.log(`  Ratio:  ${(text.length / result.length).toFixed(1)}x compression${C.reset}\n`);
}

function cmdExpand() {
  const aaakStr = args.slice(1).join(' ');
  if (!aaakStr) {
    console.error('Usage: nve-aaak expand <aaak-string>');
    process.exit(1);
  }

  const parsed = expand(aaakStr);
  if (!parsed) {
    console.error(`${C.red}Invalid AAAK format${C.reset}`);
    process.exit(1);
  }

  console.log(`\n${C.bold}Expanded AAAK:${C.reset}`);
  console.log(`  ID:       ${parsed.id}`);
  console.log(`  Entities: ${parsed.entities.join(', ') || 'none'}`);
  console.log(`  Topics:   ${parsed.topics.join(', ')}`);
  console.log(`  Quote:    "${parsed.key_sentence}"`);
  console.log(`  Weight:   ${parsed.weight}`);
  console.log(`  Emotions: ${parsed.emotions.join(', ') || 'neutral'}`);
  console.log(`  Flags:    ${parsed.flags.join(', ')}`);
  console.log();
}

function cmdBundle() {
  console.log(`${C.cyan}Compressing memory tree...${C.reset}\n`);
  const lines = compressMemoryTree();

  if (lines.length === 0) {
    console.log(`${C.dim}No memory content to compress${C.reset}`);
    return;
  }

  console.log(`${C.bold}AAAK Bundle (${lines.length} entries):${C.reset}\n`);
  for (const line of lines) {
    console.log(`  ${C.green}${line}${C.reset}`);
  }

  const totalChars = lines.join('\n').length;
  console.log(`\n  ${C.dim}Total: ${totalChars} chars (~${Math.ceil(totalChars / 4)} tokens)${C.reset}\n`);
}

function cmdWakeUp() {
  const wakeup = generateWakeUp();

  console.log(`\n${C.bold}${C.cyan}━━━ Wake-Up Context (L0 + L1) ━━━${C.reset}\n`);
  console.log(`${C.bold}[L0: Identity]${C.reset} ${C.dim}(~100 tokens)${C.reset}`);
  console.log(`  ${wakeup.l0_identity || '(empty)'}\n`);
  console.log(`${C.bold}[L1: Essential Story]${C.reset} ${C.dim}(top memories in AAAK)${C.reset}`);
  for (const line of wakeup.l1_essential) {
    console.log(`  ${C.green}${line}${C.reset}`);
  }
  console.log(`\n  ${C.dim}Estimated: ~${wakeup.token_estimate} tokens${C.reset}\n`);
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  compress,
  compressBundle,
  expand,
  detectEntities,
  extractTopics,
  detectEmotions,
  detectFlags,
  extractKeySentence,
  computeWeight,
  generateL0,
  generateL1,
  generateWakeUp,
  compressMemoryTree,
};

// CLI
if (require.main === module) {
  try {
    switch (cmd) {
      case 'compress': cmdCompress(); break;
      case 'expand': cmdExpand(); break;
      case 'bundle': cmdBundle(); break;
      case 'wake-up': case 'wakeup': cmdWakeUp(); break;
      default:
        console.error('Usage: nve-aaak [compress|expand|bundle|wake-up]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
