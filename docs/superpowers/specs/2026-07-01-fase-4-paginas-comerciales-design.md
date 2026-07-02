# Diseño FASE 4 — Páginas comerciales core

**Fecha:** 2026-07-01 · **Estado:** aprobado · **Spec origen:** `docs/FASES.MD` §8, FASE 4

## Objetivo

Construir las 6 páginas comerciales que venden los servicios de la agencia — Home,
Servicios, Detalle de servicio dinámico, Quiénes somos, Contacto y Gracias — todas
navegables, con contenido 100% editable desde Payload y SEO por página. Incluye las
extensiones de modelo y seed que esas páginas necesitan. Resultado: sitio navegable,
profesional, comercial y conectado a Payload.

## Punto de partida (FASES 2–3)

Ya existen y no se rehacen:

- **CMS:** colecciones `services` (title/slug/excerpt/icon/image/content/features/order
  + `meta` del plugin SEO), `projects`, `clients`, `testimonials`, `team-members`,
  `faqs`, `leads` (`create: anyone` para el form público), `posts`, `categories`,
  `redirects`; globals `home-page` (hero + stats + secciones de servicios/proyectos/
  testimonios + ctaSection), `header`, `footer`, `site-settings` (email, phone,
  whatsapp, address, redes, defaultSeo). Seed idempotente con los 14 servicios y globals.
- **Web:** Astro 5 estático + Tailwind 4 con tokens propios, UI kit (`Button`, `Card`,
  `Container`, `Eyebrow`, `Heading`, `Section`, `Text`), `BaseLayout` (Header/Footer/SEO
  con noindex), cliente Payload tipado (`getCollection`, `getBySlug`, `getCachedGlobal`),
  helpers de media. Solo existe `index.astro` (demo FASE 3, se reemplaza).

## Decisiones

### 1. Modelado: secciones fijas tipadas (no page-builder)

Extender el modelo existente con grupos/arrays específicos por sección, siguiendo el
patrón exacto de FASE 2. Descartados: page-builder con blocks reordenables
(sobre-ingeniería para 6 páginas de estructura fija definida en FASES.MD) y copy
hardcodeado en Astro (incumple «conectado a Payload» y FASE 16 espera editar el copy
desde el admin).

Todas las secciones nuevas son **opcionales**: el frontend solo renderiza una sección
si tiene contenido.

**Global `home-page` — secciones nuevas** (mapeo FASES.MD → modelo; lo demás ya existe):

| Requisito FASE 4    | Campo                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Propuesta de valor  | `valueProposition` group {title, text}                                                       |
| Beneficios          | `benefits` group {title, items[{title, text}]}                                               |
| Proceso de trabajo  | `process` group {title, subtitle, steps[{title, text}]}                                      |
| Logos de clientes   | `clientsSection` group {title} — logos = colección `clients` completa ordenada por `order`   |
| Bloque de confianza | `trustBlock` group {title, text, items[{text}]} — se muestra junto a los `stats` existentes  |
| Hero / CTAs / destacados / testimonios / CTA final | ya existen (hero.primaryCta, hero.secondaryCta, servicesSection, projectsSection, testimonialsSection, ctaSection) |

**Colección `services` — campos nuevos** (mapeo detalle de servicio):

| Requisito FASE 4     | Campo                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| H1 + descripción     | `title` + `excerpt` + `content` (ya existen)                                      |
| Beneficios           | `benefits` array {title, text} (nuevo)                                            |
| Qué incluye          | `features` existente, re-etiquetado «Qué incluye» (mismo `name`, sin migración)   |
| Proceso              | `process` array {title, text} (nuevo)                                             |
| Casos relacionados   | `relatedProjects` relationship → projects, hasMany (nuevo)                        |
| Preguntas frecuentes | `faqs` relationship → faqs, hasMany (nuevo)                                       |
| CTA a asesoría       | link fijo en frontend a `/contacto?servicio=<slug>`                               |
| SEO específico       | grupo `meta` del plugin (ya existe)                                               |

**Global nuevo `about-page`** (drafts, como home-page): `intro` group {eyebrow, title,
text, image}, `story` richText, `values` array {title, text}, `teamSection` group
{title, subtitle} (los miembros salen de la colección `team-members` por `order`),
`cta` group (title, text, botón con `ctaFields`).

**Global nuevo `contact-page`** (drafts): {title, text}. Los datos de contacto (email,
teléfono, WhatsApp, dirección, redes) ya viven en `site-settings` — no se duplican.

Tras el modelado: `pnpm generate:types` (los tipos los consume web vía `@cms/types`).

### 2. Seed: idempotente por sección/campo, con contenido comercial real

- **Servicios existentes:** completar `benefits`, `process` y `faqs` **solo si el campo
  está vacío** — la DB de dev ya está sembrada y el seed de FASE 2 solo crea documentos
  nuevos; sin esta idempotencia por campo, los servicios existentes quedarían sin las
  secciones nuevas.
- **Datos nuevos:** clientes (5–6, con logos SVG placeholder versionados en
  `cms/src/seed/assets/`), testimonios (4), FAQs (8 generales; cada servicio referencia
  3–4), equipo (3–4 miembros), 3 proyectos de ejemplo publicados para que «casos
  destacados» renderice (FASE 5 los expande con el modelo completo de caso de éxito).
- **Globals:** `home-page` (secciones nuevas, solo si vacías, sin tocar hero editado),
  `about-page` y `contact-page` poblados con copy comercial ZiftLab real (tono del seed
  de FASE 2, español).
- **Nav:** el seed de `header`/`footer` pasa a enlazar solo páginas existentes —
  Servicios, Quiénes somos, Contacto + CTA «Agenda una asesoría» → `/contacto`. Los
  enlaces a Portafolio y Blog vuelven en FASES 5–6. Como ese seed solo escribe si el
  global está vacío, en una DB ya sembrada el nav se ajusta una vez desde el admin
  (queda anotado en la verificación).

### 3. Páginas: Astro estático, fetch en build

Sin adapter SSR — se mantiene la salida estática de FASE 3; todos los datos se piden a
Payload en build. Rutas:

- **`/`** — orden de secciones: Hero → Propuesta de valor → Servicios destacados →
  Beneficios → Proceso → Logos de clientes → Casos destacados → Testimonios → Bloque
  de confianza (+stats) → CTA final. Reemplaza el `index.astro` demo de FASE 3.
- **`/servicios`** — hero corto + grid de todos los servicios publicados (icono,
  título, excerpt, link al detalle).
- **`/servicios/[slug]`** — `getStaticPaths` sobre servicios publicados (`depth: 1`
  para resolver media, proyectos y FAQs). Estructura: H1 único + excerpt + imagen →
  `content` (rich text) → beneficios → qué incluye → proceso → casos relacionados (solo
  si hay) → FAQs → CTA a asesoría → `meta` del plugin en `<head>` con fallback al
  patrón `"<título> | ZiftLab"` + excerpt.
- **`/quienes-somos`** — global `about-page` + grid de `team-members`.
- **`/contacto`** — intro del global + datos de contacto de `site-settings` +
  formulario de lead.
- **`/gracias`** — confirmación de lead, `noindex` (el componente SEO ya lo soporta),
  CTAs de vuelta (inicio / servicios).

**Componentes** en `web/src/components/sections/` sobre el UI kit existente, diseñados
para reuso entre páginas (p. ej. `CTASection` y `TestimonialsSection` sirven en home,
detalle de servicio y quiénes somos): `RichText`, `FaqAccordion` (details/summary
nativo, accesible, sin JS), `LeadForm`, `ServiceCard`, `LogoWall`, `ProcessSteps`,
`BenefitsGrid`, etc. Nombres definitivos en el plan de implementación.

### 4. Dirección visual: «catálogo de laboratorio» (skill frontend-design)

El design system de FASE 3 ya fija paleta (papel de laboratorio + tinta, firma ultramar
`zift`), tipografía (Archivo Variable expandida 125% display, Archivo cuerpo, IBM Plex
Mono señalética) y componentes. FASE 4 no añade tokens ni caras nuevas: define cómo se
usan en las páginas comerciales.

- **Firma de la fase — servicios como especímenes de catálogo:** cada servicio lleva un
  código de catálogo en mono (`SRV-01`…`SRV-14`, derivado del campo `order` existente)
  con reglas hairline de índice en tarjetas y en el H1 del detalle. El código encodea
  información real (posición en el catálogo de 14 servicios). Es el único gesto audaz:
  el resto de la página se mantiene quieto.
- **Ritmo cromático:** la home abre en tinta — hero oscuro (`ink`) con retícula de
  papel milimétrico dibujada con `ink-line` y acentos `zift-glow` — y cierra en tinta
  (CTA final): bookend del laboratorio. El cuerpo alterna `paper`/`surface`; la sección
  de proceso vuelve a tinta. El proceso es una secuencia real, así que lleva numeración
  mono de dos dígitos según el orden de los pasos (la numeración encodea orden
  verdadero; no se usa como decoración en ninguna otra sección).
- **Interior de servicio:** en paper (es página de lectura y conversión), con el código
  de espécimen y las hairlines como única herencia del catálogo.
- **Motion:** casi nulo en FASE 4 — hovers/focus del UI kit; lo premium llega en FASE 9.
  `prefers-reduced-motion` ya está respetado globalmente.
- **Copy:** español directo, voz activa, específico antes que ingenioso («Agenda una
  asesoría»); el vocabulario se mantiene consistente en todo el flujo (el CTA del nav,
  el del hero y el del detalle de servicio nombran la misma acción). Los errores del
  formulario dicen qué pasó y cómo continuar, sin disculpas vagas.
- **Autocrítica anti-default:** no es crema+serif+terracota, ni negro+verde ácido
  (neutros fríos + ultramar con textura de retícula de laboratorio), ni broadsheet (las
  hairlines funcionan como índice de catálogo técnico, no como maqueta de periódico).
  Piso de calidad sin anunciarlo: responsive hasta móvil, focus visible, reduced motion.

### 5. Rich text: conversor oficial Lexical → HTML en build

`RichText.astro` usa `convertLexicalToHTML` de `@payloadcms/richtext-lexical/html`,
añadido como devDependency de `web/` en la **misma versión exacta 3.85.2** que el resto
de paquetes Payload (convención del repo). Corre solo en build (salida estática): no
llega nada al bundle del cliente. Estilos tipográficos `.rich-text` en `global.css` con
los tokens del design system (h2/h3, párrafos, listas, links, strong) — no se usa
`@tailwindcss/typography`, la paleta default está deshabilitada.

**Fallback previsto:** si el paquete choca con los gotchas de vite/pnpm del monorepo
(CLAUDE.md §gotchas), serializador propio mínimo en `web/src/lib/richtext.ts` para los
node types que produce el seed (párrafos, headings, listas, links, marcas de formato).

### 6. Formulario de contacto: funcional básico (hardening en FASE 7)

- **Campos:** nombre*, email*, teléfono, empresa, servicio de interés (select poblado
  con los servicios publicados en build; preseleccionable por query param
  `?servicio=<slug>`, leído con un script mínimo), mensaje. Validación HTML5 nativa
  (`required`, `type="email"`).
- **Envío:** script de navegador — `fetch` POST JSON a
  `${PUBLIC_PAYLOAD_API_URL}/api/leads` (la colección ya tiene `create: anyone` y el
  CORS de FASE 1 permite el origen del web). Se envía `source: "formulario-contacto"`
  fijo. Botón deshabilitado + estado «Enviando…» durante el POST
  para evitar dobles envíos.
- **Resultado:** éxito → `window.location = '/gracias'`; error → mensaje inline junto
  al botón sin perder lo escrito (incluye el caso «CMS caído»).
- **Queda para FASE 7 (explícitamente fuera de alcance):** Zod, honeypot, rate
  limiting, notificación por email, email de confirmación, formularios de asesoría y
  cotización, WhatsApp flotante, Calendly, eventos de conversión. El markup se diseña
  para que FASE 7 lo endurezca sin rehacerlo.

### 7. SEO por página

`BaseLayout` ya mezcla props de página con `defaultSeo`. Títulos/descripciones por
página: home usa `home-page.meta` (plugin) con fallback a `defaultSeo`; detalle de
servicio usa su `meta`; el resto (`/servicios`, `/quienes-somos`, `/contacto`,
`/gracias`) llevan título/descripción propios definidos en la página. `/gracias` con
`noindex`. Schema.org/JSON-LD queda para FASE 8.

### 8. Límites de fase

- Casos destacados: tarjetas **sin enlace** al detalle hasta que FASE 5 cree
  `/portafolio/[slug]`.
- Nav sin Portafolio ni Blog (FASES 5–6). Footer solo con enlaces que resuelven.
- Sin animaciones/microinteracciones premium (FASE 9), sin sitemap/robots avanzado
  (FASE 8), sin tests automatizados (FASE 15).

## Verificación

1. `pnpm lint`, `pnpm typecheck`, `pnpm format:check` y `pnpm build` (cms y web) en
   verde desde `/`.
2. Con el stack arriba (`make start`) y seed aplicado: recorrer `/`, `/servicios`,
   `/servicios/desarrollo-web`, `/quienes-somos`, `/contacto`, `/gracias` — todas las
   secciones de FASES.MD §FASE 4 visibles con contenido de Payload.
3. Enviar el formulario → lead visible en `/admin` con servicio y source → redirect a
   `/gracias`.
4. Ver el `<head>` de un detalle de servicio: title/description/OG propios.
5. Ajustar el nav del header en el admin de la DB dev ya sembrada (quitar
   Portafolio/Blog).
6. Revisión visual responsive (móvil y desktop) de las 6 páginas contra la dirección
   visual de §4.
7. Respuesta final al usuario en el formato de 16 secciones de FASES.MD §7.
