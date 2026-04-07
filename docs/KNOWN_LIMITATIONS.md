# Known Limitations

> Honest list of what doesn't work yet or has constraints.

## Search & Retrieval
- **No embedding-based semantic search** — genome retrieval uses Jaccard token similarity only. Good enough for exact matches, misses semantic relationships. Track M.7 tracks upgrade to embeddings.

## Subagents
- **No real subagent spawning** — the registry defines subagent configs (tools, prompts, isolation) but doesn't actually spawn separate processes or model calls. It's a definition layer for future runtime integration. `nve-subagent invoke` is dry-run only.
- **No context isolation enforcement** — subagent tool restrictions are declared but not enforced at runtime.

## Sync & Multi-User
- **No cloud sync** — all data is local to `.evolution/`. Cross-machine sharing requires manual file transfer or git.
- **No multi-user conflict resolution** — if two users modify the same genome file, last write wins. No merge strategy.

## Server
- **No streaming in nve-serve** — SSE pushes events but API responses are full JSON (no chunked streaming).
- **Local-only operation** — nve-serve binds to localhost by default. No auth, no TLS. Not designed for remote access.

## Worktree
- **Requires git** — `nve-worktree` uses `git worktree` commands. Projects not under git cannot use isolation features. No fallback to temp directories.

## Memory
- **No binary file handling** — memory tree only processes `.md` text files. Binary files in `.evolution/` are ignored.
- **No automatic garbage collection** — old genomes, incidents, and reports accumulate indefinitely. Manual cleanup with `nve-worktree cleanup` for worktrees only.
- **Memory bundle size unbounded** — large projects with many genomes can produce very large memory bundles. Capped at 10 rules + 6 anti-patterns in rendered output, but full bundle JSON has no limit.

## Security
- **Hook timeout is fail-open** — if a safety hook exceeds 3s timeout, the action proceeds (not blocked). This prioritizes reliability over strictness. Tradeoff: a slow hook cannot be relied on as a hard security gate.
- **No signature verification** — imported skill packages are not cryptographically verified. Trust the source.

## Provider
- **No Gemini tools support flagged** — Google Gemini is listed as supporting tools but behavior may vary by model version. Test with `nve-doctor` before relying on it.
- **Placeholder detection is pattern-based** — only detects common patterns like `your-key-here`, `changeme`, `sk-...`. Custom placeholder patterns may pass through.

## Dashboard
- **VS Code extension** — exists but bridge integration (J.10) is not yet wired up. Extension panels work standalone but don't subscribe to nve-serve SSE.
