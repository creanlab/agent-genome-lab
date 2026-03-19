#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dir = path.join(root, '.evolution/failure_genomes');
if (!fs.existsSync(dir)) {
  console.error('Missing Failure Genome directory: .evolution/failure_genomes');
  process.exit(1);
}

const genomes = fs.readdirSync(dir)
  .filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));

const countBy = (getKey) => {
  const map = new Map();
  for (const item of genomes) {
    const key = getKey(item) || 'unknown';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
};

const summary = {
  schema_version: '1.0',
  generated_at: new Date().toISOString(),
  total_genomes: genomes.length,
  top_families: countBy(g => g.family).slice(0, 10),
  top_invariants: countBy(g => g.violated_invariant).slice(0, 10),
  top_repair_operators: countBy(g => g.repair_operator).slice(0, 10),
  promotion_decisions: countBy(g => g.promotion_decision).slice(0, 10),
  replay_statuses: countBy(g => g.replay && g.replay.status).slice(0, 10),
  average_utility_score: genomes.length ? Number((genomes.reduce((a, g) => a + ((g.utility && g.utility.score) || 0), 0) / genomes.length).toFixed(4)) : 0
};

const outDir = path.join(root, '.evolution/audits');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'failure-genome-summary.latest.json');
fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
console.log(`Wrote ${outFile}`);
console.log(JSON.stringify(summary, null, 2));
