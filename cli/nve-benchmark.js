#!/usr/bin/env node
/**
 * nve-benchmark — Memory System Benchmark Harness
 *
 * Tests retrieval quality of the NVE memory system.
 * Generates synthetic Q&A pairs from existing genomes/skills,
 * measures recall@K, and compares flat vs palace-aware search.
 *
 * Commands:
 *   nve-benchmark generate              — Generate test dataset from .evolution/
 *   nve-benchmark run [--mode flat|palace|both]  — Run benchmark
 *   nve-benchmark report                — Show latest results
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'run';
const ROOT = findProjectRoot();
const BENCH_DIR = path.join(ROOT, '.evolution', 'benchmarks');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

function getFlag(name, def) {
  const idx = args.indexOf(name);
  return idx === -1 ? def : args[idx + 1] || def;
}

// ─── Dataset Generation ──────────────────────────────────────────────────────

/**
 * Generate Q&A pairs from existing genomes and skills.
 * Each pair: { query, expected_id, expected_type, difficulty }
 */
function generateDataset() {
  const pairs = [];

  // From genomes
  const genomesDir = path.join(ROOT, '.evolution', 'failure_genomes');
  if (fs.existsSync(genomesDir)) {
    for (const f of fs.readdirSync(genomesDir).filter(f => f.endsWith('.json'))) {
      try {
        const g = JSON.parse(fs.readFileSync(path.join(genomesDir, f), 'utf8'));
        if (!g.genome_id) continue;

        // Easy: query by exact invariant
        if (g.violated_invariant) {
          pairs.push({
            query: g.violated_invariant,
            expected_id: g.genome_id,
            expected_type: 'genome',
            difficulty: 'easy',
          });
        }

        // Medium: query by family + partial context
        if (g.family) {
          pairs.push({
            query: `${g.family} failure pattern`,
            expected_id: g.genome_id,
            expected_type: 'genome',
            difficulty: 'medium',
          });
        }

        // Hard: query by repair operator (indirect)
        if (g.repair_operator) {
          pairs.push({
            query: `how to fix: ${g.repair_operator}`,
            expected_id: g.genome_id,
            expected_type: 'genome',
            difficulty: 'hard',
          });
        }
      } catch {}
    }
  }

  // From skills
  const skillsDir = path.join(ROOT, '.agents', 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const d of fs.readdirSync(skillsDir)) {
      const skillMd = path.join(skillsDir, d, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      try {
        const content = fs.readFileSync(skillMd, 'utf8');
        const titleMatch = content.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1] : d;

        pairs.push({
          query: title,
          expected_id: d,
          expected_type: 'skill',
          difficulty: 'easy',
        });

        pairs.push({
          query: d.replace(/-/g, ' '),
          expected_id: d,
          expected_type: 'skill',
          difficulty: 'medium',
        });
      } catch {}
    }
  }

  return pairs;
}

/**
 * Save dataset to disk.
 */
function saveDataset(pairs) {
  if (!fs.existsSync(BENCH_DIR)) fs.mkdirSync(BENCH_DIR, { recursive: true });
  const outPath = path.join(BENCH_DIR, 'dataset.json');
  fs.writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), pairs }, null, 2));
  return outPath;
}

/**
 * Load dataset from disk.
 */
function loadDataset() {
  const dsPath = path.join(BENCH_DIR, 'dataset.json');
  if (!fs.existsSync(dsPath)) return null;
  try { return JSON.parse(fs.readFileSync(dsPath, 'utf8')); }
  catch { return null; }
}

// ─── Benchmark Execution ─────────────────────────────────────────────────────

/**
 * Run benchmark with flat TF-IDF search.
 */
function runFlat(pairs, topK = 5) {
  let searchMod;
  try { searchMod = require('./nve-search'); } catch { return null; }

  const results = { hits: 0, misses: 0, total: pairs.length, by_difficulty: {}, latencies: [] };

  for (const pair of pairs) {
    const start = Date.now();
    const found = searchMod.search(pair.query, { topK });
    const latency = Date.now() - start;
    results.latencies.push(latency);

    const hit = found.some(r => r.id === pair.expected_id);
    if (hit) results.hits++;
    else results.misses++;

    if (!results.by_difficulty[pair.difficulty]) {
      results.by_difficulty[pair.difficulty] = { hits: 0, total: 0 };
    }
    results.by_difficulty[pair.difficulty].total++;
    if (hit) results.by_difficulty[pair.difficulty].hits++;
  }

  results.recall_at_k = results.total > 0 ? results.hits / results.total : 0;
  results.avg_latency_ms = results.latencies.length > 0
    ? Math.round(results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length) : 0;

  return results;
}

/**
 * Run benchmark with palace-aware search.
 */
function runPalace(pairs, topK = 5) {
  let palaceMod;
  try { palaceMod = require('./nve-palace'); } catch { return null; }

  // Ensure palace is built
  try { palaceMod.buildGraph(); } catch {}

  const results = { hits: 0, misses: 0, total: pairs.length, by_difficulty: {}, latencies: [] };

  for (const pair of pairs) {
    const start = Date.now();
    const found = palaceMod.palaceSearch(pair.query, topK);
    const latency = Date.now() - start;
    results.latencies.push(latency);

    const hit = found.some(r => r.id === pair.expected_id);
    if (hit) results.hits++;
    else results.misses++;

    if (!results.by_difficulty[pair.difficulty]) {
      results.by_difficulty[pair.difficulty] = { hits: 0, total: 0 };
    }
    results.by_difficulty[pair.difficulty].total++;
    if (hit) results.by_difficulty[pair.difficulty].hits++;
  }

  results.recall_at_k = results.total > 0 ? results.hits / results.total : 0;
  results.avg_latency_ms = results.latencies.length > 0
    ? Math.round(results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length) : 0;

  return results;
}

/**
 * Run full benchmark and save results.
 */
function runBenchmark(mode = 'both') {
  let dataset = loadDataset();
  if (!dataset) {
    const pairs = generateDataset();
    saveDataset(pairs);
    dataset = { pairs };
  }

  const pairs = dataset.pairs;
  if (pairs.length === 0) return { error: 'No test pairs. Run generate first.' };

  const report = {
    timestamp: new Date().toISOString(),
    dataset_size: pairs.length,
    top_k: 5,
    flat: null,
    palace: null,
    improvement: null,
  };

  if (mode === 'flat' || mode === 'both') {
    report.flat = runFlat(pairs);
  }
  if (mode === 'palace' || mode === 'both') {
    report.palace = runPalace(pairs);
  }

  if (report.flat && report.palace) {
    const flatR = report.flat.recall_at_k;
    const palaceR = report.palace.recall_at_k;
    report.improvement = flatR > 0
      ? `${((palaceR - flatR) / flatR * 100).toFixed(1)}%`
      : palaceR > 0 ? '+∞' : '0%';
  }

  // Save
  if (!fs.existsSync(BENCH_DIR)) fs.mkdirSync(BENCH_DIR, { recursive: true });
  const outPath = path.join(BENCH_DIR, `results-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  return report;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function cmdGenerate() {
  const pairs = generateDataset();
  const outPath = saveDataset(pairs);
  console.log(`${C.green}✓${C.reset} Generated ${pairs.length} test pairs → ${path.relative(ROOT, outPath)}`);
  const byDiff = {};
  for (const p of pairs) { byDiff[p.difficulty] = (byDiff[p.difficulty] || 0) + 1; }
  for (const [d, c] of Object.entries(byDiff)) {
    console.log(`  ${C.dim}${d}: ${c}${C.reset}`);
  }
}

function cmdRun() {
  const mode = getFlag('--mode', 'both');
  console.log(`${C.cyan}Running benchmark (mode: ${mode})...${C.reset}\n`);

  const report = runBenchmark(mode);
  if (report.error) { console.log(`${C.red}${report.error}${C.reset}`); return; }

  console.log(`${C.bold}Dataset: ${report.dataset_size} pairs, top_k=${report.top_k}${C.reset}\n`);

  function printResults(name, r) {
    if (!r) return;
    const pct = (r.recall_at_k * 100).toFixed(1);
    const color = r.recall_at_k >= 0.9 ? C.green : r.recall_at_k >= 0.7 ? C.yellow : C.red;
    console.log(`  ${C.bold}${name}:${C.reset} ${color}R@5 = ${pct}%${C.reset} (${r.hits}/${r.total}) avg ${r.avg_latency_ms}ms`);
    for (const [d, s] of Object.entries(r.by_difficulty)) {
      console.log(`    ${C.dim}${d}: ${s.hits}/${s.total} (${(s.hits/s.total*100).toFixed(0)}%)${C.reset}`);
    }
  }

  printResults('Flat (TF-IDF)', report.flat);
  printResults('Palace-aware', report.palace);

  if (report.improvement) {
    console.log(`\n  ${C.bold}Palace improvement: ${C.green}${report.improvement}${C.reset}`);
  }
  console.log();
}

function cmdReport() {
  if (!fs.existsSync(BENCH_DIR)) { console.log(`${C.dim}No benchmarks. Run: nve-benchmark run${C.reset}`); return; }
  const files = fs.readdirSync(BENCH_DIR).filter(f => f.startsWith('results-')).sort().reverse();
  if (files.length === 0) { console.log(`${C.dim}No results. Run: nve-benchmark run${C.reset}`); return; }
  const report = JSON.parse(fs.readFileSync(path.join(BENCH_DIR, files[0]), 'utf8'));
  console.log(JSON.stringify(report, null, 2));
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { generateDataset, runFlat, runPalace, runBenchmark, loadDataset, saveDataset };

// CLI
if (require.main === module) {
  try {
    switch (cmd) {
      case 'generate': cmdGenerate(); break;
      case 'run': cmdRun(); break;
      case 'report': cmdReport(); break;
      default:
        console.error('Usage: nve-benchmark [generate|run|report] [--mode flat|palace|both]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
