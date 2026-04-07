#!/usr/bin/env node
/** J.9 + L.7 — Bridge tests */
'use strict';

const { test, assert, assertIncludes, assertGte, assertType } = require('./test-runner');

let bridge;
try {
  bridge = require('../cli/nve-bridge');
} catch (e) {
  // May fail if not in a project with .evolution/ — that's OK
  bridge = null;
}

test('nve-bridge module loads', () => {
  assert(bridge !== null, 'Failed to load nve-bridge');
});

if (bridge) {
  test('scoreGenome returns 0 for disjoint sets', () => {
    const genome = {
      family: 'alpha beta',
      violated_invariant: 'gamma delta',
      repair_operator: 'epsilon zeta',
    };
    const queryTokens = ['completely', 'unrelated', 'tokens'];
    const score = bridge.scoreGenome(genome, queryTokens);
    assert(score >= 0, 'Score should be >= 0');
    // With no overlap and no utility, score should be very low
    assert(score < 0.1, `Expected low score for disjoint, got ${score}`);
  });

  test('scoreGenome returns higher score for overlapping tokens', () => {
    const genome = {
      family: 'database connection timeout',
      violated_invariant: 'connection must be pooled',
      repair_operator: 'add connection pooling',
      transferability_tags: ['database', 'performance'],
    };
    const queryTokens = ['database', 'connection', 'timeout'];
    const score = bridge.scoreGenome(genome, queryTokens);
    assert(score > 0, `Expected positive score, got ${score}`);
  });

  test('retrieveGenomes returns array', () => {
    const results = bridge.retrieveGenomes('test query');
    assert(Array.isArray(results), 'Should return array');
  });

  test('loadPromotedGenomes returns array', () => {
    const genomes = bridge.loadPromotedGenomes();
    assert(Array.isArray(genomes), 'Should return array');
  });

  test('loadSkills returns array', () => {
    const skills = bridge.loadSkills(5);
    assert(Array.isArray(skills), 'Should return array');
  });

  test('assembleInjection returns object with expected keys', () => {
    const injection = bridge.assembleInjection('test task');
    assert(injection, 'injection should not be null');
    assert(injection.timestamp, 'missing timestamp');
    assert(injection.memory_tree !== undefined, 'missing memory_tree');
    assert(typeof injection.rendered === 'string', 'rendered should be string');
  });
}

module.exports = {};
