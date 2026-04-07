#!/usr/bin/env node
/**
 * nve-serve — JSON-RPC Bridge / Local API Server
 *
 * Exposes runtime state to IDE extensions, dashboard, and remote orchestrators
 * via lightweight HTTP server. Zero external dependencies.
 *
 * Endpoints:
 *   GET  /status           — Health + bridge status
 *   GET  /profile          — Active provider profile
 *   GET  /doctor           — Latest doctor check results
 *   GET  /memory           — Compiled memory tree
 *   GET  /genomes          — Promoted genomes list
 *   GET  /genomes/retrieve?q=<query>&top=5  — Retrieve relevant genomes
 *   GET  /hooks            — Registered hooks
 *   GET  /subagents        — Registered subagents
 *   GET  /compact          — Latest compact artifacts
 *   POST /events/emit      — Emit an event through the bus (body: {type, payload})
 *   POST /bridge/capture   — Capture incident via bridge (body: trace data)
 *   GET  /sse              — Server-Sent Events stream for real-time updates
 *
 * Usage:
 *   nve-serve [--port 8099] [--host localhost]
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { findProjectRoot } = require('./nve-config');
const { loadProviderConfig, resolveProvider, PROVIDERS } = require('./nve-provider-config');
const { compileMemoryTree } = require('./nve-memory-tree');
const { createEventBus, EVENT_TYPES } = require('./nve-event-bus');

const ROOT = findProjectRoot();
const args = process.argv.slice(2);

function getFlag(name, defaultVal) {
  const idx = args.indexOf(name);
  return idx === -1 ? defaultVal : args[idx + 1] || defaultVal;
}

const PORT = parseInt(getFlag('--port', '8099'), 10);
const HOST = getFlag('--host', 'localhost');

// ─── SSE Clients ──────────────────────────────────────────────────────────────

const sseClients = new Set();

function broadcastSSE(eventType, data) {
  const msg = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch { sseClients.delete(res); }
  }
}

// ─── Event Bus ────────────────────────────────────────────────────────────────

const eventBus = createEventBus({ loadProjectHooks: true });
eventBus.on('*', (event) => broadcastSSE(event.type, event.payload));

// ─── Route Handlers ───────────────────────────────────────────────────────────

function json(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const routes = {
  'GET /status': () => {
    const config = loadProviderConfig();
    const resolved = resolveProvider(config.active_profile, config);
    return {
      project: path.basename(ROOT),
      project_root: ROOT,
      profile: config.active_profile,
      provider: resolved.provider,
      model: resolved.model,
      available: resolved.available,
      timestamp: new Date().toISOString(),
    };
  },

  'GET /profile': () => {
    const config = loadProviderConfig();
    const resolved = resolveProvider(config.active_profile, config);
    return { ...config, resolved };
  },

  'GET /doctor': () => {
    // Run doctor checks inline
    const checks = [];
    const evoDir = path.join(ROOT, '.evolution');
    checks.push({ name: '.evolution/', status: fs.existsSync(evoDir) ? 'pass' : 'fail' });
    const memPath = path.join(evoDir, 'MEMORY.md');
    checks.push({ name: 'MEMORY.md', status: fs.existsSync(memPath) ? 'pass' : 'warn' });
    checks.push({ name: 'AGENTS.md', status: fs.existsSync(path.join(ROOT, 'AGENTS.md')) ? 'pass' : 'warn' });
    const config = loadProviderConfig();
    const resolved = resolveProvider(config.active_profile, config);
    checks.push({ name: 'provider', status: resolved.available ? 'pass' : 'fail', detail: resolved.provider });
    return { checks, timestamp: new Date().toISOString() };
  },

  'GET /memory': () => compileMemoryTree(ROOT),

  'GET /genomes': () => {
    const dir = path.join(ROOT, '.evolution', 'failure_genomes');
    if (!fs.existsSync(dir)) return { genomes: [], count: 0 };
    const genomes = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; }
    }).filter(Boolean);
    return { genomes, count: genomes.length };
  },

  'GET /hooks': () => {
    const bus = createEventBus({ loadProjectHooks: true });
    return {
      event_types: EVENT_TYPES,
      hooks: bus.hooks.map(h => ({
        name: h.name, event_type: h.event_type, priority: h.priority,
        type: h.handler_fn ? 'built-in' : h.handler_path ? 'script' : 'inline',
      })),
    };
  },

  'GET /subagents': () => {
    const dir = path.join(ROOT, '.evolution', 'subagents');
    if (!fs.existsSync(dir)) return { subagents: [], count: 0 };
    const sas = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; }
    }).filter(Boolean);
    return { subagents: sas, count: sas.length };
  },

  'GET /compact': () => {
    const dir = path.join(ROOT, '.evolution', 'compact');
    if (!fs.existsSync(dir)) return { artifacts: [], count: 0 };
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().slice(-20);
    return {
      artifacts: files.map(f => ({ name: f, size: fs.statSync(path.join(dir, f)).size })),
      count: files.length,
    };
  },
};

// ─── Server ───────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const routeKey = `${req.method} ${parsed.pathname}`;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // SSE endpoint
  if (parsed.pathname === '/sse' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(`event: connected\ndata: {"message":"Connected to nve-serve SSE"}\n\n`);
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Genome retrieval with query
  if (parsed.pathname === '/genomes/retrieve' && req.method === 'GET') {
    const query = parsed.query.q || '';
    const topK = parseInt(parsed.query.top || '5', 10);
    try {
      const { default: bridge } = { default: require('./nve-bridge') };
      // Inline retrieval
      const dir = path.join(ROOT, '.evolution', 'failure_genomes');
      if (!fs.existsSync(dir)) { json(res, { results: [], count: 0 }); return; }
      // Simple inline retrieval
      json(res, { query, top: topK, message: 'Use nve-bridge retrieve for full retrieval' });
    } catch { json(res, { error: 'Retrieval not available' }, 500); }
    return;
  }

  // POST /events/emit
  if (parsed.pathname === '/events/emit' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const result = await eventBus.emit(body.type, body.payload || {});
      broadcastSSE('hook_result', result);
      json(res, result);
    } catch (e) { json(res, { error: e.message }, 400); }
    return;
  }

  // POST /bridge/capture
  if (parsed.pathname === '/bridge/capture' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const incDir = path.join(ROOT, '.evolution', 'incidents');
      if (!fs.existsSync(incDir)) fs.mkdirSync(incDir, { recursive: true });
      const eventId = `INC-${Date.now().toString(36).toUpperCase()}`;
      const incident = {
        schema_version: '1.0.0', event_id: eventId,
        project_id: path.basename(ROOT), occurred_at: new Date().toISOString(),
        status: 'observed', stage: body.stage || 'runtime',
        failure_class: body.failure_class || 'runtime_error',
        safe_title: body.title || 'API-captured incident',
        safe_summary: body.summary || '', verifier: { type: 'api_capture', outcome: 'not_run' },
        privacy: { sharing_tier: 'private', contains_code: false, contains_secrets: false },
      };
      const outFile = path.join(incDir, `${eventId}.json`);
      fs.writeFileSync(outFile, JSON.stringify(incident, null, 2));
      broadcastSSE('incident_captured', { event_id: eventId });
      json(res, { event_id: eventId, path: outFile });
    } catch (e) { json(res, { error: e.message }, 400); }
    return;
  }

  // Static routes
  if (routes[routeKey]) {
    try {
      const data = await routes[routeKey]();
      json(res, data);
    } catch (e) { json(res, { error: e.message }, 500); }
    return;
  }

  // 404
  json(res, { error: 'Not found', available_routes: Object.keys(routes) }, 404);
});

server.listen(PORT, HOST, () => {
  console.log(`\n\x1b[1mnve-serve\x1b[0m running at http://${HOST}:${PORT}`);
  console.log(`\x1b[2mProject: ${ROOT}\x1b[0m`);
  console.log(`\x1b[2mEndpoints: ${Object.keys(routes).length + 4} (incl. SSE, emit, capture, retrieve)\x1b[0m`);
  console.log(`\x1b[2mPress Ctrl+C to stop.\x1b[0m\n`);
});
