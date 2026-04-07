/**
 * nve-provider-config.js — Provider Abstraction Layer
 *
 * Defines the capability matrix for each supported LLM provider,
 * 5 built-in profiles, fallback strategy, and model selection logic.
 *
 * Zero external dependencies. Reads from .evolution/provider.json if present.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

// ─── Capability Matrix ────────────────────────────────────────────────────────

const PROVIDERS = {
  anthropic: {
    id: 'anthropic',
    display_name: 'Anthropic Claude',
    base_url: 'https://api.anthropic.com',
    env_key: 'ANTHROPIC_API_KEY',
    models: {
      default: 'claude-sonnet-4-6',
      fast: 'claude-haiku-4-5-20251001',
      powerful: 'claude-opus-4-6',
      code: 'claude-sonnet-4-6',
    },
    capabilities: {
      streaming: true,
      tools: true,
      reasoning: true,
      json_mode: true,
      images: true,
      large_context: true,   // 200k token context
      computer_use: true,
    },
  },
  google: {
    id: 'google',
    display_name: 'Google Gemini (Antigravity)',
    base_url: 'https://generativelanguage.googleapis.com',
    env_key: 'GOOGLE_API_KEY',
    models: {
      default: 'gemini-2.0-flash',
      fast: 'gemini-2.0-flash',
      powerful: 'gemini-2.5-pro',
      code: 'gemini-2.0-flash',
    },
    capabilities: {
      streaming: true,
      tools: true,
      reasoning: false,
      json_mode: true,
      images: true,
      large_context: true,   // 1M token context
      computer_use: false,
    },
  },
  openai: {
    id: 'openai',
    display_name: 'OpenAI',
    base_url: 'https://api.openai.com',
    env_key: 'OPENAI_API_KEY',
    models: {
      default: 'gpt-4o',
      fast: 'gpt-4o-mini',
      powerful: 'gpt-4o',
      code: 'gpt-4o',
    },
    capabilities: {
      streaming: true,
      tools: true,
      reasoning: true,       // o1/o3 series
      json_mode: true,
      images: true,
      large_context: false,
      computer_use: false,
    },
  },
  ollama: {
    id: 'ollama',
    display_name: 'Ollama (local)',
    base_url: 'http://localhost:11434',
    env_key: null,           // No API key required
    models: {
      default: 'llama3.2',
      fast: 'llama3.2',
      powerful: 'llama3.1:70b',
      code: 'codellama',
    },
    capabilities: {
      streaming: true,
      tools: false,
      reasoning: false,
      json_mode: true,
      images: false,
      large_context: false,
      computer_use: false,
    },
  },
  lmstudio: {
    id: 'lmstudio',
    display_name: 'LM Studio (local)',
    base_url: 'http://localhost:1234',
    env_key: null,
    models: {
      default: 'local-model',
      fast: 'local-model',
      powerful: 'local-model',
      code: 'local-model',
    },
    capabilities: {
      streaming: true,
      tools: false,
      reasoning: false,
      json_mode: true,
      images: false,
      large_context: false,
      computer_use: false,
    },
  },
};

// ─── 5 Built-in Profiles ─────────────────────────────────────────────────────

const PROFILES = {
  'competition-safe': {
    id: 'competition-safe',
    description: 'No external calls. Local models only. Safe for CTF/competition environments.',
    primary_provider: 'ollama',
    model_tier: 'default',
    fallback_chain: ['lmstudio'],
    allow_external: false,
    require_capabilities: [],
    max_tokens: 4096,
    timeout_ms: 30000,
  },
  'local-fast': {
    id: 'local-fast',
    description: 'Fast local inference for quick edits, autocomplete, and low-stakes tasks.',
    primary_provider: 'ollama',
    model_tier: 'fast',
    fallback_chain: ['lmstudio', 'anthropic'],
    allow_external: true,
    require_capabilities: [],
    max_tokens: 2048,
    timeout_ms: 15000,
  },
  'local-code': {
    id: 'local-code',
    description: 'Local code-focused model (CodeLlama or equivalent) for code generation tasks.',
    primary_provider: 'ollama',
    model_tier: 'code',
    fallback_chain: ['lmstudio', 'anthropic'],
    allow_external: true,
    require_capabilities: [],
    max_tokens: 8192,
    timeout_ms: 60000,
  },
  'research-web': {
    id: 'research-web',
    description: 'Most capable remote model. For complex reasoning, research, and architecture tasks.',
    primary_provider: 'anthropic',
    model_tier: 'powerful',
    fallback_chain: ['google', 'openai'],
    allow_external: true,
    require_capabilities: ['tools', 'reasoning', 'large_context'],
    max_tokens: 16384,
    timeout_ms: 120000,
  },
  'offline-eval': {
    id: 'offline-eval',
    description: 'Deterministic evaluation mode. No model calls. Uses replay gate and verifier only.',
    primary_provider: null,
    model_tier: null,
    fallback_chain: [],
    allow_external: false,
    require_capabilities: [],
    max_tokens: 0,
    timeout_ms: 5000,
    eval_only: true,
  },
};

// ─── Provider Config File ─────────────────────────────────────────────────────

const PROVIDER_CONFIG_FILENAME = '.evolution/provider.json';

function getProviderConfigPath() {
  return path.join(findProjectRoot(), PROVIDER_CONFIG_FILENAME);
}

function loadProviderConfig() {
  const configPath = getProviderConfigPath();
  const defaults = {
    active_profile: 'research-web',
    provider_overrides: {},
    model_overrides: {},
    custom_profiles: {},
  };
  if (!fs.existsSync(configPath)) return defaults;
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return { ...defaults, ...raw };
  } catch {
    return defaults;
  }
}

function saveProviderConfig(config) {
  const configPath = getProviderConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// ─── Resolution Logic ─────────────────────────────────────────────────────────

/**
 * Resolve the full provider + model for the active profile,
 * applying env-based availability checks.
 *
 * Returns: { provider, model, profile, available, missing_key, fallback_used }
 */
function resolveProvider(profileId, providerConfigOverride) {
  const userConfig = providerConfigOverride || loadProviderConfig();
  const allProfiles = { ...PROFILES, ...userConfig.custom_profiles };
  const profile = allProfiles[profileId] || allProfiles['research-web'];

  if (profile.eval_only) {
    return { provider: null, model: null, profile: profile.id, available: true, missing_key: null, fallback_used: false };
  }

  const chain = [profile.primary_provider, ...profile.fallback_chain].filter(Boolean);
  for (let i = 0; i < chain.length; i++) {
    const providerId = chain[i];
    const providerDef = PROVIDERS[providerId];
    if (!providerDef) continue;

    // Check key availability
    const keyAvailable = !providerDef.env_key || !!process.env[providerDef.env_key];
    if (!keyAvailable) continue;

    // Check for placeholder key
    const keyValue = providerDef.env_key ? process.env[providerDef.env_key] : null;
    if (keyValue && isPlaceholderKey(keyValue)) continue;

    // Check required capabilities
    const caps = providerDef.capabilities;
    const missingCap = profile.require_capabilities.find(cap => !caps[cap]);
    if (missingCap) continue;

    // Apply model overrides
    const modelOverrides = userConfig.model_overrides[providerId] || {};
    const tier = profile.model_tier;
    const model = modelOverrides[tier] || providerDef.models[tier] || providerDef.models.default;

    return {
      provider: providerId,
      model,
      profile: profile.id,
      available: true,
      missing_key: null,
      fallback_used: i > 0,
      fallback_from: i > 0 ? chain[0] : null,
    };
  }

  // All providers in chain failed
  const primary = chain[0] && PROVIDERS[chain[0]];
  return {
    provider: chain[0] || null,
    model: null,
    profile: profile.id,
    available: false,
    missing_key: primary ? primary.env_key : null,
    fallback_used: false,
  };
}

/**
 * Detect placeholder API keys that should not be used.
 */
function isPlaceholderKey(value) {
  if (!value || typeof value !== 'string') return true;
  const lower = value.toLowerCase();
  return (
    lower.includes('your_key') ||
    lower.includes('your-key') ||
    lower.includes('placeholder') ||
    lower.includes('changeme') ||
    lower.includes('todo') ||
    lower.includes('xxxxxxxx') ||
    value.trim() === '' ||
    value === 'sk-...' ||
    value === 'sk-ant-...'
  );
}

/**
 * Check reachability of a provider's base_url (lightweight TCP/HTTP check).
 * Returns: { reachable: boolean, latency_ms: number|null, error: string|null }
 */
async function checkReachability(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider || !provider.base_url) {
    return { reachable: false, latency_ms: null, error: 'Provider not found' };
  }

  const start = Date.now();
  try {
    const url = new URL(provider.base_url);
    const lib = url.protocol === 'https:' ? require('https') : require('http');
    await new Promise((resolve, reject) => {
      const req = lib.request({ hostname: url.hostname, port: url.port || (url.protocol === 'https:' ? 443 : 80), path: '/', method: 'HEAD', timeout: 5000 }, resolve);
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
      req.end();
    });
    return { reachable: true, latency_ms: Date.now() - start, error: null };
  } catch (e) {
    return { reachable: false, latency_ms: null, error: e.message };
  }
}

module.exports = {
  PROVIDERS,
  PROFILES,
  loadProviderConfig,
  saveProviderConfig,
  resolveProvider,
  isPlaceholderKey,
  checkReachability,
  getProviderConfigPath,
};
