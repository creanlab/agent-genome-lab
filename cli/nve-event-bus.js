/**
 * nve-event-bus.js — Event Bus & Policy Hooks Core
 *
 * Typed event system with deterministic hook execution.
 * 8 event types, 4 hook outcomes, configurable timeout.
 *
 * Event lifecycle:
 *   emit(eventType, payload) → match registered hooks → execute hooks →
 *   aggregate outcomes → return { allowed, annotations, appended_context }
 *
 * Hook outcomes: block / allow / annotate / append_context
 * Hook timeout: configurable, default 3000ms, fail-open on timeout.
 *
 * This module is imported by other CLI tools — not invoked directly.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

// ─── Event Types ──────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  'SessionStart',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
  'PreCompact',
  'Stop',
  'SessionEnd',
  'ReplayPromoteCandidate',
];

// ─── Hook Outcomes ────────────────────────────────────────────────────────────

const HOOK_OUTCOMES = ['block', 'allow', 'annotate', 'append_context'];

// ─── Event Bus Class ──────────────────────────────────────────────────────────

class EventBus {
  constructor(options = {}) {
    this.hooks = [];          // Registered hook definitions
    this.listeners = [];      // Simple event listeners (no outcome control)
    this.hookTimeout = options.hookTimeout || 3000;
    this.failOpen = options.failOpen !== false; // Default: fail-open on timeout
    this.log = options.log || [];
    this._loaded = false;
  }

  /**
   * Load hooks from .evolution/hooks/ directory.
   * Each hook is a JSON file with: event_type, name, handler (function path or inline),
   * priority, enabled.
   */
  loadHooks(hooksDir) {
    if (!hooksDir) {
      hooksDir = path.join(findProjectRoot(), '.evolution', 'hooks');
    }
    if (!fs.existsSync(hooksDir)) {
      this._loaded = true;
      return;
    }

    const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.json')).sort();
    for (const file of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(hooksDir, file), 'utf8'));
        if (raw.enabled === false) continue;
        this.registerHook({
          name: raw.name || path.basename(file, '.json'),
          event_type: raw.event_type,
          priority: raw.priority || 100,
          handler_type: raw.handler_type || 'inline',
          handler: raw.handler,     // For inline: { outcome, annotation?, context? }
          handler_path: raw.handler_path, // For script: path to .js handler
          conditions: raw.conditions || {},
        });
      } catch (e) {
        this._logEntry('hook_load_error', { file, error: e.message });
      }
    }
    this._loaded = true;
  }

  /**
   * Register a hook programmatically.
   */
  registerHook(hookDef) {
    if (!hookDef.event_type || !EVENT_TYPES.includes(hookDef.event_type)) {
      throw new Error(`Invalid event_type: ${hookDef.event_type}. Must be one of: ${EVENT_TYPES.join(', ')}`);
    }
    this.hooks.push({
      name: hookDef.name || 'unnamed',
      event_type: hookDef.event_type,
      priority: hookDef.priority || 100,
      handler_type: hookDef.handler_type || 'inline',
      handler: hookDef.handler || null,
      handler_path: hookDef.handler_path || null,
      handler_fn: hookDef.handler_fn || null,  // For programmatic registration
      conditions: hookDef.conditions || {},
    });
    // Sort by priority (lower = first)
    this.hooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Register a simple listener (no outcome control, just notification).
   */
  on(eventType, callback) {
    this.listeners.push({ event_type: eventType, callback });
  }

  /**
   * Emit an event and execute all matching hooks.
   *
   * Returns: {
   *   allowed: boolean,
   *   blocked_by: string|null,
   *   annotations: string[],
   *   appended_context: string[],
   *   hook_results: Array<{ hook_name, outcome, duration_ms }>
   * }
   */
  async emit(eventType, payload = {}) {
    if (!EVENT_TYPES.includes(eventType)) {
      throw new Error(`Unknown event type: ${eventType}`);
    }

    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      payload,
    };

    this._logEntry('event_emitted', { type: eventType });

    // Notify simple listeners (fire-and-forget)
    for (const listener of this.listeners) {
      if (listener.event_type === eventType || listener.event_type === '*') {
        try { listener.callback(event); } catch { /* silent */ }
      }
    }

    // Execute matching hooks
    const matchingHooks = this.hooks.filter(h => h.event_type === eventType);
    if (matchingHooks.length === 0) {
      return { allowed: true, blocked_by: null, annotations: [], appended_context: [], hook_results: [] };
    }

    const result = {
      allowed: true,
      blocked_by: null,
      annotations: [],
      appended_context: [],
      hook_results: [],
    };

    for (const hook of matchingHooks) {
      const start = Date.now();
      let outcome;

      try {
        outcome = await this._executeHook(hook, event);
      } catch (e) {
        this._logEntry('hook_error', { hook: hook.name, error: e.message });
        outcome = this.failOpen
          ? { outcome: 'allow', note: `Hook failed: ${e.message} (fail-open)` }
          : { outcome: 'block', note: `Hook failed: ${e.message} (fail-closed)` };
      }

      const duration_ms = Date.now() - start;

      result.hook_results.push({
        hook_name: hook.name,
        outcome: outcome.outcome,
        duration_ms,
        note: outcome.note || null,
      });

      switch (outcome.outcome) {
        case 'block':
          result.allowed = false;
          result.blocked_by = hook.name;
          this._logEntry('event_blocked', { type: eventType, hook: hook.name, reason: outcome.note });
          return result; // Short-circuit: first block wins
        case 'annotate':
          if (outcome.annotation) result.annotations.push(outcome.annotation);
          break;
        case 'append_context':
          if (outcome.context) result.appended_context.push(outcome.context);
          break;
        case 'allow':
        default:
          break;
      }
    }

    return result;
  }

  /**
   * Execute a single hook with timeout.
   */
  async _executeHook(hook, event) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Hook "${hook.name}" timed out after ${this.hookTimeout}ms`));
      }, this.hookTimeout);

      const done = (result) => {
        clearTimeout(timer);
        resolve(result);
      };

      try {
        // Inline handler: static outcome
        if (hook.handler_type === 'inline' && hook.handler) {
          const h = hook.handler;
          // Check conditions
          if (this._matchConditions(hook.conditions, event)) {
            done({
              outcome: h.outcome || 'allow',
              annotation: h.annotation || null,
              context: h.context || null,
              note: h.note || null,
            });
          } else {
            done({ outcome: 'allow', note: 'conditions not met' });
          }
          return;
        }

        // Programmatic handler function
        if (hook.handler_fn && typeof hook.handler_fn === 'function') {
          const result = hook.handler_fn(event);
          if (result && typeof result.then === 'function') {
            result.then(done).catch(reject);
          } else {
            done(result || { outcome: 'allow' });
          }
          return;
        }

        // Script handler: require() the module
        if (hook.handler_path) {
          const handlerPath = path.resolve(findProjectRoot(), hook.handler_path);
          if (!fs.existsSync(handlerPath)) {
            done({ outcome: 'allow', note: `Handler not found: ${handlerPath}` });
            return;
          }
          const handlerModule = require(handlerPath);
          const handlerFn = typeof handlerModule === 'function' ? handlerModule : handlerModule.handler;
          if (!handlerFn) {
            done({ outcome: 'allow', note: 'Handler module has no handler function' });
            return;
          }
          const result = handlerFn(event);
          if (result && typeof result.then === 'function') {
            result.then(done).catch(reject);
          } else {
            done(result || { outcome: 'allow' });
          }
          return;
        }

        // No handler — default allow
        done({ outcome: 'allow' });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Match conditions against event payload.
   * Conditions: { tool_name: "rm", payload_contains: "DROP" }
   */
  _matchConditions(conditions, event) {
    if (!conditions || Object.keys(conditions).length === 0) return true;

    const payload = event.payload || {};

    for (const [key, expected] of Object.entries(conditions)) {
      if (key === 'tool_name' && payload.tool_name !== expected) return false;
      if (key === 'payload_contains') {
        const str = JSON.stringify(payload);
        if (typeof expected === 'string' && !str.includes(expected)) return false;
        if (Array.isArray(expected) && !expected.some(e => str.includes(e))) return false;
      }
      if (key === 'risk_level') {
        if (payload.risk_level !== expected) return false;
      }
    }
    return true;
  }

  _logEntry(type, data) {
    this.log.push({ type, timestamp: new Date().toISOString(), ...data });
  }

  /**
   * Get event log for diagnostics.
   */
  getLog() { return [...this.log]; }

  /**
   * Reset bus (for testing).
   */
  reset() {
    this.hooks = [];
    this.listeners = [];
    this.log = [];
    this._loaded = false;
  }
}

// ─── Built-in Safety Hooks ────────────────────────────────────────────────────

/**
 * Default safety hooks that can be registered for any project.
 * These block dangerous tool calls and inject anti-patterns.
 */
const BUILTIN_HOOKS = {
  /**
   * Block dangerous shell commands.
   */
  blockDangerousCommands: {
    name: 'block-dangerous-commands',
    event_type: 'PreToolUse',
    priority: 10,
    handler_fn: (event) => {
      const cmd = event.payload?.command || event.payload?.args?.command || '';
      const dangerous = [
        /\brm\s+-rf\s+[\/~]/, /\brm\s+-rf\s+\.\s/, /\bDROP\s+TABLE\b/i,
        /\bDROP\s+DATABASE\b/i, /\bDELETE\s+FROM\b.*\bWHERE\s+1\s*=\s*1/i,
        /\bgit\s+push\s+--force\b/, /\bgit\s+reset\s+--hard\b/,
        /\bformat\s+[A-Z]:\s/i, /\b:(){:|:&};:/,
        /\bcurl\b.*\|\s*bash\b/, /\bwget\b.*\|\s*sh\b/,
      ];
      for (const pattern of dangerous) {
        if (pattern.test(cmd)) {
          return { outcome: 'block', note: `Dangerous command detected: matches ${pattern}` };
        }
      }
      return { outcome: 'allow' };
    },
  },

  /**
   * Block exposure of known secret patterns in tool output.
   */
  blockSecretExposure: {
    name: 'block-secret-exposure',
    event_type: 'PostToolUse',
    priority: 10,
    handler_fn: (event) => {
      const output = event.payload?.output || '';
      const secretPatterns = [
        /sk-ant-[a-zA-Z0-9]{20,}/, /sk-[a-zA-Z0-9]{20,}/,
        /ghp_[a-zA-Z0-9]{36}/, /gho_[a-zA-Z0-9]{36}/,
        /AKIA[A-Z0-9]{16}/, /password\s*[:=]\s*[^\s]{8,}/i,
      ];
      for (const pattern of secretPatterns) {
        if (pattern.test(output)) {
          return {
            outcome: 'annotate',
            annotation: `⚠ Potential secret detected in tool output (pattern: ${pattern.source}). Redact before sharing.`,
          };
        }
      }
      return { outcome: 'allow' };
    },
  },

  /**
   * Inject anti-patterns from MEMORY.md into session context.
   */
  injectAntiPatterns: {
    name: 'inject-anti-patterns',
    event_type: 'SessionStart',
    priority: 50,
    handler_fn: (event) => {
      const root = findProjectRoot();
      const memPath = path.join(root, '.evolution', 'MEMORY.md');
      if (!fs.existsSync(memPath)) return { outcome: 'allow' };

      const content = fs.readFileSync(memPath, 'utf8');
      // Extract anti-pattern section if present
      const apMatch = content.match(/##\s*Anti-?[Pp]atterns?\s*\n([\s\S]*?)(?=\n##|\n$|$)/);
      if (apMatch) {
        return {
          outcome: 'append_context',
          context: `[GENOME ANTI-PATTERNS]\n${apMatch[1].trim()}`,
        };
      }
      return { outcome: 'allow' };
    },
  },

  /**
   * Force replay gate before genome promotion.
   */
  requireReplayBeforePromotion: {
    name: 'require-replay-before-promotion',
    event_type: 'ReplayPromoteCandidate',
    priority: 10,
    handler_fn: (event) => {
      const candidate = event.payload?.candidate;
      if (!candidate) return { outcome: 'allow' };
      if (!candidate.replay_gate_result || !candidate.replay_gate_result.passed) {
        return {
          outcome: 'block',
          note: 'Genome promotion blocked: replay gate not passed. Run nve-replay first.',
        };
      }
      return { outcome: 'allow' };
    },
  },

  /**
   * M.3: Track genome/skill usage for utility score updates.
   * Logs which genomes and skills the agent reads during PreToolUse.
   */
  trackGenomeUsage: {
    name: 'track-genome-usage',
    event_type: 'PreToolUse',
    priority: 80,
    handler_fn: (event) => {
      const { tool, file_path, command } = event.payload || {};
      // Detect reads of genome or skill files
      const isGenomeRead = file_path && (file_path.includes('failure_genomes') || file_path.includes('/skills/'));
      const isGenomeCommand = command && (command.includes('failure_genomes') || command.includes('/skills/'));
      if (isGenomeRead || isGenomeCommand) {
        const usageLog = path.join(findProjectRoot(), '.evolution', 'usage_log.jsonl');
        const entry = JSON.stringify({
          timestamp: new Date().toISOString(),
          tool, file_path: file_path || null,
          type: file_path?.includes('skills') ? 'skill' : 'genome',
        });
        try { fs.appendFileSync(usageLog, entry + '\n'); } catch { /* ignore */ }
        return { outcome: 'annotate', annotation: `[USAGE_TRACKED] ${file_path || command}` };
      }
      return { outcome: 'allow' };
    },
  },

  /**
   * Capture incident candidate from failed tool execution.
   */
  captureToolFailure: {
    name: 'capture-tool-failure',
    event_type: 'PostToolUse',
    priority: 90,
    handler_fn: (event) => {
      const { exit_code, error, tool_name } = event.payload || {};
      if (exit_code && exit_code !== 0 || error) {
        return {
          outcome: 'annotate',
          annotation: `[INCIDENT_CANDIDATE] Tool "${tool_name}" failed (exit=${exit_code}): ${error || 'unknown error'}. Consider running nve-auto-capture.`,
        };
      }
      return { outcome: 'allow' };
    },
  },
};

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create an EventBus with all built-in safety hooks pre-registered.
 */
function createEventBus(options = {}) {
  const bus = new EventBus(options);

  // Register built-in hooks unless explicitly disabled
  if (options.builtinHooks !== false) {
    for (const hookDef of Object.values(BUILTIN_HOOKS)) {
      bus.registerHook({
        ...hookDef,
        handler_type: 'function',
      });
    }
  }

  // Load project-specific hooks from .evolution/hooks/
  if (options.loadProjectHooks !== false) {
    bus.loadHooks(options.hooksDir);
  }

  return bus;
}

module.exports = {
  EventBus,
  EVENT_TYPES,
  HOOK_OUTCOMES,
  BUILTIN_HOOKS,
  createEventBus,
};
