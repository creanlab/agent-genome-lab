#!/usr/bin/env node
/**
 * nve-distill.js — Auto-distill Failure Genomes from incidents with Impact ≥ 7.
 * 
 * Reads .evolution/incidents/*.json, finds those without a corresponding genome,
 * and creates FG files + updates FAMILY_INDEX.json.
 *
 * Usage: node cli/nve-distill.js [--dry-run] [--min-impact N]
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const minImpact = parseInt((args.find(a => a.startsWith('--min-impact=')) || '--min-impact=7').split('=')[1]) || 7;

const incDir = path.join(root, '.evolution/incidents');
const fgDir = path.join(root, '.evolution/failure_genomes');
const euDir = path.join(root, '.evolution/experience_units');

// Known failure families for auto-classification
const KNOWN_FAMILIES = [
  { pattern: /credential|env.*(var|key|secret)|auth.*drift|api.key/i, family: 'credential-drift-after-refactor', invariant: 'deploy_requires_all_env_vars_verified', repair: 'strip-and-verify-env-vars' },
  { pattern: /verif|done.*without|skip.*check|production.*check/i, family: 'verification-skipped-before-done', invariant: 'done_means_verified_on_production', repair: 'add-production-verification-step' },
  { pattern: /fallback|silent|try.*except.*pass|empty.*catch/i, family: 'silent-fallback-introduced', invariant: 'no_silent_fallbacks', repair: 'remove-fallback-fix-extraction' },
  { pattern: /quality|presence.*equal|gate.*bypass|css.*var/i, family: 'data-quality-gate-bypass', invariant: 'presence_does_not_equal_quality', repair: 'add-resolvability-check' },
  { pattern: /write.*read|format.*mismatch|flat.*nested|schema.*drift/i, family: 'write-read-contract-mismatch', invariant: 'write_format_must_match_read_format', repair: 'add-dual-path-lookup' },
  { pattern: /llm.*score|round|structural.*bias|single.*number/i, family: 'llm-output-structural-bias', invariant: 'never_trust_single_llm_number', repair: 'compute-structural-composite' },
  { pattern: /shell|command|powershell|bash|&&/i, family: 'command-shell-mismatch', invariant: 'check_os_before_shell_commands', repair: 'replace-with-ps-safe-command' },
  { pattern: /import|module.*not.*found|require.*missing/i, family: 'partial-fix-missing-dependency', invariant: 'fix_must_include_all_dependencies', repair: 'verify-imports-after-refactor' },
  { pattern: /deploy|build|docker|cloud.*run/i, family: 'deploy-config-drift', invariant: 'deploy_config_must_match_code', repair: 'add-deploy-preflight-check' },
  { pattern: /regression|broke.*other|side.*effect/i, family: 'undetected-regression', invariant: 'changes_must_not_break_existing', repair: 'add-regression-test-to-ci' }
];

function readJsonSafe(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(n => n.endsWith('.json') && !n.startsWith('FAMILY'))
    .map(n => ({ name: n, data: readJsonSafe(path.join(dir, n)) }))
    .filter(x => x.data);
}

function getNextFGId(existingGenomes) {
  const ids = existingGenomes.map(g => {
    const m = g.name.match(/FG-(\d+)/);
    return m ? parseInt(m[1]) : 0;
  });
  const max = ids.length > 0 ? Math.max(...ids) : 0;
  return `FG-${String(max + 1).padStart(6, '0')}`;
}

function classifyFamily(incident) {
  const text = [
    incident.title || '',
    incident.what_happened || '',
    incident.why_it_happened || '',
    incident.fix_applied || '',
    incident.pattern_extracted || '',
    incident.safe_title || '',
    incident.safe_summary || '',
    incident.safe_root_cause || ''
  ].join(' ');

  for (const f of KNOWN_FAMILIES) {
    if (f.pattern.test(text)) return f;
  }

  // Generate new family from title
  const slug = (incident.title || incident.safe_title || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);

  return {
    family: slug,
    invariant: slug.replace(/-/g, '_'),
    repair: `fix-${slug}`
  };
}

// Main
console.log(`🧬 NVE Distiller — min impact: ${minImpact}, dry run: ${dryRun}\n`);

const incidents = listJsonFiles(incDir);
const existingGenomes = listJsonFiles(fgDir);

// Find incidents that already have genomes (by incident_id match)
const genomedIncidentIds = new Set(
  existingGenomes
    .map(g => g.data.incident_id || g.data.source_incident)
    .filter(Boolean)
);

// Also check EUs for incident→source mapping
const eus = listJsonFiles(euDir);
const euSourceMap = new Map();
for (const eu of eus) {
  if (eu.data.source_incident) {
    euSourceMap.set(eu.data.source_incident, eu.data);
  }
}

const candidates = incidents.filter(inc => {
  const impact = inc.data.severity || inc.data.impact || inc.data.impact_score || 0;
  const id = inc.data.incident_id || inc.data.event_id;
  return impact >= minImpact && !genomedIncidentIds.has(id);
});

if (candidates.length === 0) {
  console.log(`✅ No new incidents with Impact ≥ ${minImpact} to distill.`);
  console.log(`   Total incidents: ${incidents.length}`);
  console.log(`   Already have genomes: ${genomedIncidentIds.size}`);
  process.exit(0);
}

console.log(`Found ${candidates.length} incident(s) to distill:\n`);

const newGenomes = [];
let nextId = getNextFGId(existingGenomes);

for (const inc of candidates) {
  const d = inc.data;
  const id = d.incident_id || d.event_id;
  const impact = d.severity || d.impact || d.impact_score || 0;
  const classification = classifyFamily(d);

  const genome = {
    schema_version: '1.0',
    genome_id: nextId,
    incident_id: id,
    created_at: new Date().toISOString(),
    context_fingerprint: {
      stack_tags: d.stack_tags || [],
      surface_tags: d.surface_tags || [],
      repo_maturity: 'active'
    },
    family: classification.family,
    violated_invariant: classification.invariant,
    repair_operator: classification.repair,
    verifier_evidence: d.evidence ? [{ kind: 'other', ref: 'inline', summary: String(d.evidence).substring(0, 200) }] : [],
    transferability_tags: [
      `applies_to=${classification.family.split('-')[0]}`
    ],
    utility: {
      score: parseFloat((impact / 10).toFixed(2)),
      reuse_count: 0,
      prevention_count: 0,
      negative_transfer_count: 0,
      last_used_at: null
    },
    replay: {
      status: 'not_run',
      family_sample_size: 0,
      holdout_sample_size: 0,
      pass_rate: null
    },
    proposed_patch_types: ['rule_patch'],
    promotion_decision: 'pending',
    notes: null
  };

  console.log(`  ${nextId}: "${d.title || d.safe_title || id}" (impact ${impact})`);
  console.log(`    → family: ${classification.family}`);
  console.log(`    → invariant: ${classification.invariant}`);
  console.log(`    → repair: ${classification.repair}`);
  console.log('');

  newGenomes.push(genome);

  // Increment ID
  const num = parseInt(nextId.replace('FG-', ''));
  nextId = `FG-${String(num + 1).padStart(6, '0')}`;
}

if (dryRun) {
  console.log(`\n🔍 DRY RUN — ${newGenomes.length} genome(s) would be created. No files written.`);
  process.exit(0);
}

// Write genome files
fs.mkdirSync(fgDir, { recursive: true });
for (const g of newGenomes) {
  const outFile = path.join(fgDir, `${g.genome_id}.json`);
  fs.writeFileSync(outFile, JSON.stringify(g, null, 2));
  console.log(`  ✅ Wrote ${outFile}`);
}

// Update FAMILY_INDEX.json
const familyIndexFile = path.join(fgDir, 'FAMILY_INDEX.json');
let familyIndex = readJsonSafe(familyIndexFile) || { families: {} };

for (const g of newGenomes) {
  if (!familyIndex.families[g.family]) {
    familyIndex.families[g.family] = {
      invariant: g.violated_invariant,
      members: [],
      created_at: g.created_at
    };
  }
  familyIndex.families[g.family].members.push(g.genome_id);
}
familyIndex.updated_at = new Date().toISOString();
familyIndex.total_genomes = Object.values(familyIndex.families).reduce((a, f) => a + (Array.isArray(f?.members) ? f.members.length : 0), 0);
familyIndex.total_families = Object.keys(familyIndex.families).length;

fs.writeFileSync(familyIndexFile, JSON.stringify(familyIndex, null, 2));
console.log(`\n  ✅ Updated FAMILY_INDEX.json (${familyIndex.total_families} families, ${familyIndex.total_genomes} genomes)`);

console.log(`\n🧬 Distilled ${newGenomes.length} new Failure Genome(s).`);
