#!/usr/bin/env node
/**
 * nve-utility.js — Recalculate utility scores for all Failure Genomes.
 * 
 * Formula: score = reuse_count * 0.3 + prevention_count * 0.5 - negative_transfer * 0.8
 *          clamped to [0.1, 1.0]
 *
 * Also applies time decay: -0.01 per month since last_used_at (min 0.1).
 *
 * Usage: node cli/nve-utility.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const dryRun = process.argv.includes('--dry-run');
const fgDir = path.join(root, '.evolution/failure_genomes');

if (!fs.existsSync(fgDir)) {
  console.error('Missing: .evolution/failure_genomes/');
  process.exit(1);
}

const genomeFiles = fs.readdirSync(fgDir)
  .filter(n => n.startsWith('FG-') && n.endsWith('.json'));

if (genomeFiles.length === 0) {
  console.log('No Failure Genomes found.');
  process.exit(0);
}

console.log(`🧬 NVE Utility Recalculator — ${genomeFiles.length} genomes, dry run: ${dryRun}\n`);

let updated = 0;
const now = Date.now();

for (const file of genomeFiles) {
  const filePath = path.join(fgDir, file);
  const genome = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const u = genome.utility || {};

  const reuse = u.reuse_count || 0;
  const prevention = u.prevention_count || 0;
  const negTransfer = u.negative_transfer_count || 0;

  // Base score from impact
  const baseScore = u.score || 0.5;

  // Activity score
  const activityScore = reuse * 0.3 + prevention * 0.5 - negTransfer * 0.8;

  // Time decay
  let decayPenalty = 0;
  if (u.last_used_at) {
    const monthsSinceUse = (now - new Date(u.last_used_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
    decayPenalty = Math.floor(monthsSinceUse) * 0.01;
  }

  // Combined: base + activity - decay, clamped [0.1, 1.0]
  const newScore = Math.max(0.1, Math.min(1.0, 
    parseFloat((baseScore + activityScore - decayPenalty).toFixed(4))
  ));

  const oldScore = u.score || 0;
  const changed = Math.abs(newScore - oldScore) > 0.001;

  if (changed) {
    console.log(`  ${genome.genome_id}: ${oldScore.toFixed(2)} → ${newScore.toFixed(2)} (reuse=${reuse}, prevent=${prevention}, neg=${negTransfer})`);
    
    if (!dryRun) {
      genome.utility = {
        ...u,
        score: newScore,
        recalculated_at: new Date().toISOString()
      };
      fs.writeFileSync(filePath, JSON.stringify(genome, null, 2));
    }
    updated++;
  }
}

if (updated === 0) {
  console.log('✅ All utility scores are up to date.');
} else if (dryRun) {
  console.log(`\n🔍 DRY RUN — ${updated} genome(s) would be updated.`);
} else {
  console.log(`\n✅ Updated ${updated} genome(s).`);
}
