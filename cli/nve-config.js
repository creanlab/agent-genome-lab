/**
 * nve-config.js — Shared config reader for NVE CLI tools.
 *
 * Reads .evolution/config.toml and provides defaults for all settings.
 * TOML parsing is minimal (no dependency) — supports basic key=value, [sections], arrays.
 */
const fs = require('fs');
const path = require('path');

function findProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, '.evolution'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

const DEFAULTS = {
  project: { name: '', description: '' },
  commands: { test: '', lint: '', build: '', audit: 'node cli/nve-audit.js', validate: 'node cli/nve-validate.js', memory: 'node cli/nve-memory.js' },
  thresholds: { min_audit_score: 70, auto_distill_severity: 7, memory_min_confidence: 0.6, memory_top_k: 8, archive_after_events: 0 },
  promotion: { replay_pass_rate: 0.7, replay_reject_rate: 0.3, min_family_sample: 2 },
  xp: { incident_base: 5, incident_severity_multiplier: 1.5, genome_promoted: 15, genome_rejected: 0, experience_unit: 8 },
  sharing: { default_tier: 'distilled', redact_code: true, redact_paths: true },
  dashboard: { port: 8080, auto_open: false },
  critical_paths: { paths: [] },
};

function parseToml(text) {
  const result = {};
  let section = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const secMatch = line.match(/^\[(\w+(?:\.\w+)*)\]$/);
    if (secMatch) { section = secMatch[1]; continue; }
    const kvMatch = line.match(/^(\w+)\s*=\s*(.+)$/);
    if (!kvMatch) continue;
    const key = kvMatch[1];
    let val = kvMatch[2].trim();
    // Parse value
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (/^-?\d+$/.test(val)) val = parseInt(val, 10);
    else if (/^-?\d+\.\d+$/.test(val)) val = parseFloat(val);
    else if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    else if (val.startsWith('[')) {
      // Simple array parse (single-line or multi-line start)
      try {
        val = JSON.parse(val.replace(/'/g, '"'));
      } catch {
        val = val.replace(/[\[\]]/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')).filter(Boolean);
      }
    }
    if (section) {
      if (!result[section]) result[section] = {};
      result[section][key] = val;
    } else {
      result[key] = val;
    }
  }
  return result;
}

function loadConfig() {
  const root = findProjectRoot();
  const configPath = path.join(root, '.evolution', 'config.toml');
  let parsed = {};
  if (fs.existsSync(configPath)) {
    try {
      parsed = parseToml(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      // Silent fallback to defaults
    }
  }
  // Deep merge with defaults
  const config = {};
  for (const [section, defaults] of Object.entries(DEFAULTS)) {
    config[section] = { ...defaults, ...(parsed[section] || {}) };
  }
  config._root = root;
  config._configPath = configPath;
  config._loaded = fs.existsSync(configPath);
  return config;
}

module.exports = { loadConfig, findProjectRoot, DEFAULTS };
