#!/usr/bin/env node
/** K.1+K.2 — Self-check tests */
'use strict';

const { test, assert, assertGte } = require('./test-runner');
const { runSmoke, runStrict } = require('../cli/nve-self-check');

test('runSmoke returns array of checks', () => {
  const results = runSmoke();
  assert(Array.isArray(results), 'Should return array');
  assertGte(results.length, 3, 'Should have at least 3 checks');
});

test('each smoke check has name and status', () => {
  const results = runSmoke();
  for (const r of results) {
    assert(r.name, 'check missing name');
    assert(['pass', 'warn', 'fail'].includes(r.status), `invalid status: ${r.status}`);
  }
});

test('runStrict includes smoke checks', () => {
  const strict = runStrict();
  const smoke = runSmoke();
  assertGte(strict.length, smoke.length, 'strict should have >= smoke checks');
});

test('runStrict validates .evolution/ content', () => {
  const results = runStrict();
  // Should have checks for genomes, incidents, etc. if they exist
  assert(results.some(r => r.name.includes('.evolution') || r.name.includes('failure_genomes') || r.name.includes('AGENTS')),
    'Should check .evolution or related content');
});

module.exports = {};
