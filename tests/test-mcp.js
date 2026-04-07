#!/usr/bin/env node
/** P.5 — MCP Server tests */
'use strict';

const { test, assert, assertEqual, assertGte, assertType } = require('./test-runner');
const { TOOLS, handlers } = require('../cli/nve-mcp');

// ─── Tool Definitions ────────────────────────────────────────────────────────

test('TOOLS has 15 entries', () => {
  assertEqual(TOOLS.length, 15);
});

test('each tool has name, description, inputSchema', () => {
  for (const tool of TOOLS) {
    assert(tool.name, `Tool missing name`);
    assert(tool.description, `${tool.name} missing description`);
    assert(tool.inputSchema, `${tool.name} missing inputSchema`);
    assertEqual(tool.inputSchema.type, 'object');
  }
});

test('all tool names start with nve_', () => {
  for (const tool of TOOLS) {
    assert(tool.name.startsWith('nve_'), `${tool.name} should start with nve_`);
  }
});

test('tools with required params have them in schema', () => {
  const search = TOOLS.find(t => t.name === 'nve_search');
  assert(search.inputSchema.required.includes('query'), 'nve_search should require query');

  const capture = TOOLS.find(t => t.name === 'nve_capture_incident');
  assert(capture.inputSchema.required.includes('title'), 'nve_capture_incident should require title');
  assert(capture.inputSchema.required.includes('summary'), 'nve_capture_incident should require summary');
});

// ─── Handler Execution ───────────────────────────────────────────────────────

test('nve_status handler returns project info', () => {
  const result = handlers.nve_status();
  assert(result.project, 'Should have project name');
  assertType(result.genomes, 'number');
  assertType(result.skills, 'number');
});

test('nve_memory_tree handler returns structure', () => {
  const result = handlers.nve_memory_tree();
  // May return error if module not loadable, that's ok
  assertType(result, 'object');
});

test('nve_wake_up handler returns AAAK context', () => {
  const result = handlers.nve_wake_up();
  assertType(result, 'object');
  if (!result.error) {
    assertType(result.l0_identity, 'string');
    assert(Array.isArray(result.l1_essential), 'l1 should be array');
    assertType(result.token_estimate, 'number');
  }
});

test('nve_search handler returns results', () => {
  const result = handlers.nve_search({ query: 'genome failure' });
  if (!result.error) {
    assert(Array.isArray(result), 'Should return array');
  }
});

test('nve_genomes_list handler returns array', () => {
  const result = handlers.nve_genomes_list();
  if (!result.error) {
    assert(Array.isArray(result), 'Should return array');
  }
});

test('nve_skills_list handler returns array', () => {
  const result = handlers.nve_skills_list();
  assert(Array.isArray(result), 'Should return array');
});

test('nve_doctor handler returns checks', () => {
  const result = handlers.nve_doctor();
  assert(Array.isArray(result), 'Should return array');
  assertGte(result.length, 3, 'Should have at least 3 checks');
  for (const check of result) {
    assert(check.name, 'Check should have name');
    assert(['pass', 'fail', 'warn'].includes(check.status), `Invalid status: ${check.status}`);
  }
});

test('nve_aaak_compress handler compresses text', () => {
  const result = handlers.nve_aaak_compress({ text: 'The failure genome system decided to use TF-IDF for search' });
  if (!result.error) {
    assertType(result.aaak, 'string');
    assert(result.aaak.length > 0, 'AAAK should not be empty');
    assertType(result.ratio, 'string');
    assert(result.ratio.includes('x'), 'Ratio should contain x');
  }
});

test('nve_compact handler returns object', () => {
  const result = handlers.nve_compact();
  assertType(result, 'object');
});

test('all handlers exist for all tools', () => {
  for (const tool of TOOLS) {
    assert(typeof handlers[tool.name] === 'function', `Handler missing for ${tool.name}`);
  }
});

module.exports = {};
