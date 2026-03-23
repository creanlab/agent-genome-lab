#!/usr/bin/env node
/**
 * nve-skill-export.js — Export admitted skills as standard SKILL.md files.
 *
 * Converts internal skill JSON → standard SKILL.md (skills.sh / skillsbd.ru compatible).
 * Generates YAML frontmatter (name, description, tags, metadata) + rich markdown body.
 *
 * Usage:
 *   node cli/nve-skill-export.js                              # export all admitted skills
 *   node cli/nve-skill-export.js --format=skillsmd             # same (default format)
 *   node cli/nve-skill-export.js --format=skillsmd --skill=SK-000001
 *   node cli/nve-skill-export.js --format=skillsmd --dest=.agents/skills
 *   node cli/nve-skill-export.js --format=skillsmd --dest=.claude/skills
 *   node cli/nve-skill-export.js --format=json                 # export as sanitised JSON
 *   node cli/nve-skill-export.js --packages                    # export packages as SKILL.md bundles
 *   node cli/nve-skill-export.js --all                         # skills + packages
 */

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  resolveRoot,
  ensureDir,
  listJsonObjects,
  readJson,
  slugify,
} = require('./nve-skill-common');

// ── Parse arguments ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (prefix) => (args.find((a) => a.startsWith(prefix)) || '').split('=')[1] || '';
const hasFlag = (flag) => args.includes(flag);

const format = getArg('--format') || 'skillsmd';
const filterSkill = getArg('--skill');
const destRel = getArg('--dest') || '.agents/skills';
const exportPackages = hasFlag('--packages') || hasFlag('--all');
const exportSkills = !hasFlag('--packages') || hasFlag('--all');

// ── Load skills ────────────────────────────────────────────────────────────────
const allSkills = listJsonObjects('.evolution/skills')
  .filter((item) => item.name !== 'INDEX.json')
  .map((item) => item.data);

const admitted = allSkills.filter((s) =>
  s.status === 'admitted' && (!filterSkill || s.skill_id === filterSkill)
);

if (admitted.length === 0 && exportSkills) {
  console.log('⚠ No admitted skills found.' + (filterSkill ? ` (filter: ${filterSkill})` : ''));
  if (!exportPackages) process.exit(0);
}

// ── SKILL.md generation ────────────────────────────────────────────────────────
function skillToSkillMd(skill) {
  const lines = [];

  // YAML frontmatter (skills.sh / skillsbd.ru compatible)
  lines.push('---');
  lines.push(`name: ${slugify(skill.title || skill.skill_id)}`);
  lines.push(`description: ${(skill.summary || skill.title || '').replace(/\n/g, ' ').slice(0, 200)}`);
  if (skill.tags && skill.tags.length > 0) {
    lines.push(`tags: [${skill.tags.join(', ')}]`);
  }
  if (skill.category) {
    lines.push(`category: ${skill.category}`);
  }
  lines.push('metadata:');
  lines.push(`  source: agent-genome-lab`);
  lines.push(`  version: 2.3.0`);
  lines.push(`  skill_id: ${skill.skill_id}`);
  lines.push(`  status: ${skill.status || 'admitted'}`);
  if (skill.evaluation && skill.evaluation.overall) {
    lines.push(`  quality_score: ${skill.evaluation.overall}`);
  }
  if (skill.source_type) {
    lines.push(`  source_type: ${skill.source_type}`);
  }
  lines.push(`  exported_at: ${new Date().toISOString()}`);
  lines.push('---');
  lines.push('');

  // Title
  lines.push(`# ${skill.title || skill.skill_id}`);
  lines.push('');

  // Summary
  if (skill.summary) {
    lines.push(skill.summary);
    lines.push('');
  }

  // Verification badge
  if (skill.evaluation) {
    const e = skill.evaluation;
    lines.push(`> ✅ **Verified by Agent Genome Lab** — Overall: ${e.overall} | Safety: ${e.safety} | Completeness: ${e.completeness} | Executability: ${e.executability}`);
    lines.push('');
  }

  // When to Use
  if (skill.when_to_use && skill.when_to_use.length > 0) {
    lines.push('## When to Use');
    for (const item of skill.when_to_use) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // When NOT to Use
  if (skill.when_not_to_use && skill.when_not_to_use.length > 0) {
    lines.push('## When NOT to Use');
    for (const item of skill.when_not_to_use) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Triggers
  if (skill.triggers && skill.triggers.length > 0) {
    lines.push('## Triggers');
    for (const trigger of skill.triggers) {
      lines.push(`- ${trigger}`);
    }
    lines.push('');
  }

  // Inputs
  if (skill.inputs && skill.inputs.length > 0) {
    lines.push('## Inputs');
    for (const input of skill.inputs) {
      lines.push(`- ${input}`);
    }
    lines.push('');
  }

  // Steps
  if (skill.steps && skill.steps.length > 0) {
    lines.push('## Steps');
    for (let i = 0; i < skill.steps.length; i++) {
      const step = skill.steps[i];
      lines.push(`### ${i + 1}. ${step.title || `Step ${i + 1}`}`);
      if (step.instruction) {
        lines.push(step.instruction);
      }
      if (step.expected_output) {
        lines.push(`**Expected output:** ${step.expected_output}`);
      }
      if (step.risk) {
        lines.push(`**Risk:** ${step.risk}`);
      }
      lines.push('');
    }
  }

  // Success Signals
  if (skill.success_signals && skill.success_signals.length > 0) {
    lines.push('## Success Signals');
    for (const signal of skill.success_signals) {
      lines.push(`- ${signal}`);
    }
    lines.push('');
  }

  // Failure Modes
  if (skill.failure_modes && skill.failure_modes.length > 0) {
    lines.push('## Failure Modes');
    for (const mode of skill.failure_modes) {
      lines.push(`- ${mode}`);
    }
    lines.push('');
  }

  // Safety Notes
  if (skill.safety_notes && skill.safety_notes.length > 0) {
    lines.push('## Safety Notes');
    for (const note of skill.safety_notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  // Cost Notes
  if (skill.cost_notes && skill.cost_notes.length > 0) {
    lines.push('## Cost Notes');
    for (const note of skill.cost_notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  // Maintainability Notes
  if (skill.maintainability_notes && skill.maintainability_notes.length > 0) {
    lines.push('## Maintainability Notes');
    for (const note of skill.maintainability_notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  // Provenance
  lines.push('## Source');
  lines.push(`- **Source type**: ${skill.source_type || 'unknown'}`);
  if (skill.source_ids) {
    const ids = typeof skill.source_ids === 'object' ? Object.entries(skill.source_ids) : [];
    for (const [key, value] of ids) {
      const list = Array.isArray(value) ? value.join(', ') : value;
      lines.push(`- **${key}**: ${list}`);
    }
  }
  lines.push(`- **Extracted by**: Agent Genome Lab v2.3.0`);
  lines.push(`- **Verification**: Replay-gated admission, 5-axis evaluation`);
  lines.push('');

  return lines.join('\n');
}

// ── Package → SKILL.md bundle ──────────────────────────────────────────────────
function packageToSkillMd(pkg, skills) {
  const lines = [];

  lines.push('---');
  lines.push(`name: ${slugify(pkg.title || pkg.package_id)}`);
  lines.push(`description: ${(pkg.summary || pkg.title || '').replace(/\n/g, ' ').slice(0, 200)}`);
  if (pkg.tags && pkg.tags.length > 0) {
    lines.push(`tags: [${pkg.tags.join(', ')}]`);
  }
  if (pkg.category) {
    lines.push(`category: ${pkg.category}`);
  }
  lines.push('metadata:');
  lines.push(`  source: agent-genome-lab`);
  lines.push(`  version: 2.3.0`);
  lines.push(`  package_id: ${pkg.package_id}`);
  lines.push(`  skill_count: ${skills.length}`);
  lines.push(`  exported_at: ${new Date().toISOString()}`);
  lines.push('---');
  lines.push('');

  lines.push(`# ${pkg.title || pkg.package_id}`);
  lines.push('');
  lines.push(pkg.summary || '');
  lines.push('');

  lines.push('## Purpose');
  lines.push('This package bundles verified skills extracted from real operational experience.');
  lines.push('Each skill has passed replay-gate verification and 5-axis evaluation.');
  lines.push('');

  lines.push('## Activation');
  lines.push('- Load metadata first; open full skill instructions only on match.');
  lines.push('- Prefer admitted skills from this package before ad-hoc approaches.');
  lines.push('- Keep the Failure Genome layer as the canonical root-cause memory.');
  lines.push('');

  lines.push(`## Included Skills (${skills.length})`);
  for (const skill of skills) {
    const score = skill.evaluation ? ` [score: ${skill.evaluation.overall}]` : '';
    lines.push(`### ${skill.skill_id}: ${skill.title}${score}`);
    if (skill.summary) lines.push(skill.summary);
    if (skill.when_to_use && skill.when_to_use.length > 0) {
      lines.push('**When to use:** ' + skill.when_to_use.join('; '));
    }
    lines.push('');
  }

  lines.push('## Guardrails');
  lines.push('- Do not auto-apply destructive changes without explicit approval.');
  lines.push('- Do not replace replay-gated genomes with looser skill text.');
  lines.push('- Verify on the real surface before calling the task done.');
  lines.push('');

  return lines.join('\n');
}

// ── JSON sanitised export ──────────────────────────────────────────────────────
function skillToSanitisedJson(skill) {
  return {
    skill_id: skill.skill_id,
    title: skill.title,
    summary: skill.summary,
    category: skill.category,
    tags: skill.tags || [],
    status: skill.status,
    when_to_use: skill.when_to_use || [],
    when_not_to_use: skill.when_not_to_use || [],
    triggers: skill.triggers || [],
    inputs: skill.inputs || [],
    steps: (skill.steps || []).map((s) => ({
      title: s.title,
      instruction: s.instruction,
      expected_output: s.expected_output,
    })),
    success_signals: skill.success_signals || [],
    failure_modes: skill.failure_modes || [],
    evaluation: skill.evaluation || {},
    source_type: skill.source_type,
    exported_at: new Date().toISOString(),
    exported_by: 'agent-genome-lab@2.3.0',
  };
}

// ── Write output ───────────────────────────────────────────────────────────────
let exportedSkills = 0;
let exportedPackages = 0;

if (exportSkills && admitted.length > 0) {
  for (const skill of admitted) {
    const dirName = slugify(skill.title || skill.skill_id);
    const outDir = path.join(ROOT, destRel, dirName);
    fs.mkdirSync(outDir, { recursive: true });

    if (format === 'json') {
      const outPath = path.join(outDir, 'skill.json');
      fs.writeFileSync(outPath, JSON.stringify(skillToSanitisedJson(skill), null, 2) + '\n');
      console.log(`  ✅ ${skill.skill_id} → ${path.relative(ROOT, outPath)}`);
    } else {
      const outPath = path.join(outDir, 'SKILL.md');
      fs.writeFileSync(outPath, skillToSkillMd(skill));
      console.log(`  ✅ ${skill.skill_id} → ${path.relative(ROOT, outPath)}`);
    }
    exportedSkills++;
  }
}

if (exportPackages) {
  const packages = listJsonObjects('.evolution/skill_packages')
    .filter((item) => item.name !== 'INDEX.json')
    .map((item) => item.data)
    .filter((pkg) => pkg.status === 'admitted');

  for (const pkg of packages) {
    const skillList = allSkills.filter((s) => (pkg.skill_ids || []).includes(s.skill_id));
    const dirName = slugify(pkg.title || pkg.package_id);
    const outDir = path.join(ROOT, destRel, dirName);
    fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, 'SKILL.md');
    fs.writeFileSync(outPath, packageToSkillMd(pkg, skillList));
    console.log(`  📦 ${pkg.package_id} → ${path.relative(ROOT, outPath)}`);
    exportedPackages++;
  }
}

console.log(`\nnve-skill-export complete — format=${format}, skills=${exportedSkills}, packages=${exportedPackages}, dest=${destRel}`);
