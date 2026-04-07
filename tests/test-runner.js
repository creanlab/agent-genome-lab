#!/usr/bin/env node
/**
 * Minimal test runner — zero external dependencies.
 * Usage: require and call test(), then run() at end.
 */
'use strict';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  red: '\x1b[31m', yellow: '\x1b[33m', dim: '\x1b[2m',
};

const tests = [];
let passed = 0;
let failed = 0;
const errors = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b, msg) {
  const as = JSON.stringify(a);
  const bs = JSON.stringify(b);
  if (as !== bs) throw new Error(msg || `Expected ${as} to equal ${bs}`);
}

function assertThrows(fn, msg) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  if (!threw) throw new Error(msg || 'Expected function to throw');
}

function assertIncludes(arr, item, msg) {
  const found = Array.isArray(arr) ? arr.includes(item) : String(arr).includes(item);
  if (!found) throw new Error(msg || `Expected ${JSON.stringify(arr)} to include ${JSON.stringify(item)}`);
}

function assertType(val, type, msg) {
  if (typeof val !== type) throw new Error(msg || `Expected typeof ${typeof val} to be ${type}`);
}

function assertGt(a, b, msg) {
  if (!(a > b)) throw new Error(msg || `Expected ${a} > ${b}`);
}

function assertGte(a, b, msg) {
  if (!(a >= b)) throw new Error(msg || `Expected ${a} >= ${b}`);
}

async function run() {
  console.log(`\n${C.bold}Running ${tests.length} tests${C.reset}\n`);
  for (const t of tests) {
    try {
      const result = t.fn();
      if (result && typeof result.then === 'function') await result;
      passed++;
      console.log(`  ${C.green}✓${C.reset} ${t.name}`);
    } catch (e) {
      failed++;
      errors.push({ name: t.name, error: e });
      console.log(`  ${C.red}✗${C.reset} ${t.name}`);
      console.log(`    ${C.dim}${e.message}${C.reset}`);
    }
  }
  console.log(`\n${C.bold}Results:${C.reset} ${C.green}${passed} passed${C.reset}, ${C.red}${failed} failed${C.reset} / ${tests.length} total\n`);
  if (errors.length > 0) {
    console.log(`${C.red}Failures:${C.reset}`);
    for (const e of errors) {
      console.log(`  ${C.red}✗${C.reset} ${e.name}: ${e.error.message}`);
    }
    console.log();
  }
  return { passed, failed, total: tests.length, errors };
}

module.exports = { test, assert, assertEqual, assertThrows, assertIncludes, assertType, assertGt, assertGte, run };
