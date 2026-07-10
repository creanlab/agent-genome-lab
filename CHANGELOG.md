# Changelog

All notable changes to Agent Genome Lab are documented here.

## [3.1.0] — 2026-07-10

### Added
- **Memory Palace** — hierarchical memory navigation, compression, and retrieval (`nve-palace`, `nve-drawers`, `nve-memory-tree`)
- **Knowledge Graph** (`nve-knowledge-graph`) and entity detection (`nve-entity-detect`)
- **AAAK compression** (`nve-aaak`) — abbreviated agent-to-agent knowledge encoding
- **MCP server** (`nve-mcp`) — Model Context Protocol access to memory, genomes, and skills
- **Agent diary** (`nve-diary`) and benchmark harness (`nve-benchmark`)
- Research preprint in-repo: `docs/papers/failure-genomes-self-evolving-agents-2026.pdf`
- CI now runs the full test suite (226 tests / 22 suites) on every push
- `npm test` / `npm run audit` scripts; `homepage`, `bugs`, canonical `repository` URL in package.json

### Changed
- README: added Research section linking the methodology preprint
- `.gitignore` hardened (`.env.*`, `*.pem`, `*.key`, `*.p12`)
- Scope rules rewritten to be project-agnostic (no external paths or shared-credential notes)

### Security
- Historical note: an API key that briefly appeared in the `web/` bundle was removed in `1cdc435`. The current tree contains no credentials; the dashboard calls a server-side proxy.

## [2.4.0] — 2026-04

### Added
- `nve-plan` (LLM planner) and `nve-analytics` (session tracking & prevention attribution)
- Phase N harness integration: `nve-handoff`, `nve-contract`, `nve-auto-capture`

## [2.3.0] — 2026-03

### Added
- SkillGraph layer: `nve-skill-extract/index/package/search/export/import`
- VS Code extension v0.2.0 with SkillGraph panels
- Domain templates pack (15 skills across 5 domains)
- GitHub Actions 5-axis audit workflow

## [2.2.0] — 2026-03

- Initial open-source release: failure genomes, error-driven skill distillation, replay-gated promotion, `.evolution/` memory layer, core CLI pipeline
