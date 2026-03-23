#!/usr/bin/env node
/**
 * nve-pack.js — Create sanitized export pack for research pool
 * Reads .evolution/ → strips PII → outputs to .evolution/exports/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');

function readJsonDir(dir) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir)
    .filter(f => f.endsWith('.json') && f !== '.gitkeep')
    .map(f => JSON.parse(fs.readFileSync(path.join(fullDir, f), 'utf-8')));
}

function redact(obj) {
  const redacted = { ...obj };
  // Strip PII fields
  delete redacted.agent_id;
  delete redacted.project;
  delete redacted.repo_name;
  // Coarsen dates
  if (redacted.created_at) {
    redacted.created_at = redacted.created_at.slice(0, 7); // YYYY-MM
  }
  // Strip code evidence content (keep type)
  if (redacted.verifier_evidence && Array.isArray(redacted.verifier_evidence)) {
    redacted.verifier_evidence = redacted.verifier_evidence.map(e => ({
      kind: e.kind,
      summary: e.summary || 'redacted'
    }));
  }
  return redacted;
}

const genomes = readJsonDir('.evolution/failure_genomes').map(redact);
const eus = readJsonDir('.evolution/experience_units').map(redact);

const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

const pack = {
  pack_id: `PACK-${dateStr}-001`,
  created_at: now.toISOString().slice(0, 10),
  source_hash: crypto.randomBytes(16).toString('hex'),
  redaction_version: 'v1',
  genomes,
  experience_units: eus,
  metadata: {
    total_incidents: readJsonDir('.evolution/incidents').length,
    total_genomes: genomes.length,
    total_eus: eus.length
  }
};

const outDir = path.join(ROOT, '.evolution', 'exports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `PACK-${dateStr}-001.json`);
fs.writeFileSync(outPath, JSON.stringify(pack, null, 2));
console.log(`✅ Pack created: ${outPath}`);
console.log(`   Genomes: ${genomes.length}, Experience Units: ${eus.length}`);
console.log(`   ⚠️  Review before sharing!`);
