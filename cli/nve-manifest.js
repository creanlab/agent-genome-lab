#!/usr/bin/env node
/**
 * nve-manifest.js — Generate repo manifest
 * Creates a snapshot of repo identity, structure health, and stack tags.
 * Output: .evolution/manifests/MANIFEST-YYYYMMDD.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function countFiles(dir) {
  try {
    return fs.readdirSync(path.join(ROOT, dir))
      .filter(f => f !== '.gitkeep' && !f.startsWith('.')).length;
  } catch { return 0; }
}

function getGitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch { return 'unknown'; }
}

const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

const manifest = {
  manifest_id: `MANIFEST-${dateStr}`,
  created_at: now.toISOString(),
  repo_name: 'evolution-tamagotchi',
  repo_version: 'v4',
  stack_tags: ['node', 'express', 'supabase', 'cloud-run', 'gemini'],
  environment_tags: ['windows-powershell', 'gcp'],
  repo_maturity: 'hybrid',
  structure_health: {
    rules_count: countFiles('.agents/rules'),
    workflows_count: countFiles('.agents/workflows'),
    skills_count: countFiles('.agents/skills'),
    incidents_count: countFiles('.evolution/incidents'),
    experience_units_count: countFiles('.evolution/experience_units'),
    failure_genomes_count: countFiles('.evolution/failure_genomes')
  },
  git_commit_hash: getGitHash()
};

const outDir = path.join(ROOT, '.evolution', 'manifests');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `MANIFEST-${dateStr}.json`);
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`✅ Manifest written: ${outPath}`);
