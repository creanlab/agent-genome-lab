#!/usr/bin/env node
/**
 * nve-init.js — Initialize NVE Failure Genome + SkillGraph structure in a project.
 *
 * Usage:
 *   node cli/nve-init.js
 *   node cli/nve-init.js --yes
 *   node cli/nve-init.js --tier=distilled
 *
 * Creates:
 *   .evolution/incidents/
 *   .evolution/experience_units/
 *   .evolution/failure_genomes/
 *   .evolution/skills/
 *   .evolution/skill_packages/
 *   .evolution/skill_relations/
 *   .evolution/audits/
 *   .evolution/manifests/
 *   .evolution/exports/
 *   .agents/rules/
 *   .agents/workflows/
 *   .agents/skills/
 *   schemas/
 *   templates/
 *   cli/
 *   AGENTS.md (if missing)
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = process.cwd();
const PACK_ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const autoYes = args.includes('--yes') || args.includes('-y');
const tierArg = (args.find((arg) => arg.startsWith('--tier=')) || '').split('=')[1] || 'distilled';

async function ask(question, defaultVal) {
  if (autoYes) return defaultVal;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [${defaultVal}]: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

function ensureDir(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    console.log(`  📁 Created ${relPath}/`);
  }
}

function writeJsonIfMissing(relPath, data) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n');
    console.log(`  📄 Created ${relPath}`);
  }
}

function copyIfMissing(src, dest) {
  const srcFull = path.join(PACK_ROOT, src);
  const destFull = path.join(ROOT, dest);
  if (!fs.existsSync(srcFull)) return false;
  if (!fs.existsSync(destFull)) {
    fs.mkdirSync(path.dirname(destFull), { recursive: true });
    fs.copyFileSync(srcFull, destFull);
    console.log(`  📄 Copied ${dest}`);
    return true;
  }
  return false;
}

function copyDirIfMissing(srcDir, destDir) {
  const srcFull = path.join(PACK_ROOT, srcDir);
  if (!fs.existsSync(srcFull)) return;
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcFull, { withFileTypes: true })) {
    const srcRel = path.join(srcDir, entry.name);
    const destRel = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirIfMissing(srcRel, destRel);
    } else {
      copyIfMissing(srcRel, destRel);
    }
  }
}

async function main() {
  console.log('\n🧬 NVE Failure Genome + SkillGraph Pack — Initializer v2.3.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Target: ${ROOT}\n`);

  const projectName = await ask('Project name', path.basename(ROOT));
  const defaultTier = await ask('Default sharing tier (private/manifest/distilled/research)', tierArg);

  console.log('\n📦 Creating .evolution/ and .agents/ structure...');
  const dirs = [
    '.evolution/incidents',
    '.evolution/experience_units',
    '.evolution/failure_genomes',
    '.evolution/skills',
    '.evolution/skill_packages',
    '.evolution/skill_relations',
    '.evolution/audits',
    '.evolution/manifests',
    '.evolution/exports',
    '.agents/rules',
    '.agents/workflows',
    '.agents/skills',
  ];
  dirs.forEach(ensureDir);

  writeJsonIfMissing('.evolution/failure_genomes/FAMILY_INDEX.json', {
    families: {},
    updated_at: new Date().toISOString(),
    total_genomes: 0,
    total_families: 0,
  });

  writeJsonIfMissing('.evolution/skills/INDEX.json', {
    schema_version: '1.0',
    updated_at: new Date().toISOString(),
    total_skills: 0,
    by_status: { candidate: 0, quarantined: 0, admitted: 0, rejected: 0 },
    skills: [],
  });

  writeJsonIfMissing('.evolution/skill_packages/INDEX.json', {
    schema_version: '1.0',
    updated_at: new Date().toISOString(),
    total_packages: 0,
    packages: [],
  });

  writeJsonIfMissing('.evolution/skill_relations/RELATIONS.json', {
    schema_version: '1.0',
    updated_at: new Date().toISOString(),
    total_relations: 0,
    relations: [],
  });

  writeJsonIfMissing('.evolution/export-meta.json', {
    project_name: projectName,
    default_tier: defaultTier,
    created_at: new Date().toISOString(),
    redaction_rules: {
      strip_code: true,
      strip_secrets: true,
      strip_paths: true,
      strip_logs: true,
    },
  });

  console.log('\n📋 Copying schemas...');
  copyDirIfMissing('schemas', 'schemas');

  console.log('\n📝 Copying templates...');
  copyDirIfMissing('templates', 'templates');

  console.log('\n🔧 Copying CLI tools...');
  copyDirIfMissing('cli', 'cli');

  console.log('\n📚 Copying docs, prompts, and agent assets...');
  copyDirIfMissing('docs', 'docs');
  copyDirIfMissing('prompts', 'prompts');
  copyDirIfMissing('.agents', '.agents');

  console.log('\n📜 Checking AGENTS.md...');
  copyIfMissing('AGENTS.md', 'AGENTS.md');

  console.log('\n🧬 Running initial audit...');
  try {
    require(path.join(ROOT, 'cli/nve-audit.js'));
  } catch (error) {
    console.log('  ⚠️ Audit skipped (run manually: node cli/nve-audit.js)');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ NVE Failure Genome + SkillGraph Pack installed.');
  console.log(`  Project: ${projectName}`);
  console.log(`  Sharing tier: ${defaultTier}`);
  console.log('\n  Next steps:');
  console.log('    1. node cli/nve-distill.js');
  console.log('    2. node cli/nve-skill-extract.js');
  console.log('    3. node cli/nve-skill-index.js');
  console.log('    4. node cli/nve-skill-package.js --auto --publish');
  console.log('    5. node cli/nve-memory.js');
  console.log('    6. node cli/nve-audit.js');
  console.log('');
  console.log('  📖 Docs: docs/SKILLNET_UPGRADE_PLAN.md, docs/SKILLGRAPH_OPERATING_GUIDE.md\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
