# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm monorepo for ZiftLab. The public site lives in `web/` and uses Astro, Tailwind CSS, and TypeScript. The administrative dashboard lives in `admin/` and uses Next.js App Router with the shared PostgreSQL schema from `packages/db`. Shared public/admin types live in `packages/types`. Operational scripts are in `infra/scripts/`; phase and analytics docs are at the repo root.

Key source paths:

- `web/src/pages/`: Astro routes and generated endpoints.
- `web/src/components/`: reusable UI and section components.
- `web/src/lib/`: public API clients, analytics, leads, UTM, media, and rich text helpers.
- `admin/src/app/`: dashboard routes, API routes, layouts, and server actions.
- `admin/src/lib/`: server-only domain modules for auth, RBAC, content, media, SEO, leads, metrics, security, backups, settings, integrations, notifications, logs, and public API.
- `packages/db/src/schema.ts`: Drizzle schema for the dashboard-owned PostgreSQL database.

## Build, Test, and Development Commands

Run from the repo root.

- `pnpm install`: install workspace dependencies.
- `make install`: macOS setup for Homebrew formulas, env files, PostgreSQL, MinIO, dependencies, migrations, and seed data.
- `make start`: start PostgreSQL, MinIO, the admin on `:3000`, and Astro on `:4321`.
- `make admin`: prepare the admin DB, create/reset the local admin user, and start the dashboard.
- `make stop`: stop local services started by the Makefile.
- `pnpm dev:web` / `pnpm dev:admin`: run one workspace locally.
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed`: manage the own Drizzle schema.
- `pnpm db:import-legacy`: import a final legacy export JSON when `LEGACY_EXPORT_FILE` is set.
- `pnpm verify:no-payload`: fail if old CMS dependencies, imports, vars, scripts, or folder names return.
- `pnpm build`: build all workspaces.
- `pnpm lint`: run ESLint in all workspaces.
- `pnpm typecheck`: run Astro and TypeScript checks.
- `pnpm format:check` / `pnpm format`: check or apply Prettier formatting.

## Coding Style & Naming Conventions

Use TypeScript and ESM. Prettier is authoritative: no semicolons, single quotes, trailing commas, and `printWidth` 100. Astro files use the Prettier Astro plugin. Keep Astro components in PascalCase, route files lowercase or bracketed for dynamic routes, and admin/domain filenames descriptive and lowercase when they are route folders. Prefix intentionally unused values with `_`.

## Testing Guidelines

There is currently no dedicated test runner or `test` script. For every change, run `pnpm lint`, `pnpm typecheck`, and the relevant build (`pnpm build:web`, `pnpm build:admin`, or `pnpm build`). For database changes, run `pnpm db:generate`, inspect the generated SQL, and apply it with `pnpm db:migrate`. When adding tests, colocate them near the code as `*.test.ts` or `*.spec.ts` and document the command in `package.json`.

## Commit & Pull Request Guidelines

Recent history uses conventional prefixes such as `feat(web): ...`, `feat(admin): ...`, `feat: ...`, `docs: ...`, and `chore: ...`, often with phase context like `FASE 20`. Keep commits focused and imperative. PRs should include a summary, validation commands, linked issue or phase, screenshots for visual changes, and notes for env/config changes.

## Security & Configuration Tips

Do not commit `.env` files or secrets. Use the example env files and `make install` to generate local defaults. Keep admin secrets, database URLs, S3/MinIO keys, GA4, Clarity, Resend, CRM, payment, webhook, and notification credentials in environment-specific configuration.
