#!/usr/bin/env node
/**
 * nve-plan.js — Lightweight Planner: 1-line prompt → detailed SPEC.md
 *
 * Usage:
 *   node cli/nve-plan.js "Add Stripe payments to the dashboard"
 *   node cli/nve-plan.js "Migrate auth from JWT to sessions" --model gemini-2.5-pro
 *   node cli/nve-plan.js --show                # display current SPEC.md
 *   node cli/nve-plan.js --offline "Build user settings page"   # no LLM, template only
 *
 * Produces .evolution/SPEC.md — a task specification that an agent can follow.
 *
 * If GEMINI_API_KEY is set → uses Gemini to expand the 1-liner into a detailed spec.
 * If not → generates a structured template for manual filling.
 *
 * Reads MEMORY.md and existing genomes to inject context into the prompt.
 * Not a full 3-agent harness — just: prompt → spec. Lightweight by design.
 *
 * Inspired by Anthropic Harness Design (Mar 2026):
 * "Without the planner, the generator under-scoped and produced less featureful apps."
 */

const fs = require('fs');
const path = require('path');

const ROOT = findProjectRoot(process.cwd());
const EVO = path.join(ROOT, '.evolution');
const SPEC_PATH = path.join(EVO, 'SPEC.md');
const MEMORY_PATH = path.join(EVO, 'MEMORY.md');
const GENOMES_DIR = path.join(EVO, 'failure_genomes');
const HANDOFF_PATH = path.join(EVO, 'HANDOFF.md');
const CONTRACT_PATH = path.join(EVO, 'CONTRACT.md');
const MANIFEST_PATH = path.join(EVO, 'MANIFEST.json');

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
let taskDescription = '';

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2).replace(/-/g, '_');
    const val = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[i + 1] : true;
    flags[key] = val;
    if (val !== true) i++;
  } else {
    taskDescription = args[i];
  }
}

if (!fs.existsSync(EVO)) {
  console.error('❌ No .evolution/ directory found. Run nve-init first.');
  process.exit(1);
}

// Handle --show
if (flags.show) {
  if (!fs.existsSync(SPEC_PATH)) {
    console.log('\n📜 No SPEC.md found.');
    console.log('   Create one: node cli/nve-plan.js "your task description"');
    process.exit(0);
  }
  console.log('\n📜 Current SPEC.md:');
  console.log('━'.repeat(50));
  console.log(fs.readFileSync(SPEC_PATH, 'utf8'));
  process.exit(0);
}

// Require task description
if (!taskDescription) {
  console.log('\nUsage:');
  console.log('  node cli/nve-plan.js "Add Stripe payments to dashboard"');
  console.log('  node cli/nve-plan.js "Fix login flow" --offline');
  console.log('  node cli/nve-plan.js --show');
  console.log('\nOptions:');
  console.log('  --offline    Generate template without LLM call');
  console.log('  --model      Gemini model to use (default: gemini-2.5-flash)');
  console.log('  --verbose    Show full LLM prompt and response');
  process.exit(0);
}

// Gather context
const context = gatherContext(taskDescription);

if (flags.offline) {
  // Offline mode: generate structured template
  const spec = generateOfflineSpec(taskDescription, context);
  fs.writeFileSync(SPEC_PATH, spec);
  console.log('\n📜 SPEC.md generated (offline mode — template only)');
  console.log(`   Path: ${SPEC_PATH}`);
  console.log(`   Task: ${taskDescription}`);
  console.log(`   Related genomes: ${context.relatedGenomes.length}`);
  console.log('\n   Fill in the TODO sections, then run:');
  console.log('   node cli/nve-contract.js --task "..." to create a CONTRACT');
  process.exit(0);
}

// Online mode: use Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.log('\n⚠️  GEMINI_API_KEY not set — falling back to offline mode.');
  const spec = generateOfflineSpec(taskDescription, context);
  fs.writeFileSync(SPEC_PATH, spec);
  console.log(`📜 SPEC.md generated (template). Path: ${SPEC_PATH}`);
  process.exit(0);
}

// Call Gemini API
generateWithLLM(taskDescription, context, apiKey)
  .then(spec => {
    fs.writeFileSync(SPEC_PATH, spec);
    console.log('\n📜 SPEC.md generated via Gemini');
    console.log(`   Path: ${SPEC_PATH}`);
    console.log(`   Task: ${taskDescription}`);
    console.log(`   Related genomes: ${context.relatedGenomes.length}`);
    console.log(`   Memory context: ${context.hasMemory ? 'injected' : 'none'}`);
    console.log('\n   Next steps:');
    console.log('   1. Review SPEC.md');
    console.log('   2. node cli/nve-contract.js --task "..." to lock the Definition of Done');
    console.log('   3. Implement!');
  })
  .catch(err => {
    console.error(`\n❌ LLM call failed: ${err.message}`);
    console.log('   Falling back to offline template...\n');
    const spec = generateOfflineSpec(taskDescription, context);
    fs.writeFileSync(SPEC_PATH, spec);
    console.log(`📜 SPEC.md generated (template). Path: ${SPEC_PATH}`);
  });

// --- Functions ---

function gatherContext(task) {
  const ctx = {
    hasMemory: false,
    memoryExcerpt: '',
    relatedGenomes: [],
    hasHandoff: false,
    handoffExcerpt: '',
    projectStack: [],
    genomeCount: 0
  };

  // Read MEMORY.md
  if (fs.existsSync(MEMORY_PATH)) {
    ctx.hasMemory = true;
    const mem = fs.readFileSync(MEMORY_PATH, 'utf8');
    // Take first 50 lines as excerpt
    ctx.memoryExcerpt = mem.split('\n').slice(0, 50).join('\n');
  }

  // Read HANDOFF.md if present
  if (fs.existsSync(HANDOFF_PATH)) {
    ctx.hasHandoff = true;
    ctx.handoffExcerpt = fs.readFileSync(HANDOFF_PATH, 'utf8').slice(0, 500);
  }

  // Read manifest for stack info
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      ctx.projectStack = manifest.stack_tags || manifest.stack || [];
    } catch (e) { /* skip */ }
  }

  // Find related genomes
  if (fs.existsSync(GENOMES_DIR)) {
    const taskLower = task.toLowerCase();
    const taskWords = new Set(taskLower.split(/[\s,.\-_:;/\\]+/).filter(w => w.length > 3));

    for (const file of fs.readdirSync(GENOMES_DIR)) {
      if (!file.startsWith('FG-') || !file.endsWith('.json')) continue;
      ctx.genomeCount++;
      try {
        const g = JSON.parse(fs.readFileSync(path.join(GENOMES_DIR, file), 'utf8'));
        const gText = `${g.family || ''} ${g.violated_invariant || ''} ${g.surface || ''} ${(g.tags || []).join(' ')}`.toLowerCase();
        const gWords = new Set(gText.split(/[\s,.\-_:;/\\]+/).filter(w => w.length > 3));

        let score = 0;
        for (const w of taskWords) {
          if (gWords.has(w)) score += 2;
          if (gText.includes(w)) score += 1;
        }

        if (score >= 3) {
          ctx.relatedGenomes.push({
            id: g.genome_id,
            family: g.family,
            invariant: g.violated_invariant,
            repair: g.repair_operator,
            score
          });
        }
      } catch (e) { /* skip */ }
    }

    ctx.relatedGenomes.sort((a, b) => b.score - a.score);
    ctx.relatedGenomes = ctx.relatedGenomes.slice(0, 5);
  }

  return ctx;
}

async function generateWithLLM(task, ctx, apiKey) {
  const model = flags.model || 'gemini-2.5-flash';

  // Build system prompt with context
  let systemPrompt = `You are a senior technical planner for an AI agent development team.
Given a 1-line task description, produce a detailed SPEC.md that another agent can implement.

The SPEC should include:
1. **Goal** — clear statement of what needs to be built
2. **Background** — why this is needed
3. **Requirements** — numbered list of specific things to implement
4. **Files to modify** — predicted files that will need changes (estimate based on task)
5. **Technical approach** — high-level implementation strategy
6. **Acceptance criteria** — how to verify the task is done
7. **Known risks** — potential issues to watch for
8. **Estimated effort** — S/M/L

Format in clean Markdown. Be specific and actionable, not vague.`;

  // Inject context
  if (ctx.hasMemory) {
    systemPrompt += `\n\nThe project has accumulated knowledge. Key patterns from MEMORY.md:\n${ctx.memoryExcerpt}`;
  }

  if (ctx.relatedGenomes.length > 0) {
    systemPrompt += `\n\n⚠️ Known failure patterns relevant to this task:`;
    for (const g of ctx.relatedGenomes) {
      systemPrompt += `\n- [${g.family}] ${g.invariant} → Fix: ${g.repair}`;
    }
    systemPrompt += `\nAccount for these in the Known Risks section.`;
  }

  if (ctx.projectStack.length > 0) {
    systemPrompt += `\n\nProject tech stack: ${ctx.projectStack.join(', ')}`;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      parts: [{ text: `${systemPrompt}\n\n---\n\nTask: "${task}"\n\nGenerate the SPEC.md:` }]
    }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096
    }
  };

  if (flags.verbose) {
    console.log('\n[VERBOSE] Prompt:', systemPrompt.slice(0, 300) + '...');
    console.log('[VERBOSE] Model:', model);
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await resp.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  let specContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!specContent) {
    throw new Error('Empty response from Gemini API');
  }

  // Remove markdown code fences if Gemini wrapped the response
  specContent = specContent.replace(/^```markdown\n?/i, '').replace(/\n?```$/i, '');

  // Add header
  const header = [
    `<!-- Generated by nve-plan.js on ${new Date().toISOString().slice(0, 10)} -->`,
    `<!-- Task: "${task}" -->`,
    `<!-- Model: ${model} | Genomes injected: ${ctx.relatedGenomes.length} | Memory: ${ctx.hasMemory ? 'yes' : 'no'} -->`,
    '',
  ].join('\n');

  return header + specContent;
}

function generateOfflineSpec(task, ctx) {
  const lines = [];
  lines.push(`# SPEC.md — Task Specification`);
  lines.push(`<!-- Generated by nve-plan.js (offline) on ${new Date().toISOString().slice(0, 10)} -->`);
  lines.push('');
  lines.push('## 🎯 Goal');
  lines.push(task);
  lines.push('');
  lines.push('## 📋 Background');
  lines.push('<!-- TODO: Why is this needed? What problem does it solve? -->');
  lines.push('');
  lines.push('## 📝 Requirements');
  lines.push('1. <!-- TODO: Requirement 1 -->');
  lines.push('2. <!-- TODO: Requirement 2 -->');
  lines.push('3. <!-- TODO: Requirement 3 -->');
  lines.push('');
  lines.push('## 📁 Files to Modify');
  lines.push('- <!-- TODO: file1.js -->');
  lines.push('- <!-- TODO: file2.js -->');
  lines.push('');
  lines.push('## 🔧 Technical Approach');
  lines.push('<!-- TODO: How to implement this? -->');
  lines.push('');
  lines.push('## ✅ Acceptance Criteria');
  lines.push('- [ ] <!-- TODO: criterion 1 -->');
  lines.push('- [ ] <!-- TODO: criterion 2 -->');
  lines.push('- [ ] No regressions in existing functionality');
  lines.push('');

  if (ctx.relatedGenomes.length > 0) {
    lines.push('## ⚡ Known Risks (auto-detected from genomes)');
    for (const g of ctx.relatedGenomes) {
      lines.push(`- **[${g.family}]** ${g.invariant}`);
      lines.push(`  - Repair: ${g.repair}`);
    }
    lines.push('');
  } else {
    lines.push('## ⚡ Known Risks');
    lines.push('- <!-- TODO: What could go wrong? -->');
    lines.push('');
  }

  lines.push('## 📊 Estimated Effort');
  lines.push('- **Size**: <!-- S / M / L -->');
  lines.push(`- **Genomes in project**: ${ctx.genomeCount}`);
  lines.push(`- **MEMORY.md**: ${ctx.hasMemory ? 'present' : 'not found'}`);
  lines.push('');

  return lines.join('\n');
}
