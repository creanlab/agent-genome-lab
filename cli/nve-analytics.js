#!/usr/bin/env node
/**
 * nve-analytics.js — Run Analytics: session tracking + prevention attribution
 *
 * Usage:
 *   node cli/nve-analytics.js                 # generate analytics for current state
 *   node cli/nve-analytics.js --start         # start a new session timer
 *   node cli/nve-analytics.js --end           # end session, save run record
 *   node cli/nve-analytics.js --history       # show all run records
 *   node cli/nve-analytics.js --attribution   # show prevention attribution report
 *
 * Produces .evolution/analytics/RUN-{date}.json with:
 *   - Session duration
 *   - Genomes read / used
 *   - Prevention attribution: which genomes prevented repeat failures
 *   - Cost estimate (if proxy tracking is enabled)
 *
 * This is the observability layer for the genome engine.
 * Anthropic tracks per-sprint cost and time. We track knowledge impact.
 */

const fs = require('fs');
const path = require('path');

const ROOT = findProjectRoot(process.cwd());
const EVO = path.join(ROOT, '.evolution');
const ANALYTICS_DIR = path.join(EVO, 'analytics');
const GENOMES_DIR = path.join(EVO, 'failure_genomes');
const INCIDENTS_DIR = path.join(EVO, 'incidents');
const EU_DIR = path.join(EVO, 'experience_units');
const MEMORY_PATH = path.join(EVO, 'MEMORY.md');
const SESSION_FILE = path.join(ANALYTICS_DIR, '.current_session.json');
const HANDOFF_PATH = path.join(EVO, 'HANDOFF.md');
const CONTRACT_PATH = path.join(EVO, 'CONTRACT.md');

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
    const key = args[i].slice(2).replace(/-/g, '_');
    const val = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[i + 1] : true;
    flags[key] = val;
    if (val !== true) i++;
  }
}

if (!fs.existsSync(EVO)) {
  console.error('❌ No .evolution/ directory found. Run nve-init first.');
  process.exit(1);
}

// Ensure analytics directory
if (!fs.existsSync(ANALYTICS_DIR)) {
  fs.mkdirSync(ANALYTICS_DIR, { recursive: true });
}

// --- Dispatch ---

if (flags.start) {
  startSession();
} else if (flags.end) {
  endSession();
} else if (flags.history) {
  showHistory();
} else if (flags.attribution) {
  showAttribution();
} else {
  generateReport();
}

// --- Session Management ---

function startSession() {
  const session = {
    session_id: `SES-${Date.now().toString(36).toUpperCase()}`,
    started_at: new Date().toISOString(),
    task: flags.task || '(not specified)',
    genomes_at_start: countFiles(GENOMES_DIR, 'FG-'),
    incidents_at_start: countFiles(INCIDENTS_DIR, 'INC-')
  };

  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));

  console.log('\n⏱️  Session started');
  console.log(`   ID:       ${session.session_id}`);
  console.log(`   Task:     ${session.task}`);
  console.log(`   Started:  ${session.started_at}`);
  console.log(`   Genomes:  ${session.genomes_at_start}`);
  console.log('\n   Run "node cli/nve-analytics.js --end" when done.');
}

function endSession() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.log('\n⚠️  No active session. Start one with --start.');
    process.exit(0);
  }

  const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  const endTime = new Date();
  const startTime = new Date(session.started_at);
  const durationMs = endTime - startTime;
  const durationMin = Math.round(durationMs / 60000);

  const genomesNow = countFiles(GENOMES_DIR, 'FG-');
  const incidentsNow = countFiles(INCIDENTS_DIR, 'INC-');

  const record = {
    ...session,
    ended_at: endTime.toISOString(),
    duration_minutes: durationMin,
    genomes_at_end: genomesNow,
    genomes_created: genomesNow - session.genomes_at_start,
    incidents_at_end: incidentsNow,
    incidents_created: incidentsNow - session.incidents_at_start,
    had_contract: fs.existsSync(CONTRACT_PATH),
    had_handoff: fs.existsSync(HANDOFF_PATH),
    memory_lines: countMemoryLines(),
    prevention_events: detectPreventionEvents(session.started_at)
  };

  // Save run record
  const date = endTime.toISOString().slice(0, 10).replace(/-/g, '');
  const runFile = path.join(ANALYTICS_DIR, `RUN-${date}-${session.session_id}.json`);
  fs.writeFileSync(runFile, JSON.stringify(record, null, 2));

  // Remove session file
  fs.unlinkSync(SESSION_FILE);

  console.log('\n⏱️  Session ended');
  console.log(`   ID:               ${record.session_id}`);
  console.log(`   Duration:         ${durationMin} min`);
  console.log(`   New incidents:    ${record.incidents_created}`);
  console.log(`   New genomes:      ${record.genomes_created}`);
  console.log(`   Contract used:    ${record.had_contract ? '✅' : '❌'}`);
  console.log(`   Handoff used:     ${record.had_handoff ? '✅' : '❌'}`);
  console.log(`   Prevention events:${record.prevention_events.length}`);
  console.log(`\n   Record saved: ${path.basename(runFile)}`);
}

// --- Reporting ---

function generateReport() {
  console.log('\n📊 Agent Genome Lab — Analytics Report');
  console.log('━'.repeat(50));

  // 1. Overview stats
  const genomes = loadGenomes();
  const incidents = countFiles(INCIDENTS_DIR, 'INC-');
  const eus = countFiles(EU_DIR, 'EU-');
  const promoted = genomes.filter(g => g.promotion === 'promoted').length;
  const rejected = genomes.filter(g => g.promotion === 'rejected').length;

  console.log('\n  📦 Knowledge Base');
  console.log(`     Incidents:       ${incidents}`);
  console.log(`     Experience Units:${eus}`);
  console.log(`     Failure Genomes: ${genomes.length}`);
  console.log(`     ├─ Promoted:     ${promoted}`);
  console.log(`     ├─ Rejected:     ${rejected}`);
  console.log(`     └─ Pending:      ${genomes.length - promoted - rejected}`);
  console.log(`     MEMORY.md lines: ${countMemoryLines()}`);

  // 2. Utility distribution
  const utilities = genomes.map(g => g.utility).filter(u => u > 0);
  if (utilities.length > 0) {
    const avgUtil = (utilities.reduce((a, b) => a + b, 0) / utilities.length).toFixed(1);
    const maxUtil = Math.max(...utilities);
    const minUtil = Math.min(...utilities);
    console.log('\n  📈 Utility Scores');
    console.log(`     Average:  ${avgUtil}`);
    console.log(`     Max:      ${maxUtil}`);
    console.log(`     Min:      ${minUtil}`);
  }

  // 3. Family distribution
  const families = {};
  for (const g of genomes) {
    families[g.family] = (families[g.family] || 0) + 1;
  }
  const sortedFamilies = Object.entries(families).sort((a, b) => b[1] - a[1]);
  if (sortedFamilies.length > 0) {
    console.log('\n  🧬 Top Failure Families');
    for (const [family, count] of sortedFamilies.slice(0, 7)) {
      const bar = '█'.repeat(Math.min(count * 2, 20));
      console.log(`     ${bar} ${family} (${count})`);
    }
  }

  // 4. Prevention attribution
  const attributions = computeAttribution(genomes);
  if (attributions.length > 0) {
    console.log('\n  🛡️ Prevention Attribution');
    for (const a of attributions.slice(0, 5)) {
      console.log(`     ${a.id}: prevented ${a.preventions}x, reused ${a.reuses}x (utility: ${a.utility})`);
    }
  }

  // 5. Run history
  const runs = loadRunHistory();
  if (runs.length > 0) {
    console.log('\n  ⏱️  Recent Sessions');
    for (const r of runs.slice(0, 5)) {
      const date = r.started_at?.slice(0, 10) || 'unknown';
      console.log(`     ${date} | ${r.duration_minutes || '?'}m | +${r.genomes_created || 0} genomes | ${r.task || '(no task)'}`);
    }
  }

  // 6. Harness adoption
  console.log('\n  🏗️ Harness Adoption');
  console.log(`     HANDOFF.md:   ${fs.existsSync(HANDOFF_PATH) ? '✅ Active' : '❌ Not created'}`);
  console.log(`     CONTRACT.md:  ${fs.existsSync(CONTRACT_PATH) ? '✅ Active' : '❌ Not created'}`);
  console.log(`     SPEC.md:      ${fs.existsSync(path.join(EVO, 'SPEC.md')) ? '✅ Active' : '❌ Not created'}`);
  console.log(`     MEMORY.md:    ${fs.existsSync(MEMORY_PATH) ? '✅ Active' : '❌ Not created'}`);

  // 7. Health score
  const health = computeHealthScore(genomes, incidents, runs);
  console.log(`\n  💚 Genome Engine Health: ${health.score}/100`);
  for (const note of health.notes) {
    console.log(`     ${note}`);
  }

  console.log('\n━'.repeat(50));
  console.log(`  Report generated: ${new Date().toISOString().slice(0, 10)}`);
}

function showHistory() {
  const runs = loadRunHistory();
  if (runs.length === 0) {
    console.log('\n📊 No session history. Start tracking with: node cli/nve-analytics.js --start');
    return;
  }

  console.log('\n📊 Session History');
  console.log('━'.repeat(60));
  console.log(`${'Date'.padEnd(12)} ${'Dur'.padEnd(6)} ${'Task'.padEnd(30)} ${'Genomes'.padEnd(8)}`);
  console.log('─'.repeat(60));

  for (const r of runs) {
    const date = (r.started_at || '').slice(0, 10);
    const dur = `${r.duration_minutes || '?'}m`;
    const task = (r.task || '(none)').slice(0, 28);
    const genomes = `+${r.genomes_created || 0}`;
    console.log(`${date.padEnd(12)} ${dur.padEnd(6)} ${task.padEnd(30)} ${genomes.padEnd(8)}`);
  }

  // Summary
  const totalMin = runs.reduce((s, r) => s + (r.duration_minutes || 0), 0);
  const totalGenomes = runs.reduce((s, r) => s + (r.genomes_created || 0), 0);
  console.log('─'.repeat(60));
  console.log(`${'Total'.padEnd(12)} ${(totalMin + 'm').padEnd(6)} ${(runs.length + ' sessions').padEnd(30)} +${totalGenomes}`);
}

function showAttribution() {
  const genomes = loadGenomes();
  const attributions = computeAttribution(genomes);

  if (attributions.length === 0) {
    console.log('\n🛡️ No prevention data available yet.');
    console.log('   Genomes gain prevention_count when they help avoid repeat failures.');
    return;
  }

  console.log('\n🛡️ Prevention Attribution Report');
  console.log('━'.repeat(60));

  let totalPrevented = 0;
  let totalReuses = 0;

  for (const a of attributions) {
    totalPrevented += a.preventions;
    totalReuses += a.reuses;
    const bar = '🛡️'.repeat(Math.min(a.preventions, 10));
    console.log(`\n  ${a.id} [${a.family}]`);
    console.log(`  ${bar}`);
    console.log(`  Prevented: ${a.preventions}x | Reused: ${a.reuses}x | Utility: ${a.utility}`);
    console.log(`  Invariant: ${a.invariant}`);
  }

  console.log('\n━'.repeat(60));
  console.log(`  Total preventions: ${totalPrevented}`);
  console.log(`  Total reuses:      ${totalReuses}`);
  console.log(`  Active genomes:    ${attributions.length}`);
}

// --- Helpers ---

function countFiles(dir, prefix) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.json')).length;
}

function countMemoryLines() {
  if (!fs.existsSync(MEMORY_PATH)) return 0;
  return fs.readFileSync(MEMORY_PATH, 'utf8').split('\n').length;
}

function loadGenomes() {
  if (!fs.existsSync(GENOMES_DIR)) return [];
  const genomes = [];
  for (const file of fs.readdirSync(GENOMES_DIR)) {
    if (!file.startsWith('FG-') || !file.endsWith('.json')) continue;
    try {
      const g = JSON.parse(fs.readFileSync(path.join(GENOMES_DIR, file), 'utf8'));
      genomes.push({
        id: g.genome_id,
        family: g.family || 'unknown',
        invariant: g.violated_invariant || '',
        utility: g.utility?.score || g.utility || 0,
        reuse_count: g.utility?.reuse_count || 0,
        prevention_count: g.utility?.prevention_count || 0,
        promotion: g.promotion_decision || g.replay?.status || 'pending',
        created: g.created_at || null
      });
    } catch (e) { /* skip */ }
  }
  return genomes;
}

function loadRunHistory() {
  if (!fs.existsSync(ANALYTICS_DIR)) return [];
  const runs = [];
  for (const file of fs.readdirSync(ANALYTICS_DIR)) {
    if (!file.startsWith('RUN-') || !file.endsWith('.json')) continue;
    try {
      runs.push(JSON.parse(fs.readFileSync(path.join(ANALYTICS_DIR, file), 'utf8')));
    } catch (e) { /* skip */ }
  }
  return runs.sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''));
}

function computeAttribution(genomes) {
  return genomes
    .filter(g => g.prevention_count > 0 || g.reuse_count > 0)
    .map(g => ({
      id: g.id,
      family: g.family,
      invariant: g.invariant,
      preventions: g.prevention_count,
      reuses: g.reuse_count,
      utility: g.utility
    }))
    .sort((a, b) => b.preventions - a.preventions || b.reuses - a.reuses);
}

function detectPreventionEvents(startedAt) {
  // Check if any genomes have been updated after session start
  const events = [];
  if (!fs.existsSync(GENOMES_DIR)) return events;

  for (const file of fs.readdirSync(GENOMES_DIR)) {
    if (!file.startsWith('FG-') || !file.endsWith('.json')) continue;
    try {
      const stat = fs.statSync(path.join(GENOMES_DIR, file));
      if (stat.mtime > new Date(startedAt)) {
        const g = JSON.parse(fs.readFileSync(path.join(GENOMES_DIR, file), 'utf8'));
        if ((g.utility?.prevention_count || 0) > 0) {
          events.push({ genome: g.genome_id, family: g.family });
        }
      }
    } catch (e) { /* skip */ }
  }
  return events;
}

function computeHealthScore(genomes, incidentCount, runs) {
  let score = 0;
  const notes = [];

  // Base: has genomes at all
  if (genomes.length > 0) {
    score += 15;
    notes.push(`✅ ${genomes.length} genome(s) in knowledge base`);
  } else {
    notes.push('❌ No genomes yet — capture incidents to build knowledge');
  }

  // Promoted ratio
  const promoted = genomes.filter(g => g.promotion === 'promoted').length;
  if (promoted > 0) {
    const ratio = promoted / genomes.length;
    score += Math.round(ratio * 20);
    notes.push(`✅ ${Math.round(ratio * 100)}% promotion rate (${promoted}/${genomes.length})`);
  }

  // Memory exists
  if (fs.existsSync(MEMORY_PATH)) {
    score += 10;
    notes.push('✅ MEMORY.md is active');
  } else {
    notes.push('❌ No MEMORY.md — run nve-memory to generate');
  }

  // Harness artifacts
  if (fs.existsSync(CONTRACT_PATH)) { score += 10; notes.push('✅ CONTRACT.md in use'); }
  if (fs.existsSync(HANDOFF_PATH)) { score += 10; notes.push('✅ HANDOFF.md in use'); }
  if (fs.existsSync(path.join(EVO, 'SPEC.md'))) { score += 5; notes.push('✅ SPEC.md in use'); }

  // Diversity of families
  const families = new Set(genomes.map(g => g.family));
  if (families.size >= 3) { score += 10; notes.push(`✅ ${families.size} failure families identified`); }

  // Prevention activity
  const preventions = genomes.reduce((s, g) => s + g.prevention_count, 0);
  if (preventions > 0) {
    score += 15;
    notes.push(`✅ ${preventions} prevention event(s) — knowledge is actively helping`);
  }

  // Session tracking
  if (runs.length >= 3) {
    score += 5;
    notes.push(`✅ ${runs.length} tracked sessions`);
  }

  return { score: Math.min(score, 100), notes };
}
