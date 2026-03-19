#!/usr/bin/env node
/**
 * nve-scaffold.js — Create a scaffold JSON for incident / experience-unit / failure-genome.
 *
 * Usage:
 *   node cli/nve-scaffold.js incident  --slug broken-deploy
 *   node cli/nve-scaffold.js eu        --slug shell-safety
 *   node cli/nve-scaffold.js genome    --slug command-shell-mismatch
 *   node cli/nve-scaffold.js incident  --slug broken-deploy --severity 9 --stage deploy
 *
 * Creates a pre-filled JSON file with correct ID, timestamp, and all required fields.
 * The agent then fills in the content fields (title, summary, root_cause, etc.).
 */
const fs = require('fs');
const path = require('path');

const ROOT = findProjectRoot();
const EVO = path.join(ROOT, '.evolution');

// ─── Parse CLI args ──────────────────────────────────────────
const args = process.argv.slice(2);
const type = (args[0] || '').toLowerCase();
const flags = {};
for (let i = 1; i < args.length; i += 2) {
  if (args[i] && args[i].startsWith('--')) {
    flags[args[i].slice(2)] = args[i + 1] || '';
  }
}

if (!['incident', 'eu', 'genome'].includes(type)) {
  console.log(`
🧬 nve-scaffold — Create a pre-filled JSON scaffold

Usage:
  nve-scaffold incident  --slug <short-name> [--severity N] [--stage S]
  nve-scaffold eu        --slug <short-name>
  nve-scaffold genome    --slug <short-name> [--family F]

Options:
  --slug       Short descriptive name (required)
  --severity   1-10 impact score (incident only, default: 5)
  --stage      Pipeline stage (incident only, default: runtime)
  --family     Failure family name (genome only)

Creates the file in the correct .evolution/ subdirectory with auto-generated ID.
`);
  process.exit(0);
}

const slug = flags.slug;
if (!slug) {
  console.error('❌ --slug is required. Example: --slug broken-deploy');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────
function findProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, '.evolution'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function nextId(dir, prefix) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.json'));
  const nums = files.map(f => {
    const m = f.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(6, '0')}`;
}

function now() {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

function slugToTitle(s) {
  return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Scaffold builders ──────────────────────────────────────
function scaffoldIncident() {
  const dir = path.join(EVO, 'incidents');
  const id = nextId(dir, 'INC-');
  const severity = parseInt(flags.severity || '5', 10);
  const stage = flags.stage || 'runtime';

  const doc = {
    schema_version: '1.0',
    event_id: id,
    project_id: path.basename(ROOT),
    occurred_at: now(),
    status: 'observed',
    stage: stage,
    failure_class: slug,
    safe_title: `TODO: ${slugToTitle(slug)}`,
    safe_summary: 'TODO: Describe what happened (safe for sharing)',
    safe_root_cause: 'TODO: Describe why it happened',
    repair_class: `TODO: repair-for-${slug}`,
    impact_score: Math.min(10, Math.max(1, severity)),
    stack_tags: ['TODO'],
    repeat_detected: false,
    files_touched_count: 0,
    patch_suggestions: {
      workflow_patch: 'TODO: or remove if not applicable',
    },
    verifier: {
      type: 'command',
      name: 'TODO: verification name',
      outcome: 'not_run',
      details: 'TODO: verification details',
    },
    privacy: {
      sharing_tier: 'distilled',
      contains_code: false,
      contains_secrets: false,
    },
  };

  const filePath = path.join(dir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n');
  return { id, filePath, type: 'incident' };
}

function scaffoldExperienceUnit() {
  const dir = path.join(EVO, 'experience_units');
  const id = nextId(dir, 'EXP-');

  const doc = {
    schema_version: '1.0',
    experience_id: id,
    canonical_key: slug,
    title: `TODO: ${slugToTitle(slug)}`,
    anti_pattern: 'TODO: What NOT to do',
    preventive_pattern: 'TODO: What TO do instead',
    verifier_recipe: 'TODO: How to verify the fix',
    workflow_patch: 'TODO: or remove',
    applicability_tags: ['TODO'],
    repo_specific: false,
    support_count: 1,
    validation_count: 0,
    confidence: 0.5,
    source_incident_ids: ['TODO: INC-XXXXXX'],
  };

  const filePath = path.join(dir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n');
  return { id, filePath, type: 'experience_unit' };
}

function scaffoldGenome() {
  const dir = path.join(EVO, 'failure_genomes');
  const id = nextId(dir, 'FG-');
  const family = flags.family || slug;

  const doc = {
    genome_id: id,
    created_at: now(),
    incident_id: 'TODO: INC-XXXXXX',
    context_fingerprint: {
      stack_tags: ['TODO'],
      surface_tags: ['TODO'],
      environment_tags: ['TODO'],
      repo_maturity: 'hybrid',
    },
    family: family,
    violated_invariant: 'TODO: which invariant was violated',
    repair_operator: `TODO: repair-for-${slug}`,
    verifier_evidence: [
      {
        kind: 'TODO: command|test|manual',
        ref: 'TODO: path or reference',
        summary: 'TODO: evidence summary',
      },
    ],
    transferability_tags: ['TODO'],
    utility: {
      score: 0,
      reuse_count: 0,
      prevention_count: 0,
      negative_transfer_count: 0,
      last_used_at: now(),
    },
    replay: {
      status: 'pending',
      family_sample_size: 0,
      holdout_sample_size: 0,
      pass_rate: 0,
      notes: 'Awaiting replay gate evaluation',
    },
    proposed_patch_types: ['TODO: workflow_patch|rule_patch|skill_patch|verifier_patch|doc_patch'],
    promotion_decision: 'pending',
    notes: '',
  };

  const filePath = path.join(dir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(doc, null, 2) + '\n');
  return { id, filePath, type: 'failure_genome' };
}

// ─── Execute ─────────────────────────────────────────────────
let result;
switch (type) {
  case 'incident': result = scaffoldIncident(); break;
  case 'eu': result = scaffoldExperienceUnit(); break;
  case 'genome': result = scaffoldGenome(); break;
}

console.log(`
✅ Scaffold created: ${result.type}
   ID:   ${result.id}
   File: ${result.filePath}

📝 Next steps:
   1. Open the file and fill in all TODO fields
   2. Run: node cli/nve-validate.js    (verify structure)
   3. Run: node cli/nve-audit.js       (update scores)
`);
