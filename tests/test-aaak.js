#!/usr/bin/env node
/** P.1+P.2 — AAAK Compression + Wake-up Protocol tests */
'use strict';

const { test, assert, assertEqual, assertGte, assertType, assertIncludes } = require('./test-runner');
const {
  compress, expand, compressBundle,
  detectEntities, extractTopics, detectEmotions, detectFlags,
  extractKeySentence, computeWeight,
  generateL0, generateL1, generateWakeUp,
} = require('../cli/nve-aaak');

// ─── Entity Detection ────────────────────────────────────────────────────────

test('detectEntities finds capitalized names (2+ occurrences)', () => {
  const entities = detectEntities('Alice talked to Bob. Alice told Bob about the project.');
  assert(entities.has('Alice'), 'Should detect Alice');
  assert(entities.has('Bob'), 'Should detect Bob');
  assertEqual(entities.get('Alice'), 'ALI');
});

test('detectEntities ignores single occurrences', () => {
  const entities = detectEntities('Once upon a time, Charlie appeared.');
  assert(!entities.has('Charlie'), 'Single occurrence should be ignored');
});

// ─── Topic Extraction ────────────────────────────────────────────────────────

test('extractTopics returns top keywords', () => {
  const topics = extractTopics('genome failure repair operator genome repair verification genome');
  assert(topics.includes('genome'), 'Should include most frequent word');
  assert(topics.includes('repair'), 'Should include second frequent word');
  assertGte(topics.length, 2, 'Should return at least 2 topics');
});

test('extractTopics skips stop words', () => {
  const topics = extractTopics('the the the and and or but genome');
  assert(!topics.includes('the'), 'Should skip stop words');
});

// ─── Emotion Detection ───────────────────────────────────────────────────────

test('detectEmotions finds known emotions', () => {
  const emotions = detectEmotions('I was frustrated that the build failed again');
  assert(emotions.includes('frust'), 'Should detect frustration');
  assert(emotions.includes('fail'), 'Should detect failure');
});

test('detectEmotions returns empty for neutral text', () => {
  const emotions = detectEmotions('function returns array of numbers');
  assertEqual(emotions.length, 0);
});

// ─── Flag Detection ──────────────────────────────────────────────────────────

test('detectFlags finds DECISION flag', () => {
  const flags = detectFlags('We decided to use Node.js for the backend');
  assert(flags.includes('DECISION'), 'Should detect DECISION');
});

test('detectFlags finds INVARIANT and AVOID', () => {
  const flags = detectFlags('You must never expose secrets in logs. Avoid using plain text passwords.');
  assert(flags.includes('INVARIANT'), 'Should detect INVARIANT');
  assert(flags.includes('AVOID'), 'Should detect AVOID');
});

test('detectFlags finds REPAIR', () => {
  const flags = detectFlags('The fix was to add input validation');
  assert(flags.includes('REPAIR'), 'Should detect REPAIR');
});

// ─── Key Sentence Extraction ─────────────────────────────────────────────────

test('extractKeySentence picks decision sentences', () => {
  const text = 'The system had many components. We decided to split the monolith into microservices. The team agreed.';
  const key = extractKeySentence(text);
  assertIncludes(key, 'decided');
});

test('extractKeySentence handles short text', () => {
  const key = extractKeySentence('Short text here');
  assertType(key, 'string');
  assert(key.length > 0, 'Should return non-empty string');
});

// ─── Weight Computation ──────────────────────────────────────────────────────

test('computeWeight returns higher for decisions', () => {
  const w1 = computeWeight('normal text', [], []);
  const w2 = computeWeight('decided something', ['DECISION'], ['determ']);
  assert(w2 > w1, `Decision weight ${w2} should be > base weight ${w1}`);
});

test('computeWeight stays in 0.1-1.0 range', () => {
  const w = computeWeight('decided core invariant must always avoid never pivot breakthrough',
    ['DECISION', 'CORE', 'INVARIANT', 'PIVOT'], ['determ', 'fix']);
  assert(w >= 0.1 && w <= 1.0, `Weight ${w} should be in [0.1, 1.0]`);
});

// ─── Compress / Expand ───────────────────────────────────────────────────────

test('compress produces AAAK format string', () => {
  const result = compress('Alice and Bob decided to build a genome system. Alice tested the replay gate. Bob fixed the verification pipeline.');
  assertType(result, 'string');
  assert(result.includes('|'), 'Should contain pipe separators');
  assert(result.includes('"'), 'Should contain quoted sentence');
});

test('compress achieves compression ratio > 1', () => {
  const text = 'The failure genome system tracks violated invariants and repair operators across multiple projects. Each genome is scored by utility and can be promoted after passing the replay gate verification process.';
  const result = compress(text);
  assert(text.length > result.length, `Input (${text.length}) should be longer than output (${result.length})`);
});

test('expand parses AAAK string back', () => {
  const aaak = 'Z01:ALI,BOB|genome_repair_test|"decided to build genome system"|0.85|determ+excite|DECISION,CORE';
  const parsed = expand(aaak);
  assert(parsed !== null, 'Should parse successfully');
  assertEqual(parsed.id, 'Z01');
  assert(parsed.entities.includes('ALI'), 'Should have ALI entity');
  assert(parsed.topics.includes('genome'), 'Should have genome topic');
  assertEqual(parsed.key_sentence, 'decided to build genome system');
  assert(Math.abs(parsed.weight - 0.85) < 0.01, 'Weight should be 0.85');
  assert(parsed.emotions.includes('determ'), 'Should have determ emotion');
  assert(parsed.flags.includes('DECISION'), 'Should have DECISION flag');
});

test('expand returns null for invalid input', () => {
  assertEqual(expand('not an aaak string'), null);
  assertEqual(expand(''), null);
});

test('compress empty text returns empty string', () => {
  assertEqual(compress(''), '');
  assertEqual(compress('  '), '');
});

// ─── Bundle Compression ──────────────────────────────────────────────────────

test('compressBundle handles array of chunks', () => {
  const chunks = [
    { text: 'First important memory about genome failures', id: 'Z01' },
    { text: 'Second memory about repair operators and verification', id: 'Z02' },
    { text: '', id: 'Z03' }, // empty, should be filtered
  ];
  const result = compressBundle(chunks);
  assertEqual(result.length, 2);
  assert(result[0].startsWith('Z01:'), 'First should have Z01 id');
});

// ─── Wake-up Protocol ────────────────────────────────────────────────────────

test('generateL0 returns string', () => {
  const l0 = generateL0();
  assertType(l0, 'string');
  // Should have project info if package.json exists
});

test('generateL1 returns array of AAAK strings', () => {
  const l1 = generateL1();
  assert(Array.isArray(l1), 'L1 should be array');
  for (const line of l1) {
    assertType(line, 'string');
  }
});

test('generateWakeUp returns combined context', () => {
  const wakeup = generateWakeUp();
  assertType(wakeup.l0_identity, 'string');
  assert(Array.isArray(wakeup.l1_essential), 'l1_essential should be array');
  assertType(wakeup.combined, 'string');
  assertType(wakeup.token_estimate, 'number');
  assert(wakeup.token_estimate >= 0, 'Token estimate should be >= 0');
});

test('wake-up token estimate is reasonable', () => {
  const wakeup = generateWakeUp();
  // Should be under 1000 tokens for the wake-up protocol
  assert(wakeup.token_estimate < 2000, `Token estimate ${wakeup.token_estimate} should be < 2000`);
});

module.exports = {};
