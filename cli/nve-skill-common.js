#!/usr/bin/env node
/**
 * nve-skill-common.js — Shared helpers for the SkillGraph layer.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'onto', 'only', 'when', 'where', 'what', 'which',
  'your', 'their', 'them', 'then', 'than', 'have', 'has', 'had', 'use', 'used', 'using', 'should', 'would', 'could',
  'after', 'before', 'about', 'into', 'over', 'under', 'through', 'while', 'must', 'will', 'just', 'very', 'more',
  'less', 'same', 'each', 'also', 'keep', 'does', 'doing', 'done', 'make', 'made', 'some', 'such', 'task', 'current',
  'real', 'small', 'step', 'steps', 'check', 'checks', 'note', 'notes', 'path', 'paths', 'data', 'file', 'files',
  'agent', 'agents', 'skill', 'skills', 'workflow', 'workflows', 'guardrail', 'guardrails', 'layer', 'layers'
]);

function findProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, '.evolution')) || fs.existsSync(path.join(dir, 'AGENTS.md'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const ROOT = findProjectRoot();

function resolveRoot(relPath) {
  return path.join(ROOT, relPath);
}

function ensureDir(relPath) {
  fs.mkdirSync(resolveRoot(relPath), { recursive: true });
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonRel(relPath, data) {
  const full = resolveRoot(relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n');
}

function listJsonObjects(relDir) {
  const fullDir = resolveRoot(relDir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir)
    .filter((name) => name.endsWith('.json') && !name.startsWith('.'))
    .map((name) => ({
      name,
      path: path.join(fullDir, name),
      data: readJson(path.join(fullDir, name), null),
    }))
    .filter((item) => item.data);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))].sort();
}

function inferCategory(text) {
  const corpus = String(text || '').toLowerCase();
  const rules = [
    { pattern: /(auth|credential|secret|token|permission|security|scope|policy)/, category: 'security' },
    { pattern: /(verify|verification|test|replay|assert|regression|contract|schema|read.*write|write.*read)/, category: 'verification' },
    { pattern: /(migrat|compatib|deprecat|wrapper|backward|rollback|legacy)/, category: 'migration' },
    { pattern: /(deploy|docker|cloud run|build|release|infra|ops|production)/, category: 'deployment' },
    { pattern: /(docs|readme|guide|explain|document)/, category: 'docs' },
    { pattern: /(metric|observe|monitor|alert|telemetry|logging)/, category: 'observability' },
    { pattern: /(cli|tool|script|automation|generator|scaffold)/, category: 'tooling' },
    { pattern: /(fallback|quality|guardrail|invariant|repair|incident|family)/, category: 'quality' },
  ];
  const match = rules.find((rule) => rule.pattern.test(corpus));
  return match ? match.category : 'quality';
}

function inferTags(text, extra = []) {
  const corpus = String(text || '').toLowerCase();
  const tags = new Set();

  const tagRules = [
    [/(verify|verification|test|assert|proof)/, ['verification', 'testing']],
    [/(replay|holdout|regression)/, ['replay', 'regression']],
    [/(contract|schema|read.*write|write.*read|format)/, ['contract', 'schema']],
    [/(fallback|silent|default path|best effort)/, ['fallback']],
    [/(migrat|rollback|compatib|legacy|wrapper|deprecat)/, ['migration', 'compatibility', 'rollback']],
    [/(deploy|docker|cloud run|build|release|production)/, ['deployment', 'production']],
    [/(secret|token|credential|auth|permission|security)/, ['security']],
    [/(docs|guide|readme|manual|playbook)/, ['docs']],
    [/(incident|family|invariant|repair)/, ['workflow']],
    [/(cost|cheap|minimal|smallest|focused|metadata|lazy)/, ['cost', 'metadata-first']],
  ];

  for (const [pattern, generated] of tagRules) {
    if (pattern.test(corpus)) {
      for (const tag of generated) tags.add(tag);
    }
  }

  for (const value of extra) {
    const normalized = slugify(String(value).replace(/^applies-to-/, '').replace(/^applies_to=/, '').replace(/^tag:/, ''));
    if (normalized) tags.add(normalized);
  }

  return [...tags].slice(0, 12).sort();
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = stableObject(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function hashString(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function buildCanonicalHash(skill) {
  const material = {
    title: (skill.title || '').trim().toLowerCase(),
    summary: (skill.summary || '').trim().toLowerCase(),
    category: (skill.category || '').trim().toLowerCase(),
    tags: uniqueSorted(skill.tags || []).map((tag) => tag.toLowerCase()),
    triggers: skill.triggers || [],
    when_to_use: skill.when_to_use || [],
    inputs: skill.inputs || [],
    steps: (skill.steps || []).map((step) => ({
      title: (step.title || '').trim().toLowerCase(),
      instruction: (step.instruction || '').trim().toLowerCase(),
      expected_output: (step.expected_output || '').trim().toLowerCase(),
      risk: (step.risk || '').trim().toLowerCase(),
    })),
    success_signals: skill.success_signals || [],
    failure_modes: skill.failure_modes || [],
  };
  return hashString(JSON.stringify(stableObject(material)));
}

function buildSemanticFingerprint(skill) {
  const tokens = tokenize(skillText(skill));
  const freq = new Map();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 16)
    .map(([token]) => token)
    .join('|');
}

function skillText(skill) {
  return [
    skill.title,
    skill.summary,
    skill.category,
    ...(skill.tags || []),
    ...(skill.triggers || []),
    ...(skill.when_to_use || []),
    ...(skill.when_not_to_use || []),
    ...(skill.inputs || []),
    ...(skill.steps || []).flatMap((step) => [step.title, step.instruction, step.expected_output]),
    ...(skill.success_signals || []),
    ...(skill.failure_modes || []),
    ...(skill.safety_notes || []),
    ...(skill.maintainability_notes || []),
    ...(skill.cost_notes || []),
  ].filter(Boolean).join(' ');
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function hasList(value, minLen = 1) {
  return Array.isArray(value) && value.filter(Boolean).length >= minLen;
}

function containsAny(text, patterns) {
  const corpus = String(text || '').toLowerCase();
  return patterns.some((pattern) => corpus.includes(pattern));
}

function evaluateSkill(skill) {
  const text = skillText(skill);
  const rationale = [];

  const completenessChecks = [
    !!skill.title,
    !!skill.summary,
    !!skill.category,
    hasList(skill.tags, 2),
    hasList(skill.triggers, 1),
    hasList(skill.when_to_use, 1),
    hasList(skill.inputs, 1),
    hasList(skill.steps, 2),
    hasList(skill.success_signals, 1),
    hasList(skill.failure_modes, 1),
    hasList(skill.safety_notes, 1),
    !!skill.source_type && !!skill.source_ids,
  ];
  const completeness = completenessChecks.filter(Boolean).length / completenessChecks.length;
  if (completeness >= 0.85) rationale.push('structure is complete enough for reuse');
  if (completeness < 0.65) rationale.push('missing several core skill fields');

  let safety = 0.45;
  if (hasList(skill.safety_notes, 1)) safety += 0.18;
  if (hasList(skill.when_not_to_use, 1)) safety += 0.10;
  if (skill.source_type && skill.source_ids) safety += 0.05;
  if (containsAny(text, ['explicit approval', 'approval', 'destructive', 'do not auto-apply'])) safety += 0.07;
  if (containsAny(text, ['rm -rf', 'drop table', 'delete', 'overwrite', 'truncate']) && !containsAny(text, ['approval', 'explicit'])) {
    safety -= 0.25;
    rationale.push('contains destructive language without a strong approval guardrail');
  }
  safety = clamp01(safety);

  let executability = 0.10;
  const steps = skill.steps || [];
  if (steps.length >= 2) executability += 0.35;
  const stepCompleteness = steps.length > 0
    ? steps.filter((step) => step.instruction && step.expected_output).length / steps.length
    : 0;
  executability += stepCompleteness * 0.25;
  if (hasList(skill.inputs, 1)) executability += 0.15;
  if (hasList(skill.success_signals, 1)) executability += 0.15;
  if (containsAny(text, ['verify', 'verification', 'test', 'replay', 'check'])) executability += 0.10;
  executability = clamp01(executability);
  if (executability < 0.60) rationale.push('execution path is too vague or under-specified');

  let maintainability = 0.15;
  if (skill.source_type && skill.source_ids) maintainability += 0.25;
  if (hasList(skill.failure_modes, 1)) maintainability += 0.15;
  if (hasList(skill.maintainability_notes, 1)) maintainability += 0.20;
  if (skill.category && hasList(skill.tags, 2)) maintainability += 0.10;
  if (steps.length > 0 && steps.length <= 4) maintainability += 0.10;
  if (skill.created_at) maintainability += 0.05;
  maintainability = clamp01(maintainability);

  let costAwareness = 0.20;
  if (hasList(skill.cost_notes, 1)) costAwareness += 0.35;
  if (steps.length > 0 && steps.length <= 4) costAwareness += 0.15;
  if ((skill.summary || '').length <= 260) costAwareness += 0.10;
  if (containsAny(text, ['smallest', 'small', 'minimal', 'focused', 'metadata', 'lazy', 'compact'])) costAwareness += 0.15;
  if ((skill.inputs || []).length > 0 && (skill.inputs || []).length <= 4) costAwareness += 0.10;
  costAwareness = clamp01(costAwareness);

  const overall = clamp01(
    (safety * 0.25)
    + (completeness * 0.22)
    + (executability * 0.22)
    + (maintainability * 0.16)
    + (costAwareness * 0.15)
  );

  let recommendation = 'quarantine';
  if (safety < 0.45 || completeness < 0.45 || executability < 0.40) recommendation = 'reject';
  else if (safety >= 0.80 && completeness >= 0.78 && executability >= 0.75 && overall >= 0.82) recommendation = 'admit';
  else if (safety >= 0.68 && completeness >= 0.65 && executability >= 0.60 && overall >= 0.72) recommendation = 'candidate';
  else if (overall >= 0.55 && safety >= 0.55) recommendation = 'quarantine';
  else recommendation = 'reject';

  return {
    safety: Number(safety.toFixed(4)),
    completeness: Number(completeness.toFixed(4)),
    executability: Number(executability.toFixed(4)),
    maintainability: Number(maintainability.toFixed(4)),
    cost_awareness: Number(costAwareness.toFixed(4)),
    overall: Number(overall.toFixed(4)),
    recommendation,
    rationale,
  };
}

function jaccard(left, right) {
  const leftSet = new Set(left || []);
  const rightSet = new Set(right || []);
  if (leftSet.size === 0 && rightSet.size === 0) return 1;
  const union = new Set([...leftSet, ...rightSet]);
  let intersection = 0;
  for (const item of leftSet) {
    if (rightSet.has(item)) intersection += 1;
  }
  return union.size === 0 ? 0 : intersection / union.size;
}

function dedupeRelations(relations) {
  const seen = new Set();
  const output = [];
  for (const relation of relations) {
    const key = [relation.source_skill_id, relation.relation_type, relation.target].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(relation);
  }
  return output.sort((a, b) => {
    if (a.source_skill_id !== b.source_skill_id) return a.source_skill_id.localeCompare(b.source_skill_id);
    if (a.relation_type !== b.relation_type) return a.relation_type.localeCompare(b.relation_type);
    return String(a.target).localeCompare(String(b.target));
  });
}

function writeSkillIndex() {
  const skills = listJsonObjects('.evolution/skills')
    .filter((item) => item.name !== 'INDEX.json')
    .map((item) => item.data);
  const byStatus = { candidate: 0, quarantined: 0, admitted: 0, rejected: 0 };
  for (const skill of skills) {
    const status = skill.status || 'candidate';
    if (byStatus[status] === undefined) byStatus[status] = 0;
    byStatus[status] += 1;
  }
  const summary = skills
    .sort((a, b) => {
      const left = a.evaluation?.overall || 0;
      const right = b.evaluation?.overall || 0;
      if (right !== left) return right - left;
      return String(a.skill_id || '').localeCompare(String(b.skill_id || ''));
    })
    .map((skill) => ({
      skill_id: skill.skill_id,
      title: skill.title,
      status: skill.status,
      category: skill.category,
      tags: skill.tags || [],
      overall: skill.evaluation?.overall || null,
      source_type: skill.source_type || null,
      source_ids: skill.source_ids || {},
      canonical_hash: skill.canonical_hash || null,
      semantic_fingerprint: skill.semantic_fingerprint || null,
      published_skill_path: skill.published_skill_path || null,
    }));

  writeJsonRel('.evolution/skills/INDEX.json', {
    schema_version: '1.0',
    updated_at: new Date().toISOString(),
    total_skills: skills.length,
    by_status: byStatus,
    skills: summary,
  });
}

function writePackageIndex() {
  const packages = listJsonObjects('.evolution/skill_packages')
    .filter((item) => item.name !== 'INDEX.json')
    .map((item) => item.data)
    .sort((a, b) => String(a.package_id || '').localeCompare(String(b.package_id || '')))
    .map((pkg) => ({
      package_id: pkg.package_id,
      title: pkg.title,
      status: pkg.status || 'admitted',
      category: pkg.category || 'quality',
      tags: pkg.tags || [],
      skill_count: Array.isArray(pkg.skill_ids) ? pkg.skill_ids.length : 0,
      skill_ids: pkg.skill_ids || [],
      published_agent_skill_path: pkg.published_agent_skill_path || null,
    }));

  writeJsonRel('.evolution/skill_packages/INDEX.json', {
    schema_version: '1.0',
    updated_at: new Date().toISOString(),
    total_packages: packages.length,
    packages,
  });
}

function writeRelationsJson(relations) {
  writeJsonRel('.evolution/skill_relations/RELATIONS.json', {
    schema_version: '1.0',
    updated_at: new Date().toISOString(),
    total_relations: relations.length,
    relations: dedupeRelations(relations),
  });
}

module.exports = {
  ROOT,
  resolveRoot,
  ensureDir,
  readJson,
  writeJsonRel,
  listJsonObjects,
  slugify,
  tokenize,
  inferCategory,
  inferTags,
  buildCanonicalHash,
  buildSemanticFingerprint,
  skillText,
  evaluateSkill,
  jaccard,
  dedupeRelations,
  writeSkillIndex,
  writePackageIndex,
  writeRelationsJson,
};
