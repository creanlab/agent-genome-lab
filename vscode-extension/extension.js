const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const http = require('http');

// ==================== HTTP HELPER ====================
function httpGetJson(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Invalid JSON from ' + url)); }
            });
        });
        req.on('error', (e) => reject(e));
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

function activate(context) {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return;

    const evoDir = path.join(root, '.evolution');
    if (!fs.existsSync(evoDir)) return;

    // ==================== TREE DATA PROVIDERS ====================

    // 1. Audit Score
    const auditProvider = new AuditTreeProvider(root);
    vscode.window.registerTreeDataProvider('nveAuditScore', auditProvider);

    // 2. Genome Families
    const genomesProvider = new GenomeFamiliesProvider(root);
    vscode.window.registerTreeDataProvider('nveGenomeFamilies', genomesProvider);

    // 3. Replay Gate
    const replayProvider = new ReplayGateProvider(root);
    vscode.window.registerTreeDataProvider('nveReplayGate', replayProvider);

    // 4. Skill Registry
    const skillProvider = new SkillRegistryProvider(root);
    vscode.window.registerTreeDataProvider('nveSkillRegistry', skillProvider);

    // 5. Skill Packages
    const packageProvider = new SkillPackagesProvider(root);
    vscode.window.registerTreeDataProvider('nveSkillPackages', packageProvider);

    // 6. Quick Actions
    const actionsProvider = new QuickActionsProvider();
    vscode.window.registerTreeDataProvider('nveQuickActions', actionsProvider);

    // 7. Bridge Status
    const bridgeProvider = new BridgeStatusProvider();
    vscode.window.registerTreeDataProvider('nveBridgeStatus', bridgeProvider);

    // 8. Memory Layers
    const memoryProvider = new MemoryTreeProvider();
    vscode.window.registerTreeDataProvider('nveMemoryTree', memoryProvider);

    // ==================== COMMANDS ====================
    function runCLI(script) {
        const terminal = vscode.window.createTerminal('NVE');
        terminal.show();
        terminal.sendText(`node cli/${script}`);
        setTimeout(() => {
            refreshAll();
        }, 3000);
    }

    function refreshAll() {
        auditProvider.refresh();
        genomesProvider.refresh();
        replayProvider.refresh();
        skillProvider.refresh();
        packageProvider.refresh();
        bridgeProvider.refresh();
        memoryProvider.refresh();
    }

    // Skill search with input box
    async function runSkillSearch() {
        const query = await vscode.window.showInputBox({
            prompt: 'Search skills by keyword',
            placeHolder: 'e.g. verification, migration, fallback...',
        });
        if (!query) return;
        const terminal = vscode.window.createTerminal('NVE Skill Search');
        terminal.show();
        terminal.sendText(`node cli/nve-skill-search.js "${query}"`);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('nve.runAudit', () => runCLI('nve-audit.js')),
        vscode.commands.registerCommand('nve.runDistill', () => runCLI('nve-distill.js')),
        vscode.commands.registerCommand('nve.runReplay', () => runCLI('nve-replay.js --dry-run --verbose')),
        vscode.commands.registerCommand('nve.runPack', () => runCLI('nve-pack.js distilled')),
        vscode.commands.registerCommand('nve.runSkillExtract', () => runCLI('nve-skill-extract.js')),
        vscode.commands.registerCommand('nve.runSkillIndex', () => runCLI('nve-skill-index.js')),
        vscode.commands.registerCommand('nve.runSkillPackage', () => runCLI('nve-skill-package.js --auto --publish')),
        vscode.commands.registerCommand('nve.runSkillSearch', () => runSkillSearch()),
        vscode.commands.registerCommand('nve.refreshAll', () => refreshAll()),

        // Bridge commands
        vscode.commands.registerCommand('nve.startServer', () => {
            const terminal = vscode.window.createTerminal('NVE Server');
            terminal.show();
            terminal.sendText('node cli/nve-serve.js');
        }),
        vscode.commands.registerCommand('nve.bridgeStatus', async () => {
            const outputChannel = vscode.window.createOutputChannel('NVE Bridge Status');
            outputChannel.show();
            try {
                const status = await httpGetJson('http://localhost:8099/status');
                outputChannel.appendLine('=== NVE Bridge Status ===');
                outputChannel.appendLine(`Project:  ${status.project || 'unknown'}`);
                outputChannel.appendLine(`Profile:  ${status.profile || 'unknown'}`);
                outputChannel.appendLine(`Provider: ${status.provider || 'unknown'}`);
                outputChannel.appendLine(`Model:    ${status.model || 'unknown'}`);
                outputChannel.appendLine(JSON.stringify(status, null, 2));
            } catch (e) {
                outputChannel.appendLine('Server not running or unreachable: ' + e.message);
            }
        }),
        vscode.commands.registerCommand('nve.runDoctor', () => runCLI('nve-doctor.js')),
        vscode.commands.registerCommand('nve.runSelfCheck', () => runCLI('nve-self-check.js smoke')),
        vscode.commands.registerCommand('nve.runReport', () => runCLI('nve-report.js generate'))
    );

    // Auto-refresh on file changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/.evolution/**/*.json');
    watcher.onDidChange(() => refreshAll());
    watcher.onDidCreate(() => refreshAll());
    watcher.onDidDelete(() => refreshAll());
    context.subscriptions.push(watcher);

    // ==================== SSE SUBSCRIPTION ====================
    const sseOutputChannel = vscode.window.createOutputChannel('NVE Events');
    let sseReq = null;

    function connectSSE() {
        if (sseReq) { try { sseReq.destroy(); } catch {} }
        sseReq = http.get('http://localhost:8099/sse', (res) => {
            if (res.statusCode !== 200) return;
            sseOutputChannel.appendLine('[SSE] Connected to nve-serve');
            let buffer = '';
            res.on('data', (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const payload = line.slice(5).trim();
                        sseOutputChannel.appendLine('[SSE] ' + payload);
                        try {
                            const evt = JSON.parse(payload);
                            if (['audit', 'genome', 'skill', 'replay', 'status', 'memory'].includes(evt.type)) {
                                refreshAll();
                            }
                        } catch {}
                    }
                }
            });
            res.on('end', () => {
                sseOutputChannel.appendLine('[SSE] Connection closed, reconnecting in 10s...');
                setTimeout(connectSSE, 10000);
            });
        });
        sseReq.on('error', () => { setTimeout(connectSSE, 30000); });
        sseReq.setTimeout(0);
    }

    const sseTimer = setTimeout(connectSSE, 5000);
    context.subscriptions.push({ dispose: () => {
        clearTimeout(sseTimer);
        if (sseReq) { try { sseReq.destroy(); } catch {} }
    }});

    // ==================== STATUS BAR ====================
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    statusBarItem.command = 'nve.bridgeStatus';
    statusBarItem.text = '$(beaker) NVE: ...';
    statusBarItem.tooltip = 'Click to show NVE bridge status';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    async function updateStatusBar() {
        try {
            const status = await httpGetJson('http://localhost:8099/status');
            const profile = status.profile || 'default';
            const health = status.health || 'ok';
            const icon = health === 'ok' ? '$(check)' : '$(warning)';
            statusBarItem.text = `$(beaker) NVE: ${profile} ${icon}`;
            statusBarItem.tooltip = `Profile: ${profile} | Provider: ${status.provider || '?'} | Model: ${status.model || '?'}`;
        } catch {
            statusBarItem.text = '$(beaker) NVE: offline';
            statusBarItem.tooltip = 'nve-serve not running';
        }
    }

    updateStatusBar();
    const statusInterval = setInterval(updateStatusBar, 30000);
    context.subscriptions.push({ dispose: () => clearInterval(statusInterval) });
}

// ==================== HELPERS ====================
function readJsonSafe(filePath, fallback) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

function statusIcon(status) {
    switch (status) {
        case 'admitted': return 'pass';
        case 'candidate': return 'question';
        case 'quarantined': return 'warning';
        case 'rejected': return 'error';
        default: return 'circle';
    }
}

function statusEmoji(status) {
    switch (status) {
        case 'admitted': return '✅';
        case 'candidate': return '⏳';
        case 'quarantined': return '🟡';
        case 'rejected': return '❌';
        default: return '•';
    }
}

// ==================== AUDIT TREE ====================
class AuditTreeProvider {
    constructor(root) { this.root = root; this._onDidChange = new vscode.EventEmitter(); this.onDidChangeTreeData = this._onDidChange.event; }
    refresh() { this._onDidChange.fire(); }

    getTreeItem(el) { return el; }
    getChildren() {
        const auditDir = path.join(this.root, '.evolution/audits');
        if (!fs.existsSync(auditDir)) return [new vscode.TreeItem('No audit data. Run: NVE: Run 5-Axis Audit')];
        const files = fs.readdirSync(auditDir).filter(f => f.startsWith('AUDIT-')).sort().reverse();
        if (files.length === 0) return [new vscode.TreeItem('No audit data. Run: NVE: Run 5-Axis Audit')];

        const latest = readJsonSafe(path.join(auditDir, files[0]), {});
        const items = [];

        if (latest.overall_score !== undefined) {
            const overall = new vscode.TreeItem(`Overall: ${latest.overall_score}%`);
            overall.iconPath = new vscode.ThemeIcon(latest.overall_score >= 90 ? 'pass' : latest.overall_score >= 70 ? 'warning' : 'error');
            overall.description = files[0].replace('.json', '');
            items.push(overall);
        }

        if (latest.axes) {
            const axisIcons = { structure: 'symbol-structure', memory: 'database', verification: 'shield', shareability: 'cloud-upload', evolution: 'beaker' };
            for (const [name, data] of Object.entries(latest.axes)) {
                const item = new vscode.TreeItem(`${name}: ${data.score}%`);
                item.iconPath = new vscode.ThemeIcon(axisIcons[name] || 'circle');
                item.description = data.score >= 90 ? '✅' : data.score >= 70 ? '🟡' : '🔴';
                items.push(item);
            }
        }

        // SkillGraph extension score
        if (latest.skillgraph) {
            const sg = latest.skillgraph;
            const sgItem = new vscode.TreeItem(`SkillGraph: ${sg.score}%`);
            sgItem.iconPath = new vscode.ThemeIcon('extensions');
            sgItem.description = `${sg.skills || 0} skills, ${sg.packages || 0} pkg`;
            sgItem.tooltip = `Admitted: ${sg.admitted || 0} | Candidate: ${sg.candidate || 0} | Quarantined: ${sg.quarantined || 0} | Relations: ${sg.relations || 0}`;
            items.push(sgItem);
        }

        return items;
    }
}

// ==================== GENOME FAMILIES TREE ====================
class GenomeFamiliesProvider {
    constructor(root) { this.root = root; this._onDidChange = new vscode.EventEmitter(); this.onDidChangeTreeData = this._onDidChange.event; }
    refresh() { this._onDidChange.fire(); }

    getTreeItem(el) { return el; }
    getChildren(element) {
        const fgDir = path.join(this.root, '.evolution/failure_genomes');
        const indexFile = path.join(fgDir, 'FAMILY_INDEX.json');

        if (!element) {
            // Root level: families
            if (!fs.existsSync(indexFile)) return [new vscode.TreeItem('No FAMILY_INDEX.json')];
            const index = readJsonSafe(indexFile, {});
            const families = Object.entries(index.families || {});
            if (families.length === 0) return [new vscode.TreeItem('No genome families yet')];
            return families.map(([name, data]) => {
                const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.Collapsed);
                item.description = `${data.members?.length || 0} genomes`;
                item.iconPath = new vscode.ThemeIcon('symbol-class');
                item.contextValue = 'family';
                item._familyData = data;
                item._familyName = name;
                return item;
            });
        }

        // Child level: family members
        if (element._familyData && element._familyData.members) {
            return element._familyData.members.map(gid => {
                const gFile = path.join(fgDir, `${gid}.json`);
                let desc = '';
                if (fs.existsSync(gFile)) {
                    try {
                        const g = JSON.parse(fs.readFileSync(gFile, 'utf8'));
                        desc = `utility: ${g.utility?.score?.toFixed(2) || '?'} | ${g.promotion_decision || 'pending'}`;
                    } catch {}
                }
                const item = new vscode.TreeItem(gid);
                item.description = desc;
                item.iconPath = new vscode.ThemeIcon('symbol-event');
                if (fs.existsSync(gFile)) {
                    item.command = { command: 'vscode.open', arguments: [vscode.Uri.file(gFile)] };
                }
                return item;
            });
        }
        return [];
    }
}

// ==================== REPLAY GATE TREE ====================
class ReplayGateProvider {
    constructor(root) { this.root = root; this._onDidChange = new vscode.EventEmitter(); this.onDidChangeTreeData = this._onDidChange.event; }
    refresh() { this._onDidChange.fire(); }

    getTreeItem(el) { return el; }
    getChildren() {
        const reportFile = path.join(this.root, '.evolution/audits/replay-gate.latest.json');
        if (!fs.existsSync(reportFile)) return [new vscode.TreeItem('No replay data. Run: NVE: Run Replay Gate')];

        const report = readJsonSafe(reportFile, {});
        const items = [];

        const summary = new vscode.TreeItem(`${report.promoted || 0} promoted, ${report.rejected || 0} rejected, ${report.skipped || 0} skipped`);
        summary.iconPath = new vscode.ThemeIcon('testing-passed-icon');
        items.push(summary);

        for (const r of (report.results || [])) {
            const item = new vscode.TreeItem(r.genome_id);
            item.description = r.decision;
            item.iconPath = new vscode.ThemeIcon(
                r.decision === 'promoted' ? 'pass' :
                r.decision === 'rejected' ? 'error' : 'question'
            );
            if (r.pass_rate !== null && r.pass_rate !== undefined) {
                item.tooltip = `Pass rate: ${(r.pass_rate * 100).toFixed(0)}% | Family size: ${r.family_size}`;
            }
            items.push(item);
        }
        return items;
    }
}

// ==================== SKILL REGISTRY TREE ====================
class SkillRegistryProvider {
    constructor(root) { this.root = root; this._onDidChange = new vscode.EventEmitter(); this.onDidChangeTreeData = this._onDidChange.event; }
    refresh() { this._onDidChange.fire(); }

    getTreeItem(el) { return el; }
    getChildren(element) {
        const indexFile = path.join(this.root, '.evolution/skills/INDEX.json');

        if (!element) {
            // Root level: status groups
            if (!fs.existsSync(indexFile)) return [new vscode.TreeItem('No skills. Run: NVE: Extract Skills')];
            const index = readJsonSafe(indexFile, {});
            const skills = index.skills || [];
            if (skills.length === 0) return [new vscode.TreeItem('No skills. Run: NVE: Extract Skills')];

            const byStatus = index.by_status || {};
            const groups = [];
            const statusOrder = ['admitted', 'candidate', 'quarantined', 'rejected'];
            for (const status of statusOrder) {
                const count = byStatus[status] || 0;
                if (count === 0) continue;
                const item = new vscode.TreeItem(
                    `${statusEmoji(status)} ${status} (${count})`,
                    vscode.TreeItemCollapsibleState.Expanded
                );
                item.iconPath = new vscode.ThemeIcon(statusIcon(status));
                item._status = status;
                item._skills = skills.filter(s => s.status === status);
                groups.push(item);
            }

            // Summary line
            const total = new vscode.TreeItem(`Total: ${skills.length} skills`);
            total.iconPath = new vscode.ThemeIcon('list-tree');
            total.description = `${byStatus.admitted || 0} admitted`;
            groups.unshift(total);

            return groups;
        }

        // Child level: skills in a status group
        if (element._skills) {
            return element._skills.map(skill => {
                const item = new vscode.TreeItem(skill.skill_id);
                item.description = skill.title || '';
                item.iconPath = new vscode.ThemeIcon(statusIcon(skill.status));
                item.tooltip = [
                    `Category: ${skill.category || '?'}`,
                    `Tags: ${(skill.tags || []).join(', ')}`,
                    `Score: ${skill.overall || '?'}`,
                    `Source: ${skill.source_type || '?'}`,
                ].join('\n');

                // Click to open skill JSON
                const skillFile = path.join(this.root, `.evolution/skills/${skill.skill_id}.json`);
                if (fs.existsSync(skillFile)) {
                    item.command = { command: 'vscode.open', arguments: [vscode.Uri.file(skillFile)] };
                }
                return item;
            });
        }
        return [];
    }
}

// ==================== SKILL PACKAGES TREE ====================
class SkillPackagesProvider {
    constructor(root) { this.root = root; this._onDidChange = new vscode.EventEmitter(); this.onDidChangeTreeData = this._onDidChange.event; }
    refresh() { this._onDidChange.fire(); }

    getTreeItem(el) { return el; }
    getChildren(element) {
        const indexFile = path.join(this.root, '.evolution/skill_packages/INDEX.json');

        if (!element) {
            // Root level: packages
            if (!fs.existsSync(indexFile)) return [new vscode.TreeItem('No packages. Run: NVE: Package Skills')];
            const index = readJsonSafe(indexFile, {});
            const packages = index.packages || [];
            if (packages.length === 0) return [new vscode.TreeItem('No packages. Run: NVE: Package Skills')];

            // Relations summary
            const relFile = path.join(this.root, '.evolution/skill_relations/RELATIONS.json');
            const relData = readJsonSafe(relFile, {});
            const relCount = (relData.relations || []).length;

            const summary = new vscode.TreeItem(`${packages.length} packages, ${relCount} relations`);
            summary.iconPath = new vscode.ThemeIcon('package');

            const items = [summary];
            for (const pkg of packages) {
                const item = new vscode.TreeItem(
                    pkg.package_id,
                    vscode.TreeItemCollapsibleState.Collapsed
                );
                item.description = `${pkg.title || ''} (${pkg.skill_count || 0} skills)`;
                item.iconPath = new vscode.ThemeIcon('archive');
                item.tooltip = [
                    `Category: ${pkg.category || '?'}`,
                    `Tags: ${(pkg.tags || []).join(', ')}`,
                    `Skills: ${(pkg.skill_ids || []).join(', ')}`,
                    pkg.published_agent_skill_path ? `Published: ${pkg.published_agent_skill_path}` : 'Not published',
                ].join('\n');
                item._pkg = pkg;
                items.push(item);
            }
            return items;
        }

        // Child level: skills in a package
        if (element._pkg && element._pkg.skill_ids) {
            return element._pkg.skill_ids.map(skillId => {
                const skillFile = path.join(this.root, `.evolution/skills/${skillId}.json`);
                const skill = readJsonSafe(skillFile, null);
                const item = new vscode.TreeItem(skillId);
                item.description = skill ? (skill.title || '') : 'missing';
                item.iconPath = new vscode.ThemeIcon(skill ? statusIcon(skill.status) : 'error');
                if (skill && fs.existsSync(skillFile)) {
                    item.command = { command: 'vscode.open', arguments: [vscode.Uri.file(skillFile)] };
                }
                return item;
            });
        }

        return [];
    }
}

// ==================== QUICK ACTIONS TREE ====================
class QuickActionsProvider {
    getTreeItem(el) { return el; }
    getChildren() {
        const actions = [
            { label: '🧬 Run Audit', cmd: 'nve.runAudit' },
            { label: '⚗️ Distill Genomes', cmd: 'nve.runDistill' },
            { label: '🔄 Replay Gate', cmd: 'nve.runReplay' },
            { label: '📦 Export Pack', cmd: 'nve.runPack' },
            { label: '─── SkillGraph ───', cmd: null },
            { label: '🧩 Extract Skills', cmd: 'nve.runSkillExtract' },
            { label: '📊 Index Skills', cmd: 'nve.runSkillIndex' },
            { label: '📦 Package Skills', cmd: 'nve.runSkillPackage' },
            { label: '🔍 Search Skills', cmd: 'nve.runSkillSearch' },
            { label: '─── Bridge ───', cmd: null },
            { label: '🌐 Start Server', cmd: 'nve.startServer' },
            { label: '📡 Bridge Status', cmd: 'nve.bridgeStatus' },
            { label: '🩺 Run Doctor', cmd: 'nve.runDoctor' },
            { label: '✔️ Self-Check', cmd: 'nve.runSelfCheck' },
            { label: '📋 Generate Report', cmd: 'nve.runReport' },
            { label: '─────────────────', cmd: null },
            { label: '🔃 Refresh All', cmd: 'nve.refreshAll' },
        ];
        return actions.map(a => {
            const item = new vscode.TreeItem(a.label);
            if (a.cmd) {
                item.command = { command: a.cmd, title: a.label };
            }
            return item;
        });
    }
}

// ==================== BRIDGE STATUS TREE ====================
class BridgeStatusProvider {
    constructor() { this._onDidChange = new vscode.EventEmitter(); this.onDidChangeTreeData = this._onDidChange.event; }
    refresh() { this._onDidChange.fire(); }

    getTreeItem(el) { return el; }
    async getChildren() {
        try {
            const status = await httpGetJson('http://localhost:8099/status');
            const items = [];
            const header = new vscode.TreeItem('nve-serve connected');
            header.iconPath = new vscode.ThemeIcon('pass');
            items.push(header);

            for (const [label, value, icon] of [
                ['Project', status.project, 'folder'],
                ['Profile', status.profile, 'account'],
                ['Provider', status.provider, 'cloud'],
                ['Model', status.model, 'symbol-misc'],
            ]) {
                const item = new vscode.TreeItem(`${label}: ${value || 'unknown'}`);
                item.iconPath = new vscode.ThemeIcon(icon);
                items.push(item);
            }
            return items;
        } catch {
            const item = new vscode.TreeItem('Server not running');
            item.iconPath = new vscode.ThemeIcon('error');
            item.description = 'Start with: NVE: Start Server';
            return [item];
        }
    }
}

// ==================== MEMORY TREE ====================
class MemoryTreeProvider {
    constructor() { this._onDidChange = new vscode.EventEmitter(); this.onDidChangeTreeData = this._onDidChange.event; }
    refresh() { this._onDidChange.fire(); }

    getTreeItem(el) { return el; }
    async getChildren(element) {
        if (element && element._rules) {
            return element._rules.map(rule => {
                const text = typeof rule === 'string' ? rule : (rule.content || rule.rule || JSON.stringify(rule));
                const item = new vscode.TreeItem(text);
                item.iconPath = new vscode.ThemeIcon('symbol-string');
                return item;
            });
        }

        try {
            const data = await httpGetJson('http://localhost:8099/memory');
            const layers = data.layers || data;
            const items = [];

            const entries = Array.isArray(layers) ? layers.map(l => [l.name || l.layer || 'unnamed', l]) : Object.entries(layers);
            const header = new vscode.TreeItem(`${entries.length} memory layers`);
            header.iconPath = new vscode.ThemeIcon('database');
            items.push(header);

            for (const [name, layer] of entries) {
                const rules = Array.isArray(layer) ? layer : (layer.rules || []);
                const item = new vscode.TreeItem(
                    `${name} (${rules.length} rules)`,
                    rules.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
                );
                item.iconPath = new vscode.ThemeIcon('layers');
                item.description = layer.source || '';
                item._rules = rules;
                items.push(item);
            }
            return items;
        } catch {
            const item = new vscode.TreeItem('Server not running');
            item.iconPath = new vscode.ThemeIcon('error');
            item.description = 'Start with: NVE: Start Server';
            return [item];
        }
    }
}

function deactivate() {}
module.exports = { activate, deactivate };
