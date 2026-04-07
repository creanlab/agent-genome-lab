# Bridge Protocol — Runtime ↔ Genome

> nve-serve HTTP API + nve-bridge CLI for connecting fast loop to slow loop.

## Endpoints (nve-serve)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Project name, active profile, provider, model |
| GET | `/profile` | Full provider config + resolved provider |
| GET | `/doctor` | Runtime health checks |
| GET | `/memory` | Compiled memory tree bundle |
| GET | `/genomes` | All genomes list with count |
| GET | `/genomes/retrieve?q=<query>&top=5` | Retrieve relevant genomes by query |
| GET | `/hooks` | Registered hooks by event type |
| GET | `/subagents` | Registered subagent configs |
| GET | `/compact` | Latest compact artifacts list |
| POST | `/events/emit` | Emit event through bus `{type, payload}` |
| POST | `/bridge/capture` | Capture incident `{title, summary, stage, failure_class}` |
| GET | `/sse` | Server-Sent Events stream |

## SSE Events

Connect to `/sse` for real-time push updates:

```
event: connected
data: {"message":"Connected to nve-serve SSE"}

event: PreToolUse
data: {"tool":"Bash","command":"npm test"}

event: hook_result
data: {"outcome":"allow","hook":"block-dangerous-commands"}
```

## Genome → Runtime (Injection)

Flow: `nve-bridge inject --task "fix login bug"`

1. Compile memory tree (5 layers)
2. Load promoted genomes from `.evolution/failure_genomes/`
3. Score genomes against task using Jaccard similarity: `score = jaccard * 0.7 + utility * 0.3`
4. Take top-K (default 5) genomes
5. Load top skills from `.agents/skills/`
6. Render injection block:

```
[GENOME CONTEXT INJECTION]

# Memory Context (compiled)
## Key Rules
- ...

## Relevant Genomes
- [FG-000001] AVOID: missing error handling → FIX: add try-catch (relevance: 73%)

## Available Skills
- error-handling: Error Handling Patterns
```

## Runtime → Genome (Capture)

Flow: `nve-bridge capture --file trace.json`

Creates incident in `.evolution/incidents/`:
```json
{
  "event_id": "INC-ABC123",
  "status": "observed",
  "stage": "runtime",
  "failure_class": "runtime_error",
  "safe_title": "Auto-captured incident",
  "bridge_metadata": { "source": "runtime_bridge", "task_id": "..." }
}
```

## CORS Policy

All endpoints return:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Example curl Commands

```bash
# Start server
nve-serve --port 8099

# Health check
curl http://localhost:8099/status

# Get memory tree
curl http://localhost:8099/memory

# Retrieve genomes
curl "http://localhost:8099/genomes/retrieve?q=database+timeout&top=3"

# Emit event
curl -X POST http://localhost:8099/events/emit \
  -H "Content-Type: application/json" \
  -d '{"type":"PreToolUse","payload":{"tool":"Bash","command":"npm test"}}'

# Capture incident
curl -X POST http://localhost:8099/bridge/capture \
  -H "Content-Type: application/json" \
  -d '{"title":"Test failure","summary":"npm test exit 1","stage":"testing"}'

# SSE stream
curl -N http://localhost:8099/sse
```
