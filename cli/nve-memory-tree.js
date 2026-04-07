#!/usr/bin/env node
/**
 * nve-memory-tree — Hierarchical Memory Tree Compiler
 *
 * 5 memory layers with explicit precedence:
 *   1. Global root   — ~/.evolution/MEMORY.md or CLAUDE.md
 *   2. Project        — .evolution/MEMORY.md
 *   3. Subtree        — subdirectory .evolution/MEMORY.md overrides
 *   4. Session digest — compacted current session context
 *   5. Verified promoted — admitted skills + promoted genomes
 *
 * Precedence: subtree > project > global; promoted > session > static;
 * same-level: later write > earlier write.
 *
 * Commands:
 *   nve-memory-tree compile [--cwd <path>]  — Compile full memory bundle
 *   nve-memory-tree show                     — Print compiled memory for current dir
 *   nve-memory-tree layers                   — Show discovered layers + source files
 *   nve-memory-tree resolve <key>            — Show which layer provides a specific key
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { findProjectRoot } = require('./nve-config');

const args = process.argv.slice(2);
const cmd = args[0] || 'show';
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

// ─── Layer Discovery ──────────────────────────────────────────────────────────

function discoverLayers(targetDir) {
  const projectRoot = findProjectRoot();
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const layers = [];

  // Layer 1: Global root (~/.evolution/MEMORY.md or ~/.claude/MEMORY.md)
  const globalPaths = [
    path.join(homeDir, '.evolution', 'MEMORY.md'),
    path.join(homeDir, '.claude', 'MEMORY.md'),
  ];
  for (const gp of globalPaths) {
    if (fs.existsSync(gp)) {
      layers.push({ level: 'global', path: gp, content: fs.readFileSync(gp, 'utf8') });
      break;
    }
  }

  // Layer 2: Project root .evolution/MEMORY.md
  const projectMemory = path.join(projectRoot, '.evolution', 'MEMORY.md');
  if (fs.existsSync(projectMemory)) {
    layers.push({ level: 'project', path: projectMemory, content: fs.readFileSync(projectMemory, 'utf8') });
  }

  // Layer 3: Subtree — walk from targetDir up to projectRoot, check for local MEMORY.md
  if (targetDir && targetDir !== projectRoot) {
    let dir = path.resolve(targetDir);
    const subtreeLayers = [];
    while (dir.startsWith(projectRoot) && dir !== projectRoot) {
      const localMemory = path.join(dir, '.evolution', 'MEMORY.md');
      if (fs.existsSync(localMemory)) {
        subtreeLayers.unshift({ level: 'subtree', path: localMemory, content: fs.readFileSync(localMemory, 'utf8') });
      }
      dir = path.dirname(dir);
    }
    layers.push(...subtreeLayers);
  }

  // Layer 4: Session digest (if exists)
  const sessionDigest = path.join(projectRoot, '.evolution', 'session_digest.md');
  if (fs.existsSync(sessionDigest)) {
    layers.push({ level: 'session', path: sessionDigest, content: fs.readFileSync(sessionDigest, 'utf8') });
  }

  // Layer 5: Verified promoted — collect from failure_genomes + skills
  const promotedFragments = collectPromotedFragments(projectRoot);
  if (promotedFragments.length > 0) {
    layers.push({
      level: 'promoted',
      path: path.join(projectRoot, '.evolution', 'failure_genomes'),
      content: promotedFragments.join('\n'),
      fragments: promotedFragments,
    });
  }

  return layers;
}

function collectPromotedFragments(projectRoot) {
  const fragments = [];
  const genomesDir = path.join(projectRoot, '.evolution', 'failure_genomes');
  if (fs.existsSync(genomesDir)) {
    const files = fs.readdirSync(genomesDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const genome = JSON.parse(fs.readFileSync(path.join(genomesDir, file), 'utf8'));
        if (genome.promotion_decision === 'promoted') {
          const kind = genome.kind || 'failure';
          const rule = kind === 'failure'
            ? `[${genome.genome_id}] AVOID: ${genome.violated_invariant} → FIX: ${genome.repair_operator}`
            : `[${genome.genome_id}] ${kind.toUpperCase()}: ${genome.success_pattern || genome.family}`;
          fragments.push(rule);
        }
      } catch { /* skip */ }
    }
  }
  const skillsDir = path.join(projectRoot, '.agents', 'skills');
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir).filter(d =>
      fs.existsSync(path.join(skillsDir, d, 'SKILL.md'))
    );
    for (const skillName of skills.slice(0, 5)) {
      fragments.push(`[SKILL] ${skillName}`);
    }
  }
  return fragments;
}

// ─── Memory Compilation ───────────────────────────────────────────────────────

function parseMemoryFile(content, source) {
  const result = { rules: [], context: '', anti_patterns: [], raw: content, source };
  const lines = content.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+(.+)/);
    if (sectionMatch) { currentSection = sectionMatch[1].toLowerCase().trim(); continue; }

    const ruleMatch = line.match(/^[-*]\s+\*\*(.+?)\*\*[:\s]+(.+)/);
    if (ruleMatch) {
      result.rules.push({ key: ruleMatch[1].trim(), value: ruleMatch[2].trim(), source });
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      if (currentSection.includes('anti') || currentSection.includes('avoid') || currentSection.includes('never')) {
        result.anti_patterns.push(bulletMatch[1].trim());
      } else {
        result.rules.push({ key: '', value: bulletMatch[1].trim(), source });
      }
    }

    if (!line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*') && line.trim()) {
      result.context += line.trim() + ' ';
    }
  }
  result.context = result.context.trim();
  return result;
}

function compileMemoryTree(targetDir) {
  const layers = discoverLayers(targetDir);
  const parsed = layers.map(l => ({ ...l, parsed: parseMemoryFile(l.content, l.path) }));

  const ruleMap = new Map();
  const allAntiPatterns = [];
  const contextParts = [];
  const provenance = [];

  for (const layer of parsed) {
    const p = layer.parsed;
    if (p.context) contextParts.push(p.context);
    for (const rule of p.rules) {
      const key = rule.key || rule.value.slice(0, 40);
      ruleMap.set(key, { ...rule, layer_level: layer.level });
      provenance.push({ key, layer: layer.level, source: layer.path });
    }
    allAntiPatterns.push(...p.anti_patterns.map(ap => ({ text: ap, layer: layer.level })));
  }

  const bundle = {
    schema_version: '1.0.0',
    compiled_at: new Date().toISOString(),
    target_dir: targetDir || findProjectRoot(),
    layers_count: layers.length,
    layers: layers.map(l => ({ level: l.level, path: l.path })),
    merged: {
      context: contextParts.join(' '),
      rules: Array.from(ruleMap.values()),
      anti_patterns: allAntiPatterns,
    },
    provenance,
    rendered: renderBundle(contextParts, ruleMap, allAntiPatterns),
  };
  return bundle;
}

function renderBundle(contextParts, ruleMap, antiPatterns) {
  const lines = ['# Memory Context (compiled)', ''];
  if (contextParts.length > 0) {
    lines.push('## Project');
    lines.push(contextParts.join(' ').slice(0, 300));
    lines.push('');
  }
  const rules = Array.from(ruleMap.values());
  if (rules.length > 0) {
    lines.push('## Key Rules');
    for (const r of rules.slice(0, 10)) {
      lines.push(`- ${r.key ? `**${r.key}**: ` : ''}${r.value}`);
    }
    lines.push('');
  }
  if (antiPatterns.length > 0) {
    lines.push('## Anti-Patterns');
    const unique = [...new Set(antiPatterns.map(a => a.text))];
    for (const ap of unique.slice(0, 6)) {
      lines.push(`- ${ap}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function getFlag(name) {
  const idx = args.indexOf(name);
  return idx === -1 ? null : args[idx + 1] || null;
}

function cmdShow() {
  const bundle = compileMemoryTree(getFlag('--cwd') || process.cwd());
  console.log(bundle.rendered);
}

function cmdCompile() {
  const cwd = getFlag('--cwd') || process.cwd();
  const bundle = compileMemoryTree(cwd);

  if (args.includes('--json')) {
    console.log(JSON.stringify(bundle, null, 2));
  } else {
    console.log(`\n${C.bold}Memory Tree Compiled${C.reset}`);
    console.log(`${C.dim}Target: ${bundle.target_dir}${C.reset}`);
    console.log(`${C.dim}Layers: ${bundle.layers_count}${C.reset}\n`);
    console.log(bundle.rendered);
    const outPath = path.join(findProjectRoot(), '.evolution', 'memory_bundle.json');
    fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), 'utf8');
    console.log(`${C.green}✓${C.reset} Saved to ${outPath}\n`);
  }
}

function cmdLayers() {
  const layers = discoverLayers(getFlag('--cwd') || process.cwd());
  console.log(`\n${C.bold}Memory Layers${C.reset} (${layers.length} discovered)\n`);
  const labels = { global: 'Global', project: 'Project', subtree: 'Subtree', session: 'Session', promoted: 'Promoted' };
  for (const layer of layers) {
    const lines = layer.content.split('\n').length;
    console.log(`  ${C.bold}${labels[layer.level] || layer.level}${C.reset}`);
    console.log(`    ${C.dim}${layer.path} (${lines} lines)${C.reset}`);
    if (layer.fragments) console.log(`    ${C.dim}${layer.fragments.length} fragments${C.reset}`);
    console.log();
  }
}

function cmdResolve() {
  const key = args[1];
  if (!key) { console.error('Usage: nve-memory-tree resolve <key>'); process.exit(1); }
  const bundle = compileMemoryTree(getFlag('--cwd') || process.cwd());
  const matches = bundle.provenance.filter(p => p.key.toLowerCase().includes(key.toLowerCase()));
  if (matches.length === 0) { console.log(`${C.yellow}No matches for "${key}"${C.reset}`); return; }
  console.log(`\n${C.bold}Resolving "${key}"${C.reset}\n`);
  for (const m of matches) {
    console.log(`  ${C.cyan}→${C.reset} ${m.key} (${m.layer} @ ${C.dim}${m.source}${C.reset})`);
  }
  const winner = bundle.merged.rules.find(r =>
    (r.key || r.value.slice(0, 40)).toLowerCase().includes(key.toLowerCase())
  );
  if (winner) console.log(`\n  ${C.green}Winner:${C.reset} ${winner.value} ${C.dim}(from ${winner.layer_level})${C.reset}\n`);
}

// Export for programmatic use (e.g. nve-bridge, nve-compact)
module.exports = { discoverLayers, compileMemoryTree, parseMemoryFile };

// CLI entry — only run when invoked directly
if (require.main === module) {
  try {
    switch (cmd) {
      case 'show': cmdShow(); break;
      case 'compile': cmdCompile(); break;
      case 'layers': cmdLayers(); break;
      case 'resolve': cmdResolve(); break;
      default:
        console.error('Usage: nve-memory-tree [show|compile|layers|resolve]');
        process.exit(1);
    }
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}
