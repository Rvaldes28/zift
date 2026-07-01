# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

ZiftLab: the official site/platform for a digital agency. `docs/FASES.MD` is the authoritative master spec/roadmap (FASE 0–16); `docs/1.md` documents the agency's stack choices for other project types. Current state: **FASE 0 (local setup) complete** — next up is FASE 1 (Payload CMS core: S3/MinIO media storage, roles, CORS).

## Commands

All commands run from the repo root:

- `pnpm dev:cms` — Payload CMS dev server → http://localhost:3000/admin
- `pnpm dev:web` — Astro dev server → http://localhost:4321
- `pnpm lint` / `pnpm typecheck` / `pnpm format:check` — quality gate; all three must pass before a phase is considered done, plus `pnpm build` where applicable
- `pnpm format` — apply Prettier
- `pnpm build` — production build of both apps (`build:cms` / `build:web` for one)
- cms-only (run inside `cms/`): `pnpm generate:types`, `pnpm generate:importmap`, `pnpm payload` (Payload CLI)

There is no test suite yet (testing is FASE 15).

Local services (Homebrew, not Docker): PostgreSQL 16 must be running (`brew services start postgresql@16`, DB `ziftlab_dev`) for the cms to boot; MinIO starts with `./infra/scripts/start-minio.sh` (not needed until FASE 1). Ports: cms `3000`, web `4321`, Postgres `5432`, MinIO `9000`/console `9001`.

## Architecture

pnpm-workspaces monorepo:

- `cms/` — Payload CMS v3 on Next.js 16 (Turbopack), Postgres via `@payloadcms/db-postgres`. Admin + content API only — it must never render the public site. Config lives in `cms/src/payload.config.ts`; collections in `cms/src/collections/`. Env vars (in `cms/.env`, never committed): `DATABASE_URL`, `PAYLOAD_SECRET` — note the template uses `DATABASE_URL`, not `DATABASE_URI` as written in docs/FASES.MD §11.
- `web/` — Astro 5 + Tailwind CSS 4 (via `@tailwindcss/vite` plugin in `astro.config.mjs`; global CSS is `web/src/styles/global.css` with `@import 'tailwindcss'`). Renders the public site; will consume the Payload REST API starting FASE 3.
- `infra/` — local scripts and backups. `docs/` — spec and roadmap.

## Monorepo gotchas (learned during FASE 0)

- `cms/next.config.ts` sets `turbopack.root` to the **repo root** (`path.resolve(dirname, '..')`), not the app dir — pnpm symlinks resolve into the root `node_modules/.pnpm`, and Turbopack refuses files outside its root. Don't revert this to the Payload template default.
- `eslint-config-next` 16 is flat-config native: `cms/eslint.config.mjs` imports `eslint-config-next/core-web-vitals` and `/typescript` directly. Do not reintroduce the `FlatCompat`/`@eslint/eslintrc` pattern from the Payload template.
- Dependency build scripts are approved in `pnpm-workspace.yaml` under `allowBuilds` (pnpm 11 syntax). If a new dep needs a postinstall, add it there.
- `cms/tsconfig.json` deliberately has **no `baseUrl`** (deprecated in TS 6+; IDEs flag it). The `paths` entries are relative to the tsconfig location and work without it — don't re-add it from Payload template configs.
- Generated files are excluded from Prettier via `.prettierignore` (`importMap.js`, `payload-types.ts`, `next-env.d.ts`) and `docs/` is deliberately not formatted. ESLint ignores `payload-types.ts` too — regenerate it with `pnpm generate:types` after changing collections rather than editing it.

## Working conventions from docs/FASES.MD

- **One phase at a time.** Do not start a later phase until the current one is verified; don't mix phases in one change. **Structure before polish.**
- Every shell command shown to the user must state its directory (`# desde /`, `# desde /cms`, …).
- Don't invent libraries or APIs (e.g. email must be Resend, Brevo, or Amazon SES). No MongoDB. No hardcoded secrets — only `.env` (repo carries `.env.example` only).
- When implementing a phase, follow the 16-section response format defined in `docs/FASES.MD` §7 (análisis → objetivos → … → commit recomendado → checklist).

## Licensing constraint

Proprietary `ZiftLab Pro License` (see `LICENSE`): internal modification and non-competing integration allowed; no resale, sublicensing, hosted/multi-tenant SaaS, or competing-platform use without written permission. Keep this in mind if asked to package, redistribute, or productize parts of this codebase.
