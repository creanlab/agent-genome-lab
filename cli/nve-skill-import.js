#!/usr/bin/env node
/**
 * nve-skill-import.js — Import external skills from SKILL.md files.
 *
 * Reads standard SKILL.md (skills.sh / skillsbd.ru format) from:
 *   - Local directory path
 *   - GitHub repo (raw content)
 *
 * Parses YAML frontmatter + markdown body, converts to internal skill JSON,
 * runs 5-axis evaluation, and saves as candidate skills in .evolution/skills/.
 *
 * Usage:
 *   node cli/nve-skill-import.js --path=./external-skills
 *   node cli/nve-skill-import.js --path=.agents/skills
 *   node cli/nve-skill-import.js --github=vercel-labs/skills
 *   node cli/nve-skill-import.js --github=user/repo --subdir=.agents/skills
 *   node cli/nve-skill-import.js --path=./some-dir --dry-run
 *   node cli/nve-skill-import.js --path=./some-dir --status=quarantined
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const {
  ROOT,
  ensureDir,
  listJsonObjects,
  inferCategory,
  inferTags,
  slugify,
  evaluateSkill,
  buildCanonicalHash,
  buildSemanticFingerprint,
  writeJsonRel,
  writeSkillIndex,
} = require('./nve-skill-common');

// ── Parse arguments ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (prefix) => (args.find((a) => a.startsWith(prefix)) || '').split('=')[1] || '';
const hasFlag = (flag) => args.includes(flag);

const localPath = getArg('--path');
const githubRepo = getArg('--github');
const subdir = getArg('--subdir') || '.agents/skills';
const dryRun = hasFlag('--dry-run');
const defaultStatus = getArg('--status') || 'candidate';

if (!localPath && !githubRepo) {
  console.log(`
nve-skill-import — Import skills from SKILL.md files (v2.3.0)

Usage:
  node cli/nve-skill-import.js --path=./external-skills     Import from local directory
  node cli/nve-skill-import.js --github=user/repo            Import from GitHub repo
  node cli/nve-skill-import.js --github=user/repo --subdir=.agents/skills

Options:
  --path=DIR       Local directory containing SKILL.md files (recursive)
  --github=REPO    GitHub repo (owner/name) to fetch from
  --subdir=DIR     Subdirectory in GitHub repo (default: .agents/skills)
  --status=STATUS  Initial status for imported skills (default: candidate)
  --dry-run        Preview without writing files
`);
  process.exit(1);
}

ensureDir('.evolution/skills');

// ── Existing skills (for dedup) ────────────────────────────────────────────────
const existingSkills = listJsonObjects('.evolution/skills')
  .filter((item) => item.name !== 'INDEX.json')
  .map((item) => item.data);
const existingHashes = new Set(existingSkills.map((s) => s.canonical_hash).filter(Boolean));
let nextSkillNumber = existingSkills.reduce((max, skill) => {
  const match = String(skill.skill_id || '').match(/^SK-(\d{6})$/);
  return match ? Math.max(max, Number(match[1])) : max;
}, 0);

function nextSkillId() {
  nextSkillNumber += 1;
  return `SK-${String(nextSkillNumber).padStart(6, '0')}`;
}

// ── Parse YAML frontmatter ─────────────────────────────────────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const yamlStr = match[1];
  const body = match[2];
  const meta = {};

  for (const line of yamlStr.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // Handle nested (metadata:) — flatten
    if (trimmed.endsWith(':') && !trimmed.includes(': ')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    // Parse arrays: [tag1, tag2]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((v) => v.trim()).filter(Boolean);
    }
    meta[key] = value;
  }
  return { meta, body };
}

// ── Parse markdown body into skill fields ──────────────────────────────────────
function parseSkillBody(body) {
  const sections = {};
  let currentSection = '_intro';
  sections[currentSection] = [];

  for (const line of body.split('\n')) {
    const headingMatch = line.match(/^##\s+(.+)/);
    if (headingMatch) {
      currentSection = slugify(headingMatch[1]);
      sections[currentSection] = [];
    } else {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(line);
    }
  }

  // Extract list items from a section
  const listItems = (key) => {
    const lines = sections[key] || [];
    return lines
      .filter((l) => l.match(/^\s*[-*]\s+/))
      .map((l) => l.replace(/^\s*[-*]\s+/, '').trim())
      .filter(Boolean);
  };

  // Extract steps (### subsections)
  const steps = [];
  const stepPattern = /^###\s+(?:\d+\.\s*)?(.+)/;
  let currentStep = null;
  for (const line of (sections['steps'] || [])) {
    const sm = line.match(stepPattern);
    if (sm) {
      if (currentStep) steps.push(currentStep);
      currentStep = { title: sm[1].trim(), instruction: '', expected_output: '', risk: '' };
    } else if (currentStep) {
      const eoMatch = line.match(/^\*\*Expected\s*output:\*\*\s*(.*)/i);
      const riskMatch = line.match(/^\*\*Risk:\*\*\s*(.*)/i);
      if (eoMatch) currentStep.expected_output = eoMatch[1].trim();
      else if (riskMatch) currentStep.risk = riskMatch[1].trim();
      else if (line.trim()) currentStep.instruction += (currentStep.instruction ? ' ' : '') + line.trim();
    }
  }
  if (currentStep) steps.push(currentStep);

  // Summary from intro (first non-empty, non-heading line)
  const introLines = (sections['_intro'] || []).filter((l) => l.trim() && !l.startsWith('#') && !l.startsWith('>'));
  const summary = introLines.join(' ').trim().slice(0, 300);

  return {
    summary,
    when_to_use: listItems('when-to-use'),
    when_not_to_use: listItems('when-not-to-use'),
    triggers: listItems('triggers'),
    inputs: listItems('inputs'),
    steps,
    success_signals: listItems('success-signals'),
    failure_modes: listItems('failure-modes'),
    safety_notes: listItems('safety-notes'),
    cost_notes: listItems('cost-notes'),
    maintainability_notes: listItems('maintainability-notes'),
  };
}

// ── Convert SKILL.md content to internal JSON ──────────────────────────────────
function skillMdToJson(content, sourcePath) {
  const { meta, body } = parseFrontmatter(content);
  const parsed = parseSkillBody(body);
  const title = body.match(/^#\s+(.+)/m)?.[1] || meta.name || path.basename(sourcePath, '.md');
  const tags = Array.isArray(meta.tags)
    ? meta.tags
    : inferTags(`${title} ${parsed.summary} ${(meta.category || '')}`, []);
  const category = meta.category || inferCategory(`${title} ${parsed.summary}`);
  const skillId = nextSkillId();

  const skill = {
    schema_version: '1.0',
    skill_id: skillId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: defaultStatus,
    title,
    summary: parsed.summary || meta.description || '',
    category,
    tags,
    triggers: parsed.triggers,
    when_to_use: parsed.when_to_use,
    when_not_to_use: parsed.when_not_to_use,
    inputs: parsed.inputs,
    steps: parsed.steps,
    success_signals: parsed.success_signals,
    failure_modes: parsed.failure_modes,
    safety_notes: parsed.safety_notes,
    cost_notes: parsed.cost_notes,
    maintainability_notes: parsed.maintainability_notes,
    source_type: 'imported',
    source_ids: {
      imported_from: sourcePath,
      original_name: meta.name || null,
      original_version: meta.version || (meta.metadata && meta.metadata.version) || null,
    },
    imported_at: new Date().toISOString(),
  };

  // Evaluate
  skill.evaluation = evaluateSkill(skill);
  skill.canonical_hash = buildCanonicalHash(skill);
  skill.semantic_fingerprint = buildSemanticFingerprint(skill);

  // Apply evaluation recommendation if stronger than default
  if (skill.evaluation.recommendation === 'admit' && defaultStatus === 'candidate') {
    skill.status = 'admitted';
  } else if (skill.evaluation.recommendation === 'reject') {
    skill.status = 'rejected';
  }

  return skill;
}

// ── Scan local directory for SKILL.md ──────────────────────────────────────────
function findSkillFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(fullPath));
    } else if (entry.name.toUpperCase() === 'SKILL.MD') {
      results.push(fullPath);
    }
  }
  return results;
}

// ── Fetch from GitHub ──────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'agent-genome-lab/2.3.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
  });
}

async function fetchGitHubTree(repo, subPath) {
  const apiUrl = `https://api.github.com/repos/${repo}/git/trees/main?recursive=1`;
  console.log(`  📡 Fetching tree from github.com/${repo}...`);
  const treeJson = await httpsGet(apiUrl);
  const tree = JSON.parse(treeJson);
  if (!tree.tree) throw new Error('Could not read repo tree. Check the repo name and permissions.');

  const skillPaths = tree.tree
    .filter((f) => f.type === 'blob' && f.path.toLowerCase().endsWith('skill.md'))
    .filter((f) => !subPath || f.path.startsWith(subPath))
    .map((f) => f.path);

  console.log(`  📂 Found ${skillPaths.length} SKILL.md file(s) in ${subPath || '/'}`);

  const skills = [];
  for (const sp of skillPaths) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${sp}`;
      const content = await httpsGet(rawUrl);
      skills.push({ path: `github:${repo}/${sp}`, content });
    } catch (err) {
      console.log(`  ⚠ Failed to fetch ${sp}: ${err.message}`);
    }
  }
  return skills;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  let skillFiles = [];

  if (localPath) {
    const resolvedPath = path.isAbsolute(localPath) ? localPath : path.join(ROOT, localPath);
    console.log(`\n📂 Scanning: ${resolvedPath}`);
    const files = findSkillFiles(resolvedPath);
    console.log(`  Found ${files.length} SKILL.md file(s)\n`);
    skillFiles = files.map((f) => ({
      path: path.relative(ROOT, f),
      content: fs.readFileSync(f, 'utf8'),
    }));
  }

  if (githubRepo) {
    console.log(`\n🌐 Importing from github.com/${githubRepo}`);
    const ghFiles = await fetchGitHubTree(githubRepo, subdir);
    skillFiles.push(...ghFiles);
  }

  if (skillFiles.length === 0) {
    console.log('⚠ No SKILL.md files found.');
    process.exit(0);
  }

  let imported = 0;
  let skipped = 0;

  for (const { path: sourcePath, content } of skillFiles) {
    try {
      const skill = skillMdToJson(content, sourcePath);

      // Dedup check
      if (existingHashes.has(skill.canonical_hash)) {
        console.log(`  ⏭ SKIP (duplicate hash): ${sourcePath}`);
        skipped++;
        continue;
      }

      if (dryRun) {
        const e = skill.evaluation;
        console.log(`  🔍 [DRY] ${skill.skill_id}: "${skill.title}" → ${skill.status} (overall=${e.overall}, safety=${e.safety})`);
      } else {
        writeJsonRel(`.evolution/skills/${skill.skill_id}.json`, skill);
        existingHashes.add(skill.canonical_hash);
        console.log(`  ✅ ${skill.skill_id}: "${skill.title}" → ${skill.status} (score=${skill.evaluation.overall})`);
      }
      imported++;
    } catch (err) {
      console.log(`  ❌ Error processing ${sourcePath}: ${err.message}`);
    }
  }

  if (!dryRun && imported > 0) {
    writeSkillIndex();
  }

  console.log(`\nnve-skill-import complete — imported=${imported}, skipped=${skipped}, dryRun=${dryRun}, status=${defaultStatus}`);
}

main().catch((err) => {
  console.error(`❌ Import failed: ${err.message}`);
  process.exit(1);
});
