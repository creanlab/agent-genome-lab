#!/usr/bin/env node
/**
 * nve-auto-capture.js — Automated incident capture → distill → promote → memory
 *
 * Usage:
 *   node cli/nve-auto-capture.js --title "API returns 500" --severity 8 --source evaluator
 *   node cli/nve-auto-capture.js --title "CSS broken" --root-cause "missing import" --resolution "added import"
 *   node cli/nve-auto-capture.js --from-file qa-report.json
 *
 * This closes the loop: runtime findings → incident → genome → MEMORY.md
 * Without this, incidents only enter the system manually via /capture-incident.
 *
 * Pipeline: create incident → nve-distill → nve-replay --promote → nve-memory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = findProjectRoot(process.cwd());
const EVO = path.join(ROOT, '.evolution');
const INCIDENTS_DIR = path.join(EVO, 'incidents');
const CLI_DIR = path.join(ROOT, 'cli');

function findProjectRoot(dir) {
  let d = dir;
  while (d !== path.dirname(d)) {
    if (fs.existsSync(path.join(d, '.evolution'))) return d;
    d = path.dirname(d);
  }
  return dir;
}

// Parse CLI args
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2).replace(/-/g, '_');
    const val = (args[i + 1] && !args[i + 1].startsWith('--')) ? args[i + 1] : true;
    flags[key] = val;
    if (val !== true) i++;
  }
}

if (!fs.existsSync(EVO)) {
  console.error('❌ No .evolution/ directory found. Run nve-init first.');
  process.exit(1);
}

// Handle --from-file (batch import)
if (flags.from_file) {
  const filePath = path.resolve(flags.from_file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const findings = Array.isArray(data) ? data : (data.findings || data.issues || [data]);
  
  console.log(`\n🔄 Auto-capturing ${findings.length} finding(s) from ${path.basename(filePath)}...\n`);
  for (const finding of findings) {
    captureAndProcess({
      title: finding.title || finding.description || 'Untitled finding',
      severity: finding.severity || 7,
      source: finding.source || 'qa-report',
      description: finding.description || finding.title || '',
      root_cause: finding.root_cause || finding.cause || 'Under investigation',
      resolution: finding.resolution || finding.fix || 'Pending',
      tags: finding.tags || []
    });
  }
  process.exit(0);
}

// Require --title
if (!flags.title) {
  console.log('\nUsage:');
  console.log('  node cli/nve-auto-capture.js --title "Bug description" [options]');
  console.log('');
  console.log('Options:');
  console.log('  --title        Bug title (required)');
  console.log('  --severity     1-10 (default: 7)');
  console.log('  --source       evaluator|qa|manual|hook (default: manual)');
  console.log('  --description  Detailed description');
  console.log('  --root-cause   Why it happened');
  console.log('  --resolution   How it was fixed');
  console.log('  --tags         Comma-separated tags');
  console.log('  --from-file    Import findings from JSON file');
  console.log('  --dry-run      Show what would be captured without writing');
  process.exit(0);
}

captureAndProcess({
  title: flags.title,
  severity: parseInt(flags.severity || '7'),
  source: flags.source || 'manual',
  description: flags.description || flags.title,
  root_cause: flags.root_cause || 'Under investigation',
  resolution: flags.resolution || 'Pending fix',
  tags: flags.tags ? flags.tags.split(',').map(t => t.trim()) : []
});

function captureAndProcess(data) {
  const isDryRun = flags.dry_run;
  
  // Step 1: Create incident
  console.log(`━━━ Step 1: Creating incident ━━━`);
  
  if (!fs.existsSync(INCIDENTS_DIR)) fs.mkdirSync(INCIDENTS_DIR, { recursive: true });
  const files = fs.readdirSync(INCIDENTS_DIR).filter(f => f.endsWith('.json'));
  const nextId = String(files.length + 1).padStart(6, '0');
  const incidentId = `INC-${nextId}`;
  
  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  
  const incident = {
    incident_id: incidentId,
    title: data.title,
    slug,
    occurred_at: new Date().toISOString(),
    severity: data.severity,
    status: data.resolution !== 'Pending fix' ? 'fixed' : 'open',
    description: data.description,
    root_cause: data.root_cause,
    resolution: data.resolution,
    impact_score: data.severity,
    source: data.source,
    tags: data.tags,
    related_incidents: []
  };

  if (isDryRun) {
    console.log(`  [DRY RUN] Would create ${incidentId}: "${data.title}"`);
    console.log(`  Severity: ${data.severity}, Source: ${data.source}`);
    return;
  }

  const incPath = path.join(INCIDENTS_DIR, `${incidentId}.json`);
  fs.writeFileSync(incPath, JSON.stringify(incident, null, 2));
  console.log(`  ✅ Created ${incidentId}: "${data.title}" (severity: ${data.severity})`);

  // Step 2: Auto-distill
  console.log(`\n━━━ Step 2: Distilling → Failure Genome ━━━`);
  try {
    const distillOutput = execSync(`node "${path.join(CLI_DIR, 'nve-distill.js')}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000
    });
    // Extract genome info from output
    const fgMatch = distillOutput.match(/FG-\d+/);
    if (fgMatch) {
      console.log(`  ✅ Genome created: ${fgMatch[0]}`);
    } else {
      console.log(`  ℹ️  Distill completed (incident may not meet threshold)`);
    }
  } catch (e) {
    const output = (e.stdout || '') + (e.stderr || '');
    const fgMatch = output.match(/FG-\d+/);
    if (fgMatch) {
      console.log(`  ✅ Genome created: ${fgMatch[0]} (with warnings)`);
    } else {
      console.log(`  ⚠️  Distill had issues: ${e.message?.slice(0, 100)}`);
    }
  }

  // Step 3: Replay Gate
  console.log(`\n━━━ Step 3: Replay Gate ━━━`);
  try {
    execSync(`node "${path.join(CLI_DIR, 'nve-replay.js')}" --promote`, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000
    });
    console.log(`  ✅ Replay gate passed & promoted`);
  } catch (e) {
    console.log(`  ⚠️  Replay gate: ${e.message?.slice(0, 80)}`);
  }

  // Step 4: Regenerate MEMORY.md
  console.log(`\n━━━ Step 4: Regenerating MEMORY.md ━━━`);
  try {
    const memOutput = execSync(`node "${path.join(CLI_DIR, 'nve-memory.js')}"`, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30000
    });
    const linesMatch = memOutput.match(/Lines:\s+(\d+)/);
    const promotedMatch = memOutput.match(/(\d+) promoted/);
    console.log(`  ✅ MEMORY.md updated (${linesMatch?.[1] || '?'} lines, ${promotedMatch?.[1] || '?'} promoted)`);
  } catch (e) {
    console.log(`  ⚠️  Memory generation: ${e.message?.slice(0, 80)}`);
  }

  console.log(`\n🎯 Pipeline complete: ${incidentId} → genome → replay → memory`);
  console.log(`   Next agent session will automatically know about this pattern.\n`);
}
