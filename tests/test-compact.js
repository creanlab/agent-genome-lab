#!/usr/bin/env node
/** I.7-I.10 — Context compaction tests */
'use strict';

const { test, assert, assertGte, assertIncludes } = require('./test-runner');
const { extractEvidence, extractOpenThreads, detectIncidentCandidates } = require('../cli/nve-compact');

const SAMPLE_TRACE = `
Running tests...
  ✓ test-schemas passed
  ✓ test-provider passed
  ✗ test-auth FAIL: connection timeout
  Error: ECONNREFUSED on port 3000

  TODO: fix the auth timeout issue
  FIXME: retry logic missing

  question: should we use a connection pool?
  need to investigate the timeout root cause

  ✓ test-memory passed
`;

test('extractEvidence finds observed facts from success markers', () => {
  const evidence = extractEvidence(SAMPLE_TRACE);
  const observed = evidence.filter(e => e.evidence_type === 'observed');
  assertGte(observed.length, 1, 'Should find at least 1 observed fact');
});

test('extractEvidence finds errors as observed', () => {
  const evidence = extractEvidence(SAMPLE_TRACE);
  const errors = evidence.filter(e => e.source === 'error');
  assertGte(errors.length, 1, 'Should find at least 1 error');
});

test('extractEvidence finds pending items from TODO/FIXME', () => {
  const evidence = extractEvidence(SAMPLE_TRACE);
  const pending = evidence.filter(e => e.evidence_type === 'pending');
  assertGte(pending.length, 1, 'Should find at least 1 pending item');
});

test('extractEvidence returns entries with required fields', () => {
  const evidence = extractEvidence(SAMPLE_TRACE);
  for (const e of evidence) {
    assert(e.fact, 'entry missing fact');
    assert(e.evidence_type, 'entry missing evidence_type');
    assert(e.source, 'entry missing source');
    assertIncludes(['observed', 'inferred', 'pending'], e.evidence_type, `invalid evidence_type: ${e.evidence_type}`);
  }
});

test('extractOpenThreads finds questions', () => {
  const threads = extractOpenThreads(SAMPLE_TRACE);
  assertGte(threads.length, 1, 'Should find at least 1 thread');
});

test('extractOpenThreads returns entries with required fields', () => {
  const threads = extractOpenThreads(SAMPLE_TRACE);
  for (const t of threads) {
    assert(t.thread_id, 'thread missing thread_id');
    assert(t.summary, 'thread missing summary');
    assert(t.created_at, 'thread missing created_at');
  }
});

test('extractOpenThreads caps at 10', () => {
  const longTrace = Array(20).fill('question: what about this?\n').join('');
  const threads = extractOpenThreads(longTrace);
  assert(threads.length <= 10, `Should cap at 10, got ${threads.length}`);
});

test('detectIncidentCandidates finds errors', () => {
  const candidates = detectIncidentCandidates(SAMPLE_TRACE);
  assertGte(candidates.length, 1, 'Should find at least 1 incident');
});

test('detectIncidentCandidates returns entries with required fields', () => {
  const candidates = detectIncidentCandidates(SAMPLE_TRACE);
  for (const c of candidates) {
    assert(c.candidate_id, 'candidate missing candidate_id');
    assert(c.raw_observation, 'candidate missing raw_observation');
    assert(c.lesson_type, 'candidate missing lesson_type');
    assert(c.source, 'candidate missing source');
  }
});

test('detectIncidentCandidates caps at 5', () => {
  const manyErrors = Array(10).fill('Error: something failed\ncrash report\n').join('');
  const candidates = detectIncidentCandidates(manyErrors);
  assert(candidates.length <= 5, `Should cap at 5, got ${candidates.length}`);
});

test('extractEvidence handles empty trace', () => {
  const evidence = extractEvidence('');
  assert(Array.isArray(evidence), 'Should return array');
  assert(evidence.length === 0, 'Empty trace should produce no evidence');
});

module.exports = {};
