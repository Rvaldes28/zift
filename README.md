# ZiftLab

Monorepo pnpm con web pública en Astro, dashboard propio en Next.js y base de datos PostgreSQL administrada con Drizzle. La operación diaria usa la API propia del dashboard; no hay runtime de CMS externo en el workspace.

## Estructura

- `web/`: sitio público Astro.
- `admin/`: dashboard Next.js App Router y APIs públicas/privadas.
- `packages/db/`: schema Drizzle, cliente PostgreSQL, migraciones y seed.
- `packages/types/`: contratos compartidos entre web y admin.
- `infra/scripts/`: helpers locales para MinIO y servicios de desarrollo.

## Arranque Local

```bash
pnpm install
make install
make start
```

URLs principales:

- Web: `http://localhost:4321`
- Dashboard: `http://localhost:3000/dashboard`
- Health check: `http://localhost:3000/api/health`
- MinIO: `http://localhost:9000`

El Makefile crea un usuario local por defecto:

- Email: `admin@ziftlab.local`
- Password: `ZiftLabAdmin1234`

## Variables Principales

- `ADMIN_DATABASE_URL`: DB propia del dashboard, por defecto `postgresql://localhost:5432/ziftlab_admin_dev`.
- `PUBLIC_API_URL`: API pública del admin para Astro.
- `PUBLIC_CONTENT_API_URL`: API pública de contenido para Astro.
- `S3_BUCKET`: bucket neutral de media, por defecto `ziftlab-media`.
- `S3_PREFIX`: prefijo de media propia, por defecto `admin-media`.

Revisa `.env.example`, `admin/.env.example` y `packages/db/.env.example` para el set completo.

## Base De Datos

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Para importar el último export JSON legado:

```bash
LEGACY_EXPORT_FILE=/ruta/export-final.json pnpm db:import-legacy
```

El importador es idempotente y usa `legacy_source`/`legacy_id` para mantener trazabilidad sin acoplar el schema activo al sistema anterior.

## Verificación

```bash
pnpm verify:no-payload
pnpm typecheck
pnpm lint
pnpm build:admin
pnpm build:web
```

`pnpm verify:no-payload` falla si vuelve a aparecer el directorio viejo, imports/dependencias antiguas, variables públicas antiguas o scripts operativos obsoletos.
