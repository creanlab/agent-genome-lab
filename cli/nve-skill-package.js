#!/usr/bin/env node
/**
 * nve-skill-package.js — Build skill packages from admitted skills and optionally publish them into .agents/skills.
 *
 * Usage:
 *   node cli/nve-skill-package.js --auto
 *   node cli/nve-skill-package.js --auto --publish
 *   node cli/nve-skill-package.js --name=verification-hardening --skills=SK-000001,SK-000004 --publish
 */

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  ensureDir,
  listJsonObjects,
  readJson,
  writeJsonRel,
  writePackageIndex,
  writeRelationsJson,
  dedupeRelations,
  slugify,
  inferTags,
  resolveRoot,
} = require('./nve-skill-common');

const args = process.argv.slice(2);
const auto = args.includes('--auto');
const publish = args.includes('--publish');
const manualName = (args.find((arg) => arg.startsWith('--name=')) || '').split('=')[1] || '';
const skillsArg = (args.find((arg) => arg.startsWith('--skills=')) || '').split('=')[1] || '';
const manualSkills = skillsArg ? skillsArg.split(',').map((s) => s.trim()).filter(Boolean) : [];

ensureDir('.evolution/skill_packages');

const skills = listJsonObjects('.evolution/skills')
  .filter((item) => item.name !== 'INDEX.json')
  .map((item) => item.data);
const admitted = skills.filter((skill) => skill.status === 'admitted');

function buildPackage(packageId, title, summary, category, skillList) {
  return {
    schema_version: '1.0',
    package_id: packageId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    title,
    summary,
    status: 'admitted',
    category,
    tags: inferTags(`${title} ${summary} ${category}`, skillList.flatMap((skill) => skill.tags || [])),
    skill_ids: skillList.map((skill) => skill.skill_id),
    activation_policy: {
      metadata_first: true,
      max_skills: Math.min(4, skillList.length),
      load_full_skill_only_on_match: true,
    },
    published_agent_skill_path: null,
  };
}

function publishPackage(pkg, skillList) {
  const dirName = slugify(pkg.package_id.replace(/^PKG-/, ''));
  const relDir = `.agents/skills/${dirName}`;
  const fullDir = path.join(ROOT, relDir);
  fs.mkdirSync(fullDir, { recursive: true });
  const lines = [];
  lines.push(`# ${pkg.title}`);
  lines.push('');
  lines.push('## Purpose');
  lines.push(pkg.summary);
  lines.push('');
  lines.push('## Activation');
  lines.push('- Load metadata first and only open the full skill instructions when the task clearly matches.');
  lines.push('- Prefer admitted skills from this package before inventing a fresh workflow.');
  lines.push('- Keep the Failure Genome layer as the canonical source of root-cause memory.');
  lines.push('');
  lines.push('## Included Skills');
  for (const skill of skillList) {
    lines.push(`- ${skill.skill_id}: ${skill.title}`);
  }
  lines.push('');
  lines.push('## Guardrails');
  lines.push('- Do not auto-apply destructive changes without explicit approval.');
  lines.push('- Do not replace replay-gated genomes with looser skill text.');
  lines.push('- Verify on the real surface before calling the task done.');
  lines.push('');
  lines.push('## Suggested Flow');
  lines.push('1. Identify which included skill best matches the current task.');
  lines.push('2. Load only the matching skill details, not the whole registry.');
  lines.push('3. Execute the skill with a concrete verification step.');
  lines.push('4. Capture new incident, experience, or genome evidence if the skill fails or evolves.');
  lines.push('');
  lines.push('## Source Skills');
  for (const skill of skillList) {
    lines.push(`- ${skill.skill_id} [${skill.category}] — ${(skill.tags || []).join(', ')}`);
  }
  lines.push('');
  fs.writeFileSync(path.join(fullDir, 'SKILL.md'), lines.join('\n') + '\n');
  return `${relDir}/SKILL.md`;
}

const packages = [];

if (auto) {
  const recipes = [
    {
      package_id: 'PKG-verification-hardening',
      title: 'Verification Hardening',
      summary: 'Bundle for done-means-verified discipline, regression checks, and contract-level proof.',
      category: 'verification',
      include: (skill) => (skill.tags || []).some((tag) => ['verification', 'quality', 'replay', 'testing'].includes(tag)),
    },
    {
      package_id: 'PKG-safe-migration',
      title: 'Safe Migration',
      summary: 'Bundle for additive migration, wrapper preservation, rollback readiness, and contract compatibility.',
      category: 'migration',
      include: (skill) => (skill.tags || []).some((tag) => ['migration', 'compatibility', 'rollback', 'docs'].includes(tag)),
    },
    {
      package_id: 'PKG-anti-fallback-and-contracts',
      title: 'Anti-Fallback and Contracts',
      summary: 'Bundle for eliminating silent fallbacks and protecting write-read, schema, and verification contracts.',
      category: 'quality',
      include: (skill) => (skill.tags || []).some((tag) => ['fallback', 'contract', 'schema', 'quality'].includes(tag)),
    },
  ];

  for (const recipe of recipes) {
    const skillList = admitted.filter(recipe.include).slice(0, 6);
    if (skillList.length === 0) continue;
    packages.push(buildPackage(recipe.package_id, recipe.title, recipe.summary, recipe.category, skillList));
  }
}

if (manualName && manualSkills.length > 0) {
  const selected = admitted.filter((skill) => manualSkills.includes(skill.skill_id));
  if (selected.length > 0) {
    packages.push(
      buildPackage(
        `PKG-${slugify(manualName)}`,
        manualName,
        `Custom package '${manualName}' generated from selected admitted skills.`,
        selected[0].category || 'quality',
        selected,
      )
    );
  }
}

for (const pkg of packages) {
  const skillList = admitted.filter((skill) => pkg.skill_ids.includes(skill.skill_id));
  if (publish) {
    pkg.published_agent_skill_path = publishPackage(pkg, skillList);
  }
  writeJsonRel(`.evolution/skill_packages/${pkg.package_id}.json`, pkg);
}

writePackageIndex();

const relationsRaw = readJson(resolveRoot('.evolution/skill_relations/RELATIONS.json'), { relations: [] });
const existingRelations = Array.isArray(relationsRaw.relations) ? relationsRaw.relations : [];
const packageRelations = [];
for (const pkg of packages) {
  for (const skillId of pkg.skill_ids || []) {
    packageRelations.push({
      source_skill_id: skillId,
      relation_type: 'belong_to_package',
      target: pkg.package_id,
      weight: 1,
      evidence: ['package_builder'],
    });
  }
}
writeRelationsJson(dedupeRelations([...existingRelations, ...packageRelations]));

console.log(`nve-skill-package complete — packages=${packages.length}, publish=${publish}`);
