#!/usr/bin/env node
/** P.10 — Agent Session Diary tests */
'use strict';

const fs = require('fs');
const path = require('path');
const { test, assert, assertEqual, assertGte, assertType } = require('./test-runner');
const {
  createEntry, detectEntryType, loadEntries, loadAllEntries,
  searchDiary, getStats, diaryPath, generateSessionId,
} = require('../cli/nve-diary');

// ─── Entry Creation ─────────────────────────────────────────────────────────

test('createEntry returns structured entry', () => {
  const entry = createEntry('Fixed the login bug in auth module');
  assert(entry !== null, 'Should return entry');
  assert(entry.id.startsWith('D'), 'ID should start with D');
  assert('timestamp' in entry, 'Should have timestamp');
  assert('session_id' in entry, 'Should have session_id');
  assert('text' in entry, 'Should have text');
  assert('type' in entry, 'Should have type');
});

test('createEntry returns null for empty text', () => {
  assertEqual(createEntry(''), null, 'Empty text = null');
  assertEqual(createEntry('   '), null, 'Whitespace = null');
  assertEqual(createEntry(null), null, 'Null = null');
});

test('createEntry trims text', () => {
  const entry = createEntry('  hello world  ');
  assertEqual(entry.text, 'hello world', 'Should trim');
});

test('createEntry includes AAAK compression', () => {
  const entry = createEntry('The critical error in the database caused a crash. The error was fixed by patching the query.');
  // AAAK might be null if nve-aaak not available, but should at least have the field
  assert('aaak' in entry, 'Should have aaak field');
});

test('createEntry accepts custom tags', () => {
  const entry = createEntry('test entry', { tags: ['auth', 'bugfix'] });
  assertEqual(entry.tags.length, 2, 'Should have 2 tags');
  assert(entry.tags.includes('auth'), 'Should include auth tag');
});

test('createEntry accepts custom session_id', () => {
  const entry = createEntry('test', { session_id: 'MY_SESSION' });
  assertEqual(entry.session_id, 'MY_SESSION');
});

// ─── Entry Type Detection ───────────────────────────────────────────────────

test('detectEntryType identifies incident', () => {
  assertEqual(detectEntryType('error in production server'), 'incident');
});

test('detectEntryType identifies resolution', () => {
  assertEqual(detectEntryType('fixed the auth issue successfully'), 'resolution');
});

test('detectEntryType identifies decision', () => {
  assertEqual(detectEntryType('decided to use PostgreSQL'), 'decision');
});

test('detectEntryType identifies insight', () => {
  assertEqual(detectEntryType('learned that caching helps'), 'insight');
});

test('detectEntryType defaults to note', () => {
  assertEqual(detectEntryType('some random text about things'), 'note');
});

// ─── Session ID ─────────────────────────────────────────────────────────────

test('generateSessionId starts with S', () => {
  const id = generateSessionId();
  assert(id.startsWith('S'), `Should start with S, got: ${id}`);
  assert(id.length >= 4, 'Should be at least 4 chars');
});

// ─── Diary Path ─────────────────────────────────────────────────────────────

test('diaryPath formats as YYYY-MM-DD.jsonl', () => {
  const p = diaryPath(new Date('2026-04-07'));
  assert(p.endsWith('2026-04-07.jsonl'), `Should end with date.jsonl, got: ${p}`);
});

// ─── Stats ──────────────────────────────────────────────────────────────────

test('getStats returns valid structure', () => {
  const stats = getStats();
  assertType(stats, 'object');
  assert('total_entries' in stats, 'Should have total_entries');
  assert('total_sessions' in stats, 'Should have total_sessions');
  assert('total_days' in stats, 'Should have total_days');
  assert('types' in stats, 'Should have types');
  assert('has_aaak' in stats, 'Should have has_aaak');
});

// ─── Search ─────────────────────────────────────────────────────────────────

test('searchDiary returns array', () => {
  const results = searchDiary('test query');
  assert(Array.isArray(results), 'Should return array');
});

test('loadAllEntries returns array', () => {
  const entries = loadAllEntries();
  assert(Array.isArray(entries), 'Should return array');
});
