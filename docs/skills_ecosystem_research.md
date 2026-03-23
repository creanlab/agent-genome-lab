# 🔬 Skills Ecosystem Research — Agent Genome Lab Integration Opportunities

> **Date**: 2026-03-23
> **Sources**: skills.sh, vercel-labs/skills, skillsbd.ru, cc-1c-skills
> **Goal**: Найти что полезно забрать, как апгрейднуть наш сервис, предложить готовые таски

---

## 1. Обзор исследованных сервисов

### 1.1 skills.sh + vercel-labs/skills

**Что это:** Глобальная открытая экосистема навыков для AI-агентов. CLI (`npx skills add owner/repo`) устанавливает SKILL.md файлы в проект.

**Ключевые факты:**
- **89,777+ установок** за всё время, **190+ навыков** в лидерборде
- **40+ поддерживаемых агентов**: Claude Code, Cursor, Antigravity, Copilot, Codex, Windsurf, Roo, Goose, Continue, Kilo и др.
- **Формат навыка**: директория с `SKILL.md` (YAML frontmatter: name, description + markdown инструкции)
- **CLI команды**: `add`, `list`, `find`, `check`, `update`, `init`, `remove`
- **Leaderboard**: All Time, Trending (24h), Hot — с подсчётом установок
- **Крупные contributors**: Vercel, Microsoft, Anthropic, Supabase, Remotion
- **Discovery**: ищет SKILL.md в `.agents/skills/`, `skills/`, `.claude/skills/` и ещё 30+ путях

**Что ценного:**
- Стандартизированный формат SKILL.md уже стал де-факто стандартом
- npx CLI для установки — zero friction
- Leaderboard как discovery mechanism
- Поддержка 40+ агентов включая наш Antigravity

### 1.2 skillsbd.ru (Российский каталог)

**Что это:** Русскоязычный каталог навыков, фокус на Яндекс, Битрикс, 1С.

**Ключевые факты:**
- CLI: `npx skillsbd add owner/repo`
- **Открытый REST API** без авторизации:
  - `GET /api/skills` — список, поиск (`?q=`), сортировка (`?sort=trending`)
  - `GET /api/skills/readme?skillId=` — содержимое SKILL.md
  - `GET /api/skills/audit?skillId=` — **аудит безопасности** (repo, license, security checks)
  - `POST /api/skills/install` — трекинг установок
- Категории, теги, авторы, метрики установок
- Модерация при добавлении навыка
- Telegram-комьюнити

**Что ценного:**
- **Security Audit API** — идея проверки навыка перед установкой
- REST API для интеграции с внешними инструментами
- Модерация как admission gate (похоже на наш!)
- Локализация и community building

### 1.3 cc-1c-skills (Nikolay-Shirokov)

**Что это:** 65+ навыков для разработки на 1С:Предприятие 8.3 через Claude Code.

**Ключевые факты:**
- **65 навыков** в `.claude/skills/` — полный цикл разработки
- Группировка по доменам: epf, erf, mxl, form, role, skd, meta, cf, cfe, subsystem, db, web
- Каждый навык = SKILL.md + bash/powershell скрипты
- **17 спецификаций** XML-форматов (1c-epf-spec.md и др.)
- **DSL-компиляторы**: JSON → XML для форм, макетов, ролей, СКД
- Slash-команды: `/epf-init`, `/web-test`, `/mxl-compile`

**Что ценного:**
- **Группировка навыков по домену** — аналог наших skill packages
- **Спецификации как отдельные документы** — deep reference для навыков
- **DSL-подход**: высокоуровневый JSON → низкоуровневый XML
- **Slash-команды** как UX для навыков

---

## 2. Сравнительный анализ: они vs мы

| Аспект | skills.sh / skillsbd | Agent Genome Lab |
|--------|---------------------|-----------------|
| **Что такое "skill"** | Статичный SKILL.md с инструкциями | JSON-объект с метаданными, оценками, статусами |
| **Откуда берутся** | Написаны вручную, публикуются в GitHub | **Извлекаются из опыта** (incidents → genomes → skills) |
| **Верификация** | skillsbd: модерация + security audit | **Replay Gate + Admission Gate + Utility Decay** |
| **Lifecycle** | Статичный (update вручную) | **Динамический** (utility score растёт/падает) |
| **Discovery** | Leaderboard, поиск по тегам | `nve-skill-search` (metadata-first, Jaccard) |
| **Packaging** | Отдельные SKILL.md файлы | **Skill Packages** с INDEX.json и relations |
| **Cross-project** | `npx skills add` копирует файл | `nve-pack distilled` с 4-уровневой редакцией |
| **Installation** | npx add → копирует SKILL.md | Нет npx installer (пока) |
| **Web UI** | skills.sh leaderboard, skillsbd.ru каталог | Gamified dashboard (XP, levels) |
| **API** | skillsbd: REST API | Нет публичного API (пока) |

### 🔑 Ключевой вывод

**Наше уникальное преимущество**: навыки **рождаются из опыта** и **проходят верификацию**. У skills.sh навыки — это ручные инструкции. У нас — проверенные паттерны, извлечённые из реальных инцидентов. Это как разница между народной медициной (кто-то написал рецепт) и доказательной медициной (прошло клинические испытания).

**Наш gap**: нет экосистемы публикации и discovery. Навыки живут внутри проекта, но нет механизма для их публикации во внешний каталог и установки из него.

---

## 3. Что можно забрать и адаптировать

### 3.1 От skills.sh — экосистема публикации

| Фича | Как адаптировать |
|------|-----------------|
| `npx skills add` installer | CLI команда `nve-skill-import` — импорт SKILL.md из GitHub repos |
| Leaderboard | Секция «Popular Skills» в web dashboard с utility scores |
| SKILL.md формат | Уже совместимы! Наш `nve-skill-package --publish` генерирует SKILL.md |
| Multi-agent support | Наш nve-pack уже создаёт файлы для Copilot, Claude, Cursor |
| `skills find` interactive search | Улучшить `nve-skill-search` добавив fuzzy search и категории |

### 3.2 От skillsbd.ru — API и аудит

| Фича | Как адаптировать |
|------|-----------------|
| REST API для навыков | `nve-serve` — локальный API сервер для интеграций |
| Security Audit | Расширить `nve-audit` секцией security checks для imported skills |
| Install tracking | Добавить `usage_count` в skill metadata для utility calculation |
| Tags + Categories | Уже есть в нашей scheme, но не используется в search UI |

### 3.3 От cc-1c-skills — организация и UX

| Фича | Как адаптировать |
|------|-----------------|
| Группировка навыков по домену | Улучшить `nve-skill-package` с автогруппировкой по category |
| Спецификации как отдельные docs | Добавить `spec.md` ссылку в skill metadata |
| Slash-команды | VS Code: slash commands для quick skill execution |
| DSL-подход | Domain-specific templates для разных use cases |

---

## 4. Предложения по апгрейду — 3 направления

### 🅰️ Направление: Skills Marketplace (Web UI)

Добавить в web dashboard (`web/index.html`) полноценный каталог навыков:

**Что показывать:**
- Все admitted skills с карточками (имя, категория, utility score, связи)
- Skill packages с их составом
- Relations graph (визуально, как dependency tree)
- Trending skills (по utility growth за 30 дней)
- Import/export controls

**Что забрать от конкурентов:**
- Leaderboard формат от skills.sh (ранжирование по utility)
- Карточки с тегами от skillsbd.ru
- Группировку по доменам от cc-1c-skills

### 🅱️ Направление: Interop с skills.sh экосистемой

Сделать Agent Genome Lab **producer** навыков для глобальной экосистемы:

1. `nve-skill-export --format=skillsmd` — конвертирует admitted skill → стандартный SKILL.md
2. `nve-skill-import owner/repo` — импортирует SKILL.md из GitHub → candidate skill в нашей системе
3. Импортированные навыки проходят наш Admission Gate → получают utility score
4. Это даёт нам уникальное предложение: "Install any skill from skills.sh, but with verification"

### 🅲 Направление: REST API + Integrations

Добавить HTTP API для интеграции с внешними инструментами:

1. `nve-serve` — запускает локальный API сервер
2. Endpoints: `/skills`, `/genomes`, `/audit`, `/memory`
3. Позволяет интегрировать с Jira, Slack, GitHub Actions
4. Фундамент для будущей облачной версии

---

## 5. Готовые таски для бэклога

### Приоритет HIGH — Quick Wins

| # | Task | Effort | Impact | Description |
|---|------|--------|--------|-------------|
| K.1 | **Web SkillGraph tab** | M | HIGH | Добавить в `web/index.html` новую вкладку «Skills» с карточками admitted навыков, utility score, категории, теги. Визуализация relations graph (canvas/SVG). Группировка по packages. |
| K.2 | **nve-skill-export --format=skillsmd** | S | HIGH | CLI утилита: конвертирует admitted skill из нашего JSON → стандартный SKILL.md (совместимый с skills.sh/skillsbd). Генерирует YAML frontmatter (name, description, tags). Публикует в `.agents/skills/`. |
| K.3 | **Enhanced nve-skill-search** | S | MEDIUM | Добавить fuzzy search, фильтры по category/tags, ранжирование по utility score. Interactive mode с fzf-стилем (как `npx skills find`). |
| K.4 | **Skill cards в nve-audit** | S | MEDIUM | В output аудита добавить секцию Top Skills: top-5 навыков по utility с мини-карточками (имя, score, category, links count). |

### Приоритет MEDIUM — Ecosystem

| # | Task | Effort | Impact | Description |
|---|------|--------|--------|-------------|
| K.5 | **nve-skill-import** | M | HIGH | CLI: `nve-skill-import owner/repo` — импортирует SKILL.md из GitHub repo → создаёт candidate skill JSON → проходит Admission Gate. Поддержка форматов skills.sh и skillsbd.ru. |
| K.6 | **Security Audit для imported skills** | S | MEDIUM | Расширить `nve-audit` проверкой imported навыков: наличие shell commands, external URLs, API keys в SKILL.md. Вдохновлено skillsbd.ru `/api/skills/audit`. |
| K.7 | **Domain templates pack** | M | MEDIUM | 5 готовых starter-пакетов: `devops`, `support`, `security`, `research`, `compliance`. Каждый содержит 3-5 шаблонных навыков + incident templates для домена. Вдохновлено группировкой cc-1c-skills. |
| K.8 | **Usage tracking в skills** | S | LOW | Добавить `usage_count`, `last_used_at` в skill JSON schema. CLI автоматически инкрементирует при match в `nve-skill-search`. Влияет на utility decay calculation. |

### Приоритет LOW — Future Platform

| # | Task | Effort | Impact | Description |
|---|------|--------|--------|-------------|
| K.9 | **nve-serve (local API)** | L | MEDIUM | Локальный HTTP сервер: `node cli/nve-serve.js --port 8042`. Endpoints: `GET /skills`, `GET /genomes`, `GET /audit`, `GET /memory`. JSON responses совместимые с skillsbd.ru API format. |
| K.10 | **Skills Leaderboard page** | M | LOW | Standalone HTML страница с leaderboard навыков (All Time по utility, Trending по growth rate). Вдохновлено skills.sh. Работает offline. |
| K.11 | **Publish to skills.sh** | M | LOW | CLI: `nve-skill-publish` — пушит admitted skill package как GitHub repo, совместимый с `npx skills add`. Auto-generates SKILL.md, README, LICENSE. |
| K.12 | **Webhook integrations** | L | LOW | nve-serve endpoints для incoming webhooks: GitHub Issues → incident, Jira ticket → incident, Slack message → EU. Ingestion connectors. |

---

## 6. Стратегическое позиционирование

### Почему это выгодно

```
skills.sh:      Навыки написаны вручную → нет верификации
skillsbd.ru:    Модерация при публикации → одноразовая проверка
Agent Genome Lab: Навыки рождаются из опыта → непрерывная верификация + decay
```

**Наш pitch для экосистемы:**

> "Skills from skills.sh are recipes written by someone. Skills from Agent Genome Lab are **clinically tested patterns** extracted from real incidents, verified by replay-gate, and ranked by utility decay. Install any external skill — we'll verify it for you."

### Конкурентная матрица

| Feature | skills.sh | skillsbd | cc-1c-skills | **Genome Lab** |
|---------|-----------|----------|-------------|----------------|
| Skill creation | Manual | Manual | Manual | **Auto-extracted from experience** |
| Verification | None | Moderation | None | **Replay + Admission Gates** |
| Lifecycle | Static | Static | Static | **Dynamic (utility decay)** |
| Cross-project | Copy files | Copy files | Copy files | **Redacted packs** |
| Discovery | Leaderboard | API + search | README | **Metadata-first search** |
| Security | None | Basic audit | None | **4-level redaction** |
| Domain focus | Coding | RU services | 1C:Enterprise | **Any operational domain** |

---

## 7. Рекомендуемый порядок реализации

```
Phase 1 (Quick):  K.2 → K.3 → K.4          # Export + Search + Audit cards
Phase 2 (Web):    K.1                        # SkillGraph tab in dashboard
Phase 3 (Import): K.5 → K.6 → K.8           # Import + Security + Tracking
Phase 4 (Domain): K.7                        # Domain templates
Phase 5 (API):    K.9 → K.10 → K.11 → K.12  # API + Leaderboard + Publish
```

**Estimated total effort:** ~4-6 sprints (2-week each)

---

## 8. Appendix: Полезные ссылки

- skills.sh → https://skills.sh/
- vercel-labs/skills (CLI repo) → https://github.com/vercel-labs/skills
- skillsbd.ru (RU каталог) → https://skillsbd.ru/
- skillsbd API docs → https://skillsbd.ru/docs/api
- cc-1c-skills (пример domain pack) → https://github.com/Nikolay-Shirokov/cc-1c-skills
- SKILL.md format spec → раздел "Creating Skills" в vercel-labs/skills README
