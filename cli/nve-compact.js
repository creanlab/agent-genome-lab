#!/usr/bin/env node
/**
 * nve-compact — Context Compaction Pipeline
 *
 * Prevents context bloat by compressing session traces into structured
 * compact artifacts while preserving decision-critical evidence.
 *
 * Output artifacts:
 *   1. Memory Digest — summary of key decisions and context (~35 lines)
 *   2. Evidence Ledger — key facts + sources, tagged: observed|inferred|pending
 *   3. Open Threads — unresolved issues and pending hypotheses
 *   4. Incident Candidate — auto-detected potential incidents from trace
 *
 * Commands:
 *   nve-compact run [--trace <file>]   — Run compaction pipeline on a trace
 *   nve-compact resume                  — Show resumable session context
 *   nve-compact digest                  — Generate memory digest from .evolution/
 *   nve-compact show                    — Show current compact state
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'show';
const ROOT = findProjectRoot();
const COMPACT_DIR = path.join(ROOT, '.evolution', 'compact');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Compact Pipeline ─────────────────────────────────────────────────────────

function ensureCompactDir() {
  if (!fs.existsSync(COMPACT_DIR)) fs.mkdirSync(COMPACT_DIR, { recursive: true });
}

/**
 * Extract evidence entries from a trace/session log.
 * Each entry: { fact, evidence_type: observed|inferred|pending, source, timestamp }
 */
function extractEvidence(traceContent) {
  const evidence = [];
  const lines = traceContent.split('\n');

  for (const line of lines) {
    // Tool results → observed facts
    if (line.includes('✓') || line.includes('passed') || line.includes('success')) {
      evidence.push({
        fact: line.trim().slice(0, 200),
        evidence_type: 'observed',
        source: 'tool_output',
      });
    }
    // Errors → observed problems
    if (line.includes('✗') || line.includes('Error') || line.includes('FAIL')) {
      evidence.push({
        fact: line.trim().slice(0, 200),
        evidence_type: 'observed',
        source: 'error',
      });
    }
    // TODO/pending → pending items
    if (line.match(/\bTODO\b|\bFIXME\b|\bpending\b|\bunresolved\b/i)) {
      evidence.push({
        fact: line.trim().slice(0, 200),
        evidence_type: 'pending',
        source: 'trace',
      });
    }
  }

  return evidence;
}

/**
 * Extract open threads (unresolved items) from session trace.
 */
function extractOpenThreads(traceContent) {
  const threads = [];
  const lines = traceContent.split('\n');

  for (const line of lines) {
    if (line.match(/\?\s*$/) || line.match(/\bquestion\b/i) || line.match(/\bneed\s+to\b/i)) {
      threads.push({
        thread_id: `thread-${Date.now().toString(36)}-${threads.length}`,
        summary: line.trim().slice(0, 200),
        created_at: new Date().toISOString(),
      });
    }
  }

  return threads.slice(0, 10);
}

/**
 * Detect potential incidents from trace.
 */
function detectIncidentCandidates(traceContent) {
  const candidates = [];
  const errorBlocks = traceContent.match(/(?:error|exception|fail|crash|timeout|rejected)[^\n]*(?:\n[^\n]*){0,3}/gi) || [];

  for (const block of errorBlocks.slice(0, 5)) {
    candidates.push({
      candidate_id: `ic-${Date.now().toString(36)}-${candidates.length}`,
      raw_observation: block.trim().slice(0, 500),
      lesson_type: 'failure',
      source: 'compact_auto_detect',
      extracted_at: new Date().toISOString(),
    });
  }

  return candidates;
}

/**
 * Run full compaction pipeline.
 */
function runCompaction(traceContent) {
  ensureCompactDir();
  const timestamp = new Date().toISOString();
  const sessionId = `session-${Date.now().toString(36)}`;

  // 1. Evidence Ledger
  const evidence = extractEvidence(traceContent);
  const evidenceLedger = {
    schema_version: '1.0.0',
    session_id: sessionId,
    compiled_at: timestamp,
    entries: evidence,
    summary: `${evidence.filter(e => e.evidence_type === 'observed').length} observed, ${evidence.filter(e => e.evidence_type === 'inferred').length} inferred, ${evidence.filter(e => e.evidence_type === 'pending').length} pending`,
  };

  // 2. Open Threads
  const threads = extractOpenThreads(traceContent);
  const openThreads = {
    schema_version: '1.0.0',
    session_id: sessionId,
    compiled_at: timestamp,
    threads,
  };

  // 3. Incident Candidates
  const incidents = detectIncidentCandidates(traceContent);

  // 4. Memory Digest (summary)
  const digest = {
    schema_version: '1.0.0',
    session_id: sessionId,
    compiled_at: timestamp,
    summary: `Session with ${evidence.length} evidence entries, ${threads.length} open threads, ${incidents.length} incident candidates.`,
    key_decisions: evidence.filter(e => e.evidence_type === 'observed').slice(0, 5).map(e => e.fact),
    open_threads_count: threads.length,
    incident_candidates_count: incidents.length,
  };

  // Save all artifacts
  const prefix = sessionId;
  fs.writeFileSync(path.join(COMPACT_DIR, `${prefix}-evidence.json`), JSON.stringify(evidenceLedger, null, 2));
  fs.writeFileSync(path.join(COMPACT_DIR, `${prefix}-threads.json`), JSON.stringify(openThreads, null, 2));
  fs.writeFileSync(path.join(COMPACT_DIR, `${prefix}-digest.json`), JSON.stringify(digest, null, 2));
  if (incidents.length > 0) {
    fs.writeFileSync(path.join(COMPACT_DIR, `${prefix}-incidents.json`), JSON.stringify(incidents, null, 2));
  }

  // Update session_digest.md for memory tree
  const digestMd = [
    `# Session Digest (${timestamp})`,
    '',
    `**Session:** ${sessionId}`,
    `**Evidence:** ${evidenceLedger.summary}`,
    '',
    '## Key Facts',
    ...digest.key_decisions.map(d => `- ${d}`),
    '',
    '## Open Threads',
    ...threads.map(t => `- ${t.summary}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, '.evolution', 'session_digest.md'), digestMd);

  return { sessionId, evidence: evidence.length, threads: threads.length, incidents: incidents.length };
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] || null;
}

function cmdRun() {
  const traceFile = getFlag('--trace');
  let traceContent;

  if (traceFile && fs.existsSync(traceFile)) {
    traceContent = fs.readFileSync(traceFile, 'utf8');
  } else {
    // Collect from recent .evolution/ state
    const parts = [];
    const incDir = path.join(ROOT, '.evolution', 'incidents');
    if (fs.existsSync(incDir)) {
      const files = fs.readdirSync(incDir).filter(f => f.endsWith('.json')).sort().slice(-10);
      for (const f of files) {
        try {
          const inc = JSON.parse(fs.readFileSync(path.join(incDir, f), 'utf8'));
          parts.push(`[INCIDENT] ${inc.safe_title}: ${inc.safe_summary}`);
        } catch { /* skip */ }
      }
    }
    const memFile = path.join(ROOT, '.evolution', 'MEMORY.md');
    if (fs.existsSync(memFile)) parts.push(fs.readFileSync(memFile, 'utf8'));
    traceContent = parts.join('\n') || 'No trace data available.';
  }

  const result = runCompaction(traceContent);
  console.log(`\n${C.bold}Compaction Complete${C.reset}`);
  console.log(`  Session: ${result.sessionId}`);
  console.log(`  Evidence entries: ${result.evidence}`);
  console.log(`  Open threads: ${result.threads}`);
  console.log(`  Incident candidates: ${result.incidents}`);
  console.log(`  ${C.dim}Artifacts saved to ${COMPACT_DIR}${C.reset}\n`);
}

function cmdResume() {
  const digestFile = path.join(ROOT, '.evolution', 'session_digest.md');
  if (!fs.existsSync(digestFile)) {
    console.log(`${C.dim}No session digest found. Run: nve-compact run${C.reset}`);
    return;
  }
  console.log(`\n${C.bold}Resumable Session Context${C.reset}\n`);
  console.log(fs.readFileSync(digestFile, 'utf8'));
}

function cmdDigest() {
  // Build digest from current .evolution/ state
  const { compileMemoryTree } = require('./nve-memory-tree');
  const bundle = compileMemoryTree(ROOT);

  console.log(`\n${C.bold}Memory Digest${C.reset}\n`);
  console.log(bundle.rendered);
}

function cmdShow() {
  ensureCompactDir();
  const files = fs.readdirSync(COMPACT_DIR).filter(f => f.endsWith('.json')).sort();

  if (files.length === 0) {
    console.log(`\n${C.dim}No compact artifacts. Run: nve-compact run${C.reset}\n`);
    return;
  }

  // Group by session
  const sessions = {};
  for (const f of files) {
    const sessionId = f.split('-evidence')[0].split('-threads')[0].split('-digest')[0].split('-incidents')[0];
    if (!sessions[sessionId]) sessions[sessionId] = [];
    sessions[sessionId].push(f);
  }

  console.log(`\n${C.bold}Compact Artifacts${C.reset} (${Object.keys(sessions).length} sessions)\n`);
  for (const [session, sessionFiles] of Object.entries(sessions)) {
    console.log(`  ${C.cyan}●${C.reset} ${C.bold}${session}${C.reset}`);
    for (const f of sessionFiles) {
      const stat = fs.statSync(path.join(COMPACT_DIR, f));
      console.log(`    ${C.dim}${f} (${(stat.size / 1024).toFixed(1)}KB)${C.reset}`);
    }
    console.log();
  }
}

// Export for programmatic use
module.exports = { extractEvidence, extractOpenThreads, detectIncidentCandidates, runCompaction };

// CLI entry
if (require.main === module) {
  try {
    switch (cmd) {
      case 'run': cmdRun(); break;
      case 'resume': cmdResume(); break;
      case 'digest': cmdDigest(); break;
      case 'show': cmdShow(); break;
      default:
        console.error('Usage: nve-compact [run|resume|digest|show]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
