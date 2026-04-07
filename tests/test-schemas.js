#!/usr/bin/env node
/** A.8 — Validate all schema files */
'use strict';

const fs = require('fs');
const path = require('path');
const { test, assert, assertEqual, assertIncludes, assertGte } = require('./test-runner');

const SCHEMAS_DIR = path.join(__dirname, '..', 'schemas');

test('schemas/runtime/ has 4 schema files', () => {
  const dir = path.join(SCHEMAS_DIR, 'runtime');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.schema.json'));
  assertEqual(files.length, 4, `Expected 4, got ${files.length}: ${files.join(', ')}`);
});

test('schemas/genome/ has 3 schema files', () => {
  const dir = path.join(SCHEMAS_DIR, 'genome');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.schema.json'));
  assertEqual(files.length, 3, `Expected 3, got ${files.length}: ${files.join(', ')}`);
});

test('failure-genome.schema.json exists and is valid JSON', () => {
  const fp = path.join(SCHEMAS_DIR, 'failure-genome.schema.json');
  assert(fs.existsSync(fp), 'failure-genome.schema.json not found');
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  assert(data.type === 'object', 'type should be object');
});

test('failure-genome.schema.json has kind field', () => {
  const data = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'failure-genome.schema.json'), 'utf8'));
  assert(data.properties.kind, 'kind field missing from properties');
  assertIncludes(data.properties.kind.enum, 'failure');
  assertIncludes(data.properties.kind.enum, 'success');
  assertIncludes(data.properties.kind.enum, 'strategy');
});

test('failure-genome.schema.json has adversarial_review field', () => {
  const data = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'failure-genome.schema.json'), 'utf8'));
  assert(data.properties.adversarial_review, 'adversarial_review field missing');
});

test('all schema files are valid JSON with required meta fields', () => {
  const dirs = ['runtime', 'genome'];
  for (const dir of dirs) {
    const fullDir = path.join(SCHEMAS_DIR, dir);
    if (!fs.existsSync(fullDir)) continue;
    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.schema.json'));
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(fullDir, file), 'utf8'));
      assert(data.$schema, `${dir}/${file} missing $schema`);
      assert(data.$id, `${dir}/${file} missing $id`);
      assert(data.type, `${dir}/${file} missing type`);
      assert(data.properties, `${dir}/${file} missing properties`);
    }
  }
});

test('query_task.schema.json has correct structure', () => {
  const data = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'runtime', 'query_task.schema.json'), 'utf8'));
  assert(data.properties.task_id, 'missing task_id');
  assert(data.properties.input, 'missing input');
  assert(data.properties.context, 'missing context');
});

test('hypothesis.schema.json has correct structure', () => {
  const data = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'runtime', 'hypothesis.schema.json'), 'utf8'));
  assert(data.properties.hypothesis_id, 'missing hypothesis_id');
  assert(data.properties.proposed_action, 'missing proposed_action');
});

test('replay_result.schema.json has gate weights', () => {
  const data = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, 'genome', 'replay_result.schema.json'), 'utf8'));
  assert(data.properties.weights || data.properties.gate_inputs, 'missing weights or gate_inputs');
});

module.exports = {};
