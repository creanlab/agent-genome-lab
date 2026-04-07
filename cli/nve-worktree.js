#!/usr/bin/env node
/**
 * nve-worktree — Worktree / Sandbox Isolation
 *
 * Run risky modifications in an isolated git worktree.
 * Detects risky operations (file deletion, schema changes, dep changes)
 * and routes them to isolation automatically.
 *
 * Commands:
 *   nve-worktree create [--name <name>]  — Create isolated worktree
 *   nve-worktree list                     — List active worktrees
 *   nve-worktree diff <name>              — Show diff summary for a worktree
 *   nve-worktree merge <name>             — Merge worktree changes back to main
 *   nve-worktree cleanup [--all]          — Remove completed worktrees
 *   nve-worktree is-risky <command>       — Check if a command should run in isolation
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'list';
const ROOT = findProjectRoot();

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Risk Detection ───────────────────────────────────────────────────────────

const RISKY_PATTERNS = [
  { pattern: /\brm\s+(-rf?|--force)\s/, label: 'forced file deletion' },
  { pattern: /\bgit\s+reset\s+--hard/, label: 'hard reset' },
  { pattern: /\bgit\s+push\s+--force/, label: 'force push' },
  { pattern: /\bnpm\s+(uninstall|remove)\b/, label: 'dependency removal' },
  { pattern: /\bschema.*\.(json|yaml|toml)\b.*\b(edit|write|rm|mv)\b/i, label: 'schema modification' },
  { pattern: /\bmigrat(e|ion)\b/i, label: 'database migration' },
  { pattern: /\.env\b.*\b(edit|write|rm|mv)\b/i, label: 'env file modification' },
  { pattern: /package(-lock)?\.json\b.*\b(edit|write)\b/i, label: 'package manifest change' },
];

function isRiskyCommand(command) {
  const matches = RISKY_PATTERNS.filter(p => p.pattern.test(command));
  return { risky: matches.length > 0, reasons: matches.map(m => m.label) };
}

// ─── Git Worktree Operations ──────────────────────────────────────────────────

function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch { return false; }
}

function exec(command) {
  return execSync(command, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
}

function getWorktreeDir() {
  return path.join(ROOT, '.evolution', 'worktrees');
}

function cmdCreate() {
  if (!isGitRepo()) {
    console.error(`${C.red}Not a git repository. Worktree isolation requires git.${C.reset}`);
    process.exit(1);
  }

  const name = getFlag('--name') || `wt-${Date.now().toString(36)}`;
  const wtDir = path.join(getWorktreeDir(), name);

  if (fs.existsSync(wtDir)) {
    console.error(`${C.red}Worktree "${name}" already exists.${C.reset}`);
    process.exit(1);
  }

  const branchName = `worktree/${name}`;
  try {
    exec(`git worktree add "${wtDir}" -b ${branchName}`);

    // Log creation
    const logDir = path.join(ROOT, '.evolution', 'worktree_logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(path.join(logDir, `${name}.json`), JSON.stringify({
      name, branch: branchName, path: wtDir,
      created_at: new Date().toISOString(),
      status: 'active',
    }, null, 2), 'utf8');

    console.log(`${C.green}✓${C.reset} Worktree created: ${C.bold}${name}${C.reset}`);
    console.log(`  Path: ${wtDir}`);
    console.log(`  Branch: ${branchName}`);
    console.log(`${C.dim}Run your risky commands in ${wtDir}${C.reset}`);
  } catch (e) {
    console.error(`${C.red}Failed to create worktree: ${e.message}${C.reset}`);
    process.exit(1);
  }
}

function cmdList() {
  if (!isGitRepo()) {
    console.log(`${C.yellow}Not a git repository.${C.reset}`);
    return;
  }

  const logDir = path.join(ROOT, '.evolution', 'worktree_logs');
  if (!fs.existsSync(logDir)) {
    console.log(`\n${C.dim}No worktrees tracked. Run: nve-worktree create${C.reset}\n`);
    return;
  }

  const logs = fs.readdirSync(logDir).filter(f => f.endsWith('.json'));
  console.log(`\n${C.bold}Active Worktrees${C.reset} (${logs.length})\n`);

  for (const file of logs) {
    try {
      const wt = JSON.parse(fs.readFileSync(path.join(logDir, file), 'utf8'));
      const exists = fs.existsSync(wt.path);
      const status = exists ? `${C.green}active${C.reset}` : `${C.dim}removed${C.reset}`;
      console.log(`  ${C.cyan}●${C.reset} ${C.bold}${wt.name}${C.reset} [${status}]`);
      console.log(`    ${C.dim}Branch: ${wt.branch} | Created: ${wt.created_at}${C.reset}`);
      if (exists) console.log(`    ${C.dim}Path: ${wt.path}${C.reset}`);
      console.log();
    } catch { /* skip */ }
  }
}

function cmdDiff() {
  const name = args[1];
  if (!name) { console.error('Usage: nve-worktree diff <name>'); process.exit(1); }

  const logFile = path.join(ROOT, '.evolution', 'worktree_logs', `${name}.json`);
  if (!fs.existsSync(logFile)) { console.error(`Worktree "${name}" not found.`); process.exit(1); }

  const wt = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  try {
    const diff = execSync(`git diff HEAD...${wt.branch} --stat`, { cwd: ROOT, encoding: 'utf8' });
    console.log(`\n${C.bold}Diff: ${name}${C.reset} (${wt.branch})\n`);
    console.log(diff || `${C.dim}No changes.${C.reset}`);
  } catch (e) {
    console.error(`${C.red}Could not diff: ${e.message}${C.reset}`);
  }
}

function cmdMerge() {
  const name = args[1];
  if (!name) { console.error('Usage: nve-worktree merge <name>'); process.exit(1); }

  const logFile = path.join(ROOT, '.evolution', 'worktree_logs', `${name}.json`);
  if (!fs.existsSync(logFile)) { console.error(`Worktree "${name}" not found.`); process.exit(1); }

  const wt = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  try {
    exec(`git merge ${wt.branch} --no-ff -m "Merge worktree ${name}"`);
    console.log(`${C.green}✓${C.reset} Merged ${wt.branch} into current branch.`);

    // Cleanup
    exec(`git worktree remove "${wt.path}"`);
    exec(`git branch -d ${wt.branch}`);
    wt.status = 'merged';
    wt.merged_at = new Date().toISOString();
    fs.writeFileSync(logFile, JSON.stringify(wt, null, 2), 'utf8');
    console.log(`${C.green}✓${C.reset} Worktree cleaned up.`);
  } catch (e) {
    console.error(`${C.red}Merge failed: ${e.message}${C.reset}`);
    process.exit(1);
  }
}

function cmdCleanup() {
  const logDir = path.join(ROOT, '.evolution', 'worktree_logs');
  if (!fs.existsSync(logDir)) { console.log('No worktrees to clean.'); return; }

  const all = args.includes('--all');
  const logs = fs.readdirSync(logDir).filter(f => f.endsWith('.json'));
  let cleaned = 0;

  for (const file of logs) {
    const logFile = path.join(logDir, file);
    const wt = JSON.parse(fs.readFileSync(logFile, 'utf8'));

    if (all || wt.status === 'merged' || !fs.existsSync(wt.path)) {
      // Remove worktree if still exists
      if (fs.existsSync(wt.path)) {
        try { exec(`git worktree remove "${wt.path}" --force`); } catch { /* ignore */ }
      }
      // Remove log
      fs.unlinkSync(logFile);
      console.log(`${C.green}✓${C.reset} Cleaned: ${wt.name}`);
      cleaned++;
    }
  }
  console.log(`\n${cleaned} worktree(s) cleaned.\n`);
}

function cmdIsRisky() {
  const command = args.slice(1).join(' ');
  if (!command) { console.error('Usage: nve-worktree is-risky <command>'); process.exit(1); }

  const result = isRiskyCommand(command);
  if (result.risky) {
    console.log(`${C.yellow}⚠ RISKY${C.reset}: ${result.reasons.join(', ')}`);
    console.log(`${C.dim}Consider: nve-worktree create --name fix-xxx${C.reset}`);
    process.exit(1);
  } else {
    console.log(`${C.green}✓${C.reset} Command appears safe.`);
  }
}

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] || null;
}

try {
  switch (cmd) {
    case 'create': cmdCreate(); break;
    case 'list': cmdList(); break;
    case 'diff': cmdDiff(); break;
    case 'merge': cmdMerge(); break;
    case 'cleanup': cmdCleanup(); break;
    case 'is-risky': cmdIsRisky(); break;
    default:
      console.error('Usage: nve-worktree [create|list|diff|merge|cleanup|is-risky]');
      process.exit(1);
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}

module.exports = { isRiskyCommand };
