#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const tier = (process.argv[2] || 'distilled').toLowerCase();
if (!['manifest','distilled','research'].includes(tier)) {
  console.error('Usage: node cli/nve-pack.js [manifest|distilled|research]');
  process.exit(1);
}

function readJsonIfExists(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function listJson(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .map(name => readJsonIfExists(path.join(dir, name)))
    .filter(Boolean);
}

const manifest = readJsonIfExists(path.join(root, '.evolution/manifests/repo-manifest.latest.json'));
const audit = readJsonIfExists(path.join(root, '.evolution/audits/repo-audit.latest.json'));
const incidents = listJson(path.join(root, '.evolution/incidents'));
const experienceUnits = listJson(path.join(root, '.evolution/experience_units'));
const genomes = listJson(path.join(root, '.evolution/failure_genomes'));

const redactIncident = (i) => ({
  event_id: i.event_id,
  occurred_at: i.occurred_at,
  status: i.status,
  failure_class: i.failure_class,
  stage: i.stage,
  safe_title: i.safe_title,
  safe_summary: i.safe_summary,
  safe_root_cause: i.safe_root_cause,
  repair_class: i.repair_class,
  impact_score: i.impact_score,
  verifier_outcome: i.verifier && i.verifier.outcome,
  repeat_detected: i.repeat_detected,
  stack_tags: i.stack_tags,
  patch_suggestions: i.patch_suggestions || {}
});

const redactExperience = (e) => ({
  canonical_key: e.canonical_key,
  title: e.title,
  anti_pattern: e.anti_pattern,
  preventive_pattern: e.preventive_pattern,
  verifier_recipe: e.verifier_recipe,
  rule_patch: e.rule_patch,
  workflow_patch: e.workflow_patch,
  skill_patch: e.skill_patch,
  verifier_patch: e.verifier_patch,
  doc_patch: e.doc_patch,
  applicability_tags: e.applicability_tags,
  confidence: e.confidence,
  support_count: e.support_count
});

const redactGenome = (g) => ({
  genome_id: g.genome_id,
  incident_id: g.incident_id,
  family: g.family,
  violated_invariant: g.violated_invariant,
  repair_operator: g.repair_operator,
  transferability_tags: g.transferability_tags,
  utility: g.utility,
  replay: g.replay,
  proposed_patch_types: g.proposed_patch_types,
  promotion_decision: g.promotion_decision
});

let payload = {};
let included = [];
let excluded = ['raw source code', 'secrets', 'full prompts', 'full logs', 'complete conversations'];

if (tier === 'manifest') {
  payload = { manifest, audit };
  included = ['manifest', 'audit'];
}
if (tier === 'distilled') {
  payload = {
    manifest,
    audit,
    incidents: incidents.map(redactIncident),
    experience_units: experienceUnits.map(redactExperience),
    failure_genomes: genomes.map(redactGenome)
  };
  included = ['manifest', 'audit', 'safe incidents', 'experience units', 'safe failure genomes'];
}
if (tier === 'research') {
  payload = { manifest, audit, incidents, experience_units: experienceUnits, failure_genomes: genomes };
  included = ['manifest', 'audit', 'full incident payloads', 'experience units', 'full structured failure genomes'];
}

const batch = {
  schema_version: '1.0',
  created_at: new Date().toISOString(),
  sharing_tier: tier,
  project_name: (manifest && manifest.project_name) || path.basename(root),
  redaction_report: { included, excluded },
  payload
};

const outDir = path.join(root, '.evolution/exports');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `research-pack-${new Date().toISOString().replace(/[:.]/g, '-')}-${tier}.json`);
fs.writeFileSync(outFile, JSON.stringify(batch, null, 2));
console.log(`Wrote ${outFile}`);
console.log(JSON.stringify(batch.redaction_report, null, 2));
