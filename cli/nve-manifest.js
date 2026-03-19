#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const ignoreDirs = new Set([
  '.git','node_modules','dist','build','.next','.nuxt','.venv','venv',
  '__pycache__','.pytest_cache','.idea','.vscode','coverage','.turbo'
]);

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function readJsonIfExists(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function hasDir(relPath) {
  const full = path.join(root, relPath);
  return fs.existsSync(full) && fs.statSync(full).isDirectory();
}

function countUnder(prefix, predicate) {
  const dir = path.join(root, prefix);
  if (!fs.existsSync(dir)) return 0;
  return walk(dir).filter(predicate).length;
}

const files = walk(root);
const extLangMap = {
  '.js':'javascript','.mjs':'javascript','.cjs':'javascript','.ts':'typescript','.tsx':'typescript',
  '.py':'python','.go':'go','.rs':'rust','.java':'java','.rb':'ruby','.php':'php',
  '.md':'markdown','.sql':'sql','.html':'html','.css':'css','.json':'json','.yaml':'yaml','.yml':'yaml'
};
const languages = new Set();
for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  if (extLangMap[ext]) languages.add(extLangMap[ext]);
}

const frameworks = new Set();
const stackTags = new Set();
const pkg = readJsonIfExists(path.join(root, 'package.json'));
if (pkg) {
  stackTags.add('node');
  const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
  const depNames = Object.keys(deps);
  if (depNames.includes('react')) { frameworks.add('react'); stackTags.add('react'); }
  if (depNames.includes('next')) { frameworks.add('next'); stackTags.add('next'); }
  if (depNames.includes('express')) { frameworks.add('express'); stackTags.add('express'); }
  if (depNames.includes('@supabase/supabase-js')) { frameworks.add('supabase'); stackTags.add('supabase'); }
}
if (fs.existsSync(path.join(root, 'cloudbuild.yaml')) || fs.existsSync(path.join(root, 'Dockerfile'))) stackTags.add('deploy');
if (fs.existsSync(path.join(root, 'cloudbuild.yaml'))) { stackTags.add('cloud-build'); stackTags.add('cloud-run'); }
if (fs.existsSync(path.join(root, 'supabase'))) stackTags.add('supabase');
if (files.some(f => f.endsWith('.py'))) stackTags.add('python');
if (files.some(f => f.endsWith('.md'))) stackTags.add('docs');

const counts = {
  rules: countUnder('.agents/rules', f => f.endsWith('.md')),
  workflows: countUnder('.agents/workflows', f => f.endsWith('.md')),
  skills: countUnder('.agents/skills', f => path.basename(f) === 'SKILL.md'),
  docs: files.filter(f => f.endsWith('.md') || f.endsWith('.txt')).length,
  incident_files: countUnder('.evolution/incidents', f => f.endsWith('.json')),
  experience_unit_files: countUnder('.evolution/experience_units', f => f.endsWith('.json')),
  failure_genome_files: countUnder('.evolution/failure_genomes', f => f.endsWith('.json'))
};

const hasTests = files.some(f =>
  /(^|\/)(tests?|__tests__)(\/|$)/.test(f) ||
  /\.test\.(js|ts|py)$/.test(f) ||
  /\.spec\.(js|ts)$/.test(f)
);

const manifest = {
  schema_version: '1.0',
  project_name: path.basename(root),
  generated_at: new Date().toISOString(),
  root_path: root,
  runtime: process.env.NVE_RUNTIME || 'unknown',
  model: process.env.NVE_MODEL || 'unknown',
  stack_tags: Array.from(stackTags).sort(),
  languages: Array.from(languages).sort(),
  frameworks: Array.from(frameworks).sort(),
  counts,
  capabilities: {
    has_ci: hasDir('.github/workflows'),
    has_tests: hasTests,
    has_canonical_memory: hasDir('.evolution/incidents') && hasDir('.evolution/experience_units'),
    has_exec_plans: hasDir('docs/exec-plans/active') || hasDir('docs/exec-plans/completed'),
    has_failure_genome_layer: hasDir('.evolution/failure_genomes')
  }
};

const outDir = path.join(root, '.evolution/manifests');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'repo-manifest.latest.json');
fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${outFile}`);
console.log(JSON.stringify(manifest, null, 2));
