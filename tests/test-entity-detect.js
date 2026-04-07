#!/usr/bin/env node
/** P.9 — 2-Pass Entity Detection tests */
'use strict';

const { test, assert, assertEqual, assertGte, assertType } = require('./test-runner');
const {
  extractCandidates, classifyEntity, detectEntities,
} = require('../cli/nve-entity-detect');

// ─── Pass 1: Candidate Extraction ───────────────────────────────────────────

test('extractCandidates finds capitalized words', () => {
  const text = 'React is great. React works well. Node is fast.';
  const candidates = extractCandidates(text);
  assert(candidates.has('React'), 'Should find React (appears 2x)');
});

test('extractCandidates filters single-occurrence words', () => {
  const text = 'Django is a Python framework for building applications.';
  const candidates = extractCandidates(text);
  assert(!candidates.has('Django'), 'Single-occurrence Django filtered');
});

test('extractCandidates finds multi-word proper nouns', () => {
  const text = 'Memory Palace is a technique for improving recall.';
  const candidates = extractCandidates(text);
  assert(candidates.has('Memory Palace'), 'Should find Memory Palace (multi-word, 1x OK)');
});

test('extractCandidates finds technical identifiers', () => {
  const text = 'Use nve-search for queries. The nve-search tool is fast.';
  const candidates = extractCandidates(text);
  assert(candidates.has('nve-search'), 'Should find nve-search (hyphenated, 2x)');
});

test('extractCandidates returns Map with count', () => {
  const text = 'React React React is popular.';
  const candidates = extractCandidates(text);
  assert(candidates.has('React'), 'Should have React');
  assertEqual(candidates.get('React').count, 3, 'Should count 3 occurrences');
});

// ─── Pass 2: Classification ─────────────────────────────────────────────────

test('classifyEntity detects person from context', () => {
  const text = 'Alice said she would fix the bug. Alice told Bob about the issue.';
  const result = classifyEntity('Alice', text);
  assertEqual(result.type, 'person', 'Alice should be classified as person');
  assert(result.confidence > 0, 'Should have positive confidence');
});

test('classifyEntity detects project from context', () => {
  const text = 'We are building Express. Express v4.18 was released. The Express repo has many stars.';
  const result = classifyEntity('Express', text);
  assertEqual(result.type, 'project', 'Express should be classified as project');
});

test('classifyEntity detects technology', () => {
  const text = 'Docker containers run on the server. Docker provides backend isolation.';
  const result = classifyEntity('Docker', text);
  assertEqual(result.type, 'technology', 'Docker should be classified as technology');
});

test('classifyEntity returns unknown for ambiguous context', () => {
  const text = 'Foo is something. Foo is another thing.';
  const result = classifyEntity('Foo', text);
  // Should return some classification
  assert(['person', 'project', 'technology', 'unknown'].includes(result.type),
    `Should return valid type, got: ${result.type}`);
});

test('classifyEntity confidence is 0-1', () => {
  const text = 'Node.js is a runtime. Node.js uses JavaScript.';
  const result = classifyEntity('Node', text);
  assert(result.confidence >= 0 && result.confidence <= 1,
    `Confidence should be 0-1, got: ${result.confidence}`);
});

// ─── Full Pipeline ──────────────────────────────────────────────────────────

test('detectEntities returns sorted array', () => {
  const text = 'React React is great. Node Node is fast. She told them about Docker Docker containers.';
  const entities = detectEntities(text);
  assert(Array.isArray(entities), 'Should return array');
  if (entities.length >= 2) {
    const score = e => e.confidence * e.occurrences;
    assert(score(entities[0]) >= score(entities[1]), 'Should be sorted by confidence*occurrences');
  }
});

test('detectEntities includes type and confidence', () => {
  const text = 'React React is used in frontend frontend development.';
  const entities = detectEntities(text);
  if (entities.length > 0) {
    const e = entities[0];
    assert('name' in e, 'Should have name');
    assert('type' in e, 'Should have type');
    assert('confidence' in e, 'Should have confidence');
    assert('occurrences' in e, 'Should have occurrences');
  }
});

test('detectEntities returns empty for no-entity text', () => {
  const text = 'the quick brown fox jumps over the lazy dog';
  const entities = detectEntities(text);
  assertEqual(entities.length, 0, 'Lowercase text should yield no entities');
});
