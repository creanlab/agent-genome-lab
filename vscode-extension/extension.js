const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

    // 4. Quick Actions
    const actionsProvider = new QuickActionsProvider();
    vscode.window.registerTreeDataProvider('nveQuickActions', actionsProvider);

    // ==================== COMMANDS ====================
    function runCLI(script, label) {
        const terminal = vscode.window.createTerminal('NVE');
        terminal.show();
        terminal.sendText(`node cli/${script}`);
        setTimeout(() => {
            auditProvider.refresh();
            genomesProvider.refresh();
            replayProvider.refresh();
        }, 3000);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('nve.runAudit', () => runCLI('nve-audit.js', 'Audit')),
        vscode.commands.registerCommand('nve.runDistill', () => runCLI('nve-distill.js', 'Distill')),
        vscode.commands.registerCommand('nve.runReplay', () => runCLI('nve-replay.js --dry-run --verbose', 'Replay')),
        vscode.commands.registerCommand('nve.runPack', () => runCLI('nve-pack.js distilled', 'Pack')),
        vscode.commands.registerCommand('nve.refreshAll', () => {
            auditProvider.refresh();
            genomesProvider.refresh();
            replayProvider.refresh();
        })
    );

    // Auto-refresh on file changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/.evolution/**/*.json');
    watcher.onDidChange(() => {
        auditProvider.refresh();
        genomesProvider.refresh();
        replayProvider.refresh();
    });
    context.subscriptions.push(watcher);
}

// ==================== AUDIT TREE ====================
class AuditTreeProvider {
    constructor(root) { this.root = root; this._onDidChange = new vscode.EventEmitter(); this.onDidChangeTreeData = this._onDidChange.event; }
    refresh() { this._onDidChange.fire(); }

    getTreeItem(el) { return el; }
    getChildren() {
        const auditDir = path.join(this.root, '.evolution/audits');
        const files = fs.readdirSync(auditDir).filter(f => f.startsWith('AUDIT-')).sort().reverse();
        if (files.length === 0) return [new vscode.TreeItem('No audit data. Run: NVE: Run 5-Axis Audit')];

        const latest = JSON.parse(fs.readFileSync(path.join(auditDir, files[0]), 'utf8'));
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
            const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
            return Object.entries(index.families || {}).map(([name, data]) => {
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

        const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
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

// ==================== QUICK ACTIONS TREE ====================
class QuickActionsProvider {
    getTreeItem(el) { return el; }
    getChildren() {
        const actions = [
            { label: '🧬 Run Audit', cmd: 'nve.runAudit' },
            { label: '⚗️ Distill Genomes', cmd: 'nve.runDistill' },
            { label: '🔄 Replay Gate', cmd: 'nve.runReplay' },
            { label: '📦 Export Pack', cmd: 'nve.runPack' },
            { label: '🔃 Refresh All', cmd: 'nve.refreshAll' },
        ];
        return actions.map(a => {
            const item = new vscode.TreeItem(a.label);
            item.command = { command: a.cmd, title: a.label };
            return item;
        });
    }
}

function deactivate() {}
module.exports = { activate, deactivate };
