#!/usr/bin/env node
/**
 * nve-contract.js — Generate CONTRACT.md with auto-injected Known Risks
 *
 * Usage:
 *   node cli/nve-contract.js --task "Add Stripe payment integration"
 *   node cli/nve-contract.js --task "Deploy to Cloud Run" --criteria "API returns 200,Frontend loads"
 *   node cli/nve-contract.js --verify                     # check contract completion
 *
 * Produces .evolution/CONTRACT.md with:
 *   - Goal and acceptance criteria
 *   - ⚡ Known Risks auto-detected from failure genomes matching the task
 *   - Test protocol
 *   - Hard fail thresholds (from genome invariants)
 *
 * This is the key USP vs Anthropic: their contracts are manual.
 * Ours auto-inject proven failure patterns as Known Risks.
 *
 * Inspired by: Anthropic Harness Design (Mar 2026) — "Before each sprint,
 * the generator and evaluator negotiated a sprint contract: agreeing on
 * what 'done' looked like for that chunk of work before any code was written."
 */

const fs = require('fs');
const path = require('path');

const ROOT = findProjectRoot(process.cwd());
const EVO = path.join(ROOT, '.evolution');
const CONTRACT_PATH = path.join(EVO, 'CONTRACT.md');
const GENOMES_DIR = path.join(EVO, 'failure_genomes');
const MEMORY_PATH = path.join(EVO, 'MEMORY.md');
const SKILLS_DIR = path.join(ROOT, '.agents', 'skills');

function findProjectRoot(dir) {
  let d = dir;
  while (d !== path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.evolution'))) return d;
    d = path.dirname(d);
  }
  return dir;
}

// Parse CLI args
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    const val = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[i + 1] : true;
    flags[key] = val;
    if (val !== true) i++;
  }
}

if (!fs.existsSync(EVO)) {
  console.error('❌ No .evolution/ directory found. Run nve-init first.');
  process.exit(1);
}

// Handle --verify flag
if (flags.verify) {
  if (!fs.existsSync(CONTRACT_PATH)) {
    console.log('❌ No CONTRACT.md found. Create one first with --task');
    process.exit(1);
  }
  verifyContract();
  process.exit(0);
}

// Require --task for creation
if (!flags.task) {
  if (fs.existsSync(CONTRACT_PATH)) {
    console.log('\n📜 Current CONTRACT.md:');
    console.log('━'.repeat(50));
    console.log(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  } else {
    console.log('\nUsage: node cli/nve-contract.js --task "your task description"');
    console.log('       node cli/nve-contract.js --verify');
  }
  process.exit(0);
}

const task = flags.task;
const criteria = flags.criteria ? flags.criteria.split(',').map(c => c.trim()) : [];
const files = flags.files ? flags.files.split(',').map(f => f.trim()) : [];

// Auto-detect known risks from genomes
const knownRisks = findKnownRisks(task);

// Auto-detect relevant skills
const relevantSkills = findRelevantSkills(task);

// Generate hard fail thresholds from genome invariants
const hardFails = knownRisks.map(r => ({
  invariant: r.invariant,
  family: r.family,
  check: r.repair || 'manual verification'
}));

// Write CONTRACT.md
writeContract({
  task,
  criteria,
  files,
  knownRisks,
  relevantSkills,
  hardFails
});

console.log('\n📜 CONTRACT.md generated');
console.log(`   Path:         ${CONTRACT_PATH}`);
console.log(`   Task:         ${task}`);
console.log(`   Criteria:     ${criteria.length || '(auto-generated)'}`);
console.log(`   ⚡ Known Risks: ${knownRisks.length} genome(s) matched`);
if (knownRisks.length > 0) {
  for (const r of knownRisks) {
    console.log(`     - ${r.family} (utility: ${r.utility})`);
  }
}
console.log(`   🧩 Skills:     ${relevantSkills.length} skill(s) available`);
console.log(`   🚫 Hard Fails: ${hardFails.length} invariant(s)`);
console.log(`\n   Run --verify after implementation to check contract completion.`);

// --- Functions ---

function findKnownRisks(taskDesc) {
  if (!fs.existsSync(GENOMES_DIR)) return [];
  
  const taskLower = taskDesc.toLowerCase();
  const taskWords = new Set(taskLower.split(/[\s,.\-_:;/\\]+/).filter(w => w.length > 3));
  
  // Keywords that map to common failure categories
  const categoryMap = {
    deploy: ['deploy', 'cloud', 'docker', 'build', 'production', 'cloudrun', 'vercel'],
    frontend: ['frontend', 'react', 'vite', 'css', 'ui', 'component', 'html', 'design'],
    security: ['auth', 'key', 'secret', 'credential', 'token', 'password', 'api-key'],
    data: ['database', 'supabase', 'postgres', 'migration', 'schema', 'query'],
    integration: ['api', 'endpoint', 'webhook', 'integration', 'fetch', 'proxy'],
    testing: ['test', 'verify', 'check', 'validation', 'assertion']
  };
  
  const genomes = [];
  for (const file of fs.readdirSync(GENOMES_DIR)) {
    if (!file.startsWith('FG-') || !file.endsWith('.json')) continue;
    try {
      const g = JSON.parse(fs.readFileSync(path.join(GENOMES_DIR, file), 'utf8'));
      const gText = `${g.family || ''} ${g.violated_invariant || ''} ${g.surface || ''} ${g.anti_pattern || ''} ${(g.tags || []).join(' ')}`.toLowerCase();
      
      // Score relevance
      let score = 0;
      const gWords = new Set(gText.split(/[\s,.\-_:;/\\]+/).filter(w => w.length > 3));
      
      // Direct word overlap
      for (const w of taskWords) {
        if (gWords.has(w)) score += 2;
        if (gText.includes(w)) score += 1;
      }
      
      // Category matching
      for (const [cat, keywords] of Object.entries(categoryMap)) {
        const taskInCat = keywords.some(k => taskLower.includes(k));
        const genomeInCat = keywords.some(k => gText.includes(k));
        if (taskInCat && genomeInCat) score += 3;
      }
      
      // Tag matching
      for (const tag of (g.tags || [])) {
        if (taskWords.has(tag.toLowerCase())) score += 4;
      }
      
      if (score >= 3) {
        genomes.push({
          id: g.genome_id,
          family: g.family,
          invariant: g.violated_invariant,
          repair: g.repair_operator,
          utility: g.utility?.score || g.utility || 0,
          score,
          tags: g.tags || []
        });
      }
    } catch (e) { /* skip */ }
  }
  
  // Sort by relevance, take top 5
  return genomes.sort((a, b) => b.score - a.score).slice(0, 5);
}

function findRelevantSkills(taskDesc) {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const taskLower = taskDesc.toLowerCase();
  
  const skills = [];
  try {
    for (const dir of fs.readdirSync(SKILLS_DIR)) {
      const skillPath = path.join(SKILLS_DIR, dir, 'SKILL.md');
      if (!fs.existsSync(skillPath)) continue;
      
      const skillName = dir.toLowerCase();
      const nameWords = skillName.split('-');
      const matches = nameWords.filter(w => taskLower.includes(w) && w.length > 3);
      
      if (matches.length > 0) {
        skills.push({ name: dir, matches });
      }
    }
  } catch (e) { /* skip */ }
  
  return skills;
}

function writeContract(c) {
  const lines = [];
  lines.push('# CONTRACT.md — Definition of Done');
  lines.push(`<!-- Generated by nve-contract.js on ${new Date().toISOString().slice(0, 10)} -->`);
  lines.push(`<!-- Verify completion with: node cli/nve-contract.js --verify -->`);
  lines.push('');
  
  lines.push('## 🎯 Goal');
  lines.push(c.task);
  lines.push('');
  
  lines.push('## ✅ Acceptance Criteria');
  if (c.criteria.length > 0) {
    for (const criterion of c.criteria) {
      lines.push(`- [ ] ${criterion}`);
    }
  } else {
    lines.push('- [ ] Feature works as described in Goal');
    lines.push('- [ ] No regressions in existing functionality');
    lines.push('- [ ] Code builds without errors');
    lines.push('- [ ] Manual smoke test passes');
  }
  lines.push('');
  
  if (c.files.length > 0) {
    lines.push('## 📁 Files in Scope');
    for (const f of c.files) lines.push(`- \`${f}\``);
    lines.push('');
  }
  
  if (c.knownRisks.length > 0) {
    lines.push('## ⚡ Known Risks (auto-detected from genomes)');
    lines.push('> These failure patterns have occurred before and are relevant to this task.');
    lines.push('> The agent MUST check each one before marking the task as done.');
    lines.push('');
    for (const r of c.knownRisks) {
      lines.push(`### ${r.id}: ${r.family}`);
      lines.push(`- **Invariant**: ${r.invariant}`);
      lines.push(`- **Repair**: ${r.repair}`);
      lines.push(`- **Utility**: ${r.utility}`);
      lines.push(`- **Tags**: ${r.tags.join(', ')}`);
      lines.push('');
    }
  }
  
  if (c.relevantSkills.length > 0) {
    lines.push('## 🧩 Available Skills');
    for (const s of c.relevantSkills) {
      lines.push(`- \`.agents/skills/${s.name}/SKILL.md\``);
    }
    lines.push('');
  }
  
  if (c.hardFails.length > 0) {
    lines.push('## 🚫 Hard Fail Thresholds');
    lines.push('> If ANY of these invariants are violated → sprint FAILS.');
    lines.push('');
    for (const hf of c.hardFails) {
      lines.push(`- **[${hf.family}]** ${hf.invariant}`);
    }
    lines.push('');
  }
  
  lines.push('## 🧪 Test Protocol');
  lines.push('1. Build completes without errors');
  lines.push('2. All acceptance criteria checked');
  lines.push('3. Known risk invariants verified');
  lines.push('4. No API keys or secrets in frontend code');
  lines.push('5. Manual smoke test or automated check');
  lines.push('');
  
  lines.push('## 📊 Status');
  lines.push(`- **Created**: ${new Date().toISOString()}`);
  lines.push('- **Verified**: ❌ Not yet');
  lines.push('');
  
  fs.writeFileSync(CONTRACT_PATH, lines.join('\n'));
}

function verifyContract() {
  const content = fs.readFileSync(CONTRACT_PATH, 'utf8');
  const totalChecks = (content.match(/- \[[ x]\]/g) || []).length;
  const doneChecks = (content.match(/- \[x\]/g) || []).length;
  const pendingChecks = totalChecks - doneChecks;
  
  console.log('\n📜 Contract Verification');
  console.log('━'.repeat(40));
  console.log(`   Total criteria: ${totalChecks}`);
  console.log(`   ✅ Done:        ${doneChecks}`);
  console.log(`   🔲 Pending:     ${pendingChecks}`);
  
  if (pendingChecks === 0 && totalChecks > 0) {
    console.log('\n   🎉 All criteria met! Contract PASSED.');
    // Update the contract file
    const updated = content.replace('**Verified**: ❌ Not yet', `**Verified**: ✅ ${new Date().toISOString()}`);
    fs.writeFileSync(CONTRACT_PATH, updated);
  } else if (pendingChecks > 0) {
    console.log(`\n   ⚠️  ${pendingChecks} criteria still pending. Contract NOT passed.`);
    
    // Show pending items
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('- [ ]')) {
        console.log(`   🔲 ${line.replace('- [ ] ', '').trim()}`);
      }
    }
  }
}
