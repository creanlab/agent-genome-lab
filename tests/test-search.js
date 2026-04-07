#!/usr/bin/env node
/** M.7 — TF-IDF Search tests */
'use strict';

const { test, assert, assertEqual, assertGte, assertType } = require('./test-runner');
const { tokenize, computeTF, computeIDF, tfidfVector, cosineSimilarity, search } = require('../cli/nve-search');

test('tokenize removes stop words and normalizes', () => {
  const tokens = tokenize('The quick brown FOX jumped over the lazy dog');
  assert(!tokens.includes('the'), 'Should remove stop words');
  assert(tokens.includes('quick'), 'Should keep content words');
  assert(tokens.includes('fox'), 'Should lowercase');
  assert(!tokens.includes('the'), 'Should remove "the"');
});

test('tokenize handles empty and null input', () => {
  assertEqual(tokenize('').length, 0);
  assertEqual(tokenize(null).length, 0);
  assertEqual(tokenize(undefined).length, 0);
});

test('computeTF returns augmented frequency', () => {
  const tf = computeTF(['node', 'node', 'react']);
  assert(tf['node'] > tf['react'], 'More frequent term should have higher TF');
  assert(tf['node'] <= 1.0, 'TF should be <= 1.0');
  assert(tf['react'] >= 0.5, 'TF should be >= 0.5 (augmented)');
});

test('computeIDF returns higher values for rare terms', () => {
  const corpus = [
    ['node', 'express', 'api'],
    ['node', 'react', 'frontend'],
    ['python', 'django', 'api'],
  ];
  const idf = computeIDF(corpus);
  assert(idf['express'] > idf['node'], 'Rare term should have higher IDF');
  assert(idf['react'] > idf['node'], 'Unique term should have higher IDF');
});

test('tfidfVector combines TF and IDF', () => {
  const idf = { node: 0.5, express: 1.2, react: 1.2 };
  const vec = tfidfVector(['node', 'express', 'express'], idf);
  assertType(vec, 'object');
  assert(vec['express'] > vec['node'], 'Higher TF*IDF for frequent+rare term');
});

test('cosineSimilarity returns 1.0 for identical vectors', () => {
  const vec = { node: 0.5, express: 1.2 };
  const sim = cosineSimilarity(vec, vec);
  assert(Math.abs(sim - 1.0) < 0.001, `Expected ~1.0, got ${sim}`);
});

test('cosineSimilarity returns 0 for orthogonal vectors', () => {
  const vecA = { node: 1.0 };
  const vecB = { python: 1.0 };
  assertEqual(cosineSimilarity(vecA, vecB), 0);
});

test('cosineSimilarity returns 0 for empty vectors', () => {
  assertEqual(cosineSimilarity({}, {}), 0);
  assertEqual(cosineSimilarity({ a: 1 }, {}), 0);
});

test('search returns array', () => {
  const results = search('node express api');
  assertType(results, 'object'); // array is object
  assert(Array.isArray(results), 'Should return array');
});

test('search results have required fields', () => {
  const results = search('genome failure repair');
  for (const r of results) {
    assert(r.type, 'Result must have type');
    assert(r.id, 'Result must have id');
    assert(r.name, 'Result must have name');
    assertType(r.score, 'number');
  }
});

test('search respects topK', () => {
  const results = search('test', { topK: 3 });
  assert(results.length <= 3, `Expected <= 3 results, got ${results.length}`);
});

test('search with empty query returns empty', () => {
  const results = search('');
  assertEqual(results.length, 0);
});

module.exports = {};
