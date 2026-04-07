#!/usr/bin/env node
/**
 * nve-provider — Provider Abstraction Layer CLI
 *
 * Commands:
 *   nve-provider list            — Show all profiles and their resolution status
 *   nve-provider check           — Resolve active profile, check key + reachability
 *   nve-provider set <profile>   — Set active profile in .evolution/provider.json
 *   nve-provider status          — One-line status (for shell prompts / CI)
 *
 * Exit codes:
 *   0  — success / provider available
 *   1  — provider unavailable or error
 */
'use strict';

const {
  PROVIDERS,
  PROFILES,
  loadProviderConfig,
  saveProviderConfig,
  resolveProvider,
  isPlaceholderKey,
  checkReachability,
} = require('./nve-provider-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'check';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function ok(msg) { console.log(`  ${C.green}✓${C.reset} ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); }
function fail(msg) { console.log(`  ${C.red}✗${C.reset} ${msg}`); }
function info(msg) { console.log(`  ${C.cyan}→${C.reset} ${msg}`); }

function keyStatus(providerId) {
  const p = PROVIDERS[providerId];
  if (!p) return { status: 'unknown', display: 'unknown provider' };
  if (!p.env_key) return { status: 'ok', display: 'no key required' };
  const val = process.env[p.env_key];
  if (!val) return { status: 'missing', display: `${p.env_key} not set` };
  if (isPlaceholderKey(val)) return { status: 'placeholder', display: `${p.env_key} is a placeholder` };
  return { status: 'ok', display: `${p.env_key} set (${val.slice(0, 8)}…)` };
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function cmdList() {
  const userConfig = loadProviderConfig();
  const activeProfile = userConfig.active_profile;

  console.log(`\n${C.bold}Provider Profiles${C.reset}\n`);
  const allProfiles = { ...PROFILES, ...userConfig.custom_profiles };

  for (const [id, profile] of Object.entries(allProfiles)) {
    const isActive = id === activeProfile;
    const marker = isActive ? `${C.cyan}●${C.reset}` : ' ';
    const resolved = resolveProvider(id, userConfig);
    const avail = resolved.available
      ? `${C.green}available${C.reset} → ${resolved.provider}/${resolved.model}`
      : `${C.red}unavailable${C.reset} (${resolved.missing_key || 'no provider'})`;

    console.log(`  ${marker} ${C.bold}${id}${C.reset}${isActive ? ' (active)' : ''}`);
    console.log(`    ${C.dim}${profile.description}${C.reset}`);
    console.log(`    ${avail}`);
    if (resolved.fallback_used) {
      console.log(`    ${C.yellow}↩ fallback from ${resolved.fallback_from}${C.reset}`);
    }
    console.log();
  }

  console.log(`${C.dim}Set active profile: nve-provider set <profile>${C.reset}\n`);
}

async function cmdCheck() {
  const userConfig = loadProviderConfig();
  const activeProfile = userConfig.active_profile;
  const resolved = resolveProvider(activeProfile, userConfig);

  console.log(`\n${C.bold}Provider Check — profile: ${activeProfile}${C.reset}\n`);

  // Profile resolution
  if (resolved.available) {
    ok(`Profile resolved: ${resolved.provider} / ${resolved.model}`);
    if (resolved.fallback_used) {
      warn(`Using fallback provider (primary ${resolved.fallback_from} unavailable)`);
    }
  } else {
    fail(`No available provider for profile "${activeProfile}"`);
    if (resolved.missing_key) {
      info(`Set env var: ${resolved.missing_key}`);
    }
    process.exit(1);
  }

  // Key status for primary provider
  const ks = keyStatus(resolved.provider);
  if (ks.status === 'ok') ok(`API key: ${ks.display}`);
  else if (ks.status === 'missing') { fail(`API key: ${ks.display}`); process.exit(1); }
  else if (ks.status === 'placeholder') { fail(`API key: ${ks.display} — replace with a real key`); process.exit(1); }

  // Reachability
  if (resolved.provider && PROVIDERS[resolved.provider]) {
    info(`Checking reachability of ${PROVIDERS[resolved.provider].base_url}…`);
    const reach = await checkReachability(resolved.provider);
    if (reach.reachable) {
      ok(`Reachable (${reach.latency_ms}ms)`);
    } else {
      warn(`Unreachable: ${reach.error} (offline-eval or competition-safe profile may still work)`);
    }
  }

  // Capabilities summary
  const providerDef = PROVIDERS[resolved.provider];
  if (providerDef) {
    const caps = Object.entries(providerDef.capabilities)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ');
    info(`Capabilities: ${caps}`);
  }

  console.log(`\n${C.green}${C.bold}Provider ready.${C.reset}\n`);
}

async function cmdSet() {
  const profileId = args[1];
  const allProfiles = { ...PROFILES, ...(loadProviderConfig().custom_profiles || {}) };

  if (!profileId) {
    console.error('Usage: nve-provider set <profile>');
    console.error('Available profiles: ' + Object.keys(allProfiles).join(', '));
    process.exit(1);
  }

  if (!allProfiles[profileId]) {
    console.error(`Unknown profile: "${profileId}"`);
    console.error('Available: ' + Object.keys(allProfiles).join(', '));
    process.exit(1);
  }

  const config = loadProviderConfig();
  config.active_profile = profileId;
  saveProviderConfig(config);
  console.log(`${C.green}✓${C.reset} Active profile set to "${C.bold}${profileId}${C.reset}"`);
  console.log(`${C.dim}Run nve-provider check to verify availability.${C.reset}`);
}

async function cmdStatus() {
  const userConfig = loadProviderConfig();
  const resolved = resolveProvider(userConfig.active_profile, userConfig);
  if (resolved.available) {
    console.log(`${resolved.profile}:${resolved.provider}/${resolved.model}`);
    process.exit(0);
  } else {
    console.log(`${resolved.profile}:unavailable`);
    process.exit(1);
  }
}

// ─── Entry ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    switch (cmd) {
      case 'list': await cmdList(); break;
      case 'check': await cmdCheck(); break;
      case 'set': await cmdSet(); break;
      case 'status': await cmdStatus(); break;
      default:
        console.error(`Unknown command: ${cmd}`);
        console.error('Usage: nve-provider [list|check|set|status]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
})();
