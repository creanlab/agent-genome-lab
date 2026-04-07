#!/usr/bin/env node
/** P.4+P.6 — Palace Graph + Room Detection tests */
'use strict';

const { test, assert, assertEqual, assertGte, assertType, assertIncludes } = require('./test-runner');
const {
  detectRoom, ROOM_PATTERNS,
  buildGraph, traverse, findTunnels,
} = require('../cli/nve-palace');

// ─── Room Detection (P.6) ────────────────────────────────────────────────────

test('ROOM_PATTERNS has 20+ patterns', () => {
  assertGte(Object.keys(ROOM_PATTERNS).length, 20, 'Should have 20+ room patterns');
});

test('detectRoom finds node room', () => {
  const rooms = detectRoom('express.js server with npm packages');
  assert(rooms.includes('node'), 'Should detect node room');
});

test('detectRoom finds python room', () => {
  const rooms = detectRoom('Django application with pytest');
  assert(rooms.includes('python'), 'Should detect python room');
});

test('detectRoom finds security room', () => {
  const rooms = detectRoom('OWASP vulnerability XSS injection');
  assert(rooms.includes('security'), 'Should detect security room');
});

test('detectRoom finds database room', () => {
  const rooms = detectRoom('PostgreSQL migration with SQL schema');
  assert(rooms.includes('database'), 'Should detect database room');
});

test('detectRoom finds multiple rooms', () => {
  const rooms = detectRoom('React frontend with API endpoint and JWT auth');
  assert(rooms.length >= 2, `Should detect multiple rooms, got: ${rooms.join(', ')}`);
});

test('detectRoom returns general for unknown text', () => {
  const rooms = detectRoom('lorem ipsum dolor sit amet');
  assert(rooms.includes('general'), 'Should fall back to general');
});

test('detectRoom finds build-failure room', () => {
  const rooms = detectRoom('build failed with compilation error');
  assert(rooms.includes('build-failure'), 'Should detect build-failure');
});

test('detectRoom finds env-config room', () => {
  const rooms = detectRoom('environment variable missing from config');
  assert(rooms.includes('env-config'), 'Should detect env-config');
});

// ─── Palace Graph (P.4) ──────────────────────────────────────────────────────

test('buildGraph returns valid structure', () => {
  const graph = buildGraph();
  assertType(graph, 'object');
  assert(graph.version, 'Should have version');
  assert(graph.wings, 'Should have wings');
  assert(graph.rooms, 'Should have rooms');
  assert(graph.stats, 'Should have stats');
  assertType(graph.stats.wing_count, 'number');
  assertType(graph.stats.room_count, 'number');
});

test('buildGraph detects wings', () => {
  const graph = buildGraph();
  assertGte(graph.stats.wing_count, 1, 'Should have at least 1 wing');
});

test('buildGraph detects rooms', () => {
  const graph = buildGraph();
  assertGte(graph.stats.room_count, 1, 'Should have at least 1 room');
});

test('traverse returns connections', () => {
  const graph = buildGraph();
  const roomNames = Object.keys(graph.rooms);
  if (roomNames.length === 0) return; // Skip if no rooms
  const result = traverse(roomNames[0]);
  assertType(result, 'object');
  assert(result.room, 'Should have room name');
  assert(Array.isArray(result.connections), 'Should have connections array');
});

test('traverse returns error for unknown room', () => {
  buildGraph(); // Ensure graph exists
  const result = traverse('nonexistent_room_xyz');
  assert(result.error, 'Should return error for unknown room');
});

test('findTunnels returns array', () => {
  buildGraph();
  const tunnels = findTunnels();
  assert(Array.isArray(tunnels), 'Should return array');
  for (const t of tunnels) {
    assert(t.room, 'Tunnel should have room');
    assert(Array.isArray(t.wings), 'Tunnel should have wings array');
    assertGte(t.wings.length, 2, 'Tunnel should span 2+ wings');
  }
});

module.exports = {};
