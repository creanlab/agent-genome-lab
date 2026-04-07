#!/usr/bin/env node
/** E.12-E.15 — Event bus + hooks tests */
'use strict';

const { test, assert, assertEqual, assertIncludes, assertGte } = require('./test-runner');
const { createEventBus, EventBus, EVENT_TYPES, HOOK_OUTCOMES, BUILTIN_HOOKS } = require('../cli/nve-event-bus');

test('EVENT_TYPES has 8 entries', () => {
  assertGte(EVENT_TYPES.length, 8, `Expected >=8 event types, got ${EVENT_TYPES.length}`);
  assertIncludes(EVENT_TYPES, 'SessionStart');
  assertIncludes(EVENT_TYPES, 'PreToolUse');
  assertIncludes(EVENT_TYPES, 'PostToolUse');
  assertIncludes(EVENT_TYPES, 'Stop');
});

test('HOOK_OUTCOMES has 4 entries', () => {
  assertGte(HOOK_OUTCOMES.length, 4, `Expected >=4 outcomes, got ${HOOK_OUTCOMES.length}`);
  assertIncludes(HOOK_OUTCOMES, 'block');
  assertIncludes(HOOK_OUTCOMES, 'allow');
  assertIncludes(HOOK_OUTCOMES, 'annotate');
  assertIncludes(HOOK_OUTCOMES, 'append_context');
});

test('BUILTIN_HOOKS has 5 entries (object)', () => {
  const keys = Object.keys(BUILTIN_HOOKS);
  assertGte(keys.length, 5, `Expected >=5 built-in hooks, got ${keys.length}`);
  assertIncludes(keys, 'blockDangerousCommands');
  assertIncludes(keys, 'blockSecretExposure');
  assertIncludes(keys, 'injectAntiPatterns');
  assertIncludes(keys, 'requireReplayBeforePromotion');
  assertIncludes(keys, 'captureToolFailure');
});

test('createEventBus returns bus with required methods', () => {
  const bus = createEventBus({ builtinHooks: false, loadProjectHooks: false });
  assert(typeof bus.emit === 'function', 'missing emit');
  assert(typeof bus.on === 'function', 'missing on');
  assert(typeof bus.registerHook === 'function', 'missing registerHook');
});

test('emit fires registered listeners', async () => {
  const bus = createEventBus({ builtinHooks: false, loadProjectHooks: false });
  let fired = false;
  bus.on('PreToolUse', () => { fired = true; });
  await bus.emit('PreToolUse', { tool: 'Read', command: 'test' });
  assert(fired, 'listener should have fired');
});

test('blockDangerousCommands blocks rm -rf /', () => {
  const hook = BUILTIN_HOOKS.blockDangerousCommands;
  const result = hook.handler_fn({ type: 'PreToolUse', payload: { command: 'rm -rf /' } });
  assert(result.outcome === 'block', `Expected block, got ${result.outcome}`);
});

test('blockDangerousCommands allows safe commands', () => {
  const hook = BUILTIN_HOOKS.blockDangerousCommands;
  const result = hook.handler_fn({ type: 'PreToolUse', payload: { command: 'ls -la' } });
  assert(result.outcome === 'allow', `Safe command should be allowed, got ${result.outcome}`);
});

test('blockDangerousCommands blocks DROP TABLE', () => {
  const hook = BUILTIN_HOOKS.blockDangerousCommands;
  const result = hook.handler_fn({ type: 'PreToolUse', payload: { command: 'DROP TABLE users' } });
  assert(result.outcome === 'block', `Expected block for DROP TABLE`);
});

test('blockDangerousCommands blocks git push --force', () => {
  const hook = BUILTIN_HOOKS.blockDangerousCommands;
  const result = hook.handler_fn({ type: 'PreToolUse', payload: { command: 'git push --force origin main' } });
  assert(result.outcome === 'block', `Expected block for force push`);
});

test('blockSecretExposure detects API keys in output', () => {
  const hook = BUILTIN_HOOKS.blockSecretExposure;
  const result = hook.handler_fn({ type: 'PostToolUse', payload: { output: 'Found key: sk-ant-api03abcdefghijklmnopqrstuvwxyz' } });
  assert(result.outcome === 'annotate', `Expected annotate for secret, got ${result.outcome}`);
});

test('blockSecretExposure allows clean output', () => {
  const hook = BUILTIN_HOOKS.blockSecretExposure;
  const result = hook.handler_fn({ type: 'PostToolUse', payload: { output: 'All tests passed.' } });
  assert(result.outcome === 'allow', `Clean output should be allowed`);
});

test('requireReplayBeforePromotion blocks without replay', () => {
  const hook = BUILTIN_HOOKS.requireReplayBeforePromotion;
  const result = hook.handler_fn({
    type: 'ReplayPromoteCandidate',
    payload: { candidate: { replay_gate_result: null } },
  });
  assert(result.outcome === 'block', `Expected block without replay`);
});

test('requireReplayBeforePromotion allows with passed replay', () => {
  const hook = BUILTIN_HOOKS.requireReplayBeforePromotion;
  const result = hook.handler_fn({
    type: 'ReplayPromoteCandidate',
    payload: { candidate: { replay_gate_result: { passed: true } } },
  });
  assert(result.outcome === 'allow', `Expected allow with passed replay`);
});

test('captureToolFailure annotates failed tool', () => {
  const hook = BUILTIN_HOOKS.captureToolFailure;
  const result = hook.handler_fn({
    type: 'PostToolUse',
    payload: { exit_code: 1, error: 'command not found', tool_name: 'Bash' },
  });
  assert(result.outcome === 'annotate', `Expected annotate for failed tool`);
});

module.exports = {};
