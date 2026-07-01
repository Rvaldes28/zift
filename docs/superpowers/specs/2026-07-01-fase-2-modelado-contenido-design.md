# Diseño FASE 2 — Modelado de contenido

**Fecha:** 2026-07-01 · **Estado:** aprobado · **Spec origen:** `docs/FASES.MD` §8, FASE 2

## Objetivo

Modelar en Payload todo el contenido comercial de ZiftLab: 12 colecciones (las 2 de
FASE 1 + 10 nuevas) y 4 globals, con access control por rol, drafts donde aplica, SEO
donde aplica, slugs autogenerados y los 14 servicios mínimos sembrados. Resultado: todo
el contenido editable desde `/admin` sin tocar código. No toca `web/` (FASE 3).

## Punto de partida (FASE 1)

Ya existen y no se rehacen: `Users` (roles admin/editor), `Media` (upload a MinIO vía
S3), helpers de acceso en `cms/src/access/` (`anyone`, `authenticated`, `isAdmin`,
`isAdminFieldLevel`, `isAdminOrSelf`), lexical como editor, tipos generados.

## Decisiones

### 1. SEO — plugin oficial `@payloadcms/plugin-seo@3.85.2`

- Misma versión exacta que el resto de paquetes Payload (convención del repo).
- `seoPlugin({ collections: ['services','projects','posts'], globals: ['home-page'], uploadsCollection: 'media', generateTitle, generateDescription })`
  — añade el grupo `meta` (title/description/image) con preview de Google y botones de
  autogeneración. `generateTitle` produce `"<título> | ZiftLab"`.
- Sin `tabbedUI`: al activarlo el plugin mueve **todos** los campos base a una pestaña
  "Content", lo que entierra los campos de sidebar (slug, order, status) dentro del tab
  y rompe esa UX. Con el default, el grupo `meta` se añade al final y el sidebar queda
  intacto.
- Descartado: grupo SEO artesanal (peor UX de admin, reinventa un plugin oficial).
- `SiteSettings` lleva un grupo `defaultSeo` manual (title/description/ogImage) como
  fallback global — el plugin no aplica ahí porque no es contenido por-documento.

### 2. Redirects — colección propia, sin plugin

Colección plana `redirects` (`from` único e indexado, `to`, `permanent` 301/302).
Descartado `@payloadcms/plugin-redirects`: su campo `to` es una referencia polimórfica
a documentos que el frontend Astro tendría que resolver; una tabla plana es el formato
que la web consumirá directamente (campos optimizados para frontend).

### 3. Drafts / published

- `versions: { drafts: true }` en **Services, Projects, Posts** y en el global
  **HomePage** (contenido editorial que se prepara antes de publicar). Payload valida
  los campos `required` solo al publicar, así que se puede guardar borradores a medias.
- Lectura pública filtrada con un helper nuevo `publishedOnly`: usuarios anónimos solo
  ven `_status: published`; usuarios autenticados ven todo.
- Categories, Clients, Testimonials, TeamMembers, FAQs y Redirects **no** llevan drafts
  (entidades simples sin flujo editorial); Leads tampoco (es entrada, no contenido).

### 4. Slugs — campo reutilizable con hook

`cms/src/fields/slug.ts` exporta `slugField(source = 'title')`: campo `text` único e
indexado, en sidebar, con hook `beforeValidate` que lo genera desde el campo fuente si
está vacío y lo normaliza siempre (minúsculas, sin acentos — "Automatización" →
"automatizacion", espacios → guiones). Lo usan Services, Projects, Posts y Categories.

### 5. Links de navegación — helper compartido

`cms/src/fields/link.ts` exporta los subcampos `{ label, href, newTab }` reutilizados
por Header (nav + CTA), Footer (columnas de links) y HomePage (CTAs de hero y cierre).
Los `href` son texto plano (rutas internas `/servicios` o URLs externas): es lo que
Astro consume sin resolver referencias.

### 6. Colecciones (10 nuevas)

Todas con timestamps (default de Payload) y agrupadas en el admin: **Contenido**
(Services, Projects, Posts, Categories), **Empresa** (Clients, Testimonials,
TeamMembers, FAQs), **CRM** (Leads), **Configuración** (Redirects + globals de config).

| Colección | Campos clave | Access (read / create / update / delete) |
| --- | --- | --- |
| `services` | title, slug, excerpt, icon (media), image (media), content (lexical), features[], order, meta (SEO) | publishedOnly / auth / auth / auth |
| `projects` | title, slug, client (→clients), services (→services, hasMany), excerpt, coverImage (media), gallery[] (media), content, externalUrl, completedAt, meta (SEO) | publishedOnly / auth / auth / auth |
| `posts` | title, slug, excerpt, coverImage (media), author (→team-members), categories (→categories, hasMany), content, publishedAt, meta (SEO) | publishedOnly / auth / auth / auth |
| `categories` | title, slug, description | anyone / auth / auth / auth |
| `clients` | name, logo (media), website, order | anyone / auth / auth / auth |
| `testimonials` | quote, authorName, authorRole, client (→clients), avatar (media), order | anyone / auth / auth / auth |
| `team-members` | name, role, bio, photo (media), socialLinks[], order | anyone / auth / auth / auth |
| `faqs` | question, answer (lexical), order | anyone / auth / auth / auth |
| `leads` | name, email, phone, company, service (→services), message, source, status (nuevo/contactado/ganado/perdido), notes | auth / **anyone** / auth / **admin** |
| `redirects` | from (único), to, permanent | anyone / auth / auth / auth |

Notas:

- **Posts.author → team-members** (no → users): `Users.read` es admin-or-self, así que
  una relación a users nunca se poblaría en peticiones anónimas (y poblarla filtraría
  emails). Los autores del blog son miembros del equipo, colección pública con nombre,
  foto y rol.
- **Leads**: `create` público (el formulario de la web postea sin auth — FASE 7),
  lectura/gestión solo autenticados, borrado solo admin (protege datos de clientes
  potenciales). `status` + `notes` dan el mini-pipeline de CRM en el admin.
- **Curación del home vía relaciones**: HomePage elige explícitamente qué servicios,
  proyectos y testimonios destacar (relaciones hasMany, ordenables). Se descartan
  checkboxes `featured` en las colecciones: un solo mecanismo, no dos.
- Campos `order` (number, default 0) + `defaultSort: 'order'` para listas ordenables a
  mano (services, clients, testimonials, team-members, faqs).

### 7. Globals (4)

| Global | Campos clave |
| --- | --- |
| `site-settings` | siteName, tagline, contactEmail, phone, whatsapp, address, socialLinks[] (platform+url), defaultSeo (title/description/ogImage) |
| `header` | logo (media), navItems[] (link, máx. 8), cta (link) |
| `footer` | columns[] (title + links[], máx. 4), bottomText |
| `home-page` | hero (eyebrow/title/subtitle/CTAs/image), stats[] (máx. 4), servicesSection (title/subtitle/featuredServices), projectsSection (title/subtitle/featuredProjects), testimonialsSection (title/featuredTestimonials), ctaSection (title/text/cta), meta (SEO) |

- Access de globals: `read: anyone`, `update: authenticated`.
- `home-page` con `versions: { drafts: true }`: los anónimos reciben la última versión
  publicada; los borradores requieren auth (`?draft=true`).

### 8. Seed idempotente de los 14 servicios mínimos

- `cms/src/seed/` con los datos de los 14 servicios de FASES.MD (desarrollo web,
  e-commerce, web apps, apps móviles, marketing digital, Google Ads, Meta Ads, SEO,
  automatización, CRM, IA, diseño gráfico, branding, consultoría tecnológica), cada uno
  con excerpt, features y contenido lexical real en español (Regla 7: nada de
  placeholders rotos), `_status: published`.
- Idempotente: busca por slug y no duplica si ya existe. Se corre con
  `pnpm seed` (nuevo script en `cms/package.json` → `payload run src/seed/index.ts`).
- Los globals **no** se siembran: quedan editables con defaults sensatos en campos
  obvios (p. ej. `siteName: 'ZiftLab'`); rellenarlos es trabajo editorial (FASE 16).

### 9. Tipos y verificación

- `pnpm generate:types` tras modelar; el esquema se sincroniza por push en dev (sin
  migraciones locales).
- Verificación de fase (Postgres + MinIO corriendo):
  1. `pnpm dev:cms` arranca; `/admin` muestra los grupos Contenido/Empresa/CRM/Configuración.
  2. `pnpm seed` crea los 14 servicios; segunda corrida no duplica.
  3. `GET /api/services` anónimo devuelve los 14 publicados; un draft no aparece.
  4. `POST /api/leads` anónimo crea un lead; `GET /api/leads` anónimo devuelve 403.
  5. `GET /api/globals/site-settings` y `GET /api/globals/home-page` responden JSON.
  6. Gate completo: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`.

## Errores previstos

- Tipos desactualizados tras añadir colecciones → `pnpm generate:types` antes de
  `typecheck`.
- Seed sin Postgres corriendo → `ECONNREFUSED :5432`: `brew services start postgresql@16`.
- Contenido lexical inválido en el seed → usar la forma canónica de nodos
  root/paragraph/text con `version: 1`.
- Olvidar registrar una colección en `payload.config.ts` → no aparece en admin ni en
  tipos.

## Fuera de alcance

Consumo desde Astro (FASE 3), páginas comerciales (FASE 4), formulario real de leads y
email (FASE 7), sitemap/metatags renderizados (FASE 8), variantes de imagen (cuando el
frontend las necesite), contenido editorial de globals y blog (FASE 16).
