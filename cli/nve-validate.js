#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredPaths = [
  'AGENTS.md',
  'README.md',
  'docs/UNIVERSAL_ARCHITECTURE.md',
  '.agents/rules',
  '.agents/workflows',
  '.agents/skills',
  '.evolution/incidents',
  '.evolution/experience_units',
  '.evolution/failure_genomes',
  '.evolution/audits',
  '.evolution/manifests',
  '.evolution/exports',
  'schemas/incident-event.schema.json',
  'schemas/experience-unit.schema.json',
  'schemas/repo-manifest.schema.json',
  'schemas/audit-report.schema.json',
  'schemas/share-batch.schema.json',
  'schemas/failure-genome.schema.json',
  'cli/nve-manifest.js',
  'cli/nve-audit.js',
  'cli/nve-pack.js',
  'cli/nve-fg-summary.js'
];

const missing = requiredPaths.filter(rel => !fs.existsSync(path.join(root, rel)));
const report = {
  schema_version: '1.0',
  generated_at: new Date().toISOString(),
  missing,
  ok: missing.length === 0
};

const outDir = path.join(root, '.evolution/audits');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'validation.latest.json');
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(`Wrote ${outFile}`);
console.log(JSON.stringify(report, null, 2));
process.exit(missing.length === 0 ? 0 : 1);
