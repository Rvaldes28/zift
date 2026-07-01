# FASE 2 — Modelado de contenido: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 12 colecciones y 4 globals en Payload con access control, drafts, SEO y slugs; los 14 servicios mínimos sembrados; todo el contenido comercial editable desde `/admin`.

**Architecture:** Se extiende FASE 1: 10 colecciones nuevas en `cms/src/collections/` y 4 globals en `cms/src/globals/`, registrados en `payload.config.ts`; helpers compartidos en `cms/src/access/` (`publishedOnly`) y `cms/src/fields/` (slug autogenerado, subcampos de link); SEO por `@payloadcms/plugin-seo`; seed idempotente vía `payload run`.

**Tech Stack:** Payload 3.85.2 + `@payloadcms/plugin-seo@3.85.2` (pin exacto), `@payloadcms/db-postgres` (push en dev, sin migraciones), lexical, PostgreSQL 16 (Homebrew), pnpm workspaces.

## Global Constraints

- Paquetes `@payloadcms/*` pineados exactos a `3.85.2` (sin `^`).
- Sin suite de tests (FASE 15): verificación = typecheck + checks runtime (curl / admin).
- Todo comando indica su directorio (`# desde /`, `# desde /cms`).
- `cms/src/payload-types.ts` es generado — nunca editarlo a mano.
- Gate de fase: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build` desde la raíz.
- No tocar `web/` (FASE 3). No sembrar globals (FASE 16).
- Runtime local: PostgreSQL 16 (`brew services start postgresql@16`) y MinIO corriendo.

---

### Task 1: Dependencia `@payloadcms/plugin-seo`

**Files:** Modify: `cms/package.json`, `pnpm-lock.yaml`.

- [ ] `pnpm --filter cms add --save-exact @payloadcms/plugin-seo@3.85.2` (# desde /)
- [ ] Verificar pin exacto en `cms/package.json` y `pnpm typecheck` verde.
- [ ] Commit: `feat(cms): añade @payloadcms/plugin-seo 3.85.2`

### Task 2: Helpers compartidos — access `publishedOnly` y fields `slug`/`link`

**Files:** Modify: `cms/src/access/index.ts`. Create: `cms/src/fields/slug.ts`, `cms/src/fields/link.ts`.

- [ ] `publishedOnly: Access` — `user ? true : { _status: { equals: 'published' } }`.
- [ ] `slugField(source = 'title')` — text único e indexado, sidebar, hook `beforeValidate` que slugifica (minúsculas, sin acentos, guiones).
- [ ] `linkFields` — subcampos `label` (req), `href` (req), `newTab` (checkbox) para arrays/grupos de navegación.
- [ ] `pnpm typecheck` verde. Commit: `feat(cms): helpers de access publishedOnly y campos slug/link`

### Task 3: Colecciones de contenido (Services, Projects, Posts, Categories)

**Files:** Create: `cms/src/collections/{Services,Projects,Posts,Categories}.ts`.

- [ ] Según la tabla del diseño: drafts en las tres primeras, `publishedOnly` en read, slug, relaciones (`posts.author → team-members`, `posts.categories`, `projects.client/services`), grupo admin **Contenido**.
- [ ] Sin registrar aún en config (Task 6). Solo estructura + typecheck local del archivo.

### Task 4: Colecciones de empresa y operación (Clients, Testimonials, TeamMembers, FAQs, Leads, Redirects)

**Files:** Create: `cms/src/collections/{Clients,Testimonials,TeamMembers,FAQs,Leads,Redirects}.ts`.

- [ ] Según la tabla del diseño. Leads: `create: anyone`, `read/update: authenticated`, `delete: isAdmin`, grupo **CRM**. Redirects: `from` único, grupo **Configuración**.

### Task 5: Globals (SiteSettings, Header, Footer, HomePage)

**Files:** Create: `cms/src/globals/{SiteSettings,Header,Footer,HomePage}.ts`.

- [ ] Según la tabla del diseño; `home-page` con `versions: { drafts: true }`; todos `read: anyone`, `update: authenticated`.

### Task 6: Registro en `payload.config.ts` + tipos

**Files:** Modify: `cms/src/payload.config.ts`. Regenerated: `cms/src/payload-types.ts`.

- [ ] Registrar las 12 colecciones y 4 globals; `seoPlugin` con `collections: ['services','projects','posts']`, `globals: ['home-page']`, `uploadsCollection: 'media'`, `tabbedUI: true`, `generateTitle`/`generateDescription`.
- [ ] `pnpm generate:types` (# desde /cms) y `pnpm typecheck && pnpm lint` (# desde /).
- [ ] Commit de Tasks 3–6: `feat(cms): FASE 2 — colecciones y globals de contenido`

### Task 7: Seed idempotente de los 14 servicios

**Files:** Create: `cms/src/seed/index.ts`, `cms/src/seed/services.ts`, `cms/src/seed/lexical.ts`. Modify: `cms/package.json` (script `seed`).

- [ ] Datos reales en español para los 14 servicios (title, slug, excerpt, features, párrafos → lexical) con `_status: 'published'` y `order` según el orden de FASES.MD.
- [ ] Idempotencia por slug (`payload.find` antes de `create`). Script: `"seed": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/index.ts"`.
- [ ] Correr `pnpm seed` dos veces (# desde /cms): la primera crea 14, la segunda crea 0.
- [ ] Commit: `feat(cms): seed idempotente con los 14 servicios mínimos`

### Task 8: Verificación end-to-end y gate de fase

**Files:** Modify: `CLAUDE.md` (estado), `docs/roadmap.md` (FASE 2 ✅).

- [ ] Con `pnpm dev:cms` corriendo: `GET /api/services` anónimo → 14 docs publicados; `POST /api/leads` anónimo → 201; `GET /api/leads` anónimo → 403; `GET /api/globals/site-settings` y `/api/globals/home-page` → JSON.
- [ ] Gate completo: `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build` (# desde /).
- [ ] Actualizar CLAUDE.md (FASE 2 completa, próxima FASE 3) y roadmap.md.
- [ ] Commit final: `DEV A2.01 — FASE 2 Modelado de contenido verificada`

---

## Errores comunes (referencia rápida)

- Typecheck falla con colecciones nuevas → regenerar tipos (`pnpm generate:types` desde `/cms`).
- `ECONNREFUSED :5432` en seed/build → `brew services start postgresql@16`.
- Lexical inválido en seed → nodos `root/paragraph/text` canónicos con `version: 1`.
- `format:check` falla con archivos nuevos → `pnpm format` y re-verificar.
