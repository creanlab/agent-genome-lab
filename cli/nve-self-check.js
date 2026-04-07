#!/usr/bin/env node
/**
 * nve-self-check — Structural Smoke Test & Strict Validation
 *
 * Commands:
 *   nve-self-check smoke   — Fast (≤5s) critical path checks
 *   nve-self-check strict  — Full validation of all .evolution/ data
 *   nve-self-check report  — Generate health report with score (0-100)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'smoke';
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};
const jsonMode = args.includes('--json');
const quietMode = args.includes('--quiet');

function log(msg) { if (!quietMode && !jsonMode) console.log(msg); }

// ─── Check Helpers ───────────────────────────────────────────────────────────

function check(name, fn) {
  try {
    const result = fn();
    return { name, status: result ? 'pass' : 'fail', detail: null };
  } catch (e) {
    return { name, status: 'fail', detail: e.message };
  }
}

function warn(name, fn) {
  try {
    const result = fn();
    return { name, status: result ? 'pass' : 'warn', detail: null };
  } catch (e) {
    return { name, status: 'warn', detail: e.message };
  }
}

// ─── Smoke Checks ────────────────────────────────────────────────────────────

function runSmoke() {
  const root = findProjectRoot();
  const evoDir = path.join(root, '.evolution');
  const results = [];

  results.push(check('.evolution/ exists', () => fs.existsSync(evoDir)));

  results.push(warn('failure_genomes/ or incidents/ has data', () => {
    const gDir = path.join(evoDir, 'failure_genomes');
    const iDir = path.join(evoDir, 'incidents');
    const gCount = fs.existsSync(gDir) ? fs.readdirSync(gDir).filter(f => f.endsWith('.json')).length : 0;
    const iCount = fs.existsSync(iDir) ? fs.readdirSync(iDir).filter(f => f.endsWith('.json')).length : 0;
    return gCount > 0 || iCount > 0;
  }));

  results.push(warn('MEMORY.md exists and non-empty', () => {
    const mp = path.join(evoDir, 'MEMORY.md');
    return fs.existsSync(mp) && fs.readFileSync(mp, 'utf8').trim().length > 0;
  }));

  // Check schemas exist
  const schemasDir = path.join(root, 'schemas');
  if (fs.existsSync(schemasDir)) {
    results.push(check('schemas/ has runtime + genome dirs', () => {
      return fs.existsSync(path.join(schemasDir, 'runtime')) &&
             fs.existsSync(path.join(schemasDir, 'genome'));
    }));
  } else {
    // Check in node_modules or global
    const globalSchemas = path.resolve(__dirname, '..', 'schemas');
    results.push(check('schemas/ reachable', () => fs.existsSync(globalSchemas)));
  }

  results.push(warn('AGENTS.md exists', () => fs.existsSync(path.join(root, 'AGENTS.md'))));

  return results;
}

// ─── Strict Checks ───────────────────────────────────────────────────────────

function runStrict() {
  const root = findProjectRoot();
  const evoDir = path.join(root, '.evolution');
  const results = runSmoke(); // Include smoke checks

  // Validate all genome JSONs
  const genomesDir = path.join(evoDir, 'failure_genomes');
  if (fs.existsSync(genomesDir)) {
    const files = fs.readdirSync(genomesDir).filter(f => f.endsWith('.json'));
    let valid = 0, invalid = 0;
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(genomesDir, file), 'utf8'));
        if (data.genome_id && data.family) valid++;
        else invalid++;
      } catch { invalid++; }
    }
    results.push({
      name: `failure_genomes/ valid (${valid}/${files.length})`,
      status: invalid === 0 ? 'pass' : 'warn',
      detail: invalid > 0 ? `${invalid} invalid genome files` : null,
    });
  }

  // Validate incidents
  const incDir = path.join(evoDir, 'incidents');
  if (fs.existsSync(incDir)) {
    const files = fs.readdirSync(incDir).filter(f => f.endsWith('.json'));
    let valid = 0, invalid = 0;
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(incDir, file), 'utf8'));
        if (data.event_id && data.status && data.stage) valid++;
        else invalid++;
      } catch { invalid++; }
    }
    results.push({
      name: `incidents/ valid (${valid}/${files.length})`,
      status: invalid === 0 ? 'pass' : 'warn',
      detail: invalid > 0 ? `${invalid} invalid incident files` : null,
    });
  }

  // Validate subagent configs
  const saDir = path.join(evoDir, 'subagents');
  if (fs.existsSync(saDir)) {
    const files = fs.readdirSync(saDir).filter(f => f.endsWith('.json'));
    let valid = 0, invalid = 0;
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(saDir, file), 'utf8'));
        if (data.name && data.allowed_tools && data.system_prompt) valid++;
        else invalid++;
      } catch { invalid++; }
    }
    results.push({
      name: `subagents/ valid (${valid}/${files.length})`,
      status: invalid === 0 ? 'pass' : 'warn',
      detail: invalid > 0 ? `${invalid} invalid subagent configs` : null,
    });
  }

  // Validate hook configs
  const hooksDir = path.join(evoDir, 'hooks');
  if (fs.existsSync(hooksDir)) {
    const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.json'));
    let valid = 0, invalid = 0;
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(hooksDir, file), 'utf8'));
        if (data.name && data.event_type) valid++;
        else invalid++;
      } catch { invalid++; }
    }
    results.push({
      name: `hooks/ valid (${valid}/${files.length})`,
      status: invalid === 0 ? 'pass' : 'warn',
      detail: invalid > 0 ? `${invalid} invalid hook configs` : null,
    });
  }

  // MEMORY.md well-formed (has ## headings)
  const memPath = path.join(evoDir, 'MEMORY.md');
  if (fs.existsSync(memPath)) {
    const content = fs.readFileSync(memPath, 'utf8');
    results.push(warn('MEMORY.md has sections (## headings)', () => /^##\s+/m.test(content)));
  }

  // No placeholder keys in .evolution/ JSON files
  results.push(check('no placeholder API keys in configs', () => {
    const configFile = path.join(evoDir, 'provider.json');
    if (!fs.existsSync(configFile)) return true;
    const content = fs.readFileSync(configFile, 'utf8');
    const placeholders = ['your_key', 'your-key', 'placeholder', 'changeme', 'xxxxxxxx', 'sk-...'];
    return !placeholders.some(p => content.toLowerCase().includes(p));
  }));

  return results;
}

// ─── Report ──────────────────────────────────────────────────────────────────

function generateReport() {
  const root = findProjectRoot();
  const evoDir = path.join(root, '.evolution');
  const results = runStrict();

  const passCount = results.filter(r => r.status === 'pass').length;
  const warnCount = results.filter(r => r.status === 'warn').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const total = results.length;
  const score = Math.round((passCount / total) * 100);

  const report = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    project_root: root,
    score,
    summary: { total, pass: passCount, warn: warnCount, fail: failCount },
    checks: results,
  };

  // Save report
  const auditsDir = path.join(evoDir, 'audits');
  if (!fs.existsSync(auditsDir)) fs.mkdirSync(auditsDir, { recursive: true });
  const outFile = path.join(auditsDir, `SELFCHECK-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');

  return { report, outFile };
}

// ─── Output ──────────────────────────────────────────────────────────────────

function printResults(results, title) {
  if (jsonMode) {
    console.log(JSON.stringify({ checks: results }, null, 2));
    return;
  }

  log(`\n${C.bold}${title}${C.reset}\n`);
  const icons = { pass: `${C.green}✓${C.reset}`, warn: `${C.yellow}!${C.reset}`, fail: `${C.red}✗${C.reset}` };
  for (const r of results) {
    log(`  ${icons[r.status] || '?'} ${r.name}${r.detail ? ` ${C.dim}(${r.detail})${C.reset}` : ''}`);
  }
  const pass = results.filter(r => r.status === 'pass').length;
  const warn = results.filter(r => r.status === 'warn').length;
  const fail = results.filter(r => r.status === 'fail').length;
  log(`\n  ${C.green}${pass} pass${C.reset}  ${C.yellow}${warn} warn${C.reset}  ${C.red}${fail} fail${C.reset}\n`);

  if (quietMode) {
    process.exit(fail > 0 ? 1 : 0);
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { runSmoke, runStrict, generateReport };

// ─── CLI Entry ───────────────────────────────────────────────────────────────

if (require.main === module) {
  try {
    switch (cmd) {
      case 'smoke': {
        const results = runSmoke();
        printResults(results, 'Smoke Check');
        break;
      }
      case 'strict': {
        const results = runStrict();
        printResults(results, 'Strict Validation');
        break;
      }
      case 'report': {
        const { report, outFile } = generateReport();
        if (jsonMode) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          log(`\n${C.bold}Health Report${C.reset} — Score: ${report.score >= 80 ? C.green : report.score >= 50 ? C.yellow : C.red}${report.score}/100${C.reset}\n`);
          printResults(report.checks, 'Checks');
          log(`${C.green}✓${C.reset} Saved to ${outFile}\n`);
        }
        break;
      }
      default:
        console.error('Usage: nve-self-check [smoke|strict|report] [--json] [--quiet]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
