#!/usr/bin/env node
/**
 * nve-skill-search.js — Enhanced search for the local skill registry.
 *
 * Features (K.3 upgrade):
 *   - Fuzzy substring matching + Jaccard token similarity
 *   - Utility-score ranked results
 *   - --list mode (all skills, no query required)
 *   - --category, --tag, --status filters
 *   - Rich table output with colours
 *   - --json for programmatic use
 *   - --packages to include package bundles
 *
 * Usage:
 *   node cli/nve-skill-search.js "verification before done"
 *   node cli/nve-skill-search.js "schema migration" --status=admitted --top=5
 *   node cli/nve-skill-search.js "fallback" --json
 *   node cli/nve-skill-search.js --list                           # list all skills
 *   node cli/nve-skill-search.js --list --status=admitted         # only admitted
 *   node cli/nve-skill-search.js --list --category=verification   # by category
 *   node cli/nve-skill-search.js --packages "deploy"              # search packages too
 */

const {
  listJsonObjects,
  tokenize,
  skillText,
  jaccard,
  readJson,
  resolveRoot,
} = require('./nve-skill-common');

// ── Parse arguments ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (prefix) => (args.find((a) => a.startsWith(prefix)) || '').split('=')[1] || '';
const hasFlag = (flag) => args.includes(flag);

const jsonMode = hasFlag('--json');
const listMode = hasFlag('--list');
const includePackages = hasFlag('--packages');
const statusFilter = getArg('--status');
const categoryFilter = getArg('--category');
const tagFilter = getArg('--tag');
const topK = Number(getArg('--top') || (listMode ? '100' : '10'));
const query = args.filter((arg) => !arg.startsWith('--')).join(' ').trim();

if (!query && !listMode) {
  console.log(`
nve-skill-search — Enhanced skill registry search (v2.3.0)

Usage:
  node cli/nve-skill-search.js "query"            Search by text
  node cli/nve-skill-search.js --list              List all skills
  node cli/nve-skill-search.js --list --status=admitted
  node cli/nve-skill-search.js --packages "query"  Include packages

Options:
  --status=admitted|candidate|quarantined|rejected
  --category=verification|migration|quality|security|deployment|...
  --tag=contract|replay|fallback|...
  --top=N          Max results (default 10, or 100 for --list)
  --json           Output as JSON
  --packages       Also search skill packages
`);
  process.exit(1);
}

// ── Load skills ────────────────────────────────────────────────────────────────
const skills = listJsonObjects('.evolution/skills')
  .filter((item) => item.name !== 'INDEX.json')
  .map((item) => item.data)
  .filter((skill) => !statusFilter || skill.status === statusFilter)
  .filter((skill) => !categoryFilter || skill.category === categoryFilter)
  .filter((skill) => !tagFilter || (skill.tags || []).includes(tagFilter));

// ── Load packages (optional) ───────────────────────────────────────────────────
let packages = [];
if (includePackages) {
  packages = listJsonObjects('.evolution/skill_packages')
    .filter((item) => item.name !== 'INDEX.json')
    .map((item) => item.data)
    .filter((pkg) => !statusFilter || pkg.status === statusFilter)
    .filter((pkg) => !categoryFilter || pkg.category === categoryFilter);
}

// ── Fuzzy substring match ──────────────────────────────────────────────────────
function fuzzyMatch(haystack, needle) {
  if (!needle) return 0;
  const h = String(haystack || '').toLowerCase();
  const n = String(needle).toLowerCase();
  if (h.includes(n)) return 1.0;

  // Try each word of the needle
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const matched = words.filter((w) => h.includes(w)).length;
  return matched / words.length;
}

// ── Score a skill ──────────────────────────────────────────────────────────────
function scoreSkill(skill) {
  if (!query) {
    // List mode — rank by evaluation score or utility
    const evalScore = skill.evaluation?.overall || 0;
    const utilityScore = skill.utility_score || 0;
    return Number(Math.max(evalScore, utilityScore).toFixed(4));
  }

  const allTokens = tokenize(skillText(skill));
  const titleTokens = tokenize(skill.title || '');
  const tagTokens = tokenize((skill.tags || []).join(' '));
  const triggerTokens = tokenize((skill.triggers || []).join(' '));
  const queryTokens = tokenize(query);

  // Jaccard similarity
  const bodyJaccard = jaccard(queryTokens, allTokens);
  const titleJaccard = jaccard(queryTokens, titleTokens);
  const tagJaccard = jaccard(queryTokens, tagTokens);
  const triggerJaccard = jaccard(queryTokens, triggerTokens);

  // Fuzzy substring match (catches partial matches)
  const titleFuzzy = fuzzyMatch(skill.title, query);
  const summaryFuzzy = fuzzyMatch(skill.summary, query);
  const tagsFuzzy = fuzzyMatch((skill.tags || []).join(' '), query);

  // Combine Jaccard + Fuzzy
  const jaccardScore = (bodyJaccard * 0.35) + (titleJaccard * 0.25) + (tagJaccard * 0.15) + (triggerJaccard * 0.07);
  const fuzzyScore = (titleFuzzy * 0.30) + (summaryFuzzy * 0.25) + (tagsFuzzy * 0.15);

  // Bonuses
  const statusBonus = skill.status === 'admitted' ? 0.12 : skill.status === 'candidate' ? 0.05 : 0;
  const utilityBonus = Math.min(0.08, (skill.utility_score || 0) * 0.08);
  const evalBonus = Math.min(0.06, (skill.evaluation?.overall || 0) * 0.06);

  const score = Math.max(jaccardScore, fuzzyScore) + statusBonus + utilityBonus + evalBonus;
  return Number(Math.min(1, score).toFixed(4));
}

// ── Score a package ────────────────────────────────────────────────────────────
function scorePackage(pkg) {
  if (!query) return 0.5;
  const text = [pkg.title, pkg.summary, pkg.category, ...(pkg.tags || [])].filter(Boolean).join(' ');
  const fuzzy = fuzzyMatch(text, query);
  const jac = jaccard(tokenize(query), tokenize(text));
  return Number(Math.max(fuzzy, jac).toFixed(4));
}

// ── Build results ──────────────────────────────────────────────────────────────
const skillResults = skills
  .map((skill) => ({
    type: 'skill',
    id: skill.skill_id,
    title: skill.title,
    status: skill.status,
    category: skill.category,
    tags: skill.tags || [],
    summary: (skill.summary || '').slice(0, 160),
    eval_score: skill.evaluation?.overall || null,
    utility: skill.utility_score || null,
    source_type: skill.source_type || null,
    score: scoreSkill(skill),
  }))
  .filter((r) => listMode || r.score > 0);

const packageResults = packages
  .map((pkg) => ({
    type: 'package',
    id: pkg.package_id,
    title: pkg.title,
    status: pkg.status || 'admitted',
    category: pkg.category || 'quality',
    tags: pkg.tags || [],
    summary: (pkg.summary || '').slice(0, 160),
    skill_count: Array.isArray(pkg.skill_ids) ? pkg.skill_ids.length : 0,
    score: scorePackage(pkg),
  }))
  .filter((r) => listMode || r.score > 0);

const allResults = [...skillResults, ...packageResults]
  .sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.id || '').localeCompare(String(b.id || ''));
  })
  .slice(0, topK);

// ── Load relations for context ─────────────────────────────────────────────────
const relationsData = readJson(resolveRoot('.evolution/skill_relations/RELATIONS.json'), { relations: [] });
const relations = Array.isArray(relationsData.relations) ? relationsData.relations : [];

function getRelationsFor(id) {
  return relations
    .filter((r) => r.source_skill_id === id || r.target === id)
    .map((r) => `${r.relation_type}→${r.source_skill_id === id ? r.target : r.source_skill_id}`)
    .slice(0, 5);
}

// ── JSON output ────────────────────────────────────────────────────────────────
if (jsonMode) {
  console.log(JSON.stringify({
    query: query || null,
    mode: listMode ? 'list' : 'search',
    filters: {
      status: statusFilter || null,
      category: categoryFilter || null,
      tag: tagFilter || null,
      top_k: topK,
    },
    total_skills: skills.length,
    total_packages: packages.length,
    total_results: allResults.length,
    results: allResults.map((r) => ({
      ...r,
      relations: getRelationsFor(r.id),
    })),
  }, null, 2));
  process.exit(0);
}

// ── Rich terminal output ───────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m', white: '\x1b[37m',
};

const statusColor = {
  admitted: C.green, candidate: C.yellow, quarantined: C.magenta, rejected: C.red,
};
const statusIcon = {
  admitted: '✅', candidate: '🟡', quarantined: '🟣', rejected: '❌',
};

const mode = listMode ? 'list' : `search "${query}"`;
const filterStr = [statusFilter && `status=${statusFilter}`, categoryFilter && `cat=${categoryFilter}`, tagFilter && `tag=${tagFilter}`].filter(Boolean).join(', ');

console.log(`\n${C.bold}nve-skill-search${C.reset} — ${mode}${filterStr ? ` (${filterStr})` : ''}`);
console.log(`${C.dim}Found ${allResults.length} result(s) from ${skills.length} skills${packages.length ? ` + ${packages.length} packages` : ''}${C.reset}\n`);

if (allResults.length === 0) {
  console.log(`${C.yellow}No matching skills found.${C.reset}`);
  if (skills.length === 0) {
    console.log(`${C.dim}Hint: Run the pipeline first: nve-distill → nve-replay → nve-skill-extract → nve-skill-index${C.reset}`);
  }
  process.exit(0);
}

// Header
console.log(`${C.dim}${'─'.repeat(90)}${C.reset}`);
console.log(`${C.bold} #  Score  Status      Category       ID${C.reset}`);
console.log(`${C.dim}${'─'.repeat(90)}${C.reset}`);

for (let i = 0; i < allResults.length; i++) {
  const r = allResults[i];
  const num = String(i + 1).padStart(2);
  const scoreStr = r.score.toFixed(2).padStart(5);
  const sc = statusColor[r.status] || C.white;
  const si = statusIcon[r.status] || '⬜';
  const typeIcon = r.type === 'package' ? '📦' : '🧩';
  const catStr = (r.category || '—').padEnd(14);
  const evalStr = r.eval_score ? ` eval=${r.eval_score}` : '';
  const utilStr = r.utility ? ` util=${r.utility}` : '';
  const skillCountStr = r.skill_count ? ` (${r.skill_count} skills)` : '';

  console.log(`${C.bold}${num}${C.reset}  ${C.cyan}${scoreStr}${C.reset}  ${sc}${si} ${r.status.padEnd(11)}${C.reset} ${catStr} ${typeIcon} ${C.bold}${r.id}${C.reset}${skillCountStr}`);
  console.log(`${C.dim}    ${r.title}${evalStr}${utilStr}${C.reset}`);

  if (r.tags && r.tags.length > 0) {
    console.log(`${C.dim}    tags: ${r.tags.join(', ')}${C.reset}`);
  }

  const rels = getRelationsFor(r.id);
  if (rels.length > 0) {
    console.log(`${C.dim}    relations: ${rels.join(', ')}${C.reset}`);
  }

  if (r.summary && r.summary.length > 10) {
    const shortSummary = r.summary.length > 120 ? r.summary.slice(0, 117) + '...' : r.summary;
    console.log(`${C.dim}    ${shortSummary}${C.reset}`);
  }
}

console.log(`${C.dim}${'─'.repeat(90)}${C.reset}`);
console.log(`${C.dim}Tip: Use --json for programmatic output, --packages to include bundles${C.reset}\n`);
