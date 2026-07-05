# FASE 0 - Auditoria y plan de migracion sin Payload

Estado: completada como auditoria y plan de migracion.
Fecha: 2026-07-03.
Alcance: no se elimina Payload, no se crea aun `admin/`, no se cambia la web publica.

## 1. Analisis del problema

El proyecto actual depende de Payload CMS como panel administrativo, API de contenido,
gestor de media, tipado de datos y receptor publico de leads. La web Astro en `web/`
esta avanzada y renderiza contenido real consumiendo la REST API de Payload durante
build o dev server.

La migracion no puede hacerse con un reemplazo brusco, porque los puntos de acoplamiento
incluyen:

- Contrato REST de colecciones y globals.
- Tipos generados en `cms/src/payload-types.ts`, usados por Astro mediante `@cms/types`.
- Relaciones pobladas con `depth`, en forma `number | Doc`.
- Media con `Media.url`, a veces relativa a `/api/media/file/...`.
- Rich text en formato Lexical, renderizado en Astro con `@payloadcms/richtext-lexical`.
- Formularios publicos que envian a `POST /api/leads/submit`.
- Redirecciones leidas por `web/astro.config.mjs` desde `/api/redirects`.

Por eso la ruta segura es crear primero un dashboard/API propia con contrato compatible,
migrar datos y media, validar paridad con la web publica, y solo al final eliminar Payload.

## 2. Objetivos

- Inventariar todas las colecciones, globals, tipos, endpoints y campos SEO actuales.
- Identificar archivos de `web/` acoplados a Payload.
- Definir el contrato minimo de API propia compatible con Astro.
- Definir estrategia de migracion de datos, media, SEO y leads.
- Definir criterios de verificacion antes de avanzar a FASE 1.
- Mantener `cms/` y la base de datos Payload intactos durante la transicion.

## 3. Arquitectura recomendada

Arquitectura de transicion:

```txt
web/ Astro publico
  |
  | REST compatible temporal
  v
admin/ API propia futura
  |
  | PostgreSQL propio + storage S3 compatible
  v
datos migrados desde Payload

cms/ Payload actual se conserva como origen y rollback hasta validar paridad.
```

Reglas de arquitectura:

- `web/` sigue siendo el frontend publico.
- `cms/` no se borra ni se modifica en esta fase.
- `admin/` se creara en una fase posterior.
- La API propia debe imitar primero el contrato que Astro ya consume.
- Despues de la paridad, `web/` puede migrar a nombres neutrales (`PUBLIC_API_URL`,
  `@/lib/api`, componentes sin `Payload` en el nombre).

## 4. Tecnologias usadas

Estado actual:

- Monorepo pnpm.
- `web/`: Astro 5, TypeScript, Tailwind CSS 4, Zod.
- `cms/`: Payload CMS 3, Next.js 16, React 19, PostgreSQL, S3/MinIO, Resend, Lexical.
- Infra local: macOS, Homebrew, PostgreSQL 16, MinIO.

Tecnologias previstas para el dashboard propio:

- Next.js + TypeScript para `admin/`.
- PostgreSQL como base principal.
- Drizzle ORM para schema, queries y migraciones, segun el prompt de migracion.
- S3 compatible para media, manteniendo MinIO local.
- Zod para validacion de API y formularios.
- Resend, Brevo o Amazon SES para email transaccional, sin secretos en repo.

## 5. Que se construye en FASE 0

Esta fase construye solo el artefacto de auditoria y plan de migracion:

- Inventario de colecciones Payload.
- Inventario de globals.
- Inventario de tipos usados por Astro.
- Inventario de endpoints consumidos.
- Inventario de SEO.
- Inventario de leads/formularios.
- Lista de archivos `web/` acoplados a Payload.
- Contrato API nuevo compatible.
- Estrategia de migracion de datos.
- Checklist de aceptacion para no romper la web publica.

No se construye todavia:

- App `admin/`.
- Schema PostgreSQL propio.
- Migraciones Drizzle.
- Reemplazo de `web/src/lib/payload.ts`.
- Eliminacion de dependencias Payload.

## 6. Estructura de carpetas

Estructura actual relevante:

```txt
.
|-- cms/
|   |-- src/collections/
|   |-- src/globals/
|   |-- src/leads/
|   |-- src/fields/
|   |-- src/seed/
|   `-- src/payload.config.ts
|-- web/
|   |-- src/lib/
|   |-- src/components/
|   |-- src/layouts/
|   `-- src/pages/
|-- infra/
|-- FASES.MD
|-- ANALITICA.md
`-- FASE_0_AUDITORIA_MIGRACION_PAYLOAD.md
```

Estructura futura recomendada desde FASE 1:

```txt
.
|-- admin/
|   |-- src/app/
|   |-- src/server/
|   |-- src/db/
|   |-- src/modules/
|   `-- drizzle/
|-- cms/       # temporal, hasta finalizar la migracion
|-- web/
`-- infra/
```

## 7. Archivos creados o modificados

Creado:

- `FASE_0_AUDITORIA_MIGRACION_PAYLOAD.md`

No modificados:

- `cms/`
- `web/`
- `.env.example`
- `package.json`
- `pnpm-workspace.yaml`

## 8. Codigo completo si aplica

No aplica codigo ejecutable en esta fase. El entregable es un documento operativo de
auditoria y plan. La implementacion de codigo empieza en FASE 1.

## 9. Inventario Payload actual

Configuracion central:

- `cms/src/payload.config.ts`
- PostgreSQL mediante `@payloadcms/db-postgres`.
- Email mediante `@payloadcms/email-resend`.
- SEO mediante `@payloadcms/plugin-seo`.
- Rich text mediante `@payloadcms/richtext-lexical`.
- Media mediante `@payloadcms/storage-s3`.
- Tipos generados en `cms/src/payload-types.ts`.

Colecciones registradas:

| Coleccion      | Archivo                               | Uso principal                 | Publica            |
| -------------- | ------------------------------------- | ----------------------------- | ------------------ |
| `users`        | `cms/src/collections/Users.ts`        | Usuarios admin/editor         | No                 |
| `media`        | `cms/src/collections/Media.ts`        | Uploads, imagenes y metadatos | Si                 |
| `services`     | `cms/src/collections/Services.ts`     | Catalogo de servicios         | Publicada          |
| `projects`     | `cms/src/collections/Projects.ts`     | Portafolio/casos              | Publicada          |
| `posts`        | `cms/src/collections/Posts.ts`        | Blog                          | Publicada          |
| `categories`   | `cms/src/collections/Categories.ts`   | Categorias de blog            | Si                 |
| `clients`      | `cms/src/collections/Clients.ts`      | Logos/clientes                | Si                 |
| `testimonials` | `cms/src/collections/Testimonials.ts` | Testimonios                   | Si                 |
| `team-members` | `cms/src/collections/TeamMembers.ts`  | Equipo/autores                | Si                 |
| `faqs`         | `cms/src/collections/FAQs.ts`         | Preguntas frecuentes          | Si                 |
| `leads`        | `cms/src/collections/Leads.ts`        | CRM y formularios             | No, salvo endpoint |
| `landings`     | `cms/src/collections/Landings.ts`     | Landings SEO locales          | Publicada          |
| `redirects`    | `cms/src/collections/Redirects.ts`    | Redirecciones editables       | Si                 |

Globals registrados:

| Global          | Archivo                           | Uso en web                                       |
| --------------- | --------------------------------- | ------------------------------------------------ |
| `site-settings` | `cms/src/globals/SiteSettings.ts` | SEO default, contacto, WhatsApp, Calendly, redes |
| `header`        | `cms/src/globals/Header.ts`       | Logo, navegacion, CTA                            |
| `footer`        | `cms/src/globals/Footer.ts`       | Columnas de links, copyright                     |
| `home-page`     | `cms/src/globals/HomePage.ts`     | Home completa y SEO de home                      |
| `about-page`    | `cms/src/globals/AboutPage.ts`    | Quienes somos                                    |
| `contact-page`  | `cms/src/globals/ContactPage.ts`  | Contacto                                         |

Colecciones internas de Payload presentes en tipos generados, pero no parte del dominio:

- `payload-kv`
- `payload-locked-documents`
- `payload-preferences`
- `payload-migrations`

## 10. Tipos usados por Astro

Astro importa tipos desde `@cms/types`, definido en `web/tsconfig.json` como:

```json
"@cms/types": ["../cms/src/payload-types.ts"]
```

Tipos de dominio usados:

- `Config`
- `Media`
- `Service`
- `Project`
- `Post`
- `Category`
- `Client`
- `Testimonial`
- `TeamMember`
- `Faq`
- `Landing`
- `SiteSetting`
- `Header`
- `Footer`
- `HomePage`
- `AboutPage`
- `ContactPage`

Campos estructurales que la API nueva debe conservar al inicio:

- `id` numerico.
- `createdAt`, `updatedAt`.
- `_status` en documentos con drafts.
- `slug` en documentos publicables.
- Relaciones como `number | Doc`.
- Has-many como `(number | Doc)[]`.
- Uploads como `number | Media`.
- Rich text Lexical en `content`, `answer`, `story`.

## 11. Endpoints consumidos por la web

Consumo desde `web/src/lib/payload.ts`:

- `GET /api/:collection`
- `GET /api/globals/:slug`

Consumo desde `web/astro.config.mjs`:

- `GET /api/redirects?limit=500&depth=0`

Consumo desde `web/src/components/sections/LeadForm.astro`:

- `POST /api/leads/submit`

Media:

- `Media.url`, que puede venir como URL absoluta o ruta relativa.
- Rutas relativas actuales esperadas: `/api/media/file/...`.

No se encontro consumo activo de GraphQL desde `web/`.

Parametros usados por Astro:

- `depth`
- `sort`
- `limit`
- `page`
- `where[slug][equals]`
- `where[categories][contains]`
- `where[categories][in]`
- `where[id][not_equals]`

Respuesta paginada esperada:

```ts
interface PaginatedDocs<T> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}
```

## 12. Inventario SEO

SEO editable por plugin Payload:

- `services.meta.title`
- `services.meta.description`
- `services.meta.image`
- `projects.meta.title`
- `projects.meta.description`
- `projects.meta.image`
- `posts.meta.title`
- `posts.meta.description`
- `posts.meta.image`
- `landings.meta.title`
- `landings.meta.description`
- `landings.meta.image`
- `home-page.meta.title`
- `home-page.meta.description`
- `home-page.meta.image`

SEO global:

- `site-settings.defaultSeo.title`
- `site-settings.defaultSeo.description`
- `site-settings.defaultSeo.ogImage`

SEO estatico o calculado en Astro:

- Titulos y descripciones de paginas legales, listados, contacto, asesoria y cotizacion.
- Canonical generado por `web/src/components/SEO.astro`.
- `noindex` en `/gracias` y 404.
- `robots.txt` generado en `web/src/pages/robots.txt.ts`.
- Sitemap con `@astrojs/sitemap`.
- RSS en `web/src/pages/rss.xml.ts`.

JSON-LD:

- Organization.
- LocalBusiness/ProfessionalService.
- Service.
- FAQPage.
- Article.
- BreadcrumbList.

## 13. Inventario leads y formularios

Formulario publico en:

- `web/src/components/sections/LeadForm.astro`

Paginas que lo usan:

- `web/src/pages/contacto.astro`
- `web/src/pages/cotizacion.astro`
- `web/src/pages/asesoria.astro`

Tipos de formulario:

- `contacto`
- `asesoria`
- `cotizacion`

Campos enviados:

- `formType`
- `name`
- `email`
- `phone`
- `company`
- `service`
- `budget`
- `message`
- `source`
- `utm.source`
- `utm.medium`
- `utm.campaign`
- `utm.term`
- `utm.content`
- `website` como honeypot

Estados de lead:

- `new`
- `contacted`
- `won`
- `lost`

Opciones de presupuesto:

- `lt-1500`
- `1500-5000`
- `5000-15000`
- `gt-15000`
- `unknown`

Comportamiento obligatorio en la API nueva:

- Validacion equivalente con Zod.
- Honeypot: si `website` llega con valor, responder exito sin guardar.
- Rate limit por IP con respuesta 429.
- Guardar lead con `status: "new"`.
- Enviar notificacion interna y confirmacion al usuario sin bloquear la respuesta.
- Mantener respuestas `{ ok: true, id }`, `{ ok: false, errors }` y `{ ok: false, message }`.

## 14. Archivos `web/` acoplados a Payload

Acoplamiento directo fuerte:

- `web/src/lib/payload.ts`
- `web/src/lib/media.ts`
- `web/src/components/PayloadImage.astro`
- `web/src/components/sections/RichText.astro`
- `web/src/components/sections/LeadForm.astro`
- `web/astro.config.mjs`
- `web/tsconfig.json`

Acoplamiento por tipos o helpers:

- `web/src/lib/blog.ts`
- `web/src/lib/schema.ts`
- `web/src/layouts/BaseLayout.astro`
- `web/src/components/Header.astro`
- `web/src/components/Footer.astro`
- `web/src/components/sections/LogoWall.astro`
- `web/src/components/sections/TestimonialCard.astro`
- `web/src/components/sections/PostCard.astro`
- `web/src/components/sections/PostGrid.astro`
- `web/src/components/sections/ProjectCard.astro`
- `web/src/components/sections/ServiceCard.astro`
- `web/src/components/sections/FaqAccordion.astro`
- `web/src/components/sections/CategoryChips.astro`

Paginas con consumo de API Payload:

- `web/src/pages/index.astro`
- `web/src/pages/contacto.astro`
- `web/src/pages/asesoria.astro`
- `web/src/pages/cotizacion.astro`
- `web/src/pages/quienes-somos.astro`
- `web/src/pages/rss.xml.ts`
- `web/src/pages/[slug].astro`
- `web/src/pages/servicios/index.astro`
- `web/src/pages/servicios/[slug].astro`
- `web/src/pages/portafolio/index.astro`
- `web/src/pages/portafolio/[slug].astro`
- `web/src/pages/blog/index.astro`
- `web/src/pages/blog/[slug].astro`
- `web/src/pages/blog/pagina/[page].astro`
- `web/src/pages/blog/categoria/[slug].astro`

## 15. Contrato API propio compatible

Variables:

- Mantener `PUBLIC_PAYLOAD_API_URL` durante la transicion si evita tocar Astro.
- Introducir despues `PUBLIC_API_URL` y adaptar `web/src/lib/payload.ts` a un nombre neutral.

Colecciones:

```txt
GET /api/:collection?depth=1&sort=order&limit=100&page=1
```

Debe devolver:

```json
{
  "docs": [],
  "totalDocs": 0,
  "limit": 100,
  "totalPages": 1,
  "page": 1,
  "pagingCounter": 1,
  "hasPrevPage": false,
  "hasNextPage": false,
  "prevPage": null,
  "nextPage": null
}
```

Globals:

```txt
GET /api/globals/site-settings?depth=1
GET /api/globals/header?depth=1
GET /api/globals/footer?depth=1
GET /api/globals/home-page?depth=2
GET /api/globals/about-page?depth=2
GET /api/globals/contact-page?depth=1
```

Leads:

```txt
POST /api/leads/submit
Content-Type: application/json
```

Exito:

```json
{ "ok": true, "id": 123 }
```

Error de validacion:

```json
{ "ok": false, "errors": { "email": ["Invalid email"] } }
```

Rate limit:

```json
{
  "ok": false,
  "message": "Demasiados envios seguidos. Espera unos minutos e intentalo de nuevo."
}
```

Media:

```ts
interface PublicMedia {
  id: number
  alt: string
  url?: string | null
  thumbnailURL?: string | null
  filename?: string | null
  mimeType?: string | null
  filesize?: number | null
  width?: number | null
  height?: number | null
}
```

Rich text:

- Mantener Lexical JSON inicialmente.
- No cambiar `RichText.astro` hasta que exista adaptador o conversor propio.

## 16. Estrategia de migracion de datos

Orden de exportacion desde Payload:

1. `media`
2. `categories`
3. `clients`
4. `faqs`
5. `team-members`
6. `services`
7. `testimonials`
8. `projects`
9. `posts`
10. `landings`
11. `redirects`
12. globals
13. `leads`
14. `users`, si se decide migrar cuentas administrativas

Reglas:

- Exportar con `depth: 0` para capturar IDs y relaciones originales.
- Crear mapa por tabla: `payload_id -> new_id`.
- Importar media primero para reconstruir uploads.
- Reconstruir relaciones despues de insertar registros base.
- Mantener `createdAt`, `updatedAt`, `publishedAt` y `_status`.
- Migrar `meta` y `defaultSeo` sin cambiar nombres durante compatibilidad.
- Migrar `utm`, `status`, `notes`, `budget` y `service` en leads.

Media:

- Copiar metadata de `media`.
- Conservar objetos del bucket actual inicialmente.
- Mantener compatibilidad con `/api/media/file/...`.
- Si cambia bucket o path, crear rewrite o redirect antes de cambiar `Media.url`.

Rollback:

- No eliminar `cms/`.
- No modificar tablas Payload.
- Mantener `PUBLIC_PAYLOAD_API_URL` apuntable a Payload mientras la API propia se valida.
- Poder volver a levantar `pnpm dev:cms` y `pnpm dev:web` sin cambios.

## 17. Implementacion local en macOS con Homebrew

Comandos de referencia:

```sh
# desde /Users/ramiro/Downloads/CODE/zift
make status

# desde /Users/ramiro/Downloads/CODE/zift
make start

# desde /Users/ramiro/Downloads/CODE/zift
pnpm dev:cms

# desde /Users/ramiro/Downloads/CODE/zift
pnpm dev:web
```

Servicios locales requeridos para verificar contenido real:

- PostgreSQL 16 por Homebrew.
- MinIO local para media.
- Payload en `http://localhost:3000`.
- Astro en `http://localhost:4321`.

## 18. Verificacion

Verificacion documental de FASE 0:

```sh
# desde /Users/ramiro/Downloads/CODE/zift
pnpm format:check
```

Verificacion antes de cambiar `web/` a API propia:

```sh
# desde /Users/ramiro/Downloads/CODE/zift
pnpm --filter web typecheck

# desde /Users/ramiro/Downloads/CODE/zift
pnpm --filter web build

# desde /Users/ramiro/Downloads/CODE/zift
pnpm typecheck
```

Escenarios manuales minimos:

- Home.
- Servicios listado y detalle.
- Portafolio listado y detalle.
- Blog listado, paginacion, categoria y detalle.
- Landings SEO en raiz.
- Contacto.
- Asesoria con Calendly y fallback con formulario.
- Cotizacion con `?servicio=slug`.
- RSS.
- Robots.
- Sitemap.
- Redirecciones.

## 19. Errores comunes y solucion

- La web no compila porque no corre el CMS: levantar Payload o apuntar la variable a la API compatible.
- Las imagenes no cargan: revisar `Media.url`, MinIO y compatibilidad con `/api/media/file/...`.
- Faltan relaciones pobladas: revisar soporte de `depth`.
- Las categorias del blog no filtran: revisar `where[categories][contains]`.
- Los relacionados del blog fallan: revisar `where[categories][in]` y `where[id][not_equals]`.
- Los formularios fallan por CORS: replicar headers CORS permitiendo `WEB_URL`.
- Los emails bloquean el submit: enviarlos fuera del camino critico.
- SEO pierde imagen OG: migrar `meta.image` y `defaultSeo.ogImage` con media poblada.
- Redirecciones no entran al build: asegurar `GET /api/redirects?limit=500&depth=0`.

## 20. Seguridad

- No commitear `.env` ni secretos.
- Mantener endpoint publico de leads con Zod, honeypot y rate limit.
- No exponer colecciones administrativas por la API publica.
- Sanitizar campos de texto libre antes de guardar leads.
- Mantener CORS restringido a `WEB_URL`.
- Migrar usuarios solo con hashing seguro, nunca contrasenas en texto plano.
- Registrar auditoria de cambios en el dashboard propio en fases posteriores.
- Mantener Payload como rollback hasta que la API propia este verificada.

## 21. Rendimiento

- La web Astro consume contenido durante build/dev, por lo que la API propia debe responder rapido.
- Mantener paginacion en colecciones.
- Resolver `depth` solo hasta lo necesario.
- Cachear globals en produccion como hace `getCachedGlobal`.
- No servir imagenes pesadas sin metadata `width` y `height`.
- Evitar N+1 en relaciones frecuentes: home, blog, servicios, proyectos y landings.

## 22. Escalabilidad

- Separar tablas de dominio de tablas internas del dashboard.
- Mantener IDs y mapas de migracion para reintentos idempotentes.
- Preparar `lead_notes` o historial de seguimiento si el CRM crece.
- Mover rate limit a Redis o almacenamiento compartido si hay multiples instancias.
- Mantener media en S3 compatible para no depender del filesystem local.
- Documentar contratos antes de reemplazar imports en `web/`.

## 23. Commit recomendado

```txt
docs: add fase 0 payload migration audit
```

## 24. Checklist final

- [x] Inventario de colecciones Payload.
- [x] Inventario de globals.
- [x] Inventario de tipos usados por Astro.
- [x] Inventario de endpoints consumidos.
- [x] Inventario de campos SEO.
- [x] Inventario de leads/formularios.
- [x] Archivos `web/` acoplados a Payload identificados.
- [x] Contrato API nuevo definido.
- [x] Estrategia de migracion de datos definida.
- [x] Payload no eliminado.
- [x] Web publica no modificada.
- [x] FASE 1 no iniciada.
