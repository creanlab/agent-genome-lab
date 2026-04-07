#!/usr/bin/env node
/** H.6-H.9 — Worktree isolation tests */
'use strict';

const { test, assert, assertEqual } = require('./test-runner');
const { isRiskyCommand } = require('../cli/nve-worktree');

test('isRiskyCommand detects rm -rf', () => {
  const r = isRiskyCommand('rm -rf /tmp/stuff');
  assert(r.risky === true, 'rm -rf should be risky');
});

test('isRiskyCommand detects git reset --hard', () => {
  const r = isRiskyCommand('git reset --hard HEAD~3');
  assert(r.risky === true, 'git reset --hard should be risky');
});

test('isRiskyCommand detects git push --force', () => {
  const r = isRiskyCommand('git push --force origin main');
  assert(r.risky === true, 'force push should be risky');
});

test('isRiskyCommand detects npm uninstall', () => {
  const r = isRiskyCommand('npm uninstall express');
  assert(r.risky === true, 'npm uninstall should be risky');
});

test('isRiskyCommand detects migration', () => {
  const r = isRiskyCommand('run database migration');
  assert(r.risky === true, 'migration should be risky');
});

test('isRiskyCommand allows safe commands', () => {
  const r = isRiskyCommand('ls -la');
  assert(r.risky === false, 'ls should be safe');
});

test('isRiskyCommand allows git status', () => {
  const r = isRiskyCommand('git status');
  assert(r.risky === false, 'git status should be safe');
});

test('isRiskyCommand allows npm test', () => {
  const r = isRiskyCommand('npm test');
  assert(r.risky === false, 'npm test should be safe');
});

test('isRiskyCommand returns reasons array', () => {
  const r = isRiskyCommand('rm -rf /');
  assert(Array.isArray(r.reasons), 'reasons should be array');
  assert(r.reasons.length > 0, 'should have at least one reason');
});

module.exports = {};
