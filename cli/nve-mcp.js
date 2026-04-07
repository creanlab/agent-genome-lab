#!/usr/bin/env node
/**
 * nve-mcp — Model Context Protocol Server
 *
 * MCP server for native integration with Claude Code, Cursor, and other
 * MCP-compatible AI tools. Communicates via JSON-RPC over stdin/stdout.
 *
 * Setup:
 *   claude mcp add nve -- node /path/to/nve-mcp.js
 *
 * Exposed tools (15):
 *   Memory & Context:
 *     nve_status          — Project health overview
 *     nve_memory_tree     — Compiled memory hierarchy
 *     nve_wake_up         — L0+L1 AAAK wake-up context (~600 tokens)
 *     nve_search          — TF-IDF semantic search across genomes & skills
 *
 *   Genomes:
 *     nve_genomes_list    — List promoted genomes
 *     nve_genomes_retrieve — Retrieve relevant genomes for a query
 *     nve_bridge_inject   — Full context injection for a task
 *
 *   Skills:
 *     nve_skills_list     — List all skills
 *     nve_skill_search    — Search skills by keyword
 *
 *   Diagnostics:
 *     nve_doctor          — Run runtime diagnostics
 *     nve_self_check      — Smoke + strict validation
 *     nve_report          — Health score report
 *
 *   Operations:
 *     nve_compact         — Get latest compaction artifacts
 *     nve_capture_incident — Capture an incident from trace
 *     nve_aaak_compress   — Compress text to AAAK format
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { findProjectRoot } = require('./nve-config');

const ROOT = findProjectRoot();

// Lazy-load modules to avoid startup cost
function loadModule(name) {
  try { return require(name); }
  catch { return null; }
}

// ─── MCP Tool Definitions ────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'nve_status',
    description: 'Get NVE project health overview: genome count, skill count, memory layers, health score',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'nve_memory_tree',
    description: 'Get compiled memory hierarchy (5 layers: global, project, subtree, session, promoted)',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'nve_wake_up',
    description: 'Get L0 Identity + L1 Essential Story in AAAK compressed format (~600 tokens). Use this at session start to load project context efficiently.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'nve_search',
    description: 'Semantic TF-IDF search across genomes and skills',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        top_k: { type: 'number', description: 'Max results (default: 10)' },
        type: { type: 'string', enum: ['genome', 'skill'], description: 'Filter by type' },
      },
      required: ['query'],
    },
  },
  {
    name: 'nve_genomes_list',
    description: 'List all promoted failure genomes with utility scores',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'nve_genomes_retrieve',
    description: 'Retrieve top-K genomes relevant to a task description',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Task description or search query' },
        top_k: { type: 'number', description: 'Max results (default: 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'nve_bridge_inject',
    description: 'Assemble full context injection for a task: memory tree + relevant genomes + skills + AAAK wake-up',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description for context retrieval' },
      },
      required: [],
    },
  },
  {
    name: 'nve_skills_list',
    description: 'List all registered skills with their status',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'nve_skill_search',
    description: 'Search skills by keyword',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Skill search query' },
      },
      required: ['query'],
    },
  },
  {
    name: 'nve_doctor',
    description: 'Run runtime environment diagnostics (Node version, schemas, providers, etc.)',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'nve_self_check',
    description: 'Run structural smoke and strict validation checks',
    inputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['smoke', 'strict'], description: 'Check mode (default: smoke)' },
      },
      required: [],
    },
  },
  {
    name: 'nve_report',
    description: 'Generate health score report (0-100) with breakdown by category',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'nve_compact',
    description: 'Get latest context compaction artifacts (evidence, open threads, incident candidates)',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'nve_capture_incident',
    description: 'Capture an incident from trace data into .evolution/incidents/',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Incident title' },
        summary: { type: 'string', description: 'What happened' },
        failure_class: { type: 'string', description: 'Failure category' },
        root_cause: { type: 'string', description: 'Root cause analysis' },
        stack_tags: { type: 'array', items: { type: 'string' }, description: 'Technology tags' },
      },
      required: ['title', 'summary'],
    },
  },
  {
    name: 'nve_aaak_compress',
    description: 'Compress text to AAAK lossless symbolic format (~30x compression)',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to compress' },
      },
      required: ['text'],
    },
  },
];

// ─── Tool Handlers ───────────────────────────────────────────────────────────

const handlers = {
  nve_status() {
    const genomesDir = path.join(ROOT, '.evolution', 'failure_genomes');
    const skillsDir = path.join(ROOT, '.agents', 'skills');
    const genomeCount = fs.existsSync(genomesDir)
      ? fs.readdirSync(genomesDir).filter(f => f.endsWith('.json')).length : 0;
    const skillCount = fs.existsSync(skillsDir)
      ? fs.readdirSync(skillsDir).filter(d => fs.existsSync(path.join(skillsDir, d, 'SKILL.md'))).length : 0;

    let pkg = {};
    try { pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')); } catch {}

    return {
      project: pkg.name || path.basename(ROOT),
      version: pkg.version || 'unknown',
      genomes: genomeCount,
      skills: skillCount,
      root: ROOT,
    };
  },

  nve_memory_tree() {
    const mod = loadModule('./nve-memory-tree');
    if (!mod) return { error: 'nve-memory-tree not available' };
    const bundle = mod.compileMemoryTree();
    return {
      layers: bundle.layers_count,
      rules: bundle.merged.rules.length,
      anti_patterns: bundle.merged.anti_patterns.length,
      rendered: bundle.rendered,
    };
  },

  nve_wake_up() {
    const mod = loadModule('./nve-aaak');
    if (!mod) return { error: 'nve-aaak not available' };
    const wakeup = mod.generateWakeUp();
    return {
      l0_identity: wakeup.l0_identity,
      l1_essential: wakeup.l1_essential,
      combined: wakeup.combined,
      token_estimate: wakeup.token_estimate,
    };
  },

  nve_search(params) {
    const mod = loadModule('./nve-search');
    if (!mod) return { error: 'nve-search not available' };
    return mod.search(params.query, {
      topK: params.top_k || 10,
      typeFilter: params.type || null,
    });
  },

  nve_genomes_list() {
    const mod = loadModule('./nve-bridge');
    if (!mod) return { error: 'nve-bridge not available' };
    return mod.loadPromotedGenomes().map(g => ({
      genome_id: g.genome_id,
      family: g.family,
      kind: g.kind || 'failure',
      utility: g.utility?.score || 0,
      invariant: g.violated_invariant,
      repair: g.repair_operator,
    }));
  },

  nve_genomes_retrieve(params) {
    const mod = loadModule('./nve-bridge');
    if (!mod) return { error: 'nve-bridge not available' };
    return mod.retrieveGenomes(params.query, params.top_k || 5).map(r => ({
      genome_id: r.genome.genome_id,
      family: r.genome.family,
      score: r.score,
      summary: r.genome.kind === 'failure'
        ? `AVOID: ${r.genome.violated_invariant} → FIX: ${r.genome.repair_operator}`
        : `${(r.genome.kind || 'success').toUpperCase()}: ${r.genome.success_pattern || r.genome.family}`,
    }));
  },

  nve_bridge_inject(params) {
    const mod = loadModule('./nve-bridge');
    if (!mod) return { error: 'nve-bridge not available' };
    const injection = mod.assembleInjection(params.task || '');
    return {
      rendered: injection.rendered,
      genomes: injection.top_genomes.length,
      skills: injection.top_skills.length,
      aaak_available: !!injection.aaak_wakeup,
      token_estimate: Math.ceil(injection.rendered.length / 4),
    };
  },

  nve_skills_list() {
    const skillsDir = path.join(ROOT, '.agents', 'skills');
    if (!fs.existsSync(skillsDir)) return [];
    return fs.readdirSync(skillsDir)
      .filter(d => fs.existsSync(path.join(skillsDir, d, 'SKILL.md')))
      .map(d => {
        const content = fs.readFileSync(path.join(skillsDir, d, 'SKILL.md'), 'utf8');
        const titleMatch = content.match(/^#\s+(.+)/m);
        const hasGotchas = fs.existsSync(path.join(skillsDir, d, 'gotchas.md'));
        const hasRefs = fs.existsSync(path.join(skillsDir, d, 'references'));
        return { name: d, title: titleMatch ? titleMatch[1] : d, enriched: hasGotchas && hasRefs };
      });
  },

  nve_skill_search(params) {
    const mod = loadModule('./nve-search');
    if (!mod) return { error: 'nve-search not available' };
    return mod.search(params.query, { topK: 10, typeFilter: 'skill' });
  },

  nve_doctor() {
    const checks = [];
    // Node version
    const nodeVer = process.version.replace('v', '').split('.').map(Number);
    checks.push({ name: 'node_version', status: nodeVer[0] >= 18 ? 'pass' : 'fail', value: process.version });
    // Schemas
    const schemasDir = path.join(ROOT, 'schemas');
    checks.push({ name: 'schemas_dir', status: fs.existsSync(schemasDir) ? 'pass' : 'fail' });
    // .evolution
    const evoDir = path.join(ROOT, '.evolution');
    checks.push({ name: 'evolution_dir', status: fs.existsSync(evoDir) ? 'pass' : 'fail' });
    // package.json
    checks.push({ name: 'package_json', status: fs.existsSync(path.join(ROOT, 'package.json')) ? 'pass' : 'fail' });
    return checks;
  },

  nve_self_check(params) {
    const mod = loadModule('./nve-self-check');
    if (!mod) return { error: 'nve-self-check not available' };
    return params.mode === 'strict' ? mod.runStrict() : mod.runSmoke();
  },

  nve_report() {
    const mod = loadModule('./nve-report');
    if (!mod) return { error: 'nve-report not available' };
    return mod.generateReport();
  },

  nve_compact() {
    const compactDir = path.join(ROOT, '.evolution', 'compact');
    if (!fs.existsSync(compactDir)) return { message: 'No compact artifacts' };
    const files = fs.readdirSync(compactDir).filter(f => f.endsWith('.json')).sort().reverse();
    if (files.length === 0) return { message: 'No compact artifacts' };
    try {
      return JSON.parse(fs.readFileSync(path.join(compactDir, files[0]), 'utf8'));
    } catch { return { message: 'Failed to read compact artifact' }; }
  },

  nve_capture_incident(params) {
    const mod = loadModule('./nve-bridge');
    if (!mod) return { error: 'nve-bridge not available' };
    return mod.captureTrace({
      title: params.title,
      summary: params.summary,
      failure_class: params.failure_class || 'runtime_error',
      root_cause: params.root_cause || null,
      stack_tags: params.stack_tags || [],
    });
  },

  nve_aaak_compress(params) {
    const mod = loadModule('./nve-aaak');
    if (!mod) return { error: 'nve-aaak not available' };
    const result = mod.compress(params.text);
    return {
      aaak: result,
      input_length: params.text.length,
      output_length: result.length,
      ratio: (params.text.length / Math.max(result.length, 1)).toFixed(1) + 'x',
    };
  },
};

// ─── JSON-RPC over stdin/stdout ──────────────────────────────────────────────

function sendResponse(id, result) {
  const response = { jsonrpc: '2.0', id, result };
  const msg = JSON.stringify(response);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`);
}

function sendError(id, code, message) {
  const response = { jsonrpc: '2.0', id, error: { code, message } };
  const msg = JSON.stringify(response);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`);
}

function sendNotification(method, params) {
  const msg = JSON.stringify({ jsonrpc: '2.0', method, params });
  process.stdout.write(`Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`);
}

function handleRequest(request) {
  const { id, method, params } = request;

  switch (method) {
    case 'initialize':
      return sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'nve-genome-lab', version: '3.1.0' },
      });

    case 'notifications/initialized':
      return; // No response needed

    case 'tools/list':
      return sendResponse(id, { tools: TOOLS });

    case 'tools/call': {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const handler = handlers[toolName];

      if (!handler) {
        return sendError(id, -32601, `Unknown tool: ${toolName}`);
      }

      try {
        const result = handler(toolArgs);
        const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        return sendResponse(id, {
          content: [{ type: 'text', text }],
          isError: false,
        });
      } catch (e) {
        return sendResponse(id, {
          content: [{ type: 'text', text: `Error: ${e.message}` }],
          isError: true,
        });
      }
    }

    case 'ping':
      return sendResponse(id, {});

    default:
      if (id) sendError(id, -32601, `Method not found: ${method}`);
  }
}

// ─── Message Parsing (Content-Length framing) ────────────────────────────────

function startServer() {
  let buffer = '';
  let contentLength = -1;

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;

    while (true) {
      if (contentLength === -1) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd === -1) break;

        const header = buffer.slice(0, headerEnd);
        const match = header.match(/Content-Length:\s*(\d+)/i);
        if (!match) {
          // Try parsing as raw JSON (some clients skip Content-Length)
          try {
            const lines = buffer.split('\n').filter(l => l.trim());
            for (const line of lines) {
              const req = JSON.parse(line.trim());
              handleRequest(req);
            }
            buffer = '';
          } catch {
            buffer = buffer.slice(headerEnd + 4);
          }
          continue;
        }

        contentLength = parseInt(match[1], 10);
        buffer = buffer.slice(headerEnd + 4);
      }

      if (buffer.length < contentLength) break;

      const body = buffer.slice(0, contentLength);
      buffer = buffer.slice(contentLength);
      contentLength = -1;

      try {
        const request = JSON.parse(body);
        handleRequest(request);
      } catch (e) {
        sendError(null, -32700, `Parse error: ${e.message}`);
      }
    }
  });

  process.stdin.on('end', () => process.exit(0));

  // Log to stderr (stdout is for MCP protocol)
  process.stderr.write('NVE MCP Server started\n');
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { TOOLS, handlers, handleRequest };

// CLI
if (require.main === module) {
  startServer();
}
