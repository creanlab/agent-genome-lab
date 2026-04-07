#!/usr/bin/env node
/** G.9-G.10 — Subagent registry tests */
'use strict';

const fs = require('fs');
const path = require('path');
const { test, assert, assertIncludes, assertGte } = require('./test-runner');

const DEFAULTS_DIR = path.join(__dirname, '..', 'cli');

// The subagent module exports DEFAULT_SUBAGENTS
let DEFAULT_SUBAGENTS;
try {
  const mod = require('../cli/nve-subagent');
  DEFAULT_SUBAGENTS = mod.DEFAULT_SUBAGENTS;
} catch {
  DEFAULT_SUBAGENTS = null;
}

test('nve-subagent module loads without error', () => {
  assert(DEFAULT_SUBAGENTS !== null, 'Failed to load nve-subagent module');
});

if (DEFAULT_SUBAGENTS) {
  test('DEFAULT_SUBAGENTS has 5 entries', () => {
    assertGte(DEFAULT_SUBAGENTS.length, 5, `Expected >=5, got ${DEFAULT_SUBAGENTS.length}`);
  });

  test('each subagent has required fields', () => {
    for (const sa of DEFAULT_SUBAGENTS) {
      assert(sa.name, `subagent missing name: ${JSON.stringify(sa)}`);
      assert(Array.isArray(sa.allowed_tools), `${sa.name} missing allowed_tools`);
      assert(sa.system_prompt, `${sa.name} missing system_prompt`);
    }
  });

  test('retriever subagent has Read, Grep, Glob tools', () => {
    const retriever = DEFAULT_SUBAGENTS.find(s => s.name === 'retriever');
    assert(retriever, 'retriever subagent not found');
    assertIncludes(retriever.allowed_tools, 'Read');
    assertIncludes(retriever.allowed_tools, 'Grep');
    assertIncludes(retriever.allowed_tools, 'Glob');
  });

  test('patcher subagent has worktree isolation', () => {
    const patcher = DEFAULT_SUBAGENTS.find(s => s.name === 'patcher');
    assert(patcher, 'patcher subagent not found');
    assert(patcher.isolation === 'worktree', 'patcher should have worktree isolation');
  });

  test('critic subagent exists and has review-oriented prompt', () => {
    const critic = DEFAULT_SUBAGENTS.find(s => s.name === 'critic');
    assert(critic, 'critic subagent not found');
    assert(critic.system_prompt.length > 20, 'critic prompt too short');
  });

  test('skill-distiller subagent exists', () => {
    const distiller = DEFAULT_SUBAGENTS.find(s => s.name === 'skill-distiller');
    assert(distiller, 'skill-distiller subagent not found');
  });

  test('replayer subagent has Bash in allowed_tools', () => {
    const replayer = DEFAULT_SUBAGENTS.find(s => s.name === 'replayer');
    assert(replayer, 'replayer subagent not found');
    assertIncludes(replayer.allowed_tools, 'Bash');
  });
}

module.exports = {};
