#!/usr/bin/env node
/**
 * nve-skill-index.js — Evaluate, deduplicate, categorize, and connect skills.
 *
 * Usage:
 *   node cli/nve-skill-index.js
 */

const {
  ensureDir,
  listJsonObjects,
  readJson,
  writeJsonRel,
  inferCategory,
  inferTags,
  buildCanonicalHash,
  buildSemanticFingerprint,
  skillText,
  evaluateSkill,
  jaccard,
  dedupeRelations,
  writeSkillIndex,
  writeRelationsJson,
  resolveRoot,
} = require('./nve-skill-common');

ensureDir('.evolution/skill_relations');

const skillItems = listJsonObjects('.evolution/skills').filter((item) => item.name !== 'INDEX.json');
const skills = skillItems.map((item) => item.data);
const statusCounts = { admitted: 0, candidate: 0, quarantined: 0, rejected: 0 };

if (skills.length === 0) {
  writeSkillIndex();
  writeRelationsJson([]);
  console.log('nve-skill-index complete');
  console.log('Skills indexed: 0');
  console.log('Relations written: 0');
  console.log('Status counts: {}');
  process.exit(0);
}

function decideStatus(skill) {
  const ev = skill.evaluation || {};
  if (skill.duplicate_of) return 'rejected';
  if ((ev.safety || 0) < 0.45 || (ev.completeness || 0) < 0.45 || (ev.executability || 0) < 0.40) return 'rejected';
  if ((ev.safety || 0) >= 0.80 && (ev.completeness || 0) >= 0.78 && (ev.executability || 0) >= 0.75 && (ev.overall || 0) >= 0.82) return 'admitted';
  if ((ev.safety || 0) >= 0.68 && (ev.completeness || 0) >= 0.65 && (ev.executability || 0) >= 0.60 && (ev.overall || 0) >= 0.72) return 'candidate';
  if ((ev.overall || 0) >= 0.55 && (ev.safety || 0) >= 0.55) return 'quarantined';
  return 'rejected';
}

for (const skill of skills) {
  const text = skillText(skill);
  if (!skill.category || skill.category === 'unknown') skill.category = inferCategory(text);
  if (!Array.isArray(skill.tags) || skill.tags.length < 2) skill.tags = inferTags(text, skill.tags || []);
  skill.canonical_hash = buildCanonicalHash(skill);
  skill.semantic_fingerprint = buildSemanticFingerprint(skill);
  skill.evaluation = evaluateSkill(skill);
  skill.duplicate_of = null;
  skill.updated_at = new Date().toISOString();
  if (skill.published_skill_path === undefined) skill.published_skill_path = null;
}

const byHash = new Map();
for (const skill of skills) {
  if (!byHash.has(skill.canonical_hash)) byHash.set(skill.canonical_hash, []);
  byHash.get(skill.canonical_hash).push(skill);
}

for (const group of byHash.values()) {
  if (group.length <= 1) continue;
  group.sort((a, b) => {
    const left = a.evaluation?.overall || 0;
    const right = b.evaluation?.overall || 0;
    if (right !== left) return right - left;
    return String(a.skill_id || '').localeCompare(String(b.skill_id || ''));
  });
  const canonical = group[0];
  for (const duplicate of group.slice(1)) {
    duplicate.duplicate_of = canonical.skill_id;
    duplicate.status = 'rejected';
    duplicate.evaluation.recommendation = 'reject_duplicate';
    duplicate.evaluation.rationale = [
      ...(duplicate.evaluation.rationale || []),
      `exact duplicate of ${canonical.skill_id}`,
    ];
  }
}

for (const skill of skills) {
  if (!skill.duplicate_of) {
    skill.status = decideStatus(skill);
  }
  statusCounts[skill.status] = (statusCounts[skill.status] || 0) + 1;
  writeJsonRel(`.evolution/skills/${skill.skill_id}.json`, skill);
}

const previousRelationsRaw = readJson(resolveRoot('.evolution/skill_relations/RELATIONS.json'), { relations: [] });
const previousRelations = Array.isArray(previousRelationsRaw.relations) ? previousRelationsRaw.relations : [];
const preservedRelations = previousRelations.filter((relation) => ![
  'derived_from_genome',
  'derived_from_experience_unit',
  'similar_to',
  'compose_with',
  'duplicate_of',
].includes(relation.relation_type));

const relations = [];
for (const skill of skills) {
  if (skill.source_type === 'failure_genome' && skill.source_ids?.genome_id) {
    relations.push({
      source_skill_id: skill.skill_id,
      relation_type: 'derived_from_genome',
      target: skill.source_ids.genome_id,
      weight: 1,
      evidence: ['source_type=failure_genome'],
    });
  }
  if (skill.source_type === 'experience_unit' && skill.source_ids?.experience_id) {
    relations.push({
      source_skill_id: skill.skill_id,
      relation_type: 'derived_from_experience_unit',
      target: skill.source_ids.experience_id,
      weight: 1,
      evidence: ['source_type=experience_unit'],
    });
  }
  if (skill.duplicate_of) {
    relations.push({
      source_skill_id: skill.skill_id,
      relation_type: 'duplicate_of',
      target: skill.duplicate_of,
      weight: 1,
      evidence: ['canonical_hash_match'],
    });
  }
}

function parseFingerprint(skill) {
  return String(skill.semantic_fingerprint || '').split('|').filter(Boolean);
}

const admissible = skills.filter((skill) => skill.status !== 'rejected');
for (let i = 0; i < admissible.length; i += 1) {
  for (let j = i + 1; j < admissible.length; j += 1) {
    const left = admissible[i];
    const right = admissible[j];
    if (left.duplicate_of || right.duplicate_of) continue;

    const fingerprintOverlap = jaccard(parseFingerprint(left), parseFingerprint(right));
    const tagOverlap = jaccard(left.tags || [], right.tags || []);
    const sameCategory = left.category === right.category;

    if (fingerprintOverlap >= 0.42 || (sameCategory && tagOverlap >= 0.34)) {
      relations.push({
        source_skill_id: left.skill_id,
        relation_type: 'similar_to',
        target: right.skill_id,
        weight: Number(Math.max(fingerprintOverlap, tagOverlap).toFixed(4)),
        evidence: [
          `fingerprint_overlap=${fingerprintOverlap.toFixed(2)}`,
          `tag_overlap=${tagOverlap.toFixed(2)}`,
        ],
      });
    }

    const canCompose = left.category !== right.category
      && (tagOverlap >= 0.18 || ['verification', 'migration', 'deployment', 'quality', 'security'].includes(left.category) || ['verification', 'migration', 'deployment', 'quality', 'security'].includes(right.category));

    if (canCompose) {
      relations.push({
        source_skill_id: left.skill_id,
        relation_type: 'compose_with',
        target: right.skill_id,
        weight: Number((0.45 + (tagOverlap * 0.4)).toFixed(4)),
        evidence: [
          `category_pair=${left.category}+${right.category}`,
          `tag_overlap=${tagOverlap.toFixed(2)}`,
        ],
      });
    }
  }
}

const finalRelations = dedupeRelations([...preservedRelations, ...relations]);
writeSkillIndex();
writeRelationsJson(finalRelations);

console.log('nve-skill-index complete');
console.log(`Skills indexed: ${skills.length}`);
console.log(`Relations written: ${finalRelations.length}`);
console.log(`Status counts: ${JSON.stringify(statusCounts)}`);
