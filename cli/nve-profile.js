#!/usr/bin/env node
/**
 * nve-profile — Profile Management CLI
 *
 * Commands:
 *   nve-profile list                    — Show all available profiles
 *   nve-profile init [--profile <id>]   — Initialize/switch active profile
 *   nve-profile recommend               — Goal-based profile recommendation
 *   nve-profile auto                    — Auto-detect best profile for current environment
 *   nve-profile validate                — Validate active profile vs provider layer
 *   nve-profile show                    — Show active profile details
 *
 * Reads from .evolution/provider.json; writes back on init/switch.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  PROVIDERS,
  PROFILES,
  loadProviderConfig,
  saveProviderConfig,
  resolveProvider,
  checkReachability,
} = require('./nve-provider-config');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'show';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

function detectEnvironment() {
  const env = {
    has_anthropic_key: !!process.env.ANTHROPIC_API_KEY,
    has_openai_key: !!process.env.OPENAI_API_KEY,
    has_google_key: !!process.env.GOOGLE_API_KEY,
    is_ci: !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI),
    is_docker: fs.existsSync('/.dockerenv'),
    has_evolution: fs.existsSync(path.join(findProjectRoot(), '.evolution')),
    platform: process.platform,
    node_version: process.versions.node,
  };
  // Check if Ollama is likely running (port 11434)
  env.ollama_likely = false; // Can't check synchronously without net, set in async
  return env;
}

function scoreProfile(profileId, env) {
  const profile = PROFILES[profileId];
  if (!profile) return -1;

  let score = 0;

  // Availability — can we actually resolve this profile?
  const resolved = resolveProvider(profileId);
  if (resolved.available) score += 50;
  if (!resolved.fallback_used) score += 20;

  // Match to environment
  if (env.is_ci && profileId === 'offline-eval') score += 30;
  if (env.is_ci && !profile.allow_external) score += 10;
  if (!env.is_ci && profileId === 'research-web' && env.has_anthropic_key) score += 25;
  if (!env.is_ci && profileId === 'local-fast') score += 5;
  if (env.has_anthropic_key && profile.primary_provider === 'anthropic') score += 15;
  if (env.has_openai_key && profile.primary_provider === 'openai') score += 10;
  if (env.has_google_key && profile.primary_provider === 'google') score += 10;

  return score;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function cmdList() {
  const config = loadProviderConfig();
  const allProfiles = { ...PROFILES, ...config.custom_profiles };

  console.log(`\n${C.bold}Available Profiles${C.reset}\n`);
  for (const [id, profile] of Object.entries(allProfiles)) {
    const active = id === config.active_profile ? ` ${C.cyan}(active)${C.reset}` : '';
    const resolved = resolveProvider(id, config);
    const status = resolved.available ? `${C.green}ready${C.reset}` : `${C.red}unavailable${C.reset}`;
    const provider = resolved.provider ? `${resolved.provider}/${resolved.model}` : 'none';
    console.log(`  ${C.bold}${id}${C.reset}${active}`);
    console.log(`    ${C.dim}${profile.description}${C.reset}`);
    console.log(`    Status: ${status} | Provider: ${provider}`);
    console.log();
  }
}

function cmdInit() {
  const profileId = getFlag('--profile') || args[1];
  const allProfiles = { ...PROFILES, ...(loadProviderConfig().custom_profiles || {}) };

  if (!profileId) {
    // If no profile specified, auto-detect
    console.log(`${C.dim}No profile specified, auto-selecting...${C.reset}`);
    return cmdAuto();
  }

  if (!allProfiles[profileId]) {
    console.error(`${C.red}Unknown profile: "${profileId}"${C.reset}`);
    console.error(`Available: ${Object.keys(allProfiles).join(', ')}`);
    process.exit(1);
  }

  const config = loadProviderConfig();
  config.active_profile = profileId;
  saveProviderConfig(config);

  const resolved = resolveProvider(profileId, config);
  if (resolved.available) {
    console.log(`${C.green}✓${C.reset} Profile set to ${C.bold}${profileId}${C.reset}`);
    console.log(`  Provider: ${resolved.provider}/${resolved.model}`);
  } else {
    console.log(`${C.yellow}⚠${C.reset} Profile set to ${C.bold}${profileId}${C.reset}, but provider is unavailable`);
    console.log(`  ${C.dim}Fix: ${resolved.missing_key ? `export ${resolved.missing_key}=<key>` : 'Check provider availability'}${C.reset}`);
  }
}

function cmdRecommend() {
  const env = detectEnvironment();
  const allProfiles = { ...PROFILES, ...(loadProviderConfig().custom_profiles || {}) };
  const scored = Object.keys(allProfiles)
    .map(id => ({ id, score: scoreProfile(id, env) }))
    .sort((a, b) => b.score - a.score);

  console.log(`\n${C.bold}Profile Recommendations${C.reset}`);
  console.log(`${C.dim}Based on current environment: CI=${env.is_ci}, Anthropic=${env.has_anthropic_key}, OpenAI=${env.has_openai_key}${C.reset}\n`);

  for (const { id, score } of scored) {
    const bar = '█'.repeat(Math.max(1, Math.round(score / 10)));
    const icon = score >= 50 ? C.green : score >= 25 ? C.yellow : C.red;
    console.log(`  ${icon}${bar}${C.reset} ${C.bold}${id}${C.reset} (score: ${score})`);
    console.log(`    ${C.dim}${allProfiles[id].description}${C.reset}`);
  }

  const best = scored[0];
  console.log(`\n${C.cyan}→ Recommended:${C.reset} ${C.bold}${best.id}${C.reset}`);
  console.log(`${C.dim}Apply with: nve-profile init --profile ${best.id}${C.reset}\n`);
}

function cmdAuto() {
  const env = detectEnvironment();
  const allProfiles = { ...PROFILES, ...(loadProviderConfig().custom_profiles || {}) };
  const scored = Object.keys(allProfiles)
    .map(id => ({ id, score: scoreProfile(id, env) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const config = loadProviderConfig();
  config.active_profile = best.id;
  saveProviderConfig(config);

  const resolved = resolveProvider(best.id, config);
  console.log(`${C.green}✓${C.reset} Auto-selected profile: ${C.bold}${best.id}${C.reset} (score: ${best.score})`);
  if (resolved.available) {
    console.log(`  Provider: ${resolved.provider}/${resolved.model}`);
  } else {
    console.log(`  ${C.yellow}Provider unavailable — will use fallback or offline mode${C.reset}`);
  }
}

async function cmdValidate() {
  const config = loadProviderConfig();
  const profileId = config.active_profile;
  const allProfiles = { ...PROFILES, ...config.custom_profiles };
  const profile = allProfiles[profileId];

  console.log(`\n${C.bold}Validating profile: ${profileId}${C.reset}\n`);

  if (!profile) {
    console.log(`${C.red}✗${C.reset} Unknown profile: ${profileId}`);
    process.exit(1);
  }

  const issues = [];

  // Resolve provider
  const resolved = resolveProvider(profileId, config);
  if (resolved.available) {
    console.log(`${C.green}✓${C.reset} Provider resolved: ${resolved.provider}/${resolved.model}`);
  } else {
    console.log(`${C.red}✗${C.reset} Provider unavailable`);
    issues.push(`Set ${resolved.missing_key || 'a valid provider'}`);
  }

  // Fallback sanity
  if (resolved.fallback_used) {
    console.log(`${C.yellow}⚠${C.reset} Using fallback (primary: ${resolved.fallback_from})`);
  }

  // Capabilities check
  if (profile.require_capabilities && profile.require_capabilities.length > 0 && resolved.provider) {
    const caps = PROVIDERS[resolved.provider]?.capabilities || {};
    for (const cap of profile.require_capabilities) {
      if (caps[cap]) {
        console.log(`${C.green}✓${C.reset} Capability: ${cap}`);
      } else {
        console.log(`${C.red}✗${C.reset} Missing capability: ${cap}`);
        issues.push(`Provider ${resolved.provider} lacks capability: ${cap}`);
      }
    }
  }

  // Reachability
  if (resolved.provider && profile.allow_external) {
    const reach = await checkReachability(resolved.provider);
    if (reach.reachable) {
      console.log(`${C.green}✓${C.reset} Reachable (${reach.latency_ms}ms)`);
    } else {
      console.log(`${C.yellow}⚠${C.reset} Unreachable: ${reach.error}`);
    }
  }

  // Result
  if (issues.length === 0) {
    console.log(`\n${C.green}${C.bold}Profile "${profileId}" is valid and operational.${C.reset}\n`);
  } else {
    console.log(`\n${C.red}${C.bold}Issues found:${C.reset}`);
    issues.forEach(i => console.log(`  ${C.red}→${C.reset} ${i}`));
    console.log();
    process.exit(1);
  }
}

function cmdShow() {
  const config = loadProviderConfig();
  const profileId = config.active_profile;
  const allProfiles = { ...PROFILES, ...config.custom_profiles };
  const profile = allProfiles[profileId];
  const resolved = resolveProvider(profileId, config);

  console.log(`\n${C.bold}Active Profile: ${profileId}${C.reset}`);
  console.log(`  Description:  ${profile.description}`);
  console.log(`  Provider:     ${resolved.provider || 'none'}`);
  console.log(`  Model:        ${resolved.model || 'none'}`);
  console.log(`  Available:    ${resolved.available ? `${C.green}yes${C.reset}` : `${C.red}no${C.reset}`}`);
  console.log(`  External:     ${profile.allow_external ? 'yes' : 'no'}`);
  console.log(`  Max tokens:   ${profile.max_tokens}`);
  console.log(`  Timeout:      ${profile.timeout_ms}ms`);
  if (profile.require_capabilities?.length > 0) {
    console.log(`  Required:     ${profile.require_capabilities.join(', ')}`);
  }
  console.log(`  Fallback:     ${profile.fallback_chain?.join(' → ') || 'none'}`);
  console.log();
}

// ─── Entry ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    switch (cmd) {
      case 'list': cmdList(); break;
      case 'init': cmdInit(); break;
      case 'recommend': cmdRecommend(); break;
      case 'auto': cmdAuto(); break;
      case 'validate': await cmdValidate(); break;
      case 'show': cmdShow(); break;
      default:
        console.error(`Unknown command: ${cmd}`);
        console.error('Usage: nve-profile [list|init|recommend|auto|validate|show]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
})();
