#!/usr/bin/env node
/**
 * nve-palace — Palace Graph for Hierarchical Genome Navigation
 *
 * Inspired by MemPalace palace_graph.py (MIT).
 * Organizes genomes and skills into a navigable spatial hierarchy:
 *   Wings (projects) → Rooms (failure families) → Halls (connections) → Tunnels (cross-project)
 *
 * +34% retrieval improvement over flat search (MemPalace claim).
 *
 * Commands:
 *   nve-palace build                     — Build palace graph from genomes + skills
 *   nve-palace traverse <room>           — Walk graph from a room
 *   nve-palace tunnels                   — Find cross-wing connections
 *   nve-palace stats                     — Topology metrics
 *   nve-palace search <query>            — Palace-aware search (room-boosted)
 *   nve-palace rooms                     — List all rooms with counts
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'stats';
const ROOT = findProjectRoot();
const PALACE_PATH = path.join(ROOT, '.evolution', 'palace_graph.json');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Room Detection (60+ patterns) ──────────────────────────────────────────

const ROOM_PATTERNS = {
  // Stack/technology rooms
  'node': /\bnode\.?js\b|express|npm|yarn|pnpm/i,
  'python': /\bpython\b|django|flask|fastapi|pip|pytest/i,
  'react': /\breact\b|jsx|tsx|next\.?js|vite/i,
  'typescript': /\btypescript\b|\.ts\b|tsconfig/i,
  'docker': /\bdocker\b|container|dockerfile|compose/i,
  'kubernetes': /\bkubernetes\b|k8s|pod|helm/i,
  'database': /\bdatabase\b|sql|postgres|mysql|mongo|redis|sqlite/i,
  'api': /\bapi\b|endpoint|rest|graphql|grpc/i,
  'auth': /\bauth\b|login|oauth|jwt|session|credential/i,
  'ci-cd': /\bci\b|cd\b|pipeline|github.actions|jenkins|deploy/i,
  'testing': /\btest\b|jest|mocha|pytest|spec|coverage/i,
  'security': /\bsecurity\b|vulnerability|owasp|secret|xss|injection/i,
  'frontend': /\bfrontend\b|css|html|ui|ux|component|layout/i,
  'backend': /\bbackend\b|server|middleware|handler|route/i,
  'cloud': /\bcloud\b|aws|gcp|azure|lambda|s3|cloud.run/i,
  'git': /\bgit\b|branch|merge|commit|rebase|cherry/i,
  'config': /\bconfig\b|env|settings|dotenv|yaml|toml/i,
  'logging': /\blog\b|logging|trace|debug|monitor|observability/i,
  'cache': /\bcache\b|redis|memcache|cdn|invalidat/i,
  'migration': /\bmigrat\b|schema.change|alter.table|upgrade/i,

  // Failure family rooms
  'build-failure': /\bbuild\b.*\bfail\b|\bbuild\b.*\berror\b|compilation/i,
  'runtime-error': /\bruntime\b.*\berror\b|crash|exception|panic/i,
  'data-loss': /\bdata.loss\b|silent.fail|fallback.*data|corrupt/i,
  'dependency': /\bdependency\b|package|module.*miss|import.*fail/i,
  'env-config': /\benv\b.*\bvar\b|environment|config.*miss/i,
  'verification': /\bverif\b|validation|assert|check.*fail/i,
  'performance': /\bperformance\b|slow|latency|timeout|bottleneck/i,
  'concurrency': /\bconcurren\b|race|deadlock|mutex|thread/i,
};

/**
 * Detect room from text using pattern matching.
 */
function detectRoom(text) {
  const matches = [];
  for (const [room, pattern] of Object.entries(ROOM_PATTERNS)) {
    if (pattern.test(text)) {
      matches.push(room);
    }
  }
  return matches.length > 0 ? matches : ['general'];
}

/**
 * Detect room from folder structure.
 */
function detectRoomsFromFolders(rootDir) {
  const rooms = new Map();
  if (!fs.existsSync(rootDir)) return rooms;

  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const detected = detectRoom(entry.name);
      for (const r of detected) {
        rooms.set(r, (rooms.get(r) || 0) + 1);
      }
    }
  } catch {}
  return rooms;
}

// ─── Palace Graph Core ───────────────────────────────────────────────────────

/**
 * Build palace graph from genomes and skills.
 * Returns: { wings, rooms, halls, tunnels, drawers }
 */
function buildGraph() {
  const wings = new Map();  // wing_name → { rooms: Set, drawers: [] }
  const rooms = new Map();  // room_name → { wings: Set, drawers: [], count: number }
  const halls = [];         // { from_room, to_room, wing, strength }
  const tunnels = [];       // { room, wings: string[] } — cross-wing connections

  const projectName = path.basename(ROOT);

  // Wing 1: Genomes
  const genomesDir = path.join(ROOT, '.evolution', 'failure_genomes');
  if (fs.existsSync(genomesDir)) {
    const wingName = `wing_genomes`;
    const wing = { rooms: new Set(), drawers: [] };

    for (const f of fs.readdirSync(genomesDir).filter(f => f.endsWith('.json'))) {
      try {
        const g = JSON.parse(fs.readFileSync(path.join(genomesDir, f), 'utf8'));
        const text = [g.family, g.violated_invariant, g.repair_operator, g.success_pattern,
          ...(g.context_fingerprint?.stack_tags || [])].filter(Boolean).join(' ');
        const detectedRooms = detectRoom(text);

        const drawer = {
          id: g.genome_id || f,
          type: 'genome',
          rooms: detectedRooms,
          wing: wingName,
          importance: g.utility?.score || 0.5,
          text: text.slice(0, 200),
        };

        wing.drawers.push(drawer);
        for (const r of detectedRooms) {
          wing.rooms.add(r);
          if (!rooms.has(r)) rooms.set(r, { wings: new Set(), drawers: [], count: 0 });
          const room = rooms.get(r);
          room.wings.add(wingName);
          room.drawers.push(drawer);
          room.count++;
        }
      } catch {}
    }

    wings.set(wingName, wing);
  }

  // Wing 2: Skills
  const skillsDir = path.join(ROOT, '.agents', 'skills');
  if (fs.existsSync(skillsDir)) {
    const wingName = `wing_skills`;
    const wing = { rooms: new Set(), drawers: [] };

    for (const d of fs.readdirSync(skillsDir)) {
      const skillMd = path.join(skillsDir, d, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      try {
        const content = fs.readFileSync(skillMd, 'utf8');
        const detectedRooms = detectRoom(content);

        const drawer = {
          id: d,
          type: 'skill',
          rooms: detectedRooms,
          wing: wingName,
          importance: 0.7,
          text: content.slice(0, 200),
        };

        wing.drawers.push(drawer);
        for (const r of detectedRooms) {
          wing.rooms.add(r);
          if (!rooms.has(r)) rooms.set(r, { wings: new Set(), drawers: [], count: 0 });
          const room = rooms.get(r);
          room.wings.add(wingName);
          room.drawers.push(drawer);
          room.count++;
        }
      } catch {}
    }

    wings.set(wingName, wing);
  }

  // Wing 3: Project structure
  const folderRooms = detectRoomsFromFolders(ROOT);
  if (folderRooms.size > 0) {
    const wingName = `wing_${projectName}`;
    if (!wings.has(wingName)) wings.set(wingName, { rooms: new Set(), drawers: [] });
    const wing = wings.get(wingName);
    for (const [r, count] of folderRooms) {
      wing.rooms.add(r);
      if (!rooms.has(r)) rooms.set(r, { wings: new Set(), drawers: [], count: 0 });
      rooms.get(r).wings.add(wingName);
      rooms.get(r).count += count;
    }
  }

  // Build halls (connections between rooms within same wing)
  for (const [wingName, wing] of wings) {
    const roomList = [...wing.rooms];
    for (let i = 0; i < roomList.length; i++) {
      for (let j = i + 1; j < roomList.length; j++) {
        // Count shared drawers
        const room1drawers = new Set((rooms.get(roomList[i])?.drawers || []).map(d => d.id));
        const shared = (rooms.get(roomList[j])?.drawers || []).filter(d => room1drawers.has(d.id)).length;
        if (shared > 0) {
          halls.push({
            from_room: roomList[i],
            to_room: roomList[j],
            wing: wingName,
            strength: shared,
          });
        }
      }
    }
  }

  // Find tunnels (rooms that span multiple wings)
  for (const [roomName, room] of rooms) {
    if (room.wings.size > 1) {
      tunnels.push({
        room: roomName,
        wings: [...room.wings],
        drawer_count: room.count,
      });
    }
  }

  const graph = {
    version: '1.0.0',
    built_at: new Date().toISOString(),
    project: projectName,
    wings: Object.fromEntries([...wings].map(([k, v]) => [k, {
      rooms: [...v.rooms],
      drawer_count: v.drawers.length,
    }])),
    rooms: Object.fromEntries([...rooms].map(([k, v]) => [k, {
      wings: [...v.wings],
      drawer_count: v.count,
    }])),
    halls,
    tunnels,
    stats: {
      wing_count: wings.size,
      room_count: rooms.size,
      hall_count: halls.length,
      tunnel_count: tunnels.length,
      total_drawers: [...wings.values()].reduce((s, w) => s + w.drawers.length, 0),
    },
  };

  // Save
  const dir = path.dirname(PALACE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PALACE_PATH, JSON.stringify(graph, null, 2), 'utf8');

  return graph;
}

/**
 * Load saved palace graph.
 */
function loadGraph() {
  if (!fs.existsSync(PALACE_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(PALACE_PATH, 'utf8')); }
  catch { return null; }
}

/**
 * Traverse from a room — find connected rooms via halls and tunnels.
 */
function traverse(roomName) {
  const graph = loadGraph();
  if (!graph) return { error: 'No palace graph. Run: nve-palace build' };

  const room = graph.rooms[roomName];
  if (!room) return { error: `Room "${roomName}" not found` };

  const connected = new Set();
  const connections = [];

  // Via halls
  for (const hall of graph.halls) {
    if (hall.from_room === roomName) {
      connected.add(hall.to_room);
      connections.push({ room: hall.to_room, via: 'hall', wing: hall.wing, strength: hall.strength });
    } else if (hall.to_room === roomName) {
      connected.add(hall.from_room);
      connections.push({ room: hall.from_room, via: 'hall', wing: hall.wing, strength: hall.strength });
    }
  }

  // Via tunnels
  for (const tunnel of graph.tunnels) {
    if (tunnel.room === roomName) {
      for (const wing of tunnel.wings) {
        const wingRooms = Object.entries(graph.rooms)
          .filter(([, r]) => r.wings.includes(wing) && r !== roomName)
          .map(([name]) => name);
        for (const wr of wingRooms) {
          if (!connected.has(wr)) {
            connected.add(wr);
            connections.push({ room: wr, via: 'tunnel', wing, strength: 1 });
          }
        }
      }
    }
  }

  return {
    room: roomName,
    wings: room.wings,
    drawers: room.drawer_count,
    connections: connections.sort((a, b) => b.strength - a.strength),
  };
}

/**
 * Find all tunnel rooms (cross-wing connections).
 */
function findTunnels() {
  const graph = loadGraph();
  if (!graph) return [];
  return graph.tunnels || [];
}

/**
 * Palace-aware search: boost results by room proximity.
 */
function palaceSearch(query, topK = 10) {
  const graph = loadGraph();
  let searchMod;
  try { searchMod = require('./nve-search'); } catch { return []; }

  // Base TF-IDF search
  const results = searchMod.search(query, { topK: topK * 2 });

  if (!graph) return results.slice(0, topK);

  // Detect query rooms
  const queryRooms = new Set(detectRoom(query));

  // Boost results in matching rooms
  const boosted = results.map(r => {
    let boost = 0;
    // Check if result's content matches query rooms
    const resultRooms = detectRoom(r.name + ' ' + (r.description || ''));
    const overlap = resultRooms.filter(rr => queryRooms.has(rr)).length;
    if (overlap > 0) boost = 0.1 * overlap;

    // Tunnel bonus: if result is in a room that tunnels to query rooms
    if (graph.tunnels) {
      for (const tunnel of graph.tunnels) {
        if (resultRooms.includes(tunnel.room) && tunnel.wings.length > 1) {
          boost += 0.05;
        }
      }
    }

    return { ...r, score: r.score + boost, palace_boost: boost };
  });

  return boosted.sort((a, b) => b.score - a.score).slice(0, topK);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

function cmdBuild() {
  console.log(`${C.cyan}Building palace graph...${C.reset}\n`);
  const graph = buildGraph();
  const s = graph.stats;
  console.log(`${C.green}✓${C.reset} Palace built: ${s.wing_count} wings, ${s.room_count} rooms, ${s.hall_count} halls, ${s.tunnel_count} tunnels, ${s.total_drawers} drawers\n`);

  if (graph.tunnels.length > 0) {
    console.log(`${C.bold}Tunnels (cross-wing):${C.reset}`);
    for (const t of graph.tunnels) {
      console.log(`  ${C.yellow}⚡${C.reset} ${t.room} → spans ${t.wings.join(', ')} (${t.drawer_count} items)`);
    }
    console.log();
  }
}

function cmdTraverse() {
  const room = args[1];
  if (!room) { console.error('Usage: nve-palace traverse <room>'); process.exit(1); }
  const result = traverse(room);
  if (result.error) { console.log(`${C.red}${result.error}${C.reset}`); return; }

  console.log(`\n${C.bold}Room: ${room}${C.reset} (${result.drawers} drawers, wings: ${result.wings.join(', ')})\n`);
  if (result.connections.length === 0) {
    console.log(`  ${C.dim}No connections${C.reset}`);
  } else {
    for (const c of result.connections) {
      const icon = c.via === 'tunnel' ? '⚡' : '→';
      console.log(`  ${icon} ${C.cyan}${c.room}${C.reset} ${C.dim}(via ${c.via}, wing: ${c.wing}, strength: ${c.strength})${C.reset}`);
    }
  }
  console.log();
}

function cmdTunnels() {
  const tunnels = findTunnels();
  if (tunnels.length === 0) {
    console.log(`${C.dim}No tunnels. Run: nve-palace build${C.reset}`);
    return;
  }
  console.log(`\n${C.bold}Cross-Wing Tunnels${C.reset} (${tunnels.length})\n`);
  for (const t of tunnels) {
    console.log(`  ${C.yellow}⚡${C.reset} ${t.room} → ${t.wings.join(' ↔ ')} (${t.drawer_count} items)`);
  }
  console.log();
}

function cmdStats() {
  const graph = loadGraph();
  if (!graph) { console.log(`${C.dim}No palace graph. Run: nve-palace build${C.reset}`); return; }
  const s = graph.stats;
  console.log(`\n${C.bold}Palace Stats${C.reset}\n`);
  console.log(`  Wings:    ${s.wing_count}`);
  console.log(`  Rooms:    ${s.room_count}`);
  console.log(`  Halls:    ${s.hall_count}`);
  console.log(`  Tunnels:  ${s.tunnel_count}`);
  console.log(`  Drawers:  ${s.total_drawers}`);
  console.log(`  Built:    ${graph.built_at}`);
  console.log();
}

function cmdRooms() {
  const graph = loadGraph();
  if (!graph) { console.log(`${C.dim}No palace graph. Run: nve-palace build${C.reset}`); return; }
  const sorted = Object.entries(graph.rooms).sort((a, b) => b[1].drawer_count - a[1].drawer_count);
  console.log(`\n${C.bold}Rooms${C.reset} (${sorted.length})\n`);
  for (const [name, room] of sorted) {
    const isTunnel = (graph.tunnels || []).some(t => t.room === name);
    const icon = isTunnel ? `${C.yellow}⚡${C.reset}` : ' ';
    console.log(`  ${icon} ${C.cyan}${name}${C.reset} — ${room.drawer_count} drawers, wings: ${room.wings.join(', ')}`);
  }
  console.log();
}

function cmdSearch() {
  const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
  if (!query) { console.error('Usage: nve-palace search <query>'); process.exit(1); }
  const results = palaceSearch(query);
  if (results.length === 0) { console.log(`${C.dim}No results${C.reset}`); return; }
  console.log(`\n${C.bold}Palace Search: "${query}"${C.reset} (${results.length})\n`);
  for (const r of results) {
    const boost = r.palace_boost > 0 ? ` ${C.yellow}+${r.palace_boost.toFixed(2)} palace${C.reset}` : '';
    console.log(`  ${r.type === 'genome' ? '🧬' : '⚡'} ${C.bold}${r.name}${C.reset} — ${C.green}${r.score.toFixed(3)}${C.reset}${boost}`);
  }
  console.log();
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  detectRoom, detectRoomsFromFolders, ROOM_PATTERNS,
  buildGraph, loadGraph, traverse, findTunnels, palaceSearch,
};

// CLI
if (require.main === module) {
  try {
    switch (cmd) {
      case 'build': cmdBuild(); break;
      case 'traverse': cmdTraverse(); break;
      case 'tunnels': cmdTunnels(); break;
      case 'stats': cmdStats(); break;
      case 'rooms': cmdRooms(); break;
      case 'search': cmdSearch(); break;
      default:
        console.error('Usage: nve-palace [build|traverse|tunnels|stats|rooms|search]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
