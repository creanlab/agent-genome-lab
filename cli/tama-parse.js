#!/usr/bin/env node
/**
 * TAMA CLI Parser (TAMA-3.1)
 * Parses evolution_journal.md → structured JSON
 * 
 * Usage:
 *   node tama-parse.js <path-to-evolution_journal.md>
 *   node tama-parse.js --stdin  (reads from stdin)
 *   node tama-parse.js <path> --pretty  (formatted JSON output)
 *   node tama-parse.js <path> --summary  (human-readable summary)
 */

const fs = require('fs');
const path = require('path');

// ==================== PARSER ====================
function parseJournal(text) {
    const result = {
        status: null,
        entries: [],
        patterns: [],
        antiPatterns: [],
        xpTimeline: [],
        meta: {
            parsedAt: new Date().toISOString(),
            source: 'tama-parse CLI',
            version: '1.0.0'
        }
    };

    // Parse STATUS_JSON
    const statusRe = /<!--\s*STATUS_JSON[\s\S]*?(\{[\s\S]*?\})\s*-->/;
    const statusMatch = text.match(statusRe);
    if (statusMatch) {
        try { result.status = JSON.parse(statusMatch[1]); }
        catch (e) { console.error('⚠️  Failed to parse STATUS_JSON:', e.message); }
    }

    // Parse EVO entries
    const evoRe = /<!--\s*EVO_JSON\s*\n?\s*(\{[\s\S]*?\})\s*-->/g;
    for (const m of text.matchAll(evoRe)) {
        try { result.entries.push(JSON.parse(m[1])); }
        catch (e) { console.error('⚠️  Failed to parse EVO entry:', e.message); }
    }

    // Parse patterns table
    for (const m of text.matchAll(/\|\s*(PAT-\d+)\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*(EVO-\d+)/g)) {
        result.patterns.push({ id: m[1], name: m[2].trim(), source: m[3] });
    }

    // Parse anti-patterns table  
    for (const m of text.matchAll(/\|\s*(AP-\d+)\s*\|\s*\*\*([^*]+)\*\*/g)) {
        result.antiPatterns.push({ id: m[1], name: m[2].trim() });
    }

    // Build XP timeline
    let cumXP = 0;
    const sorted = [...result.entries].sort((a, b) => a.id.localeCompare(b.id));
    result.xpTimeline = sorted.map(e => {
        cumXP += e.xp || 0;
        return { id: e.id, date: e.date, xp: e.xp, cumulativeXP: cumXP };
    });

    // Computed stats
    if (result.status && result.entries.length > 0) {
        const entries = result.entries;
        const preventive = entries.filter(e => e.category === 'Preventive').length;
        result.computed = {
            avgImpact: +(entries.reduce((a, e) => a + (e.impact || 0), 0) / entries.length).toFixed(2),
            preventiveRatio: +(preventive / entries.length).toFixed(2),
            totalXP: cumXP,
            entriesCount: entries.length,
            patternsCount: result.patterns.length,
            antiPatternsCount: result.antiPatterns.length,
            healthScore: calcHealthScore(result)
        };
    }

    return result;
}

function calcHealthScore(data) {
    const s = data.status;
    const e = data.entries;
    if (!s || e.length === 0) return 0;
    
    const preventive = e.filter(x => x.category === 'Preventive').length;
    const preventiveRatio = preventive / e.length;
    const patternReuse = s.total_patterns > 0 ? Math.min(1, s.total_patterns / Math.max(1, s.total_entries)) : 0;
    const repeatRate = s.total_anti_patterns > 0 ? Math.min(1, s.total_anti_patterns / (s.total_anti_patterns + s.total_patterns + s.total_entries)) : 0;
    const freshness = 1;

    return Math.round((0.3 * (1 - repeatRate) + 0.3 * preventiveRatio + 0.2 * patternReuse + 0.2 * freshness) * 100);
}

// ==================== SUMMARY ====================
function printSummary(data) {
    if (!data.status) {
        console.log('❌ No STATUS_JSON found in file.');
        return;
    }
    const s = data.status;
    const c = data.computed || {};
    
    console.log('');
    console.log('  🧬 Evolution Tamagotchi — Journal Summary');
    console.log('  ═══════════════════════════════════════════');
    console.log(`  🦊 Agent:      ${s.agent_id}`);
    console.log(`  📂 Project:    ${s.project || '—'}`);
    console.log(`  ${s.level_emoji} Level:      ${s.level} — ${s.level_name}`);
    console.log(`  ⚡ XP:         ${s.xp_current} / ${s.xp_next_level}`);
    console.log(`  🔥 Streak:     ${s.streak}`);
    console.log(`  📊 Entries:    ${c.entriesCount || 0}`);
    console.log(`  🧠 Patterns:   ${c.patternsCount || 0}`);
    console.log(`  🚫 Anti-Pat:   ${c.antiPatternsCount || 0}`);
    console.log(`  💚 Health:     ${c.healthScore || 0}%`);
    console.log(`  📈 Avg Impact: ${c.avgImpact || '—'}`);
    console.log(`  🛡️  Preventive: ${Math.round((c.preventiveRatio || 0) * 100)}%`);
    console.log('');
    
    if (data.entries.length > 0) {
        console.log('  📓 Latest Entries:');
        const latest = [...data.entries].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 5);
        for (const e of latest) {
            const impact = e.impact >= 7 ? '🔴' : e.impact >= 5 ? '🟡' : '🟢';
            console.log(`     ${e.id} ${impact} ${e.title} (+${e.xp} XP)`);
        }
        console.log('');
    }
    
    if (data.patterns.length > 0) {
        console.log('  🧠 Patterns:');
        for (const p of data.patterns) {
            console.log(`     ${p.id} — ${p.name} (from ${p.source})`);
        }
        console.log('');
    }
}

// ==================== MAIN ====================
function main() {
    const args = process.argv.slice(2);
    const flags = new Set(args.filter(a => a.startsWith('--')));
    const files = args.filter(a => !a.startsWith('--'));

    if (files.length === 0 && !flags.has('--stdin')) {
        console.log(`
  🧬 TAMA CLI Parser v1.0
  
  Usage:
    node tama-parse.js <file.md>             Output JSON
    node tama-parse.js <file.md> --pretty    Pretty JSON
    node tama-parse.js <file.md> --summary   Human summary
    echo "..." | node tama-parse.js --stdin  Read from stdin
`);
        process.exit(0);
    }

    let text;
    if (flags.has('--stdin')) {
        text = fs.readFileSync(0, 'utf8'); // read from stdin
    } else {
        const filePath = path.resolve(files[0]);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ File not found: ${filePath}`);
            process.exit(1);
        }
        text = fs.readFileSync(filePath, 'utf8');
    }

    const data = parseJournal(text);

    if (flags.has('--summary')) {
        printSummary(data);
    } else if (flags.has('--pretty')) {
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log(JSON.stringify(data));
    }
}

main();
