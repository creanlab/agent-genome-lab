/**
 * nve-errors.js — Structured Error Module
 *
 * Shared error types, catalog, and formatters for all CLI tools.
 * Not a CLI — import only.
 */
'use strict';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Error Class ─────────────────────────────────────────────────────────────

class NveError extends Error {
  constructor(code, context = {}) {
    const template = ERROR_CATALOG[code] || { description: code, suggestedFix: 'Check logs' };
    const description = typeof template.description === 'function'
      ? template.description(context)
      : template.description;
    const suggestedFix = typeof template.suggestedFix === 'function'
      ? template.suggestedFix(context)
      : template.suggestedFix;

    super(description);
    this.name = 'NveError';
    this.code = code;
    this.description = description;
    this.suggestedFix = suggestedFix;
    this.context = context;
  }
}

// ─── Error Catalog ───────────────────────────────────────────────────────────

const ERROR_CATALOG = {
  E_NO_EVOLUTION: {
    description: '.evolution/ directory not found in project root',
    suggestedFix: 'Run: nve-init',
  },
  E_PROVIDER_UNREACHABLE: {
    description: (ctx) => `Cannot reach provider endpoint: ${ctx.provider || 'unknown'}`,
    suggestedFix: 'Check network connection or run: nve-doctor',
  },
  E_PLACEHOLDER_KEY: {
    description: (ctx) => `API key for ${ctx.provider || 'provider'} appears to be a placeholder`,
    suggestedFix: (ctx) => `Set a real API key in ${ctx.env_var || 'environment variable'}`,
  },
  E_SCHEMA_INVALID: {
    description: (ctx) => `JSON does not match schema: ${ctx.file || 'unknown'}`,
    suggestedFix: (ctx) => `Check schema at schemas/${ctx.schema || 'unknown'}`,
  },
  E_GENOME_CORRUPT: {
    description: (ctx) => `Genome file is not valid JSON: ${ctx.file || 'unknown'}`,
    suggestedFix: 'Re-run: nve-distill',
  },
  E_HOOK_TIMEOUT: {
    description: (ctx) => `Hook "${ctx.hook || 'unknown'}" exceeded ${ctx.timeout_ms || 3000}ms timeout`,
    suggestedFix: (ctx) => `Check hook at ${ctx.path || '.evolution/hooks/'}`,
  },
  E_WORKTREE_ORPHANED: {
    description: (ctx) => `Worktree "${ctx.name || 'unknown'}" exists but no parent branch`,
    suggestedFix: 'Run: nve-worktree cleanup',
  },
  E_MEMORY_STALE: {
    description: 'MEMORY.md not updated in >7 days',
    suggestedFix: 'Run: nve-memory update',
  },
  E_SUBAGENT_INVALID: {
    description: (ctx) => `Subagent config "${ctx.name || 'unknown'}" missing required fields`,
    suggestedFix: 'Required: name, description, allowed_tools, system_prompt',
  },
  E_BRIDGE_DISCONNECTED: {
    description: 'Bridge not initialized — no genome context available',
    suggestedFix: 'Run: nve-bridge inject first',
  },
};

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatError(nveError) {
  return {
    code: nveError.code,
    description: nveError.description,
    suggestedFix: nveError.suggestedFix,
    context: nveError.context,
    timestamp: new Date().toISOString(),
  };
}

function formatErrorHuman(nveError) {
  return [
    `${C.red}${C.bold}Error [${nveError.code}]${C.reset}: ${nveError.description}`,
    `${C.yellow}Fix${C.reset}: ${nveError.suggestedFix}`,
  ].join('\n');
}

// ─── Safe Defaults ───────────────────────────────────────────────────────────

const SAFE_DEFAULTS = {
  hook_timeout_ms: 3000,
  max_genomes_per_retrieval: 10,
  max_skills_injected: 5,
  worktree_auto_cleanup_hours: 24,
  compact_max_evidence_items: 50,
  bridge_max_payload_kb: 512,
  sse_heartbeat_interval_ms: 30000,
  max_memory_rules: 50,
  max_anti_patterns: 20,
  provider_request_timeout_ms: 30000,
};

module.exports = { NveError, ERROR_CATALOG, formatError, formatErrorHuman, SAFE_DEFAULTS };
