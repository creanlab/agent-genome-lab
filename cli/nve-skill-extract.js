#!/usr/bin/env node
/**
 * nve-skill-extract.js — Create candidate skills from failure genomes and experience units.
 *
 * Usage:
 *   node cli/nve-skill-extract.js
 *   node cli/nve-skill-extract.js --from=genomes
 *   node cli/nve-skill-extract.js --from=experience_units
 *   node cli/nve-skill-extract.js --dry-run
 *   node cli/nve-skill-extract.js --min-confidence=0.75 --min-utility=0.6
 */

const {
  ensureDir,
  listJsonObjects,
  inferCategory,
  inferTags,
  writeJsonRel,
  writeSkillIndex,
} = require('./nve-skill-common');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sourceMode = (args.find((arg) => arg.startsWith('--from=')) || '--from=all').split('=')[1];
const minConfidence = Number((args.find((arg) => arg.startsWith('--min-confidence=')) || '--min-confidence=0.75').split('=')[1]) || 0.75;
const minUtility = Number((args.find((arg) => arg.startsWith('--min-utility=')) || '--min-utility=0.6').split('=')[1]) || 0.6;

ensureDir('.evolution/skills');

const existingSkills = listJsonObjects('.evolution/skills')
  .filter((item) => item.name !== 'INDEX.json')
  .map((item) => item.data);
const existingSourceKeys = new Set(existingSkills.map((skill) => JSON.stringify(skill.source_ids || {})));
let nextSkillNumber = existingSkills.reduce((max, skill) => {
  const match = String(skill.skill_id || '').match(/^SK-(\d{6})$/);
  return match ? Math.max(max, Number(match[1])) : max;
}, 0);

function nextSkillId() {
  nextSkillNumber += 1;
  return `SK-${String(nextSkillNumber).padStart(6, '0')}`;
}

function genomeToSkill(genome, skillId) {
  const family = genome.family || 'unknown-family';
  const repair = genome.repair_operator || 'apply-targeted-repair';
  const invariant = genome.violated_invariant || 'protect-core-invariant';
  const title = `Prevent ${family}`;
  const summary = `Reusable prevention workflow for the failure family '${family}', centered on invariant '${invariant}' and repair operator '${repair}'.`;
  const category = inferCategory(`${family} ${repair} ${invariant}`);
  const tags = inferTags(`${family} ${repair} ${invariant}`, [
    'skillgraph',
    'failure-genome',
    'replay',
    category,
    ...(genome.transferability_tags || []).map((tag) => String(tag).replace(/^applies_to=/, '')),
  ]);

  return {
    schema_version: '1.0',
    skill_id: skillId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    title,
    summary,
    status: 'candidate',
    category,
    tags,
    source_type: 'failure_genome',
    source_ids: {
      genome_id: genome.genome_id,
      incident_id: genome.incident_id || null,
    },
    triggers: [
      `Signals of family: ${family}`,
      `Invariant at risk: ${invariant}`,
    ],
    when_to_use: [
      `Use when current work resembles the '${family}' failure family.`,
      'Use before marking a change as done when the repair touches production or a shared contract.',
    ],
    when_not_to_use: [
      'Do not use as a substitute for actual debugging when the failure pattern is unrelated.',
      'Do not auto-apply destructive changes without explicit approval.',
    ],
    inputs: [
      'Current task summary',
      'Relevant diff / changed files',
      'Verification target (environment, contract, or test surface)',
    ],
    steps: [
      {
        title: 'Inspect family signals',
        instruction: `Check whether the current task matches the '${family}' pattern and restate the invariant '${invariant}'.`,
        expected_output: 'Clear yes/no match plus invariant statement.',
        risk: 'low',
      },
      {
        title: 'Apply repair operator',
        instruction: `Apply or adapt the repair operator '${repair}' to the current context rather than copying a prior fix blindly.`,
        expected_output: 'Targeted remediation plan tied to the current code path.',
        risk: 'medium',
      },
      {
        title: 'Verify on the real surface',
        instruction: 'Run the smallest trustworthy verification on the real target surface (production-like env, actual schema path, or real contract boundary).',
        expected_output: 'Verification evidence tied to the touched surface.',
        risk: 'medium',
      },
      {
        title: 'Holdout regression check',
        instruction: 'Check at least one adjacent family or holdout surface to reduce negative transfer and regression risk.',
        expected_output: 'Regression note or holdout pass result.',
        risk: 'medium',
      },
    ],
    success_signals: [
      `Invariant '${invariant}' is explicitly verified.`,
      'Real target surface passes after the repair.',
      'No obvious holdout regression is introduced.',
    ],
    failure_modes: [
      'Repair copied from the old incident without adapting to the new context.',
      'Verification performed only on a fake or incomplete surface.',
      'Regression introduced in an adjacent contract or family.',
    ],
    safety_notes: [
      'Require explicit approval for destructive commands, auth changes, or billing-impacting actions.',
      'Preserve backward compatibility and wrappers until stability is proven.',
    ],
    maintainability_notes: [
      'Keep the skill tied to the originating genome for lineage and future replay review.',
      'Split the skill if multiple unrelated invariants accumulate.',
    ],
    cost_notes: [
      'Prefer the smallest real verification that still proves the invariant.',
      'Avoid loading large context windows when a focused replay or diff is enough.',
    ],
    relations: [
      {
        type: 'derived_from_genome',
        target: genome.genome_id,
        weight: 1.0,
        evidence: [`family=${family}`, `repair=${repair}`],
      },
    ],
    evaluation: null,
    canonical_hash: null,
    semantic_fingerprint: null,
    duplicate_of: null,
    published_skill_path: null,
  };
}

function experienceUnitToSkill(unit, skillId) {
  const title = unit.title || unit.lesson_title || unit.canonical_key || `Experience skill ${skillId}`;
  const summary = unit.safe_summary || unit.lesson || unit.pattern || unit.anti_pattern || 'Reusable workflow distilled from a high-confidence experience unit.';
  const corpus = [title, summary, unit.anti_pattern, unit.canonical_key, unit.pattern].filter(Boolean).join(' ');
  const category = inferCategory(corpus);
  const tags = inferTags(corpus, ['skillgraph', 'experience-unit', category]);

  return {
    schema_version: '1.0',
    skill_id: skillId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    title: `Apply lesson: ${title}`,
    summary,
    status: 'candidate',
    category,
    tags,
    source_type: 'experience_unit',
    source_ids: {
      experience_id: unit.experience_id || unit.event_id || null,
      incident_id: unit.source_incident || null,
    },
    triggers: [
      unit.canonical_key || 'Related task or lesson appears again',
    ],
    when_to_use: [
      'Use when the current task matches the lesson or anti-pattern described here.',
      'Use when a fast, reusable guardrail is preferable to re-deriving the same lesson from scratch.',
    ],
    when_not_to_use: [
      'Do not use if the lesson contradicts current repo policy or newer replay evidence.',
    ],
    inputs: [
      'Current task summary',
      'Relevant files or changed surfaces',
    ],
    steps: [
      {
        title: 'Restate the lesson',
        instruction: `Restate the core lesson in current-task terms: ${summary}`,
        expected_output: 'Current-task framing of the lesson.',
        risk: 'low',
      },
      {
        title: 'Apply the guardrail',
        instruction: 'Translate the lesson into one or two concrete checks or edits against the current task.',
        expected_output: 'Concrete checks or edits tied to the current code path.',
        risk: 'medium',
      },
      {
        title: 'Verify the lesson held',
        instruction: 'Run a direct verification that demonstrates the anti-pattern was avoided.',
        expected_output: 'Verification note or test evidence.',
        risk: 'medium',
      },
    ],
    success_signals: [
      'The lesson is translated into a concrete check or change.',
      'A direct verification step confirms the anti-pattern was avoided.',
    ],
    failure_modes: [
      'Lesson restated abstractly but not translated into checks.',
      'No verification performed after applying the lesson.',
    ],
    safety_notes: [
      'Prefer additive fixes and explicit verification over implicit assumptions.',
    ],
    maintainability_notes: [
      'Retire or merge the skill when replay evidence points to a stronger canonical skill.',
    ],
    cost_notes: [
      'Keep the skill short; split if it becomes a broad workflow instead of a guardrail.',
    ],
    relations: [],
    evaluation: null,
    canonical_hash: null,
    semantic_fingerprint: null,
    duplicate_of: null,
    published_skill_path: null,
  };
}

const candidates = [];

if (sourceMode === 'all' || sourceMode === 'genomes') {
  const genomes = listJsonObjects('.evolution/failure_genomes')
    .filter((item) => item.name !== 'FAMILY_INDEX.json')
    .map((item) => item.data);
  for (const genome of genomes) {
    const utility = Number(genome.utility?.score || 0);
    const replayStatus = genome.replay?.status || 'not_run';
    const promoted = genome.promotion_decision === 'promoted';
    if (!(promoted || replayStatus === 'passed' || utility >= minUtility)) continue;
    const sourceKey = JSON.stringify({ genome_id: genome.genome_id, incident_id: genome.incident_id || null });
    if (existingSourceKeys.has(sourceKey)) continue;
    const skillId = nextSkillId();
    const skill = genomeToSkill(genome, skillId);
    candidates.push(skill);
    existingSourceKeys.add(sourceKey);
  }
}

if (sourceMode === 'all' || sourceMode === 'experience_units') {
  const units = listJsonObjects('.evolution/experience_units').map((item) => item.data);
  for (const unit of units) {
    const confidence = Number(unit.confidence || 0);
    if (confidence < minConfidence) continue;
    const sourceKey = JSON.stringify({ experience_id: unit.experience_id || unit.event_id || null, incident_id: unit.source_incident || null });
    if (existingSourceKeys.has(sourceKey)) continue;
    const skillId = nextSkillId();
    const skill = experienceUnitToSkill(unit, skillId);
    candidates.push(skill);
    existingSourceKeys.add(sourceKey);
  }
}

console.log(`\nnve-skill-extract — from=${sourceMode}, dryRun=${dryRun}`);
console.log(`Candidates: ${candidates.length}\n`);

for (const skill of candidates) {
  console.log(`- ${skill.skill_id}: ${skill.title}`);
  if (!dryRun) {
    writeJsonRel(`.evolution/skills/${skill.skill_id}.json`, skill);
  }
}

if (!dryRun) {
  writeSkillIndex();
  console.log('\nWrote candidate skills to .evolution/skills/');
}
