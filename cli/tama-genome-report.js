#!/usr/bin/env node
/**
 * tama-genome-report.js — Generate Failure Genome health and analytics report
 *
 * Answers:
 * - Which failure family is most common?
 * - Which repair operator is most reusable?
 * - Which patch type has the best win rate?
 * - Which genomes are stale or low utility?
 * - Which shared genomes transferred successfully?
 *
 * Output: .evolution/audits/GENOME-REPORT-YYYYMMDD.json + stdout summary
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GENOMES_DIR = path.join(ROOT, '.evolution', 'failure_genomes');

function readGenomes() {
  if (!fs.existsSync(GENOMES_DIR)) return [];
  return fs.readdirSync(GENOMES_DIR)
    .filter(f => f.startsWith('FG-') && f.endsWith('.json'))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(GENOMES_DIR, f), 'utf-8')); }
      catch { return null; }
    })
    .filter(Boolean);
}

const genomes = readGenomes();
if (!genomes.length) {
  console.log('No failure genomes found in .evolution/failure_genomes/');
  process.exit(0);
}

// 1. Families by count
const familyCounts = {};
genomes.forEach(g => {
  familyCounts[g.family] = familyCounts[g.family] || { count: 0, genomes: [], utility_sum: 0 };
  familyCounts[g.family].count++;
  familyCounts[g.family].genomes.push(g.genome_id);
  familyCounts[g.family].utility_sum += (g.utility?.score || 0);
});
const familiesByCount = Object.entries(familyCounts)
  .map(([family, data]) => ({
    family,
    count: data.count,
    genomes: data.genomes,
    avg_utility: +(data.utility_sum / data.count).toFixed(2)
  }))
  .sort((a, b) => b.count - a.count);

// 2. Repair operators by reuse
const operatorReuse = {};
genomes.forEach(g => {
  const op = g.repair_operator;
  operatorReuse[op] = operatorReuse[op] || { reuse_count: 0, prevention_count: 0 };
  operatorReuse[op].reuse_count += (g.utility?.reuse_count || 0);
  operatorReuse[op].prevention_count += (g.utility?.prevention_count || 0);
});
const operatorsByReuse = Object.entries(operatorReuse)
  .map(([operator, data]) => ({ operator, ...data }))
  .sort((a, b) => b.reuse_count - a.reuse_count);

// 3. Patch types by win rate
const patchStats = {};
genomes.forEach(g => {
  (g.proposed_patch_types || []).forEach(pt => {
    patchStats[pt] = patchStats[pt] || { promoted: 0, rejected: 0, pending: 0 };
    if (g.promotion_decision === 'promoted') patchStats[pt].promoted++;
    else if (g.promotion_decision === 'rejected') patchStats[pt].rejected++;
    else patchStats[pt].pending++;
  });
});
const patchTypesByWinRate = Object.entries(patchStats)
  .map(([type, data]) => ({
    type,
    ...data,
    total: data.promoted + data.rejected + data.pending,
    win_rate: data.promoted + data.rejected > 0
      ? +(data.promoted / (data.promoted + data.rejected)).toFixed(2)
      : null
  }))
  .sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));

// 4. Stale genomes (utility < 0.3 or no use in 30+ days)
const now = Date.now();
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const staleGenomes = genomes.filter(g => {
  const utility = g.utility?.score || 0;
  const lastUsed = g.utility?.last_used_at ? new Date(g.utility.last_used_at).getTime() : 0;
  return utility < 0.3 || (lastUsed > 0 && now - lastUsed > THIRTY_DAYS_MS);
});

// 5. Low utility genomes
const lowUtilityGenomes = genomes
  .filter(g => (g.utility?.score || 0) < 0.5)
  .map(g => ({ genome_id: g.genome_id, family: g.family, utility: g.utility?.score }));

// 6. Negative transfer
const negativeTransfer = genomes.filter(g => (g.utility?.negative_transfer_count || 0) > 0);

// 7. Replay coverage
const replayStats = {
  not_run: genomes.filter(g => g.replay?.status === 'not_run').length,
  passed: genomes.filter(g => g.replay?.status === 'passed').length,
  failed: genomes.filter(g => g.replay?.status === 'failed').length,
  partial: genomes.filter(g => g.replay?.status === 'partial').length
};

// Build report
const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const report = {
  report_date: new Date().toISOString().slice(0, 10),
  total_genomes: genomes.length,
  total_families: Object.keys(familyCounts).length,
  families_by_count: familiesByCount,
  repair_operators_by_reuse: operatorsByReuse.slice(0, 10),
  patch_types_by_win_rate: patchTypesByWinRate,
  replay_coverage: replayStats,
  stale_genomes: staleGenomes.map(g => g.genome_id),
  low_utility_genomes: lowUtilityGenomes,
  negative_transfer: negativeTransfer.map(g => ({
    genome_id: g.genome_id,
    negative_count: g.utility?.negative_transfer_count
  })),
  top_invariants: [...new Set(genomes.map(g => g.violated_invariant))],
  health_summary: {
    genome_count: genomes.length >= 20 ? '✅ Good' : `⚠️ ${genomes.length}/20 minimum`,
    replay_coverage: replayStats.passed > 0 ? '✅ Some replayed' : '⚠️ No replays run',
    family_diversity: Object.keys(familyCounts).length >= 5 ? '✅ Good diversity' : `⚠️ ${Object.keys(familyCounts).length} families`,
    stale_count: staleGenomes.length === 0 ? '✅ None stale' : `⚠️ ${staleGenomes.length} stale`
  }
};

// Write report
const outDir = path.join(ROOT, '.evolution', 'audits');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `GENOME-REPORT-${dateStr}.json`);
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

// Console output
console.log(`\n🧬 Failure Genome Health Report — ${report.report_date}`);
console.log(`${'═'.repeat(50)}`);
console.log(`\n📊 Overview`);
console.log(`   Total genomes: ${report.total_genomes}`);
console.log(`   Total families: ${report.total_families}`);
console.log(`   Replay coverage: ${replayStats.passed} passed, ${replayStats.not_run} not run`);

console.log(`\n🏠 Top Families`);
familiesByCount.slice(0, 5).forEach(f => {
  console.log(`   ${f.family}: ${f.count} genomes (avg utility: ${f.avg_utility})`);
});

console.log(`\n🔧 Top Repair Operators (by reuse)`);
operatorsByReuse.slice(0, 5).forEach(o => {
  console.log(`   ${o.operator}: reused ${o.reuse_count}x, prevented ${o.prevention_count}x`);
});

console.log(`\n📦 Patch Types (by win rate)`);
patchTypesByWinRate.forEach(p => {
  console.log(`   ${p.type}: ${p.promoted}/${p.total} promoted (${p.win_rate !== null ? (p.win_rate * 100) + '%' : 'n/a'})`);
});

console.log(`\n⚕️ Health`);
Object.entries(report.health_summary).forEach(([k, v]) => {
  console.log(`   ${k}: ${v}`);
});

if (staleGenomes.length) {
  console.log(`\n⚠️ Stale genomes: ${staleGenomes.map(g => g.genome_id).join(', ')}`);
}

console.log(`\n✅ Report saved: ${outPath}\n`);
