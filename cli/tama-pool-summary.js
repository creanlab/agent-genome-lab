#!/usr/bin/env node
/**
 * tama-pool-summary.js — Summarize local research pool
 * Reads research-pool/incoming/ → aggregates → writes summary
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INCOMING = path.join(ROOT, 'research-pool', 'incoming');
const SUMMARIES = path.join(ROOT, 'research-pool', 'summaries');

function readJsonDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
}

const packs = readJsonDir(INCOMING);
if (!packs.length) {
  console.log('No packs found in research-pool/incoming/');
  process.exit(0);
}

// Aggregate
const familyCounts = {};
const operatorCounts = {};
let totalGenomes = 0;

packs.forEach(pack => {
  (pack.genomes || []).forEach(g => {
    totalGenomes++;
    familyCounts[g.family] = (familyCounts[g.family] || 0) + 1;
    operatorCounts[g.repair_operator] = (operatorCounts[g.repair_operator] || 0) + 1;
  });
});

const topFamilies = Object.entries(familyCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([family, count]) => ({ family, count }));

const topOperators = Object.entries(operatorCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([operator, count]) => ({ operator, count }));

const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

const summary = {
  summary_date: now.toISOString().slice(0, 10),
  total_packs: packs.length,
  total_genomes: totalGenomes,
  top_families: topFamilies,
  top_repair_operators: topOperators
};

if (!fs.existsSync(SUMMARIES)) fs.mkdirSync(SUMMARIES, { recursive: true });
const outPath = path.join(SUMMARIES, `SUMMARY-${dateStr}.json`);
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(`✅ Summary: ${outPath}`);
console.log(`   Packs: ${packs.length}, Genomes: ${totalGenomes}`);
console.log(`   Top families: ${topFamilies.map(f => f.family).join(', ')}`);
