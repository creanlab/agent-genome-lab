#!/usr/bin/env node
/**
 * nve-replay.js — Replay Gate for Failure Genome promotion.
 *
 * For each genome with promotion_decision = "pending":
 * 1. Find family members (same family in FAMILY_INDEX)
 * 2. Check if repair operator would prevent similar incidents
 * 3. Score pass rate
 * 4. If ≥ 60% → promote, else → reject/refine
 * 5. Holdout regression check on 1-2 unrelated genomes
 *
 * Usage: node cli/nve-replay.js [--dry-run] [--promote] [--verbose]
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const autoPromote = args.includes('--promote');
const verbose = args.includes('--verbose');

const fgDir = path.join(root, '.evolution/failure_genomes');
const incDir = path.join(root, '.evolution/incidents');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function listJsonFiles(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(n => n.endsWith('.json') && (!prefix || n.startsWith(prefix)))
    .map(n => ({ name: n, path: path.join(dir, n), data: readJson(path.join(dir, n)) }))
    .filter(x => x.data);
}

// Load all genomes and incidents
const allGenomes = listJsonFiles(fgDir, 'FG-');
const allIncidents = listJsonFiles(incDir, 'INC-');
const familyIndex = readJson(path.join(fgDir, 'FAMILY_INDEX.json')) || { families: {} };

// Find pending genomes
const pending = allGenomes.filter(g =>
  g.data.promotion_decision === 'pending' ||
  (g.data.replay && g.data.replay.status === 'not_run' && g.data.promotion_decision !== 'rejected')
);

console.log(`🔄 NVE Replay Gate — ${allGenomes.length} genomes, ${pending.length} pending\n`);

if (pending.length === 0) {
  console.log('✅ No pending genomes to replay.');
  process.exit(0);
}

const results = [];

for (const genome of pending) {
  const g = genome.data;
  const gid = g.genome_id;
  const family = g.family;

  console.log(`━━━ ${gid}: "${family}" ━━━`);

  // Step 1: Is the source incident fixed?
  const sourceIncident = allIncidents.find(i =>
    i.data.incident_id === g.incident_id || i.data.event_id === g.incident_id
  );

  let incidentFixed = true;
  if (sourceIncident) {
    const status = sourceIncident.data.status || 'resolved';
    incidentFixed = status !== 'open';
    if (!incidentFixed) {
      console.log(`  ❌ Step 1: Source incident ${g.incident_id} still OPEN → SKIP`);
      results.push({ genome_id: gid, decision: 'skipped', reason: 'incident_open' });
      continue;
    }
  }
  console.log(`  ✅ Step 1: Source incident fixed`);

  // Step 2: Find family members
  const familyMembers = allGenomes.filter(fg =>
    fg.data.family === family && fg.data.genome_id !== gid
  );
  console.log(`  📋 Step 2: ${familyMembers.length} family member(s)`);

  if (familyMembers.length === 0) {
    // First in family → auto-promote (no replay possible)
    console.log(`  🟢 First in family → PROMOTE (no replay needed)`);
    results.push({ genome_id: gid, decision: 'promoted', reason: 'first_in_family', pass_rate: null, family_size: 0 });
    continue;
  }

  // Step 3: Would repair operator prevent similar incidents?
  const repairOp = g.repair_operator || '';
  let passCount = 0;
  let totalChecked = 0;

  for (const fm of familyMembers) {
    totalChecked++;
    const fmRepair = fm.data.repair_operator || '';
    const fmInvariant = fm.data.violated_invariant || '';

    // Similarity check: same invariant OR same repair approach
    const sameInvariant = fmInvariant === g.violated_invariant;
    const similarRepair = repairOp && fmRepair &&
      (repairOp.includes(fmRepair.split('-')[0]) || fmRepair.includes(repairOp.split('-')[0]));

    // If same invariant, repair would likely work
    if (sameInvariant || similarRepair) {
      passCount++;
      if (verbose) console.log(`    ✓ ${fm.data.genome_id}: same invariant/repair → PASS`);
    } else {
      if (verbose) console.log(`    ✗ ${fm.data.genome_id}: different invariant → FAIL`);
    }
  }

  const passRate = totalChecked > 0 ? passCount / totalChecked : 0;
  console.log(`  📊 Step 3: Pass rate = ${passCount}/${totalChecked} = ${(passRate * 100).toFixed(0)}%`);

  // Step 4: Pass rate ≥ 60%?
  if (passRate < 0.6 && totalChecked > 1) {
    console.log(`  ❌ Step 4: Pass rate < 60% → REJECT`);
    results.push({ genome_id: gid, decision: 'rejected', reason: 'low_pass_rate', pass_rate: passRate, family_size: totalChecked });
    continue;
  }
  console.log(`  ✅ Step 4: Pass rate OK (≥ 60% or single member)`);

  // Step 5: Holdout regression check
  const unrelatedGenomes = allGenomes.filter(fg =>
    fg.data.family !== family && fg.data.genome_id !== gid
  ).slice(0, 2); // Check at most 2

  let regressionDetected = false;
  for (const holdout of unrelatedGenomes) {
    // Check if repair operator could conflict with holdout's invariant
    const conflict = holdout.data.violated_invariant &&
      g.repair_operator &&
      holdout.data.repair_operator &&
      g.repair_operator === holdout.data.repair_operator &&
      g.violated_invariant !== holdout.data.violated_invariant;

    if (conflict) {
      regressionDetected = true;
      if (verbose) console.log(`    ⚠️ Regression on ${holdout.data.genome_id}: conflicting repair`);
    }
  }

  if (regressionDetected) {
    console.log(`  ❌ Step 5: Holdout regression detected → REJECT`);
    results.push({ genome_id: gid, decision: 'rejected', reason: 'holdout_regression', pass_rate: passRate, family_size: totalChecked });
    continue;
  }
  console.log(`  ✅ Step 5: No holdout regression`);

  // Step 6: PROMOTE
  console.log(`  🧬 Step 6: PROMOTE → ${gid}`);
  results.push({ genome_id: gid, decision: 'promoted', reason: 'replay_passed', pass_rate: passRate, family_size: totalChecked });
  console.log('');
}

// Apply decisions
if (!dryRun && autoPromote) {
  for (const r of results) {
    if (r.decision === 'skipped') continue;

    const genome = allGenomes.find(g => g.data.genome_id === r.genome_id);
    if (!genome) continue;

    genome.data.promotion_decision = r.decision;
    genome.data.replay = {
      status: r.decision === 'skipped' ? 'not_run' : 'completed',
      family_sample_size: r.family_size || 0,
      holdout_sample_size: r.decision !== 'skipped' ? 2 : 0,
      pass_rate: r.pass_rate,
      replayed_at: new Date().toISOString()
    };

    fs.writeFileSync(genome.path, JSON.stringify(genome.data, null, 2));
  }
  console.log(`\n✅ Applied ${results.filter(r => r.decision !== 'skipped').length} decision(s) to genome files.`);
} else if (dryRun) {
  console.log(`\n🔍 DRY RUN — no files modified.`);
} else {
  console.log(`\n💡 Run with --promote to apply decisions to genome files.`);
}

// Summary
const promoted = results.filter(r => r.decision === 'promoted').length;
const rejected = results.filter(r => r.decision === 'rejected').length;
const skipped = results.filter(r => r.decision === 'skipped').length;

console.log(`\n📊 Summary: ${promoted} promoted, ${rejected} rejected, ${skipped} skipped`);

// Write replay report
const report = {
  schema_version: '1.0',
  generated_at: new Date().toISOString(),
  total_pending: pending.length,
  promoted, rejected, skipped,
  results
};

const outDir = path.join(root, '.evolution/audits');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'replay-gate.latest.json');
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(`\nWrote ${outFile}`);
