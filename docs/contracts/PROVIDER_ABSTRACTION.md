# Provider Abstraction Layer

> Provider-agnostic runtime with capability matrix, profiles, and fallback chains.

## Providers (5)

| Provider | Display Name | Base URL | Auth | Key Capabilities |
|----------|-------------|----------|------|-----------------|
| `anthropic` | Anthropic Claude | api.anthropic.com | ANTHROPIC_API_KEY | streaming, tools, reasoning, 200k context |
| `google` | Google Gemini | generativelanguage.googleapis.com | GOOGLE_API_KEY | streaming, tools, json_mode, 1M context |
| `openai` | OpenAI | api.openai.com | OPENAI_API_KEY | streaming, tools, reasoning, json_mode |
| `ollama` | Ollama (local) | localhost:11434 | none | streaming, json_mode |
| `lmstudio` | LM Studio (local) | localhost:1234 | none | streaming, json_mode |

## Capability Matrix

| Capability | anthropic | google | openai | ollama | lmstudio |
|-----------|-----------|--------|--------|--------|----------|
| streaming | ✅ | ✅ | ✅ | ✅ | ✅ |
| tools | ✅ | ✅ | ✅ | ❌ | ❌ |
| reasoning | ✅ | ❌ | ✅ | ❌ | ❌ |
| json_mode | ✅ | ✅ | ✅ | ✅ | ✅ |
| images | ✅ | ✅ | ✅ | ❌ | ❌ |
| large_context | ✅ | ✅ | ❌ | ❌ | ❌ |
| computer_use | ✅ | ❌ | ❌ | ❌ | ❌ |

## Profiles (5)

| Profile | Primary | Fallback | Use Case |
|---------|---------|----------|----------|
| `competition-safe` | ollama | lmstudio | CTF/competitions — no external calls |
| `local-fast` | ollama | lmstudio → anthropic | Quick edits, autocomplete |
| `local-code` | ollama (codellama) | lmstudio → anthropic | Code generation |
| `research-web` | anthropic (opus) | google → openai | Complex reasoning, research |
| `offline-eval` | none | none | Replay gate only, no model calls |

## Fallback Chain Behavior

1. Try `primary_provider`
2. Check: API key exists and is not a placeholder
3. Check: required capabilities present
4. If fail → try next in `fallback_chain`
5. If all fail → return `{ available: false, missing_key: ... }`

## Example Config (`.evolution/provider.json`)

```json
{
  "active_profile": "research-web",
  "provider_overrides": {},
  "model_overrides": {
    "anthropic": { "powerful": "claude-opus-4-6" }
  },
  "custom_profiles": {}
}
```

## Adding a New Provider

Add to `PROVIDERS` object in `cli/nve-provider-config.js`:

```js
myProvider: {
  id: 'myProvider',
  display_name: 'My Provider',
  base_url: 'https://api.myprovider.com',
  env_key: 'MY_PROVIDER_KEY',
  models: { default: 'my-model', fast: 'my-model-mini', powerful: 'my-model-pro', code: 'my-model' },
  capabilities: { streaming: true, tools: false, reasoning: false, json_mode: true, images: false, large_context: false, computer_use: false },
}
```

## CLI Commands

```bash
nve-provider list          # Show all profiles with resolution status
nve-provider check         # Resolve active profile
nve-provider set <profile> # Switch active profile
nve-provider status        # One-line status for shell
nve-profile auto           # Auto-detect best profile
nve-profile recommend      # Environment-based recommendation
nve-doctor                 # Full health check including provider
```
