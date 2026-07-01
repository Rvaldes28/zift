# Diseño FASE 1 — Payload CMS Core

**Fecha:** 2026-07-01 · **Estado:** aprobado · **Spec origen:** `docs/FASES.MD` §8, FASE 1

## Objetivo

Dejar Payload CMS estable contra PostgreSQL local (Homebrew), con roles admin/editor,
media almacenada en MinIO local vía S3, CORS configurado y tipos generados — sin errores
de TypeScript. No toca `web/` (el consumo de la API es FASE 3) ni modela contenido (FASE 2).

## Punto de partida (FASE 0)

Ya existen y no se rehacen: `cms/src/payload.config.ts` con `postgresAdapter`
(`DATABASE_URL`), `lexicalEditor`, secret desde `.env`, colecciones `Users` (auth
mínima) y `Media` (upload mínimo), `infra/scripts/start-minio.sh`, y el gate de calidad
(`pnpm lint` / `typecheck` / `format:check` / `build`).

## Decisiones

### 1. Storage S3/MinIO — plugin oficial `@payloadcms/storage-s3`

- Dependencia nueva en `cms/`: `@payloadcms/storage-s3@3.85.2` (misma versión exacta que
  el resto de paquetes Payload).
- Configurado en `payload.config.ts` → `plugins: [s3Storage({ ... })]` sobre la colección
  `media`, leyendo `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY` y `forcePathStyle` leído de `S3_FORCE_PATH_STYLE === 'true'`
  (requerido por MinIO; la variable ya está prevista en el `.env.example` raíz).
- Los archivos se sirven a través de la API de Payload (`/api/media/file/...`), de modo
  que el access control de la colección aplica también a los binarios.
- Descartado: `@payloadcms/plugin-cloud-storage` (legacy, más boilerplate) y disco local
  (viola la spec). El mismo plugin sirve para Cloudflare R2 / AWS S3 en producción
  cambiando solo variables de entorno.

### 2. Bucket MinIO — script idempotente separado

- Nuevo `infra/scripts/create-minio-bucket.sh`: usa `mc` (Homebrew: `brew install
  minio-mc`), registra el alias local y crea `payload-media` con `mc mb
  --ignore-existing`. Se ejecuta una vez con MinIO arrancado.
- `start-minio.sh` no se modifica (sigue siendo un `exec` limpio).

### 3. Roles y permisos

Campo `roles` en `Users`: `select` con opciones `admin` y `editor`, `hasMany: true`,
`required`, `defaultValue: ['editor']`, `saveToJWT: true`. Matriz:

| Acción                            | admin | editor          |
| --------------------------------- | ----- | --------------- |
| Entrar al admin                   | ✅    | ✅              |
| CRUD Media (y contenido futuro)   | ✅    | ✅              |
| Crear/borrar usuarios             | ✅    | ❌              |
| Ver/editar otros usuarios         | ✅    | solo su perfil  |
| Cambiar campo `roles`             | ✅    | ❌ (ni el suyo) |
| Leer Media                        | público (la web lo consume) | — |

Implementación:

- Helpers reutilizables en `cms/src/access/` (p. ej. `isAdmin`, `isAdminOrSelf`,
  `authenticated`, `anyone`), tipados con `Access` de Payload.
- `Users.access`: `create`/`delete` → solo admin; `read`/`update` → admin o el propio
  usuario; `admin` → cualquier usuario autenticado (ambos roles entran al panel).
- Field-level access en `roles`: `update` solo admin (un editor no puede
  auto-promoverse).
- `Media.access`: `read` → público; `create`/`update`/`delete` → autenticado.
- Primer usuario: se crea desde el onboarding de `/admin` seleccionando rol `admin`
  (el campo `roles` aparece en el formulario de primer usuario).

### 4. Server URL y CORS

- `serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL` (nombre ya fijado en el
  `.env.example` raíz).
- `cors: [process.env.WEB_URL || 'http://localhost:4321']` — origen de la web Astro vía
  env var para poder cambiarlo en producción sin tocar código.
- `cms/.env.example` y `cms/.env` se amplían con `PAYLOAD_PUBLIC_SERVER_URL`, `WEB_URL`
  y las variables `S3_*` (mismos valores locales que el `.env.example` raíz, que también
  incorpora `WEB_URL`).

### 5. Tipos y verificación

- Regenerar tipos tras tocar colecciones: `pnpm generate:types` (desde `/cms`); el campo
  `roles` debe aparecer en `payload-types.ts`.
- Verificación de la fase (con PostgreSQL y MinIO corriendo):
  1. `pnpm dev:cms` arranca sin errores y `/admin` carga.
  2. Crear primer usuario admin y hacer login.
  3. Subir una imagen en Media → el objeto aparece en el bucket `payload-media` de MinIO
     y la imagen se sirve desde la URL de Payload.
  4. `GET http://localhost:3000/api/media` responde JSON.
  5. Gate completo: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`.

## Errores previstos

- MinIO apagado al subir media → error de conexión S3: arrancar con
  `./infra/scripts/start-minio.sh` y crear el bucket antes de probar.
- Bucket inexistente → `NoSuchBucket`: ejecutar `create-minio-bucket.sh`.
- Olvidar `forcePathStyle` → firmas S3 inválidas contra MinIO.
- Tipos desactualizados tras añadir `roles` → correr `pnpm generate:types` antes de
  `typecheck`.

## Fuera de alcance

Colecciones de contenido (FASE 2), consumo desde Astro (FASE 3), variantes/resize de
imágenes (se decidirá cuando el frontend las necesite), email, analítica, deploy.
