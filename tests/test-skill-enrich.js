#!/usr/bin/env node
/** M.4+M.5 — Skill Enrichment tests */
'use strict';

const { test, assert, assertIncludes, assertGte, assertType } = require('./test-runner');
const { parseSkillMd, generateGotchas, generateReferenceExample } = require('../cli/nve-skill-enrich');

const SAMPLE_SKILL_MD = `---
name: test-skill
description: "A test skill for unit tests"
applies_to: ["node", "express"]
---

# Test Skill

## Invariants
✅ **Always validate input** before processing
✅ **Never expose secrets** in logs

## Repair Operators
🔧 Add input validation middleware
🔧 Redact sensitive fields

## Context & Applicability
This skill applies to Node.js + Express APIs.
`;

test('parseSkillMd extracts name from frontmatter', () => {
  const result = parseSkillMd(SAMPLE_SKILL_MD);
  assert(result.name === 'test-skill', `Expected 'test-skill', got '${result.name}'`);
});

test('parseSkillMd extracts description', () => {
  const result = parseSkillMd(SAMPLE_SKILL_MD);
  assertIncludes(result.description, 'test skill');
});

test('parseSkillMd extracts applies_to', () => {
  const result = parseSkillMd(SAMPLE_SKILL_MD);
  assert(result.applies_to.includes('node'), 'Should include node');
  assert(result.applies_to.includes('express'), 'Should include express');
});

test('parseSkillMd extracts invariants', () => {
  const result = parseSkillMd(SAMPLE_SKILL_MD);
  assertGte(result.invariants.length, 2, 'Should find 2 invariants');
  assertIncludes(result.invariants[0], 'validate input');
});

test('parseSkillMd extracts repair operators', () => {
  const result = parseSkillMd(SAMPLE_SKILL_MD);
  assertGte(result.repair_operators.length, 2, 'Should find 2 repair operators');
  assertIncludes(result.repair_operators[0], 'validation');
});

test('parseSkillMd extracts context section', () => {
  const result = parseSkillMd(SAMPLE_SKILL_MD);
  assertIncludes(result.context, 'Node.js');
});

test('generateGotchas produces markdown with skill name', () => {
  const parsed = parseSkillMd(SAMPLE_SKILL_MD);
  const gotchas = generateGotchas(parsed);
  assertType(gotchas, 'string');
  assertIncludes(gotchas, 'test-skill');
  assertIncludes(gotchas, 'Edge Cases');
  assertIncludes(gotchas, 'Anti-Patterns');
});

test('generateGotchas includes invariant edge cases', () => {
  const parsed = parseSkillMd(SAMPLE_SKILL_MD);
  const gotchas = generateGotchas(parsed);
  assertIncludes(gotchas, 'validate input');
  assertIncludes(gotchas, 'expose secrets');
});

test('generateGotchas includes applies_to context', () => {
  const parsed = parseSkillMd(SAMPLE_SKILL_MD);
  const gotchas = generateGotchas(parsed);
  assertIncludes(gotchas, 'node');
});

test('generateReferenceExample produces valid JSON', () => {
  const parsed = parseSkillMd(SAMPLE_SKILL_MD);
  const jsonStr = generateReferenceExample(parsed);
  const obj = JSON.parse(jsonStr);
  assert(obj.skill_name === 'test-skill', 'Should have skill_name');
  assert(obj.example_scenario, 'Should have example_scenario');
  assert(obj.example_scenario.trigger, 'Should have trigger');
});

test('parseSkillMd handles empty input gracefully', () => {
  const result = parseSkillMd('');
  assert(result.name === '', 'Name should be empty');
  assert(result.invariants.length === 0, 'No invariants');
  assert(result.repair_operators.length === 0, 'No repair operators');
});

module.exports = {};
