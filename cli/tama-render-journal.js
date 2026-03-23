#!/usr/bin/env node
/**
 * tama-render-journal.js — Render markdown journal from canonical .evolution/ data
 * Generates a journal view compatible with web/index.html parser.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readJsonDir(dir) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir)
    .filter(f => f.endsWith('.json') && f !== '.gitkeep')
    .map(f => JSON.parse(fs.readFileSync(path.join(fullDir, f), 'utf-8')))
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
}

const incidents = readJsonDir('.evolution/incidents');

if (!incidents.length) {
  console.log('No incidents found in .evolution/incidents/');
  process.exit(0);
}

// Build STATUS_JSON
const totalXP = incidents.reduce((sum, inc) => {
  const impact = inc.severity || 5;
  const xp = impact <= 2 ? 3 : impact <= 4 ? 5 : impact <= 6 ? 8 : impact <= 8 ? 13 : 21;
  return sum + xp;
}, 0);

const level = Math.min(100, Math.floor(totalXP / 10) + 1);
const patterns = incidents.filter(i => i.pattern_extracted).length;
const aps = incidents.filter(i => i.anti_pattern).length;

let md = `# 🧬 Evolution Journal (rendered from canonical memory)\n\n`;
md += `<!-- STATUS_JSON\n${JSON.stringify({
  agent_id: 'rendered',
  project: 'evolution-tamagotchi',
  level,
  level_name: level <= 10 ? 'Novice' : level <= 20 ? 'Apprentice' : level <= 30 ? 'Operative' : 'Specialist',
  level_emoji: level <= 10 ? '🟢' : level <= 20 ? '🔵' : level <= 30 ? '🟣' : '🟡',
  xp_current: totalXP,
  total_entries: incidents.length,
  total_patterns: patterns,
  total_anti_patterns: aps,
  last_updated: new Date().toISOString()
}, null, 2)}\n-->\n\n`;

// EVO entries
md += '## Журнал Эволюции\n\n';
incidents.forEach((inc, i) => {
  const id = inc.incident_id || `EVO-${String(i + 1).padStart(3, '0')}`;
  const impact = inc.severity || 5;
  const xp = impact <= 2 ? 3 : impact <= 4 ? 5 : impact <= 6 ? 8 : impact <= 8 ? 13 : 21;
  md += `### ${id} · ${inc.title}\n`;
  md += `**Impact**: ${impact}/10\n`;
  md += `**Type**: ${inc.type}\n\n`;
  md += `${inc.what_happened || ''}\n\n`;
  md += `<!-- EVO_JSON\n${JSON.stringify({
    id, date: (inc.created_at || '').slice(0, 10),
    impact, xp, category: inc.category, type: inc.type,
    pattern: inc.pattern_extracted, title: inc.title
  })}\n-->\n\n---\n\n`;
});

const outPath = process.argv[2] || path.join(ROOT, '.evolution', 'rendered-journal.md');
fs.writeFileSync(outPath, md);
console.log(`✅ Journal rendered: ${outPath}`);
console.log(`   Entries: ${incidents.length}, Total XP: ${totalXP}`);
