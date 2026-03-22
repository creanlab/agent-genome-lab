#!/usr/bin/env node
/**
 * nve-skill-search.js — Search the local skill registry.
 *
 * Usage:
 *   node cli/nve-skill-search.js "verification before done"
 *   node cli/nve-skill-search.js "schema migration" --status=admitted --top=5
 *   node cli/nve-skill-search.js "fallback" --json
 */

const {
  listJsonObjects,
  tokenize,
  skillText,
  jaccard,
} = require('./nve-skill-common');

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const statusFilter = (args.find((arg) => arg.startsWith('--status=')) || '').split('=')[1] || '';
const categoryFilter = (args.find((arg) => arg.startsWith('--category=')) || '').split('=')[1] || '';
const tagFilter = (args.find((arg) => arg.startsWith('--tag=')) || '').split('=')[1] || '';
const topK = Number((args.find((arg) => arg.startsWith('--top=')) || '--top=10').split('=')[1]) || 10;
const query = args.filter((arg) => !arg.startsWith('--')).join(' ').trim();

if (!query) {
  console.log('Usage: node cli/nve-skill-search.js "query text" [--status=admitted] [--category=verification] [--tag=contract] [--top=10] [--json]');
  process.exit(1);
}

const skills = listJsonObjects('.evolution/skills')
  .filter((item) => item.name !== 'INDEX.json')
  .map((item) => item.data)
  .filter((skill) => !statusFilter || skill.status === statusFilter)
  .filter((skill) => !categoryFilter || skill.category === categoryFilter)
  .filter((skill) => !tagFilter || (skill.tags || []).includes(tagFilter));

const queryTokens = tokenize(query);

function scoreSkill(skill) {
  const allTokens = tokenize(skillText(skill));
  const titleTokens = tokenize(skill.title || '');
  const tagTokens = tokenize((skill.tags || []).join(' '));
  const triggerTokens = tokenize((skill.triggers || []).join(' '));

  const bodyScore = jaccard(queryTokens, allTokens);
  const titleScore = jaccard(queryTokens, titleTokens);
  const tagScore = jaccard(queryTokens, tagTokens);
  const triggerScore = jaccard(queryTokens, triggerTokens);
  const statusBonus = skill.status === 'admitted' ? 0.18 : skill.status === 'candidate' ? 0.08 : 0;
  const categoryBonus = categoryFilter && skill.category === categoryFilter ? 0.04 : 0;
  const score = (bodyScore * 0.45) + (titleScore * 0.25) + (tagScore * 0.15) + (triggerScore * 0.07) + statusBonus + categoryBonus;
  return Number(score.toFixed(4));
}

const results = skills
  .map((skill) => ({
    skill_id: skill.skill_id,
    title: skill.title,
    status: skill.status,
    category: skill.category,
    tags: skill.tags || [],
    summary: skill.summary || '',
    score: scoreSkill(skill),
  }))
  .filter((result) => result.score > 0)
  .sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.skill_id || '').localeCompare(String(b.skill_id || ''));
  })
  .slice(0, topK);

if (jsonMode) {
  console.log(JSON.stringify({
    query,
    filters: {
      status: statusFilter || null,
      category: categoryFilter || null,
      tag: tagFilter || null,
      top_k: topK,
    },
    total_results: results.length,
    results,
  }, null, 2));
  process.exit(0);
}

console.log(`\nnve-skill-search — query="${query}"\n`);
if (results.length === 0) {
  console.log('No matching skills found.');
  process.exit(0);
}

for (const result of results) {
  console.log(`\n${result.skill_id} [${result.status}|${result.category}] score=${result.score.toFixed(4)}`);
  console.log(`  ${result.title}`);
  console.log(`  tags: ${(result.tags || []).join(', ')}`);
  console.log(`  ${result.summary}`);
}
console.log('');
