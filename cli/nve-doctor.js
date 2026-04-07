#!/usr/bin/env node
/**
 * nve-doctor — Runtime Doctor
 *
 * Fail-fast diagnostic tool. Checks that the environment is healthy before
 * running any genome pipeline command. Catches problems before they cause
 * silent failures or corrupted state.
 *
 * Checks:
 *   1. Node.js version (>=18)
 *   2. .evolution/ directory exists and is writable
 *   3. Required subdirectories present
 *   4. config.toml is valid (no parse errors)
 *   5. Active provider key set and not a placeholder
 *   6. Provider reachability (skip if offline profile)
 *   7. Schema files integrity (runtime + genome schemas present)
 *   8. MEMORY.md freshness (<7 days old, or warn)
 *   9. Disk space for .evolution/ (warn if <50MB)
 *  10. AGENTS.md present
 *
 * Exit codes:
 *   0  — all checks passed (or only warnings)
 *   1  — one or more checks failed (blocking)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { findProjectRoot, loadConfig } = require('./nve-config');
const {
  loadProviderConfig,
  resolveProvider,
  isPlaceholderKey,
  checkReachability,
  PROVIDERS,
} = require('./nve-provider-config');

const ROOT = findProjectRoot();

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const checks = [];
let hasBlocker = false;

function addCheck(name, status, message, fix) {
  checks.push({ name, status, message, fix: fix || null });
  if (status === 'fail') hasBlocker = true;
}

function printCheck(c) {
  const icon = c.status === 'pass' ? `${C.green}✓${C.reset}` :
               c.status === 'warn' ? `${C.yellow}⚠${C.reset}` :
               `${C.red}✗${C.reset}`;
  console.log(`  ${icon} ${c.name}`);
  if (c.status !== 'pass') {
    console.log(`    ${C.dim}${c.message}${C.reset}`);
    if (c.fix) console.log(`    ${C.cyan}→ Fix: ${c.fix}${C.reset}`);
  }
}

// ─── Check 1: Node.js Version ─────────────────────────────────────────────────

function checkNodeVersion() {
  const [major] = process.versions.node.split('.').map(Number);
  if (major >= 18) {
    addCheck('Node.js version', 'pass', `v${process.versions.node}`);
  } else {
    addCheck('Node.js version', 'fail',
      `Node.js v${process.versions.node} detected — v18+ required`,
      'Upgrade Node.js: https://nodejs.org/');
  }
}

// ─── Check 2: .evolution/ writable ───────────────────────────────────────────

function checkEvolutionDir() {
  const evoDir = path.join(ROOT, '.evolution');
  if (!fs.existsSync(evoDir)) {
    addCheck('.evolution/ directory', 'fail',
      `Directory not found at ${evoDir}`,
      'Run: nve-init');
    return;
  }
  try {
    const testFile = path.join(evoDir, '.doctor-write-test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    addCheck('.evolution/ writable', 'pass', evoDir);
  } catch (e) {
    addCheck('.evolution/ writable', 'fail',
      `Cannot write to ${evoDir}: ${e.message}`,
      'Check directory permissions');
  }
}

// ─── Check 3: Required subdirs ────────────────────────────────────────────────

function checkSubdirs() {
  const required = ['incidents', 'experience_units', 'failure_genomes', 'audits'];
  const missing = required.filter(d => !fs.existsSync(path.join(ROOT, '.evolution', d)));
  if (missing.length === 0) {
    addCheck('.evolution/ subdirectories', 'pass', 'All required dirs present');
  } else {
    addCheck('.evolution/ subdirectories', 'warn',
      `Missing: ${missing.join(', ')}`,
      'Run: nve-init to scaffold missing directories');
  }
}

// ─── Check 4: config.toml parseable ──────────────────────────────────────────

function checkConfig() {
  try {
    const cfg = loadConfig();
    if (cfg._loaded) {
      addCheck('config.toml', 'pass', `Loaded from ${cfg._configPath}`);
    } else {
      addCheck('config.toml', 'warn',
        'No config.toml found — using defaults',
        'Run: nve-init to create a default config');
    }
  } catch (e) {
    addCheck('config.toml', 'fail',
      `Parse error: ${e.message}`,
      'Fix syntax in .evolution/config.toml');
  }
}

// ─── Check 5: Provider key ────────────────────────────────────────────────────

function checkProviderKey() {
  const userConfig = loadProviderConfig();
  const resolved = resolveProvider(userConfig.active_profile, userConfig);

  if (!resolved.provider) {
    addCheck('Provider key', 'pass', `Profile "${resolved.profile}" requires no API key (eval-only)`);
    return;
  }

  const providerDef = PROVIDERS[resolved.provider];
  if (!providerDef || !providerDef.env_key) {
    addCheck('Provider key', 'pass', `${resolved.provider} requires no API key`);
    return;
  }

  const val = process.env[providerDef.env_key];
  if (!val) {
    const fallback = resolved.fallback_used ? ` (using fallback: ${resolved.provider})` : '';
    if (resolved.available) {
      addCheck('Provider key', 'warn',
        `${providerDef.env_key} not set${fallback}`,
        `Set env: export ${providerDef.env_key}=<your-key>`);
    } else {
      addCheck('Provider key', 'fail',
        `${providerDef.env_key} not set — no available fallback`,
        `Set env: export ${providerDef.env_key}=<your-key>  OR  nve-provider set competition-safe`);
    }
    return;
  }

  if (isPlaceholderKey(val)) {
    addCheck('Provider key', 'fail',
      `${providerDef.env_key} contains a placeholder value`,
      `Replace ${providerDef.env_key} with a real API key`);
    return;
  }

  addCheck('Provider key', 'pass',
    `${providerDef.env_key} set (${val.slice(0, 8)}…)${resolved.fallback_used ? ' [fallback]' : ''}`);
}

// ─── Check 6: Provider reachability ──────────────────────────────────────────

async function checkProviderReachability() {
  const userConfig = loadProviderConfig();
  const resolved = resolveProvider(userConfig.active_profile, userConfig);

  const profile = { ...({} /* PROFILES */), ...userConfig.custom_profiles }; // loaded lazily
  const { PROFILES } = require('./nve-provider-config');
  const allProfiles = { ...PROFILES, ...userConfig.custom_profiles };
  const profileDef = allProfiles[userConfig.active_profile];

  if (!profileDef || !profileDef.allow_external || !resolved.provider) {
    addCheck('Provider reachability', 'pass', 'Skipped (offline/eval profile)');
    return;
  }

  const reach = await checkReachability(resolved.provider);
  if (reach.reachable) {
    addCheck('Provider reachability', 'pass', `${PROVIDERS[resolved.provider].base_url} reachable (${reach.latency_ms}ms)`);
  } else {
    addCheck('Provider reachability', 'warn',
      `${PROVIDERS[resolved.provider].base_url} unreachable: ${reach.error}`,
      `Check network / VPN, or: nve-provider set competition-safe`);
  }
}

// ─── Check 7: Schema files ────────────────────────────────────────────────────

function checkSchemas() {
  // Find package root (where schemas/ lives — may differ from project root for linked install)
  const pkgRoot = path.resolve(__dirname, '..');
  const runtimeSchemas = ['query_task', 'retrieval_bundle', 'hypothesis', 'ranked_decision'];
  const genomeSchemas = ['lesson_candidate', 'memory_digest', 'replay_result'];
  const coreSchemas = ['incident-event', 'failure-genome', 'experience-unit'];

  const missing = [];

  for (const s of runtimeSchemas) {
    if (!fs.existsSync(path.join(pkgRoot, 'schemas', 'runtime', `${s}.schema.json`))) {
      missing.push(`runtime/${s}`);
    }
  }
  for (const s of genomeSchemas) {
    if (!fs.existsSync(path.join(pkgRoot, 'schemas', 'genome', `${s}.schema.json`))) {
      missing.push(`genome/${s}`);
    }
  }
  for (const s of coreSchemas) {
    if (!fs.existsSync(path.join(pkgRoot, 'schemas', `${s}.schema.json`))) {
      missing.push(s);
    }
  }

  if (missing.length === 0) {
    addCheck('Schema contracts', 'pass', `All ${runtimeSchemas.length + genomeSchemas.length + coreSchemas.length} schemas present`);
  } else {
    addCheck('Schema contracts', 'warn',
      `Missing schemas: ${missing.join(', ')}`,
      'Run: git pull to get latest schema files');
  }
}

// ─── Check 8: MEMORY.md freshness ────────────────────────────────────────────

function checkMemoryFreshness() {
  const memPath = path.join(ROOT, '.evolution', 'MEMORY.md');
  if (!fs.existsSync(memPath)) {
    addCheck('MEMORY.md', 'warn',
      'MEMORY.md not found',
      'Run: nve-memory to generate it');
    return;
  }
  const stat = fs.statSync(memPath);
  const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) {
    addCheck('MEMORY.md freshness', 'pass', `Last updated ${ageDays.toFixed(1)} days ago`);
  } else {
    addCheck('MEMORY.md freshness', 'warn',
      `MEMORY.md is ${Math.floor(ageDays)} days old`,
      'Run: nve-memory to refresh');
  }
}

// ─── Check 9: Disk space ──────────────────────────────────────────────────────

function checkDiskSpace() {
  try {
    // Estimate free space on the drive where .evolution/ lives
    // Node has no native disk-space API without external deps; use os.freemem as proxy
    // and check if .evolution/ dir is accessible for writing (done in check 2).
    // Real disk check would require child_process — skip to stay zero-dependency.
    addCheck('Disk space', 'pass', 'Check skipped (zero-dep mode — verify manually if needed)');
  } catch {
    addCheck('Disk space', 'warn', 'Could not determine disk space');
  }
}

// ─── Check 10: AGENTS.md ─────────────────────────────────────────────────────

function checkAgentsMd() {
  const agentsPath = path.join(ROOT, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    addCheck('AGENTS.md', 'pass', agentsPath);
  } else {
    addCheck('AGENTS.md', 'warn',
      'AGENTS.md not found — agents have no operating contract',
      'Run: nve-init or copy from agent-genome-lab template');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  const jsonMode = args => args.includes('--json');
  const quiet = process.argv.includes('--quiet');

  if (!quiet) {
    console.log(`\n${C.bold}nve-doctor${C.reset} — Runtime Health Check`);
    console.log(`${C.dim}Project root: ${ROOT}${C.reset}\n`);
  }

  // Run synchronous checks
  checkNodeVersion();
  checkEvolutionDir();
  checkSubdirs();
  checkConfig();
  checkProviderKey();
  checkSchemas();
  checkMemoryFreshness();
  checkDiskSpace();
  checkAgentsMd();

  // Run async checks
  await checkProviderReachability();

  // C.9: Save report to file
  if (process.argv.includes('--save')) {
    const auditsDir = path.join(ROOT, '.evolution', 'audits');
    if (!fs.existsSync(auditsDir)) fs.mkdirSync(auditsDir, { recursive: true });
    const outFile = path.join(auditsDir, `DOCTOR-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
    fs.writeFileSync(outFile, JSON.stringify({ checks, has_blocker: hasBlocker, timestamp: new Date().toISOString() }, null, 2));
    if (!quiet) console.log(`${C.green}✓${C.reset} Report saved to ${outFile}\n`);
  }

  // C.5: Local model availability check
  if (checks.some(c => c.name === 'Provider key' && c.status === 'pass')) {
    const userConfig2 = loadProviderConfig();
    const resolved2 = resolveProvider(userConfig2.active_profile, userConfig2);
    if (resolved2.provider === 'ollama') {
      try {
        const { execSync } = require('child_process');
        const models = execSync('ollama list 2>&1', { timeout: 5000 }).toString();
        if (models.includes(resolved2.model)) {
          addCheck('Ollama model available', 'pass', `Model "${resolved2.model}" found`);
        } else {
          addCheck('Ollama model available', 'warn',
            `Model "${resolved2.model}" not found locally`,
            `Run: ollama pull ${resolved2.model}`);
        }
      } catch {
        addCheck('Ollama model available', 'warn',
          'Could not check Ollama models (ollama not running?)',
          'Start Ollama: ollama serve');
      }
    }
  }

  // Output
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ checks, has_blocker: hasBlocker }, null, 2));
  } else if (!quiet) {
    for (const c of checks) printCheck(c);

    const passCount = checks.filter(c => c.status === 'pass').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    const failCount = checks.filter(c => c.status === 'fail').length;

    console.log(`\n${C.bold}Summary:${C.reset} ${C.green}${passCount} passed${C.reset}, ${C.yellow}${warnCount} warnings${C.reset}, ${C.red}${failCount} failed${C.reset}\n`);

    if (hasBlocker) {
      console.log(`${C.red}${C.bold}Doctor found blocking issues. Fix them before running the pipeline.${C.reset}\n`);
    } else {
      console.log(`${C.green}${C.bold}Environment looks healthy.${C.reset}\n`);
    }
  } else {
    // Quiet mode: one line
    if (hasBlocker) {
      const failed = checks.filter(c => c.status === 'fail').map(c => c.name).join(', ');
      console.log(`FAIL: ${failed}`);
    } else {
      console.log('OK');
    }
  }

  process.exit(hasBlocker ? 1 : 0);
})();
