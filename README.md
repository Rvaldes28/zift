# ZiftLab

Sitio oficial de ZiftLab, agencia digital. Monorepo con pnpm workspaces desarrollado en local sobre macOS + Homebrew.

La visión, reglas y roadmap completo del proyecto viven en [docs/FASES.MD](./docs/FASES.MD).

## Stack

- **`web/`** — Web pública: [Astro](https://astro.build) + Tailwind CSS 4 + TypeScript. Consume contenido desde la API de Payload.
- **`cms/`** — [Payload CMS v3](https://payloadcms.com) sobre Next.js: panel administrativo y API de contenido. No renderiza la web pública.
- **PostgreSQL 16** local via Homebrew.
- **MinIO** local via Homebrew como storage S3-compatible para media (se conecta en FASE 1).
- **pnpm workspaces** como gestor del monorepo.

## Estructura

```txt
ziftlab/
├── cms/     # Payload CMS + Next.js + PostgreSQL
├── web/     # Astro + Tailwind + TypeScript
├── infra/   # scripts locales y backups
├── docs/    # visión, roadmap y decisiones
└── ...      # configuración compartida (prettier, editorconfig, env)
```

## Requisitos previos

```bash
# desde /
brew update
brew install node pnpm git postgresql@16 minio
```

## Setup local

1. Iniciar PostgreSQL y crear la base de datos:

```bash
# desde /
brew services start postgresql@16
createdb ziftlab_dev
```

2. Configurar variables de entorno (ver [.env.example](./.env.example)):

```bash
# desde /
cp cms/.env.example cms/.env
# editar cms/.env y poner un PAYLOAD_SECRET propio: openssl rand -hex 32
```

3. Instalar dependencias:

```bash
# desde /
pnpm install
```

4. (Opcional en FASE 0) Iniciar MinIO para storage local de media:

```bash
# desde /
./infra/scripts/start-minio.sh
```

## Desarrollo

```bash
# desde /
pnpm dev:cms   # Payload CMS → http://localhost:3000/admin
```

```bash
# desde /
pnpm dev:web   # Web pública → http://localhost:4321
```

## Puertos locales

| Servicio      | Puerto |
| ------------- | ------ |
| Payload CMS   | 3000   |
| Astro         | 4321   |
| PostgreSQL    | 5432   |
| MinIO API     | 9000   |
| MinIO Console | 9001   |

## Calidad

```bash
# desde /
pnpm lint
pnpm typecheck
pnpm format:check
```

```bash
# desde /
pnpm format   # aplica formato con Prettier
pnpm build    # build de todas las apps
```

## Variables de entorno

El repositorio solo versiona `.env.example` (raíz y por app). Los `.env` reales nunca se commitean. Ver [docs/FASES.MD](./docs/FASES.MD) sección 11.

## Roadmap

El desarrollo avanza por fases (FASE 0 → FASE 16), una a la vez, según [docs/FASES.MD](./docs/FASES.MD). Estado actual: **FASE 0 completada** — entorno local, monorepo y ambas apps funcionando.

## Licencia

Software propietario bajo [ZiftLab Pro License v1.0](./LICENSE). Contacto: hello@ziftlab.com
