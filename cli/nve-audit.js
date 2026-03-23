#!/usr/bin/env node
/**
 * nve-audit.js — 5-Axis Structural Audit + SkillGraph extension.
 *
 * Preserves the original 5-axis overall score while adding a non-breaking
 * `skillgraph` section to the audit payload.
 */
const fs = require('fs');
const path = require('path');

function findProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, 'AGENTS.md')) || fs.existsSync(path.join(dir, '.evolution'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..');
}

const ROOT = findProjectRoot();
function exists(relPath) { return fs.existsSync(path.join(ROOT, relPath)); }
function listDir(relPath) {
  try {
    return fs.readdirSync(path.join(ROOT, relPath)).filter((name) => name !== '.gitkeep' && !name.startsWith('.'));
  } catch {
    return [];
  }
}
function countDir(relPath) { return listDir(relPath).length; }
function readJson(relPath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  } catch {
    return fallback;
  }
}

const issues = [];

// ============== AXIS 1: STRUCTURE ==============
const structureChecks = [
  { path: 'AGENTS.md', weight: 5, label: 'Operating contract' },
  { path: '.agents/rules', weight: 5, label: 'Agent rules dir' },
  { path: '.agents/workflows', weight: 5, label: 'Agent workflows dir' },
  { path: '.agents/skills', weight: 5, label: 'Agent skills dir' },
  { path: 'docs', weight: 5, label: 'Documentation dir' },
];

let structureScore = 0;
for (const check of structureChecks) {
  if (exists(check.path)) {
    structureScore += check.weight;
    structureScore += Math.min(3, countDir(check.path));
  } else {
    issues.push({ axis: 'structure', type: 'missing', path: check.path, label: check.label });
  }
}
const ruleCount = countDir('.agents/rules');
const workflowCount = countDir('.agents/workflows');
const skillCount = countDir('.agents/skills');
structureScore += Math.min(10, ruleCount * 2);
structureScore += Math.min(10, workflowCount * 2);
structureScore += Math.min(5, skillCount);
structureScore = Math.min(100, Math.round((structureScore / 60) * 100));

// ============== AXIS 2: MEMORY ==============
const memCounts = {
  incidents: countDir('.evolution/incidents'),
  experience_units: countDir('.evolution/experience_units'),
  failure_genomes: countDir('.evolution/failure_genomes') > 0 ? Math.max(0, countDir('.evolution/failure_genomes') - (exists('.evolution/failure_genomes/FAMILY_INDEX.json') ? 1 : 0)) : 0,
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
if (exists('.github/workflows')) verifScore += 20;
if (exists('cloudbuild.yaml') || exists('Dockerfile')) verifScore += 15;
const rulesDir = listDir('.agents/rules');
const guardrailRules = ['truthfulness', 'docs', 'sharing'];
for (const needle of guardrailRules) {
  if (rulesDir.some((name) => name.includes(needle))) verifScore += 10;
}
const dangerPatterns = [
  { pat: 'AIzaSy', label: 'Google API key' },
  { pat: 'eyJhbG', label: 'JWT token' },
  { pat: 'pplx-', label: 'Perplexity key' },
  { pat: /\bsk-[a-zA-Z0-9]{20,}/, label: 'OpenAI key' },
  { pat: /\bghp_[a-zA-Z0-9]{30,}/, label: 'GitHub token' },
];
const checkFiles = ['AGENTS.md', 'server.js', 'README.md'];
let securityOk = true;
for (const file of checkFiles) {
  if (!exists(file)) continue;
  const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const pattern of dangerPatterns) {
    const found = pattern.pat instanceof RegExp ? pattern.pat.test(content) : content.includes(pattern.pat);
    if (found) {
      issues.push({ axis: 'verification', type: 'security', file, label: pattern.label });
      securityOk = false;
    }
  }
}
if (securityOk) verifScore += 15;
if (exists('package.json')) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    if (pkg.scripts && pkg.scripts.test && pkg.scripts.test !== 'echo "Error: no test"') verifScore += 10;
  } catch {
    // ignore malformed package.json
  }
}
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
const skillSchemaChecks = [
  'schemas/skill-candidate.schema.json',
  'schemas/skill-package.schema.json',
  'schemas/skill-relation.schema.json',
];
for (const schema of schemaChecks) {
  if (exists(schema)) shareScore += 10;
}
for (const schema of skillSchemaChecks) {
  if (exists(schema)) shareScore += 3;
}
if (exists('cli/nve-pack.js')) shareScore += 15;
if (exists('templates')) shareScore += 10;
if (exists('.evolution/exports')) shareScore += 5;
if (exists('TAMA_start')) shareScore += 5;
if (exists('TAMA_start/README.md')) shareScore += 5;
shareScore = Math.min(100, shareScore);

// ============== AXIS 5: EVOLUTION INTELLIGENCE ==============
let evoScore = 0;
if (memCounts.failure_genomes > 0) evoScore += 20;
if (exists('.evolution/failure_genomes/FAMILY_INDEX.json')) evoScore += 15;
if (exists('.agents/workflows/50-failure-genome-review.md')) evoScore += 15;
if (exists('.agents/rules/60-failure-genome-promotion.md')) evoScore += 15;
if (exists('cli/nve-replay.js')) evoScore += 15;
if (exists('cli/nve-distill.js')) evoScore += 10;
if (exists('cli/nve-utility.js')) evoScore += 10;
evoScore = Math.min(100, evoScore);

// ============== SKILLGRAPH EXTENSION (not part of overall 5-axis score) ==============
const skillFiles = listDir('.evolution/skills').filter((name) => name.endsWith('.json') && name !== 'INDEX.json');
const packageFiles = listDir('.evolution/skill_packages').filter((name) => name.endsWith('.json') && name !== 'INDEX.json');
const relationsRaw = readJson('.evolution/skill_relations/RELATIONS.json', { relations: [] });
const relations = Array.isArray(relationsRaw.relations) ? relationsRaw.relations : [];
const skillIndex = readJson('.evolution/skills/INDEX.json', { by_status: {} });
const byStatus = skillIndex.by_status || {};
let skillgraphScore = 0;
if (exists('.evolution/skills')) skillgraphScore += 20;
if (exists('.evolution/skill_packages')) skillgraphScore += 10;
if (exists('.evolution/skill_relations/RELATIONS.json')) skillgraphScore += 10;
if (exists('cli/nve-skill-extract.js')) skillgraphScore += 10;
if (exists('cli/nve-skill-index.js')) skillgraphScore += 10;
if (exists('cli/nve-skill-package.js')) skillgraphScore += 10;
if (exists('cli/nve-skill-search.js')) skillgraphScore += 10;
skillgraphScore += Math.min(10, skillFiles.length * 2);
skillgraphScore += Math.min(5, packageFiles.length * 2);
skillgraphScore += Math.min(5, relations.length > 0 ? 5 : 0);
skillgraphScore = Math.min(100, skillgraphScore);

const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
const overall = Math.round((structureScore + memoryScore + verifScore + shareScore + evoScore) / 5);

const audit = {
  schema_version: '2.1',
  audit_date: now.toISOString().slice(0, 10),
  generated_at: now.toISOString(),
  overall_score: overall,
  axes: {
    structure: { score: structureScore, rules: ruleCount, workflows: workflowCount, skills: skillCount },
    memory: { score: memoryScore, ...memCounts },
    verification: { score: verifScore, security_ok: securityOk },
    shareability: {
      score: shareScore,
      schemas: schemaChecks.filter((schema) => exists(schema)).length,
      skill_schemas: skillSchemaChecks.filter((schema) => exists(schema)).length,
      has_pack: exists('cli/nve-pack.js'),
    },
    evolution: {
      score: evoScore,
      genomes: memCounts.failure_genomes,
      has_replay: exists('cli/nve-replay.js'),
      has_distill: exists('cli/nve-distill.js'),
    },
  },
  skillgraph: {
    score: skillgraphScore,
    skills: skillFiles.length,
    admitted: byStatus.admitted || 0,
    candidate: byStatus.candidate || 0,
    quarantined: byStatus.quarantined || 0,
    rejected: byStatus.rejected || 0,
    packages: packageFiles.length,
    relations: relations.length,
    has_extract: exists('cli/nve-skill-extract.js'),
    has_index: exists('cli/nve-skill-index.js'),
    has_package_builder: exists('cli/nve-skill-package.js'),
    has_search: exists('cli/nve-skill-search.js'),
    has_export: exists('cli/nve-skill-export.js'),
    top_skills: skillFiles
      .map((f) => readJson(`.evolution/skills/${f}`, null))
      .filter((s) => s && s.status === 'admitted')
      .sort((a, b) => ((b.evaluation?.overall || 0) - (a.evaluation?.overall || 0)))
      .slice(0, 5)
      .map((s) => ({
        skill_id: s.skill_id,
        title: s.title,
        category: s.category || 'quality',
        tags: (s.tags || []).slice(0, 4),
        eval_score: s.evaluation?.overall || 0,
        relations: relations.filter((r) => r.source_skill_id === s.skill_id || r.target === s.skill_id).length,
      })),
  },
  issues,
};

const outDir = path.join(ROOT, '.evolution', 'audits');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `AUDIT-${dateStr}.json`);
fs.writeFileSync(outPath, JSON.stringify(audit, null, 2) + '\n');

const bar = (score) => {
  const filled = Math.round(score / 5);
  return '█'.repeat(filled) + '░'.repeat(20 - filled) + ` ${score}%`;
};

console.log(`\n🧬 NVE 5-Axis Audit — ${now.toISOString().slice(0, 10)}\n`);
console.log(`  Overall: ${bar(overall)}\n`);
console.log(`  Structure:      ${bar(structureScore)}  (${ruleCount}R ${workflowCount}W ${skillCount}S)`);
console.log(`  Memory:         ${bar(memoryScore)}  (${memCounts.incidents}I ${memCounts.experience_units}EU ${memCounts.failure_genomes}FG)`);
console.log(`  Verification:   ${bar(verifScore)}  (security: ${securityOk ? '✅' : '❌'})`);
console.log(`  Shareability:   ${bar(shareScore)}  (${schemaChecks.filter((schema) => exists(schema)).length}/6 schemas)`);
console.log(`  Evolution:      ${bar(evoScore)}  (${memCounts.failure_genomes} genomes)`);
console.log(`  SkillGraph*:    ${bar(skillgraphScore)}  (${skillFiles.length} skills, ${packageFiles.length} packages, ${relations.length} relations)`);

if (audit.skillgraph.top_skills && audit.skillgraph.top_skills.length > 0) {
  console.log(`\n  🏆 Top Skills:`);
  for (const ts of audit.skillgraph.top_skills) {
    const relStr = ts.relations > 0 ? ` 🔗${ts.relations}` : '';
    const tagStr = ts.tags.length > 0 ? ` [${ts.tags.join(', ')}]` : '';
    console.log(`    ${ts.skill_id} │ ${ts.eval_score.toFixed(2)} │ ${ts.category} │ ${ts.title}${relStr}${tagStr}`);
  }
}

if (issues.length) {
  console.log(`\n  ⚠️ Issues (${issues.length}):`);
  for (const issue of issues) console.log(`    - [${issue.axis}] ${issue.type}: ${issue.path || issue.file}`);
}

console.log(`\n  Wrote: ${outPath}`);
console.log('  *SkillGraph is reported as an extension and is not folded into the historical 5-axis overall score.\n');
