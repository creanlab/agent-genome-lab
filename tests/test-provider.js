#!/usr/bin/env node
/** B.4 + B.13 — Provider abstraction tests */
'use strict';

const { test, assert, assertEqual, assertIncludes, assertGte } = require('./test-runner');
const { PROVIDERS, PROFILES, resolveProvider, isPlaceholderKey, loadProviderConfig } = require('../cli/nve-provider-config');

test('PROVIDERS has 5 entries', () => {
  const keys = Object.keys(PROVIDERS);
  assertGte(keys.length, 5, `Expected >=5 providers, got ${keys.length}`);
  assertIncludes(keys, 'anthropic');
  assertIncludes(keys, 'openai');
  assertIncludes(keys, 'ollama');
  assertIncludes(keys, 'lmstudio');
  assertIncludes(keys, 'google');
});

test('PROFILES has 5 entries', () => {
  const keys = Object.keys(PROFILES);
  assertGte(keys.length, 5, `Expected >=5 profiles, got ${keys.length}`);
  assertIncludes(keys, 'competition-safe');
  assertIncludes(keys, 'local-fast');
  assertIncludes(keys, 'local-code');
  assertIncludes(keys, 'research-web');
  assertIncludes(keys, 'offline-eval');
});

test('each provider has base_url and capabilities', () => {
  for (const [name, provider] of Object.entries(PROVIDERS)) {
    assert(provider.base_url !== undefined, `${name} missing base_url`);
    assert(provider.capabilities, `${name} missing capabilities`);
    assert(provider.models, `${name} missing models`);
  }
});

test('offline-eval profile reports available (eval_only)', () => {
  const result = resolveProvider('offline-eval');
  assert(result.available === true, 'offline-eval should be available');
  assert(result.profile === 'offline-eval', 'profile should be offline-eval');
});

test('isPlaceholderKey detects placeholder keys', () => {
  assert(isPlaceholderKey('your_key_here') === true, 'your_key_here should be placeholder');
  assert(isPlaceholderKey('your-key-here') === true, 'your-key-here should be placeholder');
  assert(isPlaceholderKey('placeholder') === true, 'placeholder should be placeholder');
  assert(isPlaceholderKey('changeme') === true, 'changeme should be placeholder');
  assert(isPlaceholderKey('') === true, 'empty string should be placeholder');
  assert(isPlaceholderKey(null) === true, 'null should be placeholder');
  assert(isPlaceholderKey('sk-...') === true, 'sk-... should be placeholder');
  assert(isPlaceholderKey('sk-ant-...') === true, 'sk-ant-... should be placeholder');
});

test('isPlaceholderKey passes real-looking keys', () => {
  assert(isPlaceholderKey('sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF') === false, 'real-looking key rejected');
});

test('resolveProvider returns object with required fields', () => {
  const result = resolveProvider('competition-safe');
  assert(result.profile, 'missing profile');
  assert(typeof result.available === 'boolean', 'missing available');
});

test('each profile resolves without error', () => {
  for (const profileName of Object.keys(PROFILES)) {
    const result = resolveProvider(profileName);
    assert(result, `${profileName} resolved to null`);
    assert(result.profile === profileName, `${profileName} profile mismatch: ${result.profile}`);
  }
});

test('loadProviderConfig returns valid config even without file', () => {
  const config = loadProviderConfig();
  assert(config, 'config is null');
  assert(typeof config === 'object', 'config should be object');
  assert(config.active_profile, 'missing active_profile');
});

module.exports = {};
