# FASE 1 — Payload CMS Core: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Payload CMS estable contra PostgreSQL local con roles admin/editor, media en MinIO vía S3, CORS y tipos generados — sin errores de TypeScript.

**Architecture:** Se extiende el scaffold de FASE 0: el plugin oficial `@payloadcms/storage-s3` redirige los uploads de `media` a MinIO (sirviendo archivos vía la API de Payload para respetar access control); un campo `roles` en `users` + helpers de acceso en `cms/src/access/` implementan la matriz admin/editor; `serverURL` y `cors` se leen de env vars.

**Tech Stack:** Payload 3.85.2 (Next 16, Turbopack), `@payloadcms/db-postgres`, `@payloadcms/storage-s3@3.85.2`, PostgreSQL 16 (Homebrew), MinIO (Homebrew) + `mc` (Homebrew `minio-mc`), pnpm workspaces.

## Global Constraints

- Todos los paquetes `@payloadcms/*` y `payload` van pineados **exactos a `3.85.2`** (sin `^`).
- **No hay suite de tests** (testing es FASE 15, ver CLAUDE.md): el ciclo de verificación de cada tarea es `pnpm typecheck` + checks en runtime (curl/mc), no TDD.
- Todo comando indica su directorio (`# desde /` = raíz del repo `zift/`, `# desde /cms`).
- Ningún secreto en código: solo `.env` (gitignoreado); `cms/.env` existe localmente y **no se commitea**; los `.env.example` sí.
- Gate de fase (todo debe pasar): `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` desde la raíz.
- No tocar `web/` (FASE 3) ni crear colecciones de contenido (FASE 2).
- `cms/src/payload-types.ts` es generado: nunca editarlo a mano, regenerar con `pnpm generate:types` (desde `/cms`).
- Servicios locales requeridos en runtime: PostgreSQL 16 (`brew services start postgresql@16`, DB `ziftlab_dev`) y MinIO (`./infra/scripts/start-minio.sh`). En dev el adaptador Postgres sincroniza el esquema automáticamente (push), no hacen falta migraciones.

---

### Task 1: Dependencia `@payloadcms/storage-s3`

**Files:**
- Modify: `cms/package.json` (dependencia nueva)
- Modify: `pnpm-lock.yaml` (lockfile, lo actualiza pnpm)

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: paquete `@payloadcms/storage-s3@3.85.2` instalado; la Task 3 importa `s3Storage` de él.

- [ ] **Step 1: Instalar el paquete con versión exacta**

```bash
# desde /
pnpm --filter cms add --save-exact @payloadcms/storage-s3@3.85.2
```

Expected: termina sin errores; si pnpm avisa de build scripts pendientes de aprobar, revisar `pnpm-workspace.yaml` → `allowBuilds` (convención del repo, ver CLAUDE.md).

- [ ] **Step 2: Verificar el pin exacto**

```bash
# desde /
grep '"@payloadcms/storage-s3"' cms/package.json
```

Expected: `"@payloadcms/storage-s3": "3.85.2",` (sin `^`).

- [ ] **Step 3: Verificar que typecheck sigue verde**

```bash
# desde /
pnpm typecheck
```

Expected: PASS (sin errores en `cms` ni `web`).

- [ ] **Step 4: Commit**

```bash
# desde /
git add cms/package.json pnpm-lock.yaml
git commit -m "feat(cms): añade @payloadcms/storage-s3 3.85.2"
```

---

### Task 2: Roles admin/editor y permisos de colecciones

**Files:**
- Create: `cms/src/access/index.ts`
- Modify: `cms/src/collections/Users.ts`
- Modify: `cms/src/collections/Media.ts`
- Regenerated: `cms/src/payload-types.ts` (vía CLI, no a mano)

**Interfaces:**
- Consumes: nada nuevo (usa tipos `Access`/`FieldAccess` de `payload`).
- Produces: helpers `anyone`, `authenticated`, `isAdmin`, `isAdminFieldLevel`, `isAdminOrSelf` (exportados desde `cms/src/access/index.ts`); campo `users.roles: ('admin' | 'editor')[]` en los tipos generados. La verificación E2E (Task 5) asume: `read` de media público, `create` de media requiere login, `create`/`delete` de users solo admin.

- [ ] **Step 1: Crear los helpers de acceso**

Crear `cms/src/access/index.ts`:

```ts
import type { Access, FieldAccess } from 'payload'

export const anyone: Access = () => true

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => Boolean(user?.roles?.includes('admin'))

export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) =>
  Boolean(user?.roles?.includes('admin'))

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.roles?.includes('admin')) return true
  return { id: { equals: user.id } }
}
```

- [ ] **Step 2: Añadir roles y access a Users**

Reemplazar el contenido completo de `cms/src/collections/Users.ts`:

```ts
import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminFieldLevel, isAdminOrSelf } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    // Ambos roles pueden entrar al panel de administración
    admin: ({ req: { user } }) => Boolean(user),
    create: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['editor'],
      saveToJWT: true,
      access: {
        // Sin restricción en create: el onboarding del primer usuario debe poder elegir admin
        update: isAdminFieldLevel,
      },
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
    },
  ],
}
```

- [ ] **Step 3: Añadir access a Media**

Reemplazar el contenido completo de `cms/src/collections/Media.ts`:

```ts
import type { CollectionConfig } from 'payload'

import { anyone, authenticated } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
```

- [ ] **Step 4: Regenerar tipos**

```bash
# desde /cms
pnpm generate:types
```

Expected: termina sin errores y `cms/src/payload-types.ts` cambia.

- [ ] **Step 5: Verificar que el tipo User incluye roles**

```bash
# desde /
grep -A 2 "roles" cms/src/payload-types.ts | head -5
```

Expected: aparece `roles: ('admin' | 'editor')[];` dentro de la interface `User`.

- [ ] **Step 6: Typecheck y lint**

```bash
# desde /
pnpm typecheck && pnpm lint
```

Expected: ambos PASS. (Si `user?.roles` diera error de tipo, la causa típica es no haber regenerado tipos — repetir Step 4, no editar `payload-types.ts`.)

- [ ] **Step 7: Commit**

```bash
# desde /
git add cms/src/access/index.ts cms/src/collections/Users.ts cms/src/collections/Media.ts cms/src/payload-types.ts
git commit -m "feat(cms): roles admin/editor y permisos básicos de Users y Media"
```

---

### Task 3: serverURL, CORS y storage S3/MinIO en payload.config.ts + env

**Files:**
- Modify: `cms/src/payload.config.ts`
- Modify: `cms/.env.example`
- Modify: `cms/.env` (local, NO se commitea)
- Modify: `.env.example` (raíz: añadir `WEB_URL`)

**Interfaces:**
- Consumes: `s3Storage` de `@payloadcms/storage-s3` (Task 1).
- Produces: config final de Payload; env vars `PAYLOAD_PUBLIC_SERVER_URL`, `WEB_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` que Task 4/5 usan. El plugin pone `disableLocalStorage: true` en `media` automáticamente y los archivos se sirven vía `/api/media/file/<filename>`.

- [ ] **Step 1: Actualizar payload.config.ts**

Reemplazar el contenido completo de `cms/src/payload.config.ts`:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  cors: [process.env.WEB_URL || 'http://localhost:4321'],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT || '',
        region: process.env.S3_REGION || '',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        // MinIO requiere path-style (http://host:9000/bucket/key)
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      },
    }),
  ],
})
```

- [ ] **Step 2: Ampliar cms/.env.example**

Añadir al final de `cms/.env.example`:

```bash
# URL pública del servidor Payload
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Origen permitido para CORS (web Astro)
WEB_URL=http://localhost:4321

# MinIO local — storage S3-compatible para media
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=payload-media
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
```

- [ ] **Step 3: Ampliar cms/.env (local)**

Añadir el mismo bloque del Step 2 al final de `cms/.env` (que hoy solo tiene `DATABASE_URL` y `PAYLOAD_SECRET`). Este archivo está gitignoreado — no aparecerá en `git status`.

- [ ] **Step 4: Añadir WEB_URL al .env.example raíz**

En `.env.example` (raíz), dentro de la sección `# Payload CMS (va en cms/.env)`, añadir después de la línea `PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000`:

```bash
WEB_URL=http://localhost:4321
```

- [ ] **Step 5: Typecheck y lint**

```bash
# desde /
pnpm typecheck && pnpm lint
```

Expected: ambos PASS.

- [ ] **Step 6: Commit**

```bash
# desde /
git add cms/src/payload.config.ts cms/.env.example .env.example
git commit -m "feat(cms): serverURL, CORS y storage S3 (MinIO) en payload.config"
```

---

### Task 4: Script idempotente de bucket MinIO

**Files:**
- Create: `infra/scripts/create-minio-bucket.sh` (ejecutable)

**Interfaces:**
- Consumes: MinIO corriendo (`./infra/scripts/start-minio.sh`); `mc` (Homebrew `minio-mc`); env vars `S3_*` opcionales (tiene los mismos defaults locales).
- Produces: bucket `payload-media` existente y alias `mc` llamado `ziftlocal`, que Task 5 usa para verificar objetos (`mc ls ziftlocal/payload-media`).

- [ ] **Step 1: Crear el script**

Crear `infra/scripts/create-minio-bucket.sh`:

```bash
#!/usr/bin/env bash
# Crea (idempotente) el bucket local de MinIO para la media de Payload.
#
# Requiere MinIO corriendo:   ./infra/scripts/start-minio.sh
# Requiere el cliente mc:     brew install minio-mc
#
# Uso:
#   # desde /
#   ./infra/scripts/create-minio-bucket.sh
set -euo pipefail

MINIO_ALIAS="ziftlocal"
MINIO_URL="${S3_ENDPOINT:-http://localhost:9000}"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
BUCKET="${S3_BUCKET:-payload-media}"

if ! command -v mc >/dev/null 2>&1; then
  echo "Error: 'mc' no está instalado. Instalar con: brew install minio-mc" >&2
  exit 1
fi

mc alias set "$MINIO_ALIAS" "$MINIO_URL" "$MINIO_USER" "$MINIO_PASSWORD"
mc mb --ignore-existing "$MINIO_ALIAS/$BUCKET"
echo "Bucket '$BUCKET' listo en $MINIO_URL"
```

- [ ] **Step 2: Hacerlo ejecutable**

```bash
# desde /
chmod +x infra/scripts/create-minio-bucket.sh
```

- [ ] **Step 3: Arrancar MinIO si no está corriendo**

```bash
# desde /
curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live || true
```

Si NO responde `200`, arrancarlo en background (proceso persistente, no bloquear la sesión):

```bash
# desde / (en background)
./infra/scripts/start-minio.sh
```

Expected: `curl` al health check devuelve `200`.

- [ ] **Step 4: Ejecutar el script (instalar mc si falta)**

```bash
# desde /
command -v mc >/dev/null || brew install minio-mc
./infra/scripts/create-minio-bucket.sh
```

Expected: `Added `ziftlocal` successfully.` (o actualizado), `Bucket created successfully` o silencio si ya existía, y la línea final `Bucket 'payload-media' listo en http://localhost:9000`.

- [ ] **Step 5: Verificar el bucket**

```bash
# desde /
mc ls ziftlocal/
```

Expected: aparece `payload-media/`.

- [ ] **Step 6: Commit**

```bash
# desde /
git add infra/scripts/create-minio-bucket.sh
git commit -m "feat(infra): script idempotente para crear el bucket MinIO de media"
```

---

### Task 5: Verificación end-to-end y gate de fase

**Files:**
- Modify: `CLAUDE.md` (línea de estado: FASE 1 completa)
- Test: verificación runtime vía curl/mc (no hay suite de tests)

**Interfaces:**
- Consumes: todo lo anterior — dev server (`pnpm dev:cms`), bucket `ziftlocal/payload-media` (Task 4), permisos de Task 2, endpoints REST de Payload: `POST /api/users/first-register`, `POST /api/users/login` (header `Authorization: JWT <token>`), `POST /api/media` (multipart `file` + `_payload`), `GET /api/media`, `GET /api/media/file/<filename>`.
- Produces: FASE 1 verificada y commit final de fase.

- [ ] **Step 1: Confirmar servicios**

```bash
# desde /
brew services list | grep postgresql@16
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:9000/minio/health/live
```

Expected: postgres `started`; MinIO `200`. Si no: `brew services start postgresql@16` / `./infra/scripts/start-minio.sh` (background).

- [ ] **Step 2: Arrancar el dev server (background) y esperar a que sirva /admin**

```bash
# desde / (en background)
pnpm dev:cms
```

Luego (reintentar hasta ~60s):

```bash
# desde /
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin
```

Expected: `200`. El primer boot aplica el push del esquema (columna `roles` incluida) a `ziftlab_dev`.

- [ ] **Step 3: Crear el primer usuario admin**

```bash
# desde /
curl -s -X POST http://localhost:3000/api/users/first-register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ziftlab.com","password":"ZiftLab-dev-2026","roles":["admin"]}'
```

Expected: JSON con `"user"` cuyo `"roles"` es `["admin"]` y un `"token"`. **Comprobar explícitamente que roles es `["admin"]`** (si saliera `["editor"]`, el campo se está descartando en el onboarding y hay que parar y revisar — no continuar con un primer usuario editor). Si el endpoint devolviera 404, alternativa: abrir http://localhost:3000/admin en el navegador y completar el formulario de primer usuario eligiendo rol Admin.

Nota: contraseña solo de desarrollo local; el usuario puede cambiarla luego desde `/admin`.

- [ ] **Step 4: Login y captura del token**

```bash
# desde /
TOKEN=$(curl -s -X POST http://localhost:3000/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@ziftlab.com","password":"ZiftLab-dev-2026"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "${TOKEN:0:20}..."
```

Expected: imprime el inicio de un JWT (no vacío).

- [ ] **Step 5: Subir una imagen de prueba**

Generar un PNG válido de 1×1 y subirlo (usar el scratchpad de la sesión para el archivo temporal):

```bash
# desde /
SCRATCH="$(mktemp -d)"
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > "$SCRATCH/fase1-test.png"
curl -s -X POST http://localhost:3000/api/media \
  -H "Authorization: JWT $TOKEN" \
  -F "file=@$SCRATCH/fase1-test.png" \
  -F '_payload={"alt":"Imagen de prueba FASE 1"}'
```

Expected: JSON del documento creado con `"filename": "fase1-test.png"`, `"mimeType": "image/png"` y una `"url"`.

- [ ] **Step 6: Verificar el objeto en MinIO y el serving vía Payload**

```bash
# desde /
mc ls ziftlocal/payload-media
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/media/file/fase1-test.png
```

Expected: `mc ls` muestra `fase1-test.png`; el curl devuelve `200` (archivo servido desde MinIO a través de Payload).

- [ ] **Step 7: Verificar API REST pública y permisos negativos**

```bash
# desde /
curl -s http://localhost:3000/api/media | head -c 300; echo
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/media
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/users \
  -H 'Content-Type: application/json' -d '{"email":"x@x.com","password":"12345678"}'
```

Expected: el GET devuelve JSON con `"docs":[...]` sin auth (read público); los dos POST sin auth devuelven `403` (crear media requiere login; crear usuarios requiere admin).

- [ ] **Step 8: Parar el dev server y correr el gate completo**

Parar el proceso de `pnpm dev:cms`. Luego (PostgreSQL sigue corriendo — `pnpm build` lo necesita):

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check && pnpm build
```

Expected: los cuatro PASS. Si `format:check` falla por archivos nuevos: `pnpm format` y re-verificar.

- [ ] **Step 9: Actualizar el estado en CLAUDE.md**

En `CLAUDE.md`, reemplazar en la sección "What this project is":

```
Current state: **FASE 0 (local setup) complete** — next up is FASE 1 (Payload CMS core: S3/MinIO media storage, roles, CORS).
```

por:

```
Current state: **FASE 1 (Payload CMS core) complete** — next up is FASE 2 (content modeling). MinIO must be running for media uploads (`./infra/scripts/start-minio.sh`; bucket via `./infra/scripts/create-minio-bucket.sh`).
```

También actualizar en la sección de servicios locales la frase `MinIO starts with ./infra/scripts/start-minio.sh (not needed until FASE 1)` → quitar el "(not needed until FASE 1)" y mencionar el script del bucket.

- [ ] **Step 10: Commit final de fase**

```bash
# desde /
git add CLAUDE.md
git commit -m "DEV A1.01 — FASE 1 Payload CMS Core verificada"
```

---

## Errores comunes (referencia rápida para el ejecutor)

- `NoSuchBucket` al subir media → correr `./infra/scripts/create-minio-bucket.sh` (desde `/`).
- Error de firma S3 (`SignatureDoesNotMatch`) → falta `S3_FORCE_PATH_STYLE=true` en `cms/.env`.
- `ECONNREFUSED :9000` → MinIO apagado: `./infra/scripts/start-minio.sh`.
- `ECONNREFUSED :5432` → `brew services start postgresql@16`.
- Typecheck falla con `roles` → regenerar tipos (`pnpm generate:types` desde `/cms`), no editar `payload-types.ts`.
