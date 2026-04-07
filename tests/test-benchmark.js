#!/usr/bin/env node
/** P.7 — Benchmark Harness tests */
'use strict';

const { test, assert, assertEqual, assertGte, assertType } = require('./test-runner');
const {
  generateDataset, runFlat, runPalace, runBenchmark, loadDataset, saveDataset,
} = require('../cli/nve-benchmark');

// ─── Dataset Generation ─────────────────────────────────────────────────────

test('generateDataset returns array', () => {
  const pairs = generateDataset();
  assertType(pairs, 'object', 'Should return array');
  assert(Array.isArray(pairs), 'Should be an array');
});

test('dataset pairs have required fields', () => {
  const pairs = generateDataset();
  if (pairs.length === 0) return; // OK if no genomes/skills exist
  const p = pairs[0];
  assert('query' in p, 'Should have query');
  assert('expected_id' in p, 'Should have expected_id');
  assert('expected_type' in p, 'Should have expected_type');
  assert('difficulty' in p, 'Should have difficulty');
});

test('dataset difficulty levels are valid', () => {
  const pairs = generateDataset();
  const validDiffs = new Set(['easy', 'medium', 'hard']);
  for (const p of pairs) {
    assert(validDiffs.has(p.difficulty), `Invalid difficulty: ${p.difficulty}`);
  }
});

test('dataset expected_type is genome or skill', () => {
  const pairs = generateDataset();
  const validTypes = new Set(['genome', 'skill']);
  for (const p of pairs) {
    assert(validTypes.has(p.expected_type), `Invalid type: ${p.expected_type}`);
  }
});

// ─── Save/Load ──────────────────────────────────────────────────────────────

test('saveDataset writes file', () => {
  const fs = require('fs');
  const pairs = [{ query: 'test', expected_id: 'x', expected_type: 'genome', difficulty: 'easy' }];
  const outPath = saveDataset(pairs);
  assert(fs.existsSync(outPath), 'Should create dataset file');
});

test('loadDataset reads saved data', () => {
  const ds = loadDataset();
  assert(ds !== null, 'Should load dataset');
  assert(Array.isArray(ds.pairs), 'Should have pairs array');
  assertGte(ds.pairs.length, 1, 'Should have at least 1 pair');
});

// ─── Benchmark Execution ────────────────────────────────────────────────────

test('runFlat returns results object', () => {
  const pairs = [{ query: 'test query', expected_id: 'none', expected_type: 'genome', difficulty: 'easy' }];
  const result = runFlat(pairs);
  if (!result) return; // nve-search not available
  assert('hits' in result, 'Should have hits');
  assert('misses' in result, 'Should have misses');
  assert('recall_at_k' in result, 'Should have recall_at_k');
  assert('avg_latency_ms' in result, 'Should have avg_latency_ms');
});

test('runFlat recall_at_k is 0-1', () => {
  const pairs = [{ query: 'test', expected_id: 'none', expected_type: 'genome', difficulty: 'easy' }];
  const result = runFlat(pairs);
  if (!result) return;
  assertGte(result.recall_at_k, 0, 'recall >= 0');
  assert(result.recall_at_k <= 1, 'recall <= 1');
});

test('runBenchmark returns report', () => {
  const report = runBenchmark('flat');
  assertType(report, 'object', 'Should return report');
  assert('timestamp' in report || 'error' in report, 'Should have timestamp or error');
});

test('runBenchmark tracks difficulty breakdown', () => {
  const report = runBenchmark('flat');
  if (report.error) return;
  if (!report.flat) return;
  assertType(report.flat.by_difficulty, 'object', 'Should have difficulty breakdown');
});

test('runBenchmark both mode runs flat and palace', () => {
  const report = runBenchmark('both');
  if (report.error) return;
  // At least one should exist
  assert(report.flat !== undefined || report.palace !== undefined, 'Should have at least one result');
});
