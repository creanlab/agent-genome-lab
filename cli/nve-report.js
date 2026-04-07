#!/usr/bin/env node
/**
 * nve-report — Runtime Session Reports
 *
 * Commands:
 *   nve-report generate  — Collect stats and generate health report
 *   nve-report show      — Pretty-print latest report
 *   nve-report history   — List last 10 reports with scores
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'show';
const ROOT = findProjectRoot();
const EVO_DIR = path.join(ROOT, '.evolution');
const REPORTS_DIR = path.join(EVO_DIR, 'reports');
const jsonMode = args.includes('--json');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Data Collection ─────────────────────────────────────────────────────────

function countFiles(dir, ext = '.json') {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter(f => f.endsWith(ext)).length;
}

function countGenomesByKind() {
  const dir = path.join(EVO_DIR, 'failure_genomes');
  const result = { failure: 0, success: 0, strategy: 0, promoted: 0, total: 0 };
  if (!fs.existsSync(dir)) return result;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const g = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const kind = g.kind || 'failure';
      if (result[kind] !== undefined) result[kind]++;
      if (g.promotion_decision === 'promoted') result.promoted++;
      result.total++;
    } catch { /* skip corrupt */ }
  }
  return result;
}

function countIncidentsByStatus() {
  const dir = path.join(EVO_DIR, 'incidents');
  const result = { observed: 0, distilled: 0, promoted: 0, rejected: 0, total: 0 };
  if (!fs.existsSync(dir)) return result;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const inc = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      const status = inc.status || 'observed';
      if (result[status] !== undefined) result[status]++;
      result.total++;
    } catch { /* skip */ }
  }
  return result;
}

function isMemoryFresh() {
  const mp = path.join(EVO_DIR, 'MEMORY.md');
  if (!fs.existsSync(mp)) return false;
  const stat = fs.statSync(mp);
  const daysSinceModified = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
  return daysSinceModified < 7;
}

// ─── Score Calculation ───────────────────────────────────────────────────────

function calculateScore(stats) {
  let score = 0;
  const max = 100;

  // Genomes (up to 20 points)
  score += Math.min(stats.genomes.total * 2, 20);
  // Skills (up to 15 points)
  score += Math.min(stats.skills * 3, 15);
  // Incidents resolved (up to 15 points)
  score += Math.min((stats.incidents.promoted + stats.incidents.distilled), 15);
  // Memory fresh (10 points)
  if (stats.memory_fresh) score += 10;
  // Subagents configured (up to 10 points)
  score += Math.min(stats.subagents * 2, 10);
  // Hooks configured (up to 10 points)
  score += Math.min(stats.hooks * 2, 10);
  // Has AGENTS.md (5 points)
  if (stats.has_agents_md) score += 5;
  // Has provider config (5 points)
  if (stats.has_provider_config) score += 5;
  // Promoted genomes bonus (up to 10 points)
  score += Math.min(stats.genomes.promoted * 2, 10);

  return Math.min(score, max);
}

// ─── Commands ────────────────────────────────────────────────────────────────

function cmdGenerate() {
  const stats = {
    project: path.basename(ROOT),
    project_root: ROOT,
    genomes: countGenomesByKind(),
    incidents: countIncidentsByStatus(),
    skills: countFiles(path.join(ROOT, '.agents', 'skills'), ''),
    subagents: countFiles(path.join(EVO_DIR, 'subagents')),
    hooks: countFiles(path.join(EVO_DIR, 'hooks')),
    memory_fresh: isMemoryFresh(),
    has_agents_md: fs.existsSync(path.join(ROOT, 'AGENTS.md')),
    has_provider_config: fs.existsSync(path.join(EVO_DIR, 'provider.json')),
  };

  const score = calculateScore(stats);
  const report = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    score,
    stats,
  };

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const outFile = path.join(REPORTS_DIR, `SESSION-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\n${C.bold}Report Generated${C.reset} — Score: ${score >= 80 ? C.green : score >= 50 ? C.yellow : C.red}${score}/100${C.reset}`);
    printReport(report);
    console.log(`${C.green}✓${C.reset} Saved to ${outFile}\n`);
  }
}

function cmdShow() {
  if (!fs.existsSync(REPORTS_DIR)) { console.log('No reports yet. Run: nve-report generate'); return; }
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('SESSION-')).sort();
  if (files.length === 0) { console.log('No reports yet. Run: nve-report generate'); return; }

  const latest = files[files.length - 1];
  const report = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, latest), 'utf8'));

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }
}

function cmdHistory() {
  if (!fs.existsSync(REPORTS_DIR)) { console.log('No reports yet.'); return; }
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('SESSION-')).sort().slice(-10);

  if (jsonMode) {
    const reports = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8')); } catch { return null; }
    }).filter(Boolean);
    console.log(JSON.stringify(reports, null, 2));
    return;
  }

  console.log(`\n${C.bold}Report History${C.reset} (last ${files.length})\n`);
  for (const file of files) {
    try {
      const r = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, file), 'utf8'));
      const scoreColor = r.score >= 80 ? C.green : r.score >= 50 ? C.yellow : C.red;
      console.log(`  ${scoreColor}${r.score}/100${C.reset}  ${C.dim}${r.generated_at}${C.reset}  ${file}`);
    } catch {
      console.log(`  ${C.red}?${C.reset}  ${file} (corrupt)`);
    }
  }
  console.log();
}

function printReport(report) {
  const s = report.stats;
  const scoreColor = report.score >= 80 ? C.green : report.score >= 50 ? C.yellow : C.red;

  console.log(`\n${C.bold}Health Score: ${scoreColor}${report.score}/100${C.reset}`);
  console.log(`${C.dim}Generated: ${report.generated_at}${C.reset}\n`);

  console.log(`  ${C.bold}Genomes${C.reset}`);
  console.log(`    Total: ${s.genomes.total} (failure: ${s.genomes.failure}, success: ${s.genomes.success}, strategy: ${s.genomes.strategy})`);
  console.log(`    Promoted: ${s.genomes.promoted}`);

  console.log(`  ${C.bold}Incidents${C.reset}`);
  console.log(`    Total: ${s.incidents.total} (observed: ${s.incidents.observed}, distilled: ${s.incidents.distilled}, promoted: ${s.incidents.promoted})`);

  console.log(`  ${C.bold}Infrastructure${C.reset}`);
  console.log(`    Skills: ${s.skills} | Subagents: ${s.subagents} | Hooks: ${s.hooks}`);
  console.log(`    Memory fresh: ${s.memory_fresh ? `${C.green}yes${C.reset}` : `${C.yellow}no${C.reset}`}`);
  console.log(`    AGENTS.md: ${s.has_agents_md ? `${C.green}yes${C.reset}` : `${C.yellow}no${C.reset}`}`);
  console.log(`    Provider config: ${s.has_provider_config ? `${C.green}yes${C.reset}` : `${C.yellow}no${C.reset}`}`);
  console.log();
}

// Export for programmatic use
module.exports = { countGenomesByKind, countIncidentsByStatus, calculateScore };

// CLI entry
if (require.main === module) {
  try {
    switch (cmd) {
      case 'generate': cmdGenerate(); break;
      case 'show': cmdShow(); break;
      case 'history': cmdHistory(); break;
      default:
        console.error('Usage: nve-report [generate|show|history] [--json]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
