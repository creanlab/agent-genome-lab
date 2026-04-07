#!/usr/bin/env node
/**
 * nve-hooks — Policy Hooks CLI
 *
 * Commands:
 *   nve-hooks list              — Show all registered hooks (built-in + project)
 *   nve-hooks test <event_type> — Dry-run emit an event, show hook outcomes
 *   nve-hooks init              — Scaffold .evolution/hooks/ with example configs
 *   nve-hooks check             — Verify all project hooks are valid
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createEventBus, EVENT_TYPES, BUILTIN_HOOKS } = require('./nve-event-bus');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'list';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Commands ─────────────────────────────────────────────────────────────────

function cmdList() {
  const bus = createEventBus({ loadProjectHooks: true });

  console.log(`\n${C.bold}Registered Hooks${C.reset}\n`);
  console.log(`${C.dim}Event types: ${EVENT_TYPES.join(', ')}${C.reset}\n`);

  const byEvent = {};
  for (const hook of bus.hooks) {
    if (!byEvent[hook.event_type]) byEvent[hook.event_type] = [];
    byEvent[hook.event_type].push(hook);
  }

  for (const eventType of EVENT_TYPES) {
    const hooks = byEvent[eventType] || [];
    const label = hooks.length > 0 ? `${C.green}${hooks.length}${C.reset}` : `${C.dim}0${C.reset}`;
    console.log(`  ${C.bold}${eventType}${C.reset} (${label} hooks)`);
    for (const h of hooks) {
      const type = h.handler_fn ? 'built-in' : h.handler_path ? 'script' : 'inline';
      console.log(`    ${C.cyan}→${C.reset} ${h.name} [pri:${h.priority}] (${C.dim}${type}${C.reset})`);
    }
  }
  console.log();
}

async function cmdTest() {
  const eventType = args[1];
  if (!eventType || !EVENT_TYPES.includes(eventType)) {
    console.error(`Usage: nve-hooks test <event_type>`);
    console.error(`Event types: ${EVENT_TYPES.join(', ')}`);
    process.exit(1);
  }

  // Build test payload based on event type
  const testPayloads = {
    SessionStart: { session_id: 'test-session-001' },
    UserPromptSubmit: { prompt: 'Help me fix the login bug' },
    PreToolUse: { tool_name: 'Bash', command: 'echo hello' },
    PostToolUse: { tool_name: 'Bash', command: 'echo hello', exit_code: 0, output: 'hello' },
    PreCompact: { session_tokens: 180000, threshold: 200000 },
    Stop: { reason: 'user_request' },
    SessionEnd: { session_id: 'test-session-001', duration_ms: 120000 },
    ReplayPromoteCandidate: { candidate: { candidate_id: 'lc-test-001', replay_gate_result: null } },
  };

  const bus = createEventBus({ loadProjectHooks: true });
  const payload = testPayloads[eventType] || {};

  console.log(`\n${C.bold}Testing event: ${eventType}${C.reset}`);
  console.log(`${C.dim}Payload: ${JSON.stringify(payload)}${C.reset}\n`);

  const result = await bus.emit(eventType, payload);

  if (result.allowed) {
    console.log(`${C.green}✓${C.reset} Event ${C.bold}ALLOWED${C.reset}`);
  } else {
    console.log(`${C.red}✗${C.reset} Event ${C.bold}BLOCKED${C.reset} by: ${result.blocked_by}`);
  }

  if (result.annotations.length > 0) {
    console.log(`\n${C.yellow}Annotations:${C.reset}`);
    result.annotations.forEach(a => console.log(`  ${a}`));
  }

  if (result.appended_context.length > 0) {
    console.log(`\n${C.cyan}Appended context:${C.reset}`);
    result.appended_context.forEach(c => console.log(`  ${c.slice(0, 200)}${c.length > 200 ? '…' : ''}`));
  }

  console.log(`\n${C.dim}Hook results:${C.reset}`);
  for (const hr of result.hook_results) {
    const icon = hr.outcome === 'block' ? C.red + '✗' : hr.outcome === 'allow' ? C.green + '✓' : C.yellow + '◆';
    console.log(`  ${icon}${C.reset} ${hr.hook_name}: ${hr.outcome} (${hr.duration_ms}ms)${hr.note ? ` — ${hr.note}` : ''}`);
  }
  console.log();
}

function cmdInit() {
  const hooksDir = path.join(findProjectRoot(), '.evolution', 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const examples = [
    {
      filename: '10-block-force-push.json',
      content: {
        name: 'block-force-push',
        event_type: 'PreToolUse',
        priority: 10,
        enabled: true,
        handler_type: 'inline',
        conditions: { payload_contains: 'push --force' },
        handler: { outcome: 'block', note: 'Force push is not allowed. Use --force-with-lease instead.' },
      },
    },
    {
      filename: '20-annotate-large-diff.json',
      content: {
        name: 'annotate-large-diff',
        event_type: 'PostToolUse',
        priority: 50,
        enabled: true,
        handler_type: 'inline',
        conditions: { tool_name: 'Edit' },
        handler: { outcome: 'annotate', annotation: 'Review large edits carefully before committing.' },
      },
    },
    {
      filename: '30-inject-project-rules.json',
      content: {
        name: 'inject-project-rules',
        event_type: 'SessionStart',
        priority: 50,
        enabled: false,
        handler_type: 'inline',
        handler: {
          outcome: 'append_context',
          context: 'Project rules: Always run tests before committing. Never push directly to main.',
        },
        _comment: 'Enable this and customize the context string for your project.',
      },
    },
  ];

  let created = 0;
  for (const ex of examples) {
    const fp = path.join(hooksDir, ex.filename);
    if (!fs.existsSync(fp)) {
      fs.writeFileSync(fp, JSON.stringify(ex.content, null, 2), 'utf8');
      created++;
      console.log(`${C.green}✓${C.reset} Created ${ex.filename}`);
    } else {
      console.log(`${C.dim}  Skipped ${ex.filename} (exists)${C.reset}`);
    }
  }
  console.log(`\n${created > 0 ? `${created} hook configs created` : 'All hooks already exist'} in ${hooksDir}\n`);
}

function cmdCheck() {
  const hooksDir = path.join(findProjectRoot(), '.evolution', 'hooks');
  if (!fs.existsSync(hooksDir)) {
    console.log(`${C.yellow}⚠${C.reset} No hooks directory at ${hooksDir}`);
    console.log(`${C.dim}Run: nve-hooks init${C.reset}`);
    return;
  }

  const files = fs.readdirSync(hooksDir).filter(f => f.endsWith('.json'));
  let valid = 0;
  let invalid = 0;

  console.log(`\n${C.bold}Checking project hooks${C.reset}\n`);
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(hooksDir, file), 'utf8'));
      if (!raw.event_type || !EVENT_TYPES.includes(raw.event_type)) {
        throw new Error(`Invalid event_type: ${raw.event_type}`);
      }
      if (!raw.handler && !raw.handler_path) {
        throw new Error('Missing handler or handler_path');
      }
      console.log(`${C.green}✓${C.reset} ${file} → ${raw.event_type}:${raw.name || 'unnamed'} ${raw.enabled === false ? `${C.dim}(disabled)${C.reset}` : ''}`);
      valid++;
    } catch (e) {
      console.log(`${C.red}✗${C.reset} ${file}: ${e.message}`);
      invalid++;
    }
  }
  console.log(`\n${valid} valid, ${invalid} invalid\n`);
}

// ─── Entry ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    switch (cmd) {
      case 'list': cmdList(); break;
      case 'test': await cmdTest(); break;
      case 'init': cmdInit(); break;
      case 'check': cmdCheck(); break;
      default:
        console.error(`Unknown command: ${cmd}`);
        console.error('Usage: nve-hooks [list|test|init|check]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
})();
