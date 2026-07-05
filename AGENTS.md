# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm monorepo for ZiftLab. The public site lives in `web/` and uses Astro, Tailwind CSS, and TypeScript. The CMS lives in `cms/` and uses Payload CMS on Next.js. Operational scripts are in `infra/scripts/`; phase and analytics docs are at the repo root.

Key source paths:
- `web/src/pages/`: Astro routes and generated endpoints.
- `web/src/components/`: reusable UI and section components.
- `web/src/lib/`: client/content helpers such as analytics, leads, UTM, and Payload access.
- `cms/src/collections/`, `cms/src/globals/`, `cms/src/fields/`: Payload schema definitions.
- `cms/src/seed/`: seed data and seed assets.

## Build, Test, and Development Commands

Run from the repo root.
- `pnpm install`: install workspace dependencies.
- `make install`: macOS setup for Homebrew formulas, env files, PostgreSQL, MinIO, dependencies, and seed data.
- `make start`: start PostgreSQL, MinIO, Payload CMS on `:3000`, and Astro on `:4321`.
- `make stop`: stop local services started by the Makefile.
- `pnpm dev:web` / `pnpm dev:cms`: run one workspace locally.
- `pnpm build`: build all workspaces.
- `pnpm lint`: run ESLint in all workspaces.
- `pnpm typecheck`: run Astro and TypeScript checks.
- `pnpm format:check` / `pnpm format`: check or apply Prettier formatting.

## Coding Style & Naming Conventions

Use TypeScript and ESM. Prettier is authoritative: no semicolons, single quotes, trailing commas, and `printWidth` 100. Astro files use the Prettier Astro plugin. Keep Astro components in PascalCase, route files lowercase or bracketed for dynamic routes, and CMS collection/global filenames in PascalCase. Prefix intentionally unused values with `_`.

## Testing Guidelines

There is currently no dedicated test runner or `test` script. For every change, run `pnpm lint`, `pnpm typecheck`, and the relevant build (`pnpm build:web`, `pnpm build:cms`, or `pnpm build`). When adding tests, colocate them near the code as `*.test.ts` or `*.spec.ts` and document the command in `package.json`.

## Commit & Pull Request Guidelines

Recent history uses conventional prefixes such as `feat(web): ...`, `feat: ...`, `docs: ...`, and `chore: ...`, often with phase context like `FASE 12`. Keep commits focused and imperative. PRs should include a summary, validation commands, linked issue or phase, screenshots for visual Astro changes, and notes for env/config changes.

## Security & Configuration Tips

Do not commit `.env` files or secrets. Use the example env files and `make install` to generate local defaults. Keep Payload secrets, database URLs, S3/MinIO keys, GA4, Clarity, and Resend credentials in environment-specific configuration.
