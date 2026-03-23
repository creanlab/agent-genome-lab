#!/usr/bin/env node
/**
 * TAMA Gist Sync (TAMA-3.2)
 * Parses evolution_journal.md and pushes to GitHub Gist
 * 
 * Usage:
 *   node tama-sync.js <journal.md> --gist-id <GIST_ID> [--token <GITHUB_TOKEN>]
 *   node tama-sync.js <journal.md> --create [--token <GITHUB_TOKEN>]
 * 
 * Environment:
 *   GITHUB_TOKEN — Personal Access Token with gist scope
 *   TAMA_GIST_ID — Default Gist ID to update
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ==================== PARSER (shared with tama-parse.js) ====================
function parseJournal(text) {
    const result = { status: null, entries: [], patterns: [], antiPatterns: [] };
    const statusRe = /<!--\s*STATUS_JSON[\s\S]*?(\{[\s\S]*?\})\s*-->/;
    const statusMatch = text.match(statusRe);
    if (statusMatch) { try { result.status = JSON.parse(statusMatch[1]); } catch(e) {} }
    const evoRe = /<!--\s*EVO_JSON\s*\n?\s*(\{[\s\S]*?\})\s*-->/g;
    for (const m of text.matchAll(evoRe)) { try { result.entries.push(JSON.parse(m[1])); } catch(e) {} }
    for (const m of text.matchAll(/\|\s*(PAT-\d+)\s*\|\s*\*\*([^*]+)\*\*\s*\|\s*(EVO-\d+)/g)) {
        result.patterns.push({ id: m[1], name: m[2].trim(), source: m[3] });
    }
    for (const m of text.matchAll(/\|\s*(AP-\d+)\s*\|\s*\*\*([^*]+)\*\*/g)) {
        result.antiPatterns.push({ id: m[1], name: m[2].trim() });
    }
    return result;
}

// ==================== GITHUB API ====================
function githubRequest(method, path, token, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const opts = {
            hostname: 'api.github.com',
            path: path,
            method: method,
            headers: {
                'User-Agent': 'tama-sync/1.0',
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${token}`,
                ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
            }
        };
        const req = https.request(opts, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (res.statusCode >= 400) reject(new Error(`GitHub API ${res.statusCode}: ${json.message}`));
                    else resolve(json);
                } catch(e) { reject(new Error(`Invalid response: ${body.slice(0, 200)}`)); }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function createGist(token, filename, content, description) {
    return await githubRequest('POST', '/gists', token, {
        description: description || 'Evolution Tamagotchi Journal',
        public: true,
        files: { [filename]: { content } }
    });
}

async function updateGist(token, gistId, filename, content) {
    return await githubRequest('PATCH', `/gists/${gistId}`, token, {
        files: { [filename]: { content } }
    });
}

// ==================== MAIN ====================
async function main() {
    const args = process.argv.slice(2);
    const files = args.filter(a => !a.startsWith('--'));
    
    // Parse flags
    function getFlag(name) {
        const idx = args.indexOf(name);
        return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
    }
    
    const isCreate = args.includes('--create');
    const gistId = getFlag('--gist-id') || process.env.TAMA_GIST_ID;
    const token = getFlag('--token') || process.env.GITHUB_TOKEN;
    
    if (files.length === 0) {
        console.log(`
  🧬 TAMA Gist Sync v1.0
  
  Usage:
    node tama-sync.js <journal.md> --create              Create new Gist
    node tama-sync.js <journal.md> --gist-id <ID>        Update existing Gist
    
  Environment:
    GITHUB_TOKEN    GitHub PAT with 'gist' scope
    TAMA_GIST_ID    Default Gist ID to update
`);
        process.exit(0);
    }
    
    if (!token) {
        console.error('❌ GITHUB_TOKEN not set. Use --token <TOKEN> or set GITHUB_TOKEN env var.');
        console.error('   Create one at: https://github.com/settings/tokens → "gist" scope');
        process.exit(1);
    }
    
    const filePath = path.resolve(files[0]);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }
    
    const text = fs.readFileSync(filePath, 'utf8');
    const data = parseJournal(text);
    
    if (!data.status) {
        console.error('❌ No STATUS_JSON found in journal.');
        process.exit(1);
    }
    
    const filename = path.basename(filePath);
    const desc = `🧬 ${data.status.agent_id} — Level ${data.status.level} ${data.status.level_name} | ${data.status.xp_current} XP`;
    
    try {
        if (isCreate) {
            console.log(`📤 Creating new Gist for ${data.status.agent_id}...`);
            const result = await createGist(token, filename, text, desc);
            console.log(`✅ Gist created!`);
            console.log(`   🔗 ${result.html_url}`);
            console.log(`   📋 ID: ${result.id}`);
            console.log(`\n   💡 Save the ID: export TAMA_GIST_ID=${result.id}`);
        } else if (gistId) {
            console.log(`📤 Updating Gist ${gistId.slice(0, 8)}... for ${data.status.agent_id}...`);
            const result = await updateGist(token, gistId, filename, text);
            console.log(`✅ Gist updated!`);
            console.log(`   🔗 ${result.html_url}`);
            console.log(`   📊 ${data.status.level_emoji} Level ${data.status.level} | ${data.status.xp_current} XP | ${data.entries.length} entries`);
        } else {
            console.error('❌ No Gist ID provided. Use --gist-id <ID> or --create');
            process.exit(1);
        }
    } catch (e) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }
}

main();
