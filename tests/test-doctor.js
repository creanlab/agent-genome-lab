#!/usr/bin/env node
/** C.13 — Doctor concept tests */
'use strict';

const fs = require('fs');
const path = require('path');
const { test, assert, assertGte } = require('./test-runner');

test('Node.js version >= 18', () => {
  const major = parseInt(process.versions.node.split('.')[0], 10);
  assertGte(major, 18, `Node ${major} < 18`);
});

test('schemas/ directory exists and has subdirs', () => {
  const schemasDir = path.join(__dirname, '..', 'schemas');
  assert(fs.existsSync(schemasDir), 'schemas/ not found');
  const runtime = path.join(schemasDir, 'runtime');
  const genome = path.join(schemasDir, 'genome');
  assert(fs.existsSync(runtime), 'schemas/runtime/ not found');
  assert(fs.existsSync(genome), 'schemas/genome/ not found');
});

test('cli/ directory has expected tool count', () => {
  const cliDir = path.join(__dirname, '..', 'cli');
  const jsFiles = fs.readdirSync(cliDir).filter(f => f.endsWith('.js'));
  assertGte(jsFiles.length, 30, `Expected >=30 CLI files, got ${jsFiles.length}`);
});

test('package.json version is 3.x', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert(pkg.version.startsWith('3.'), `Version ${pkg.version} is not 3.x`);
});

test('placeholder key patterns detected correctly', () => {
  const placeholders = ['sk-xxx', 'your-key-here', 'REPLACE_ME', 'sk-ant-xxx', '', 'INSERT_KEY'];
  const realKeys = ['sk-ant-api03-abcdefghijklmnop1234567890', 'gsk_abc123def456'];

  function isPlaceholder(key) {
    if (!key || key.length < 10) return true;
    const patterns = ['xxx', 'your-key', 'replace', 'insert', 'todo', 'placeholder', 'example'];
    return patterns.some(p => key.toLowerCase().includes(p));
  }

  for (const p of placeholders) {
    assert(isPlaceholder(p), `Should detect placeholder: "${p}"`);
  }
  for (const r of realKeys) {
    assert(!isPlaceholder(r), `Should pass real key: "${r}"`);
  }
});

module.exports = {};
