# ZiftLab

Monorepo pnpm con web publica en Astro, dashboard propio en Next.js y base de datos PostgreSQL administrada con Drizzle. El entorno de desarrollo principal es GitHub Codespaces.

## Estructura

- `web/`: sitio publico Astro.
- `admin/`: dashboard Next.js App Router y APIs publicas/privadas.
- `packages/db/`: schema Drizzle, cliente PostgreSQL, migraciones y seed.
- `packages/types/`: contratos compartidos entre web y admin.
- `.devcontainer/`: contenedor principal, PostgreSQL, MinIO y configuracion de puertos para Codespaces.
- `infra/scripts/`: generadores y setup del entorno de Codespaces.

## Arranque En GitHub Codespaces

1. Abre el repo en GitHub.
2. Usa `Code` -> `Codespaces` -> `Create codespace`.
3. Espera a que termine el `postCreateCommand`: instala dependencias, genera `.env`, migra, hace seed y crea el admin.
4. Arranca la app:

```bash
pnpm codespace:dev
```

Tambien puedes usar:

```bash
make start
```

URLs principales desde el panel `Ports` de Codespaces:

- Web: puerto `4321`
- Dashboard: puerto `3000`, ruta `/dashboard`
- Health check: puerto `3000`, ruta `/api/health`
- MinIO consola: puerto `9001`

Usuario de desarrollo:

- Email: `admin@ziftlab.codespace`
- Password: `ZiftLabCodespace1234`

## Variables

`pnpm codespace:env` regenera `.env`, `admin/.env`, `web/.env` y `packages/db/.env` con valores de Codespaces. Los servicios internos usan nombres de contenedor:

- `ADMIN_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ziftlab_admin_dev`
- `S3_ENDPOINT=http://minio:9000`
- `INTERNAL_API_URL=http://app:3000`
- `PUBLIC_API_URL=` para que el navegador use el proxy `/api` del dev server de Astro.

No se deben commitear `.env` reales. Usa Codespaces Secrets para credenciales externas.

## Base De Datos

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Para importar el ultimo export JSON legado:

```bash
LEGACY_EXPORT_FILE=/workspaces/zift/export-final.json pnpm db:import-legacy
```

## Verificacion

```bash
pnpm verify:no-payload
pnpm typecheck
pnpm lint
pnpm build:admin
pnpm build:web
```
