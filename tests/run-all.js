#!/usr/bin/env node
/**
 * Run all agent-genome-lab tests.
 * Usage: node tests/run-all.js
 */
'use strict';

const path = require('path');
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

const SUITES = [
  'test-schemas',
  'test-provider',
  'test-doctor',
  'test-event-bus',
  'test-memory-tree',
  'test-subagent',
  'test-bridge',
  'test-worktree',
  'test-compact',
  'test-errors',
  'test-self-check',
  'test-skill-enrich',
  'test-search',
  'test-aaak',
  'test-mcp',
  'test-knowledge-graph',
  'test-palace',
  'test-benchmark',
  'test-drawers',
  'test-entity-detect',
  'test-diary',
];

async function main() {
  console.log(`\n${C.bold}${C.cyan}═══ agent-genome-lab test suite ═══${C.reset}\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  const suiteResults = [];

  for (const suite of SUITES) {
    console.log(`${C.bold}━━━ ${suite} ━━━${C.reset}`);
    // Clear require cache for test-runner to reset counters
    const runnerPath = require.resolve('./test-runner');
    delete require.cache[runnerPath];

    try {
      // Fresh test-runner instance per suite
      const runner = require('./test-runner');

      // Load suite (registers tests via test())
      const suitePath = path.join(__dirname, suite);
      delete require.cache[require.resolve(suitePath)];
      require(suitePath);

      // Run tests
      const result = await runner.run();
      totalPassed += result.passed;
      totalFailed += result.failed;
      suiteResults.push({ name: suite, ...result });
    } catch (e) {
      console.log(`  ${C.red}✗ Suite failed to load: ${e.message}${C.reset}\n`);
      totalFailed++;
      suiteResults.push({ name: suite, passed: 0, failed: 1, total: 1, errors: [{ name: 'load', error: e }] });
    }
  }

  // Summary
  console.log(`${C.bold}${C.cyan}═══ SUMMARY ═══${C.reset}\n`);
  for (const s of suiteResults) {
    const icon = s.failed === 0 ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
    console.log(`  ${icon} ${s.name}: ${C.green}${s.passed}${C.reset}/${s.total}`);
  }
  console.log(`\n  ${C.bold}Total: ${C.green}${totalPassed} passed${C.reset}, ${C.red}${totalFailed} failed${C.reset} / ${totalPassed + totalFailed}\n`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
