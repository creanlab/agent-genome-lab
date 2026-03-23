#!/usr/bin/env node
/**
 * nve-audit.js — 5-Axis Structural Audit (V2)
 *
 * Axes (0-100 each):
 *   1. Structure   — AGENTS.md, rules, workflows, skills
 *   2. Memory      — incidents, experience_units, failure_genomes
 *   3. Verification — CI/CD, tests, guardrail rules
 *   4. Shareability — schemas, nve-pack, exports, templates
 *   5. Evolution    — FG layer, review workflow, promotion rule, replay
 *
 * Output: .evolution/audits/AUDIT-YYYYMMDD.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function exists(p) { return fs.existsSync(path.join(ROOT, p)); }
function countDir(p) {
  try { return fs.readdirSync(path.join(ROOT, p)).filter(f => f !== '.gitkeep' && !f.startsWith('.')).length; }
  catch { return 0; }
}

const issues = [];

// ============== AXIS 1: STRUCTURE (25 points max) ==============
const structureChecks = [
  { path: 'AGENTS.md', weight: 5, label: 'Operating contract' },
  { path: '.agents/rules', weight: 5, label: 'Agent rules dir' },
  { path: '.agents/workflows', weight: 5, label: 'Agent workflows dir' },
  { path: '.agents/skills', weight: 5, label: 'Agent skills dir' },
  { path: 'docs', weight: 5, label: 'Documentation dir' },
];

let structureScore = 0;
for (const c of structureChecks) {
  if (exists(c.path)) {
    structureScore += c.weight;
    // Bonus for content
    const count = countDir(c.path);
    if (count > 0) structureScore += Math.min(3, count);
  } else {
    issues.push({ axis: 'structure', type: 'missing', path: c.path, label: c.label });
  }
}
// Rule count bonus
const ruleCount = countDir('.agents/rules');
const workflowCount = countDir('.agents/workflows');
const skillCount = countDir('.agents/skills');
structureScore += Math.min(10, ruleCount * 2);
structureScore += Math.min(10, workflowCount * 2);
structureScore += Math.min(5, skillCount);
structureScore = Math.min(100, Math.round((structureScore / 60) * 100));

// ============== AXIS 2: MEMORY (counts) ==============
const memCounts = {
  incidents: countDir('.evolution/incidents'),
  experience_units: countDir('.evolution/experience_units'),
  failure_genomes: countDir('.evolution/failure_genomes'),
  audits: countDir('.evolution/audits'),
  manifests: countDir('.evolution/manifests'),
};
let memoryScore = 0;
if (exists('.evolution')) memoryScore += 10;
memoryScore += Math.min(20, memCounts.incidents * 2);
memoryScore += Math.min(20, memCounts.experience_units * 4);
memoryScore += Math.min(30, memCounts.failure_genomes * 4);
memoryScore += Math.min(10, memCounts.audits * 3);
memoryScore += Math.min(10, memCounts.manifests * 5);
memoryScore = Math.min(100, memoryScore);

// ============== AXIS 3: VERIFICATION ==============
let verifScore = 0;
// CI/CD
if (exists('.github/workflows')) verifScore += 20;
if (exists('cloudbuild.yaml') || exists('Dockerfile')) verifScore += 15;
// Guardrail rules
const guardrailRules = ['rules/10-truthfulness', 'rules/30-docs', 'rules/50-sharing'];
for (const r of guardrailRules) {
  if (fs.readdirSync(path.join(ROOT, '.agents/rules')).some(f => f.includes(r.split('/')[1].split('-')[0]))) {
    verifScore += 10;
  }
}
// Security check
const dangerPatterns = [
  { pat: 'AIzaSy', label: 'Google API key' },
  { pat: 'eyJhbG', label: 'JWT token' },
  { pat: 'pplx-', label: 'Perplexity key' },
  { pat: /\bsk-[a-zA-Z0-9]{20,}/, label: 'OpenAI key' },
  { pat: /\bghp_[a-zA-Z0-9]{30,}/, label: 'GitHub token' },
];
const checkFiles = ['AGENTS.md', 'server.js', 'README.md'];
let securityOk = true;
for (const f of checkFiles) {
  if (exists(f)) {
    const content = fs.readFileSync(path.join(ROOT, f), 'utf-8');
    for (const dp of dangerPatterns) {
      const found = dp.pat instanceof RegExp ? dp.pat.test(content) : content.includes(dp.pat);
      if (found) {
        issues.push({ axis: 'verification', type: 'security', file: f, label: dp.label });
        securityOk = false;
      }
    }
  }
}
if (securityOk) verifScore += 15;
// Tests
if (exists('package.json')) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    if (pkg.scripts && pkg.scripts.test && pkg.scripts.test !== 'echo "Error: no test"') verifScore += 10;
  } catch {}
}
// Operating contract and backlog
if (exists('AGENTS.md')) verifScore += 5;
if (exists('docs/backlog_tama.md') || exists('docs/backlog.md')) verifScore += 5;
verifScore = Math.min(100, verifScore);

// ============== AXIS 4: SHAREABILITY ==============
let shareScore = 0;
const schemaChecks = [
  'schemas/failure-genome.schema.json',
  'schemas/incident-event.schema.json',
  'schemas/experience-unit.schema.json',
  'schemas/repo-manifest.schema.json',
  'schemas/audit-report.schema.json',
  'schemas/share-batch.schema.json',
];
for (const s of schemaChecks) {
  if (exists(s)) shareScore += 10;
}
if (exists('cli/nve-pack.js')) shareScore += 15;
if (exists('templates')) shareScore += 10;
if (exists('.evolution/exports')) shareScore += 5;
if (exists('TAMA_start')) shareScore += 5;
if (exists('TAMA_start/README.md')) shareScore += 5;
shareScore = Math.min(100, shareScore);

// ============== AXIS 5: EVOLUTION INTELLIGENCE ==============
let evoScore = 0;
if (countDir('.evolution/failure_genomes') > 0) evoScore += 20;
if (exists('.evolution/failure_genomes/FAMILY_INDEX.json')) evoScore += 15;
if (exists('.agents/workflows/50-failure-genome-review.md')) evoScore += 15;
if (exists('.agents/rules/60-failure-genome-promotion.md')) evoScore += 15;
if (exists('cli/nve-replay.js')) evoScore += 15;
if (exists('cli/nve-distill.js')) evoScore += 10;
if (exists('cli/nve-utility.js')) evoScore += 10;
evoScore = Math.min(100, evoScore);

// ============== OUTPUT ==============
const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
const overall = Math.round((structureScore + memoryScore + verifScore + shareScore + evoScore) / 5);

const audit = {
  schema_version: '2.0',
  audit_date: now.toISOString().slice(0, 10),
  generated_at: now.toISOString(),
  overall_score: overall,
  axes: {
    structure: { score: structureScore, rules: ruleCount, workflows: workflowCount, skills: skillCount },
    memory: { score: memoryScore, ...memCounts },
    verification: { score: verifScore, security_ok: securityOk },
    shareability: { score: shareScore, schemas: schemaChecks.filter(s => exists(s)).length, has_pack: exists('cli/nve-pack.js') },
    evolution: { score: evoScore, genomes: memCounts.failure_genomes, has_replay: exists('cli/nve-replay.js'), has_distill: exists('cli/nve-distill.js') },
  },
  issues
};

const outDir = path.join(ROOT, '.evolution', 'audits');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `AUDIT-${dateStr}.json`);
fs.writeFileSync(outPath, JSON.stringify(audit, null, 2));

// Console output
const bar = (score) => {
  const filled = Math.round(score / 5);
  return '█'.repeat(filled) + '░'.repeat(20 - filled) + ` ${score}%`;
};

console.log(`\n🧬 NVE 5-Axis Audit — ${now.toISOString().slice(0, 10)}\n`);
console.log(`  Overall: ${bar(overall)}\n`);
console.log(`  Structure:      ${bar(structureScore)}  (${ruleCount}R ${workflowCount}W ${skillCount}S)`);
console.log(`  Memory:         ${bar(memoryScore)}  (${memCounts.incidents}I ${memCounts.experience_units}EU ${memCounts.failure_genomes}FG)`);
console.log(`  Verification:   ${bar(verifScore)}  (security: ${securityOk ? '✅' : '❌'})`);
console.log(`  Shareability:   ${bar(shareScore)}  (${schemaChecks.filter(s => exists(s)).length}/6 schemas)`);
console.log(`  Evolution:      ${bar(evoScore)}  (${memCounts.failure_genomes} genomes)`);

if (issues.length) {
  console.log(`\n  ⚠️ Issues (${issues.length}):`);
  for (const i of issues) console.log(`    - [${i.axis}] ${i.type}: ${i.path || i.file}`);
}

console.log(`\n  Wrote: ${outPath}\n`);
