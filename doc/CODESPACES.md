# GitHub Codespaces

Este repo usa GitHub Codespaces como entorno de desarrollo principal.

## Servicios

`.devcontainer/docker-compose.yml` levanta:

- `app`: Node.js, pnpm, Next.js y Astro.
- `postgres`: PostgreSQL 16 para `packages/db`.
- `minio`: storage S3-compatible para media.
- `minio-init`: crea el bucket `ziftlab-media`.

## Setup

El `postCreateCommand` ejecuta:

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install --frozen-lockfile
pnpm codespace:setup
```

`pnpm codespace:setup` genera `.env`, corre migraciones, ejecuta seed y crea el usuario:

- Email: `admin@ziftlab.codespace`
- Password: `ZiftLabCodespace1234`

## Desarrollo

```bash
pnpm codespace:dev
```

Puertos:

- `4321`: web Astro.
- `3000`: dashboard Next.js.
- `9001`: consola MinIO.

Astro usa `/api` como proxy hacia `http://app:3000`, asi el navegador no depende de origenes manuales.
