#!/usr/bin/env node
/**
 * nve-init.js — Initialize NVE Failure Genome Pack in a project.
 *
 * Usage:
 *   npx nve-genome                   # Interactive mode
 *   npx nve-genome --yes             # Accept all defaults
 *   npx nve-genome --tier distilled  # Set default sharing tier
 *
 * Creates:
 *   .evolution/incidents/
 *   .evolution/experience_units/
 *   .evolution/failure_genomes/
 *   .evolution/failure_genomes/FAMILY_INDEX.json
 *   .evolution/audits/
 *   .evolution/manifests/
 *   .evolution/exports/
 *   .agents/rules/   (if not exists)
 *   .agents/workflows/ (if not exists)
 *   schemas/ (copies from pack)
 *   AGENTS.md (if not exists)
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = process.cwd();
const PACK_ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const autoYes = args.includes('--yes') || args.includes('-y');
const tierArg = (args.find(a => a.startsWith('--tier=')) || '').split('=')[1] || 'distilled';

async function ask(question, defaultVal) {
  if (autoYes) return defaultVal;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} [${defaultVal}]: `, answer => {
      rl.close();
      resolve(answer.trim() || defaultVal);
    });
  });
}

function ensureDir(p) {
  const full = path.join(ROOT, p);
  if (!fs.existsSync(full)) {
    fs.mkdirSync(full, { recursive: true });
    console.log(`  📁 Created ${p}/`);
  }
}

function copyIfMissing(src, dest) {
  const srcFull = path.join(PACK_ROOT, src);
  const destFull = path.join(ROOT, dest);
  if (!fs.existsSync(destFull) && fs.existsSync(srcFull)) {
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
  for (const f of fs.readdirSync(srcFull)) {
    copyIfMissing(path.join(srcDir, f), path.join(destDir, f));
  }
}

async function main() {
  console.log(`
🧬 NVE Failure Genome Pack — Initializer v2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: ${ROOT}
`);

  // Step 1: Project info
  const projectName = await ask('Project name', path.basename(ROOT));
  const defaultTier = await ask('Default sharing tier (private/manifest/distilled/research)', tierArg);

  console.log('\n📦 Creating .evolution/ memory structure...');

  // Step 2: Create directories
  const dirs = [
    '.evolution/incidents',
    '.evolution/experience_units',
    '.evolution/failure_genomes',
    '.evolution/audits',
    '.evolution/manifests',
    '.evolution/exports',
    '.agents/rules',
    '.agents/workflows',
    '.agents/skills',
  ];
  for (const d of dirs) ensureDir(d);

  // Step 3: Create FAMILY_INDEX.json
  const fiPath = path.join(ROOT, '.evolution/failure_genomes/FAMILY_INDEX.json');
  if (!fs.existsSync(fiPath)) {
    fs.writeFileSync(fiPath, JSON.stringify({
      families: {},
      updated_at: new Date().toISOString(),
      total_genomes: 0,
      total_families: 0
    }, null, 2));
    console.log('  📄 Created FAMILY_INDEX.json');
  }

  // Step 4: Create export-meta.json
  const emPath = path.join(ROOT, '.evolution/export-meta.json');
  if (!fs.existsSync(emPath)) {
    fs.writeFileSync(emPath, JSON.stringify({
      project_name: projectName,
      default_tier: defaultTier,
      created_at: new Date().toISOString(),
      redaction_rules: {
        strip_code: true,
        strip_secrets: true,
        strip_paths: true,
        strip_logs: true
      }
    }, null, 2));
    console.log('  📄 Created export-meta.json');
  }

  // Step 5: Copy schemas
  console.log('\n📋 Copying schemas...');
  copyDirIfMissing('schemas', 'schemas');

  // Step 6: Copy templates
  console.log('\n📝 Copying templates...');
  copyDirIfMissing('templates', 'templates');

  // Step 7: Copy CLI tools
  console.log('\n🔧 Copying CLI tools...');
  copyDirIfMissing('cli', 'cli');

  // Step 8: Copy AGENTS.md
  console.log('\n📜 Checking AGENTS.md...');
  copyIfMissing('AGENTS.md', 'AGENTS.md');

  // Step 9: Run initial audit
  console.log('\n🧬 Running initial audit...');
  try {
    require(path.join(ROOT, 'cli/nve-audit.js'));
  } catch (e) {
    console.log('  ⚠️ Audit skipped (run manually: node cli/nve-audit.js)');
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ NVE Failure Genome Pack installed!

  Project: ${projectName}
  Sharing tier: ${defaultTier}

  Next steps:
    1. Start coding — incidents are captured automatically
    2. Run: node cli/nve-distill.js    — auto-create genomes
    3. Run: node cli/nve-replay.js     — replay gate check
    4. Run: node cli/nve-pack.js ${defaultTier}  — export for sharing
    5. Run: node cli/nve-audit.js      — check 5-axis score

  📖 Docs: docs/UNIVERSAL_ARCHITECTURE.md
`);
}

main().catch(console.error);
