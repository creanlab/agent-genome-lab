#!/usr/bin/env node
/** P.3 — Temporal Knowledge Graph tests */
'use strict';

const fs = require('fs');
const path = require('path');
const { test, assert, assertEqual, assertGte, assertType } = require('./test-runner');
const {
  loadGraph, saveGraph,
  addTriple, queryTriples, queryByObject,
  invalidateTriple, getTimeline, getStats,
} = require('../cli/nve-knowledge-graph');

// Save/restore graph to avoid test pollution
const ROOT = path.join(__dirname, '..');
const KG_PATH = path.join(ROOT, '.evolution', 'knowledge_graph.json');
let backup = null;

function setup() {
  if (fs.existsSync(KG_PATH)) backup = fs.readFileSync(KG_PATH, 'utf8');
  // Start fresh
  const dir = path.dirname(KG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  saveGraph({ version: '1.0.0', triples: [], next_id: 1 });
}

function teardown() {
  if (backup) fs.writeFileSync(KG_PATH, backup, 'utf8');
  else if (fs.existsSync(KG_PATH)) fs.unlinkSync(KG_PATH);
}

// Run setup before tests
setup();

test('addTriple creates triple with correct fields', () => {
  const t = addTriple('node', 'uses', 'express');
  assertEqual(t.subject, 'node');
  assertEqual(t.predicate, 'uses');
  assertEqual(t.object, 'express');
  assert(t.valid_from, 'Should have valid_from');
  assertEqual(t.valid_to, null);
  assertType(t.id, 'number');
});

test('addTriple auto-increments id', () => {
  const t1 = addTriple('a', 'is', 'b');
  const t2 = addTriple('c', 'is', 'd');
  assert(t2.id > t1.id, 'IDs should increment');
});

test('queryTriples finds by subject', () => {
  addTriple('genome-001', 'belongs_to', 'build-failure');
  addTriple('genome-001', 'violates', 'env-var-check');
  const results = queryTriples('genome-001');
  assertGte(results.length, 2, 'Should find at least 2 triples');
});

test('queryTriples filters by predicate', () => {
  // Reset graph to avoid pollution from prior tests
  saveGraph({ version: '1.0.0', triples: [], next_id: 1 });
  addTriple('skill-x', 'applies_to', 'python');
  addTriple('skill-x', 'is_a', 'skill');
  const results = queryTriples('skill-x', { predicate: 'applies_to' });
  assertEqual(results.length, 1);
  assertEqual(results[0].object, 'python');
});

test('invalidateTriple sets valid_to', () => {
  const t = addTriple('temp', 'status', 'active');
  const inv = invalidateTriple(t.id);
  assert(inv.valid_to !== null, 'valid_to should be set');
});

test('queryTriples excludes invalidated by default', () => {
  const t = addTriple('gone', 'was', 'here');
  invalidateTriple(t.id);
  const results = queryTriples('gone');
  assertEqual(results.length, 0);
});

test('queryTriples includes invalidated with flag', () => {
  const results = queryTriples('gone', { include_invalid: true });
  assertGte(results.length, 1, 'Should find invalidated triple');
});

test('queryByObject does reverse lookup', () => {
  addTriple('genome-a', 'uses_stack', 'react');
  addTriple('genome-b', 'uses_stack', 'react');
  const results = queryByObject('react');
  assertGte(results.length, 2, 'Should find triples by object');
});

test('getTimeline returns sorted triples', () => {
  const timeline = getTimeline();
  assertType(timeline, 'object');
  assert(Array.isArray(timeline), 'Should be array');
  for (let i = 1; i < timeline.length; i++) {
    assert(timeline[i].valid_from >= timeline[i-1].valid_from, 'Should be sorted by date');
  }
});

test('getStats returns correct counts', () => {
  const stats = getStats();
  assertGte(stats.total_triples, 5, 'Should have multiple triples');
  assertGte(stats.active, 1, 'Should have active triples');
  assertGte(stats.invalidated, 1, 'Should have invalidated triples');
  assertGte(stats.unique_subjects, 3, 'Should have multiple subjects');
});

test('loadGraph returns valid structure', () => {
  const graph = loadGraph();
  assert(graph.version, 'Should have version');
  assert(Array.isArray(graph.triples), 'Should have triples array');
  assertType(graph.next_id, 'number');
});

// Cleanup
teardown();

module.exports = {};
