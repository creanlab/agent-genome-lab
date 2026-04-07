# Worktree Isolation Runbook

## When to Use

Use worktree isolation for operations that:
- Delete files (`rm -rf`)
- Modify schemas or migrations
- Change `package.json` dependencies
- Touch `.env` files
- Run `git reset --hard` or `git push --force`

## Risky Patterns (auto-detected)

```
rm -rf, git reset --hard, git push --force,
npm uninstall, schema modification, migration,
.env modification, package.json changes
```

`nve-worktree is-risky <command>` checks if a command matches these patterns.

## Commands

```bash
# Create isolated worktree
nve-worktree create --name fix-auth

# List active worktrees
nve-worktree list

# See changes in worktree vs main
nve-worktree diff fix-auth

# Merge worktree changes back
nve-worktree merge fix-auth

# Clean up specific worktree
nve-worktree cleanup fix-auth

# Clean up all stale worktrees (>24h)
nve-worktree cleanup --all
```

## Workflow Example

```bash
# 1. Detect risky command
nve-worktree is-risky "rm -rf src/legacy/"
# → ⚠ RISKY: matches pattern "rm -rf"

# 2. Create isolated workspace
nve-worktree create --name remove-legacy
# → Created worktree at .evolution/worktrees/remove-legacy/

# 3. Do the risky work in the worktree
cd .evolution/worktrees/remove-legacy/
rm -rf src/legacy/
npm test

# 4. Review diff
nve-worktree diff remove-legacy

# 5. If happy, merge back
nve-worktree merge remove-legacy
# → Changes merged to main workspace

# 6. Cleanup
nve-worktree cleanup remove-legacy
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "not a git repository" | Worktree requires git. Initialize with `git init` |
| Orphaned worktree | Run `nve-worktree cleanup --all` |
| Merge conflicts | Resolve manually in worktree, then retry merge |
| Disk space | Worktrees are full copies. Clean up after use |

## Logs

All worktree operations logged to `.evolution/worktree_logs/`.
