#!/usr/bin/env node
/** K.3+K.8 — Error module + safe defaults tests */
'use strict';

const { test, assert, assertGte, assertType } = require('./test-runner');
const { NveError, ERROR_CATALOG, formatError, formatErrorHuman, SAFE_DEFAULTS } = require('../cli/nve-errors');

test('ERROR_CATALOG has 10 error codes', () => {
  assertGte(Object.keys(ERROR_CATALOG).length, 10, 'Expected >=10 error codes');
});

test('NveError creates proper error', () => {
  const err = new NveError('E_NO_EVOLUTION');
  assert(err instanceof Error, 'Should be Error instance');
  assert(err.code === 'E_NO_EVOLUTION', 'Wrong code');
  assert(err.description.includes('.evolution'), 'Description should mention .evolution');
  assert(err.suggestedFix.includes('nve-init'), 'Fix should mention nve-init');
});

test('NveError with context interpolation', () => {
  const err = new NveError('E_PROVIDER_UNREACHABLE', { provider: 'anthropic' });
  assert(err.description.includes('anthropic'), 'Should include provider name');
});

test('formatError returns structured object', () => {
  const err = new NveError('E_PLACEHOLDER_KEY', { provider: 'openai', env_var: 'OPENAI_API_KEY' });
  const formatted = formatError(err);
  assert(formatted.code === 'E_PLACEHOLDER_KEY', 'Wrong code');
  assert(formatted.description, 'Missing description');
  assert(formatted.suggestedFix, 'Missing suggestedFix');
  assert(formatted.timestamp, 'Missing timestamp');
});

test('formatErrorHuman returns colored string', () => {
  const err = new NveError('E_GENOME_CORRUPT', { file: 'test.json' });
  const human = formatErrorHuman(err);
  assertType(human, 'string', 'Should be string');
  assert(human.includes('E_GENOME_CORRUPT'), 'Should include error code');
});

test('SAFE_DEFAULTS has expected keys', () => {
  assert(SAFE_DEFAULTS.hook_timeout_ms === 3000, 'hook_timeout_ms should be 3000');
  assert(SAFE_DEFAULTS.max_genomes_per_retrieval === 10, 'max_genomes should be 10');
  assert(SAFE_DEFAULTS.max_skills_injected === 5, 'max_skills should be 5');
  assert(SAFE_DEFAULTS.worktree_auto_cleanup_hours === 24, 'cleanup_hours should be 24');
});

test('all error codes have description and suggestedFix', () => {
  for (const [code, template] of Object.entries(ERROR_CATALOG)) {
    assert(template.description, `${code} missing description`);
    assert(template.suggestedFix, `${code} missing suggestedFix`);
  }
});

module.exports = {};
