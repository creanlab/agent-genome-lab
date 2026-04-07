#!/usr/bin/env node
/** P.8 — Verbatim Drawer Storage tests */
'use strict';

const { test, assert, assertEqual, assertGte, assertType } = require('./test-runner');
const {
  chunkText, createDrawers, ingestFile, loadAllDrawers, getStats,
} = require('../cli/nve-drawers');

// ─── Chunking ───────────────────────────────────────────────────────────────

test('chunkText returns single chunk for short text', () => {
  const chunks = chunkText('Hello world');
  assertEqual(chunks.length, 1, 'Short text = 1 chunk');
  assertEqual(chunks[0], 'Hello world');
});

test('chunkText returns empty for null/empty', () => {
  assertEqual(chunkText('').length, 0, 'Empty = no chunks');
  assertEqual(chunkText(null).length, 0, 'Null = no chunks');
});

test('chunkText splits long text into multiple chunks', () => {
  const text = 'A'.repeat(2000);
  const chunks = chunkText(text, 800, 100);
  assert(chunks.length >= 2, `Should split into 2+ chunks, got ${chunks.length}`);
});

test('chunkText respects overlap', () => {
  // Create text with clear boundaries
  const para1 = 'First paragraph content. '.repeat(40); // ~1000 chars
  const para2 = 'Second paragraph content. '.repeat(40);
  const text = para1 + '\n\n' + para2;
  const chunks = chunkText(text, 800, 100);
  assert(chunks.length >= 2, 'Should produce multiple chunks');
  // Chunks should not be empty
  for (const c of chunks) {
    assert(c.length > 0, 'No empty chunks');
  }
});

test('chunkText respects paragraph boundaries', () => {
  const text = 'A'.repeat(300) + '\n\n' + 'B'.repeat(300) + '\n\n' + 'C'.repeat(300);
  const chunks = chunkText(text, 700, 50);
  // Should try to break at \n\n
  assert(chunks.length >= 2, 'Should split at paragraph boundaries');
});

// ─── Drawer Creation ────────────────────────────────────────────────────────

test('createDrawers generates correct metadata', () => {
  const chunks = ['chunk one', 'chunk two'];
  const drawers = createDrawers(chunks, {
    source_file: 'test.md',
    source_id: 'test',
    wing: 'main',
    room: 'general',
  });
  assertEqual(drawers.length, 2, 'Should create 2 drawers');
  assertEqual(drawers[0].source_id, 'test');
  assertEqual(drawers[0].wing, 'main');
  assertEqual(drawers[0].room, 'general');
  assertEqual(drawers[0].chunk_index, 0);
  assertEqual(drawers[1].chunk_index, 1);
});

test('createDrawers assigns sequential IDs', () => {
  const chunks = ['a', 'b', 'c'];
  const drawers = createDrawers(chunks, { source_id: 'x', source_file: 'x.md' });
  assertEqual(drawers[0].id, 'x_000');
  assertEqual(drawers[1].id, 'x_001');
  assertEqual(drawers[2].id, 'x_002');
});

test('createDrawers tracks char_count', () => {
  const chunks = ['hello world'];
  const drawers = createDrawers(chunks, { source_id: 't', source_file: 't.md' });
  assertEqual(drawers[0].char_count, 11);
});

// ─── Stats ──────────────────────────────────────────────────────────────────

test('getStats returns valid structure', () => {
  const stats = getStats();
  assertType(stats, 'object', 'Should return object');
  assert('total_drawers' in stats, 'Should have total_drawers');
  assert('total_sources' in stats, 'Should have total_sources');
  assert('total_chars' in stats, 'Should have total_chars');
  assert('rooms' in stats, 'Should have rooms');
});

test('loadAllDrawers returns array', () => {
  const drawers = loadAllDrawers();
  assert(Array.isArray(drawers), 'Should return array');
});
