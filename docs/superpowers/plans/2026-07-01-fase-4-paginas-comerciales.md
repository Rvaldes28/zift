# FASE 4 — Páginas comerciales core: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Las 6 páginas comerciales (Home, Servicios, Detalle de servicio, Quiénes somos, Contacto, Gracias) navegables y conectadas a Payload, con las extensiones de modelo y seed que necesitan.

**Architecture:** Se extiende el CMS con secciones fijas tipadas (global `home-page`, colección `services`, globals nuevos `about-page`/`contact-page`), se amplía el seed idempotente con contenido comercial real, y se construyen las páginas en Astro estático consumiendo la REST API en build. Dirección visual «catálogo de laboratorio» sobre los tokens de FASE 3 (spec §4).

**Tech Stack:** Payload CMS 3.85.2 (Next 16, Postgres), Astro 5 + Tailwind 4, `@payloadcms/richtext-lexical/html` para rich text.

**Spec:** `docs/superpowers/specs/2026-07-01-fase-4-paginas-comerciales-design.md`

## Global Constraints

- Paquetes Payload **siempre pinneados exactos a `3.85.2`** (sin `^`).
- Solo tokens ZiftLab (paper/surface/line/muted/ink/ink-2/ink-line/ink-muted/zift/zift-deep/zift-tint/zift-glow/ok/danger) — la paleta default de Tailwind está deshabilitada.
- Todo el copy en español; el CTA se llama siempre «Agenda una asesoría» y apunta a `/contacto`.
- Comandos de calidad desde la raíz del repo: `pnpm lint && pnpm typecheck && pnpm format:check`. Deben pasar antes de cada commit. `pnpm format` los arregla.
- `pnpm generate:types` se corre **desde `/cms`** tras cada cambio de modelo; `cms/src/payload-types.ts` nunca se edita a mano.
- El seed (`pnpm seed` desde `/cms`) necesita PostgreSQL y MinIO arriba (`make start` desde `/`).
- No tocar alcance de fases posteriores: sin páginas de portafolio/blog, sin Zod/honeypot/emails, sin JSON-LD, sin animaciones premium.
- Commits con el formato del repo (`feat(cms):`, `feat(web):`, `docs:`, …).

---

### Task 1: CMS — secciones nuevas del global `home-page`

**Files:**
- Modify: `cms/src/globals/HomePage.ts`

**Interfaces:**
- Produces (tipos generados que consume web): `HomePage['valueProposition']` {title?, text?}, `HomePage['benefits']` {title?, items?[{title, text?}]}, `HomePage['process']` {title?, subtitle?, steps?[{title, text?}]}, `HomePage['clientsSection']` {title?}, `HomePage['trustBlock']` {title?, text?, items?[{text}]}.

- [ ] **Step 1: Insertar `valueProposition` tras el group `hero`**

En `cms/src/globals/HomePage.ts`, justo después del cierre del group `hero` (línea `},` tras el campo `image`) y antes de `stats`, insertar:

```ts
    {
      name: 'valueProposition',
      type: 'group',
      label: 'Propuesta de valor',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'text',
          type: 'textarea',
        },
      ],
    },
```

- [ ] **Step 2: Anotar dónde se pintan las `stats`**

Al campo `stats` existente, dentro de su `label`, no se cambia nada; añadir `admin.description`:

```ts
    {
      name: 'stats',
      type: 'array',
      label: 'Cifras destacadas',
      maxRows: 4,
      admin: {
        description: 'Se muestran dentro del bloque de confianza',
      },
      fields: [
```

- [ ] **Step 3: Insertar `benefits` y `process` tras `servicesSection`**

Después del cierre de `servicesSection` y antes de `projectsSection`:

```ts
    {
      name: 'benefits',
      type: 'group',
      label: 'Beneficios',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'items',
          type: 'array',
          maxRows: 6,
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
            },
            {
              name: 'text',
              type: 'textarea',
            },
          ],
        },
      ],
    },
    {
      name: 'process',
      type: 'group',
      label: 'Proceso de trabajo',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'subtitle',
          type: 'textarea',
        },
        {
          name: 'steps',
          type: 'array',
          maxRows: 6,
          admin: {
            description: 'Secuencia real de trabajo — el frontend los numera en orden',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
            },
            {
              name: 'text',
              type: 'textarea',
            },
          ],
        },
      ],
    },
    {
      name: 'clientsSection',
      type: 'group',
      label: 'Logos de clientes',
      admin: {
        description: 'Los logos salen de la colección Clientes, ordenada por su campo order',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
        },
      ],
    },
```

- [ ] **Step 4: Insertar `trustBlock` tras `testimonialsSection`**

Después del cierre de `testimonialsSection` y antes de `ctaSection`:

```ts
    {
      name: 'trustBlock',
      type: 'group',
      label: 'Bloque de confianza',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'text',
          type: 'textarea',
        },
        {
          name: 'items',
          type: 'array',
          maxRows: 6,
          label: 'Garantías',
          fields: [
            {
              name: 'text',
              type: 'text',
              required: true,
            },
          ],
        },
      ],
    },
```

- [ ] **Step 5: Regenerar tipos y quality gate**

```bash
# desde /cms
pnpm generate:types
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
```

Expected: tipos regenerados sin error; los tres comandos en verde. `git diff cms/src/payload-types.ts` muestra los campos nuevos en `HomePage`.

- [ ] **Step 6: Commit**

```bash
# desde /
git add cms/src/globals/HomePage.ts cms/src/payload-types.ts
git commit -m "feat(cms): secciones FASE 4 del global home-page"
```

---

### Task 2: CMS — campos nuevos de la colección `services`

**Files:**
- Modify: `cms/src/collections/Services.ts`

**Interfaces:**
- Produces: `Service['benefits']` [{title, text?}], `Service['process']` [{title, text?}], `Service['relatedProjects']` (number | Project)[], `Service['faqs']` (number | Faq)[]; `features` conserva su `name` (solo cambia el label a «Qué incluye»).

- [ ] **Step 1: Re-etiquetar `features` e insertar los campos nuevos**

En `cms/src/collections/Services.ts`, cambiar el label del array `features`:

```ts
    {
      name: 'features',
      type: 'array',
      label: 'Qué incluye',
      fields: [
```

Después del cierre de `features` y antes de `order`, insertar:

```ts
    {
      name: 'benefits',
      type: 'array',
      label: 'Beneficios',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'text',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'process',
      type: 'array',
      label: 'Proceso',
      admin: {
        description: 'Secuencia real de trabajo — el frontend los numera en orden',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'text',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'relatedProjects',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: true,
      label: 'Casos relacionados',
    },
    {
      name: 'faqs',
      type: 'relationship',
      relationTo: 'faqs',
      hasMany: true,
      label: 'Preguntas frecuentes',
    },
```

- [ ] **Step 2: Regenerar tipos y quality gate**

```bash
# desde /cms
pnpm generate:types
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
```

Expected: verde; `Service` en `payload-types.ts` tiene `benefits`, `process`, `relatedProjects`, `faqs`.

- [ ] **Step 3: Commit**

```bash
# desde /
git add cms/src/collections/Services.ts cms/src/payload-types.ts
git commit -m "feat(cms): beneficios, proceso, casos y FAQs relacionados en services"
```

---

### Task 3: CMS — globals nuevos `about-page` y `contact-page`

**Files:**
- Create: `cms/src/globals/AboutPage.ts`
- Create: `cms/src/globals/ContactPage.ts`
- Modify: `cms/src/payload.config.ts` (registro en `globals`)

**Interfaces:**
- Produces: globals `about-page` y `contact-page` en la REST API (`/api/globals/about-page`), tipos `AboutPage` y `ContactPage`. El CTA de about usa la forma {title?, text?, cta: {label?, href?, newTab?}} — la misma que `HomePage['ctaSection']`, para que el componente web `CTASection` sirva a ambos.

- [ ] **Step 1: Crear `cms/src/globals/AboutPage.ts`**

```ts
import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'
import { ctaFields } from '../fields/link'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: 'Quiénes somos',
  admin: {
    group: 'Contenido',
  },
  versions: {
    drafts: true,
  },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'intro',
      type: 'group',
      fields: [
        {
          name: 'eyebrow',
          type: 'text',
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'text',
          type: 'textarea',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'story',
      type: 'richText',
      label: 'Nuestra historia',
    },
    {
      name: 'values',
      type: 'array',
      label: 'Valores',
      maxRows: 6,
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'text',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'teamSection',
      type: 'group',
      label: 'Sección de equipo',
      admin: {
        description: 'Los miembros salen de la colección Equipo, ordenada por su campo order',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'subtitle',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'ctaSection',
      type: 'group',
      label: 'CTA final',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          name: 'text',
          type: 'textarea',
        },
        {
          name: 'cta',
          type: 'group',
          label: 'Botón',
          fields: ctaFields,
        },
      ],
    },
  ],
}
```

- [ ] **Step 2: Crear `cms/src/globals/ContactPage.ts`**

```ts
import type { GlobalConfig } from 'payload'

import { anyone, authenticated } from '../access'

export const ContactPage: GlobalConfig = {
  slug: 'contact-page',
  label: 'Contacto',
  admin: {
    group: 'Contenido',
    description: 'Los datos de contacto (email, teléfono, dirección) viven en Ajustes del sitio',
  },
  versions: {
    drafts: true,
  },
  access: {
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'text',
      type: 'textarea',
    },
  ],
}
```

- [ ] **Step 3: Registrarlos en `cms/src/payload.config.ts`**

Añadir imports junto a los demás globals y ampliar el array `globals`:

```ts
import { AboutPage } from './globals/AboutPage'
import { ContactPage } from './globals/ContactPage'
```

```ts
  globals: [Header, Footer, SiteSettings, HomePage, AboutPage, ContactPage],
```

(Respetar el orden/estilo del array existente; si el array actual lista en otro orden, añadir los dos al final.)

- [ ] **Step 4: Regenerar tipos y quality gate**

```bash
# desde /cms
pnpm generate:types
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
```

Expected: verde; `Config['globals']` incluye `'about-page'` y `'contact-page'`.

- [ ] **Step 5: Commit**

```bash
# desde /
git add cms/src/globals/AboutPage.ts cms/src/globals/ContactPage.ts cms/src/payload.config.ts cms/src/payload-types.ts
git commit -m "feat(cms): globals about-page y contact-page"
```

---

### Task 4: Seed — assets y datos de empresa (clientes, testimonios, equipo, FAQs)

**Files:**
- Create: `cms/src/seed/assets/logo-nimbo.svg`, `logo-altura.svg`, `logo-vetta.svg`, `logo-kuorum.svg`, `logo-faro.svg`, `logo-andamio.svg`
- Create: `cms/src/seed/company.ts`
- Modify: `cms/src/seed/index.ts` (llamar a `seedCompany`)

**Interfaces:**
- Consumes: `lexicalParagraphs` de `cms/src/seed/lexical.ts`.
- Produces: `seedCompany(payload): Promise<void>` — crea clients/testimonials/team-members/faqs idempotentes (por name/authorName/question). Exporta `coreFaqQuestions: string[]` (las 4 FAQs que Task 6 relaciona a cada servicio).

- [ ] **Step 1: Crear los 6 SVG de logos placeholder**

Mismo template para cada archivo, cambiando texto y `aria-label`. `cms/src/seed/assets/logo-nimbo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48" role="img" aria-label="Nimbo"><text x="80" y="31" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="3" fill="#596070">NIMBO</text></svg>
```

Los otros cinco: `ALTURA` (logo-altura.svg), `VETTA` (logo-vetta.svg), `KUORUM` (logo-kuorum.svg), `FARO` (logo-faro.svg), `ANDAMIO` (logo-andamio.svg), con `aria-label` «Altura Capital», «Vetta Estudio», «Kuorum Legal», «Faro Retail», «Andamio».

- [ ] **Step 2: Crear `cms/src/seed/company.ts`**

```ts
import path from 'path'
import { fileURLToPath } from 'url'

import type { Payload } from 'payload'

import { lexicalParagraphs } from './lexical'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Datos de empresa para las páginas comerciales (FASE 4). Placeholders
// realistas y editables desde /admin — FASE 16 los sustituye por contenido final.

const clients = [
  { name: 'Nimbo', file: 'logo-nimbo.svg', website: 'https://example.com', order: 1 },
  { name: 'Altura Capital', file: 'logo-altura.svg', website: 'https://example.com', order: 2 },
  { name: 'Vetta Estudio', file: 'logo-vetta.svg', website: 'https://example.com', order: 3 },
  { name: 'Kuorum Legal', file: 'logo-kuorum.svg', website: 'https://example.com', order: 4 },
  { name: 'Faro Retail', file: 'logo-faro.svg', website: 'https://example.com', order: 5 },
  { name: 'Andamio', file: 'logo-andamio.svg', website: 'https://example.com', order: 6 },
]

const testimonials = [
  {
    quote:
      'ZiftLab rehízo nuestro e-commerce y las ventas subieron 42% en el primer trimestre. La inversión se pagó sola.',
    authorName: 'Mariana Setién',
    authorRole: 'Directora de e-commerce, Faro Retail',
    clientName: 'Faro Retail',
    order: 1,
  },
  {
    quote:
      'Automatizaron nuestra operación de leads y hoy respondemos en minutos lo que antes tomaba días.',
    authorName: 'Diego Arriaga',
    authorRole: 'Socio, Kuorum Legal',
    clientName: 'Kuorum Legal',
    order: 2,
  },
  {
    quote:
      'Entienden de negocio, no solo de tecnología. Cada decisión técnica vino con un porqué comercial.',
    authorName: 'Lucía Ferrán',
    authorRole: 'CEO, Nimbo',
    clientName: 'Nimbo',
    order: 3,
  },
  {
    quote:
      'El sitio nuevo carga al instante y el equipo lo actualiza sin llamarnos a nadie. Justo lo que pedimos.',
    authorName: 'Roberto Anaya',
    authorRole: 'Director general, Vetta Estudio',
    clientName: 'Vetta Estudio',
    order: 4,
  },
]

const teamMembers = [
  {
    name: 'Ramiro Valdés',
    role: 'Fundador y dirección tecnológica',
    bio: 'Lidera la arquitectura y la entrega de cada proyecto, del kickoff al lanzamiento.',
    order: 1,
  },
  {
    name: 'Sofía Herrera',
    role: 'Diseño y experiencia',
    bio: 'Convierte objetivos de negocio en interfaces claras que convierten.',
    order: 2,
  },
  {
    name: 'Marco Juárez',
    role: 'Desarrollo',
    bio: 'Construye sistemas rápidos y mantenibles con TypeScript de punta a punta.',
    order: 3,
  },
]

const faqs = [
  {
    question: '¿Cuánto cuesta un proyecto?',
    answer:
      'Depende del alcance. Después de una asesoría gratuita te entregamos una propuesta cerrada, con precio y plazos claros, sin sorpresas.',
    order: 1,
  },
  {
    question: '¿Cuánto tarda un proyecto?',
    answer:
      'Un sitio comercial típico toma de 4 a 8 semanas. Los proyectos más grandes se entregan por fases, con avances visibles desde la primera semana.',
    order: 2,
  },
  {
    question: '¿El código y el contenido son míos?',
    answer:
      'Sí. Todo lo que construimos —código, diseño, contenido y cuentas— queda a tu nombre desde el día uno.',
    order: 3,
  },
  {
    question: '¿Cómo empezamos?',
    answer:
      'Agenda una asesoría gratuita. En una llamada de 30 minutos entendemos tu caso y te decimos si podemos ayudarte y cómo.',
    order: 4,
  },
  {
    question: '¿Qué pasa después del lanzamiento?',
    answer:
      'Ofrecemos planes de soporte y mejora continua, o te dejamos todo documentado para que tu equipo lo opere.',
    order: 5,
  },
  {
    question: '¿Puedo editar el contenido yo mismo?',
    answer:
      'Sí. Entregamos un panel de administración desde el que tu equipo edita textos, imágenes y páginas sin tocar código.',
    order: 6,
  },
  {
    question: '¿Con qué tecnologías trabajan?',
    answer:
      'Tecnología moderna y probada: Astro, Next.js, TypeScript, Payload CMS y PostgreSQL, entre otras. Elegimos según el proyecto, no al revés.',
    order: 7,
  },
  {
    question: '¿Trabajan con empresas fuera de México?',
    answer: 'Sí, trabajamos en remoto con clientes de toda Latinoamérica y España.',
    order: 8,
  },
]

// Las 4 FAQs núcleo que se relacionan a cada servicio (Task 6 del plan FASE 4)
export const coreFaqQuestions = faqs.slice(0, 4).map((faq) => faq.question)

export const seedCompany = async (payload: Payload): Promise<void> => {
  let created = 0
  let skipped = 0

  for (const client of clients) {
    const existing = await payload.find({
      collection: 'clients',
      where: { name: { equals: client.name } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }
    const logo = await payload.create({
      collection: 'media',
      data: { alt: `Logo de ${client.name}` },
      filePath: path.resolve(dirname, 'assets', client.file),
    })
    await payload.create({
      collection: 'clients',
      data: {
        name: client.name,
        logo: logo.id,
        website: client.website,
        order: client.order,
      },
    })
    created += 1
  }
  payload.logger.info(`Seed de clientes: ${created} creados, ${skipped} ya existían`)

  created = 0
  skipped = 0
  for (const testimonial of testimonials) {
    const existing = await payload.find({
      collection: 'testimonials',
      where: { authorName: { equals: testimonial.authorName } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }
    const client = await payload.find({
      collection: 'clients',
      where: { name: { equals: testimonial.clientName } },
      limit: 1,
    })
    await payload.create({
      collection: 'testimonials',
      data: {
        quote: testimonial.quote,
        authorName: testimonial.authorName,
        authorRole: testimonial.authorRole,
        client: client.docs[0]?.id ?? null,
        order: testimonial.order,
      },
    })
    created += 1
  }
  payload.logger.info(`Seed de testimonios: ${created} creados, ${skipped} ya existían`)

  created = 0
  skipped = 0
  for (const member of teamMembers) {
    const existing = await payload.find({
      collection: 'team-members',
      where: { name: { equals: member.name } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }
    await payload.create({
      collection: 'team-members',
      data: member,
    })
    created += 1
  }
  payload.logger.info(`Seed de equipo: ${created} creados, ${skipped} ya existían`)

  created = 0
  skipped = 0
  for (const faq of faqs) {
    const existing = await payload.find({
      collection: 'faqs',
      where: { question: { equals: faq.question } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }
    await payload.create({
      collection: 'faqs',
      data: {
        question: faq.question,
        answer: lexicalParagraphs([faq.answer]),
        order: faq.order,
      },
    })
    created += 1
  }
  payload.logger.info(`Seed de FAQs: ${created} creadas, ${skipped} ya existían`)
}
```

- [ ] **Step 3: Llamar a `seedCompany` desde `cms/src/seed/index.ts`**

Añadir el import y la llamada después del bucle de servicios y antes de `seedGlobals` (las relaciones de globals la necesitan):

```ts
import { seedCompany } from './company'
```

```ts
  await seedCompany(payload)

  await seedGlobals(payload)
```

- [ ] **Step 4: Quality gate**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
```

Expected: verde. (El seed se corre al final, en Task 7, con todo el contenido nuevo junto.)

- [ ] **Step 5: Commit**

```bash
# desde /
git add cms/src/seed/assets cms/src/seed/company.ts cms/src/seed/index.ts
git commit -m "feat(cms): seed de clientes, testimonios, equipo y FAQs"
```

---

### Task 5: Seed — 3 proyectos de ejemplo (casos destacados)

**Files:**
- Create: `cms/src/seed/assets/cover-faro.svg`, `cover-nimbo.svg`, `cover-kuorum.svg`
- Create: `cms/src/seed/projects.ts`
- Modify: `cms/src/seed/index.ts`

**Interfaces:**
- Consumes: clientes creados por `seedCompany` (Task 4), servicios del seed FASE 2, `lexicalParagraphs`.
- Produces: `seedProjects(payload): Promise<void>` — 3 projects publicados (slugs `faro-retail-ecommerce`, `portal-clientes-nimbo`, `captacion-kuorum-legal`) que Task 6 relaciona a servicios y Task 7 destaca en home.

- [ ] **Step 1: Crear los 3 SVG de portada**

Template 1200×800; `cms/src/seed/assets/cover-faro.svg` (los otros cambian texto y aria-label — `NIMBO`, `KUORUM`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-label="Proyecto Faro Retail"><rect width="1200" height="800" fill="#f3f4f7"/><rect x="60" y="60" width="1080" height="680" fill="none" stroke="#e3e5eb" stroke-width="2"/><text x="600" y="415" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="42" font-weight="700" letter-spacing="6" fill="#596070">FARO RETAIL</text></svg>
```

- [ ] **Step 2: Crear `cms/src/seed/projects.ts`**

```ts
import path from 'path'
import { fileURLToPath } from 'url'

import type { Payload } from 'payload'

import { lexicalParagraphs } from './lexical'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// 3 casos de ejemplo para «Casos destacados» del home (FASE 4).
// FASE 5 amplía el modelo de caso de éxito y su página de detalle.
const projects = [
  {
    title: 'Plataforma e-commerce Faro Retail',
    slug: 'faro-retail-ecommerce',
    excerpt:
      'Rediseño y migración de tienda con 12.000 SKUs: +42% de ventas y un checkout tres veces más rápido.',
    clientName: 'Faro Retail',
    serviceSlugs: ['e-commerce', 'marketing-digital'],
    cover: 'cover-faro.svg',
    paragraphs: [
      'Faro Retail vendía bien en tienda física pero su e-commerce no acompañaba: lento, difícil de administrar y con un checkout que perdía clientes. Migramos el catálogo completo a una arquitectura moderna, rediseñamos el flujo de compra y automatizamos el email de recuperación.',
    ],
  },
  {
    title: 'Portal de clientes Nimbo',
    slug: 'portal-clientes-nimbo',
    excerpt:
      'Portal de autoservicio que redujo 60% los tickets de soporte y digitalizó el alta de clientes.',
    clientName: 'Nimbo',
    serviceSlugs: ['web-apps', 'automatizacion'],
    cover: 'cover-nimbo.svg',
    paragraphs: [
      'El equipo de soporte de Nimbo atendía por correo lo que sus clientes podían resolver solos. Construimos un portal de autoservicio con seguimiento de envíos, facturación y alta digital, integrado con sus sistemas internos.',
    ],
  },
  {
    title: 'Captación digital Kuorum Legal',
    slug: 'captacion-kuorum-legal',
    excerpt:
      'Embudo de captación con Google Ads y CRM: 3× más leads calificados con el mismo presupuesto.',
    clientName: 'Kuorum Legal',
    serviceSlugs: ['google-ads', 'crm'],
    cover: 'cover-kuorum.svg',
    paragraphs: [
      'Kuorum invertía en anuncios sin medir qué campañas traían clientes reales. Rehicimos el embudo completo: landing pages por práctica legal, campañas segmentadas y un CRM que registra cada lead hasta el cierre.',
    ],
  },
]

export const seedProjects = async (payload: Payload): Promise<void> => {
  let created = 0
  let skipped = 0

  for (const project of projects) {
    const existing = await payload.find({
      collection: 'projects',
      where: { slug: { equals: project.slug } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }

    const [client, services, cover] = await Promise.all([
      payload.find({
        collection: 'clients',
        where: { name: { equals: project.clientName } },
        limit: 1,
      }),
      payload.find({
        collection: 'services',
        where: { slug: { in: project.serviceSlugs } },
        limit: project.serviceSlugs.length,
      }),
      payload.create({
        collection: 'media',
        data: { alt: `Portada del caso ${project.title}` },
        filePath: path.resolve(dirname, 'assets', project.cover),
      }),
    ])

    await payload.create({
      collection: 'projects',
      data: {
        title: project.title,
        slug: project.slug,
        excerpt: project.excerpt,
        client: client.docs[0]?.id ?? null,
        services: services.docs.map((doc) => doc.id),
        coverImage: cover.id,
        content: lexicalParagraphs(project.paragraphs),
        _status: 'published',
      },
    })
    created += 1
  }
  payload.logger.info(`Seed de proyectos: ${created} creados, ${skipped} ya existían`)
}
```

- [ ] **Step 3: Llamarlo desde `cms/src/seed/index.ts`** (después de `seedCompany`, antes de `seedGlobals`)

```ts
import { seedProjects } from './projects'
```

```ts
  await seedCompany(payload)
  await seedProjects(payload)

  await seedGlobals(payload)
```

- [ ] **Step 4: Quality gate y commit**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add cms/src/seed/assets cms/src/seed/projects.ts cms/src/seed/index.ts
git commit -m "feat(cms): seed de 3 casos de ejemplo para el home"
```

---

### Task 6: Seed — completar servicios existentes (beneficios, proceso, FAQs)

**Files:**
- Modify: `cms/src/seed/services.ts` (tipo `ServiceSeed` + datos)
- Modify: `cms/src/seed/index.ts` (update idempotente por campo)

**Interfaces:**
- Consumes: `coreFaqQuestions` de `cms/src/seed/company.ts` (Task 4).
- Produces: los 14 services con `benefits` (3 c/u), `process` (4 pasos estándar) y `faqs` (las 4 núcleo) poblados — la DB dev ya sembrada se completa vía update por campo vacío.

- [ ] **Step 1: Extender el tipo y añadir el proceso estándar en `cms/src/seed/services.ts`**

```ts
export type ServiceSeed = {
  title: string
  slug: string
  excerpt: string
  features: string[]
  benefits: { title: string; text: string }[]
  paragraphs: string[]
  order: number
}

// Método estándar ZiftLab — la misma secuencia aplica a todos los servicios
export const serviceProcess = [
  { title: 'Descubrimiento', text: 'Entendemos tu negocio, objetivos y punto de partida.' },
  { title: 'Propuesta', text: 'Alcance, plazos y precio claros antes de empezar.' },
  { title: 'Construcción', text: 'Ejecución por fases con entregas visibles cada semana.' },
  {
    title: 'Lanzamiento y mejora',
    text: 'Salida a producción, medición y optimización continua.',
  },
]
```

- [ ] **Step 2: Añadir `benefits` a cada uno de los 14 servicios**

Insertar la clave `benefits` en cada objeto (después de `features`). Copy por servicio:

`desarrollo-web`:
```ts
    benefits: [
      { title: 'Más velocidad, más ventas', text: 'Sitios que cargan en milisegundos y convierten mejor en Google y en móvil.' },
      { title: 'Autonomía total', text: 'Tu equipo edita el contenido desde un panel sin depender de un desarrollador.' },
      { title: 'Base técnica sólida', text: 'SEO técnico, analítica y seguridad incluidos desde el primer día.' },
    ],
```

`e-commerce`:
```ts
    benefits: [
      { title: 'Checkout que convierte', text: 'Menos fricción en cada paso del embudo, más pedidos completados.' },
      { title: 'Operación integrada', text: 'Pagos, envíos y facturación conectados en un solo flujo.' },
      { title: 'Ventas en automático', text: 'Carritos abandonados y email marketing trabajando 24/7.' },
    ],
```

`web-apps`:
```ts
    benefits: [
      { title: 'Procesos digitalizados', text: 'Reemplaza hojas de cálculo y trabajo manual por software a medida.' },
      { title: 'Escala sin fricción', text: 'Arquitectura TypeScript lista para crecer con tu operación.' },
      { title: 'Integrado con lo tuyo', text: 'Se conecta con tus sistemas y APIs existentes.' },
    ],
```

`apps-moviles`:
```ts
    benefits: [
      { title: 'Presencia en el bolsillo', text: 'Tu negocio disponible para el cliente en iOS y Android.' },
      { title: 'Engagement real', text: 'Notificaciones push que traen usuarios de vuelta.' },
      { title: 'Un solo código', text: 'Desarrollo multiplataforma: menos costo, mismo alcance.' },
    ],
```

`marketing-digital`:
```ts
    benefits: [
      { title: 'Estrategia completa', text: 'Canales, mensajes y presupuesto alineados a objetivos de venta.' },
      { title: 'Decisiones con datos', text: 'Reportes claros de qué funciona y qué no.' },
      { title: 'Crecimiento sostenido', text: 'Optimización continua, no campañas sueltas.' },
    ],
```

`google-ads`:
```ts
    benefits: [
      { title: 'Demanda que ya existe', text: 'Aparece exactamente cuando el cliente busca lo que vendes.' },
      { title: 'Presupuesto eficiente', text: 'Pujas y segmentación optimizadas para bajar el costo por lead.' },
      { title: 'Medible de punta a punta', text: 'Cada peso invertido rastreado hasta la conversión.' },
    ],
```

`meta-ads`:
```ts
    benefits: [
      { title: 'Alcance segmentado', text: 'Audiencias precisas en Facebook e Instagram.' },
      { title: 'Creativos que venden', text: 'Anuncios diseñados para detener el scroll.' },
      { title: 'Remarketing inteligente', text: 'Recupera a los visitantes que no compraron a la primera.' },
    ],
```

`seo`:
```ts
    benefits: [
      { title: 'Tráfico sin pagar por clic', text: 'Posicionamiento orgánico que se acumula con el tiempo.' },
      { title: 'Base técnica impecable', text: 'Core Web Vitals, indexación y estructura optimizadas.' },
      { title: 'Contenido con intención', text: 'Páginas que responden exactamente lo que tu cliente busca.' },
    ],
```

`automatizacion`:
```ts
    benefits: [
      { title: 'Horas recuperadas', text: 'Tareas repetitivas que se ejecutan solas, sin errores.' },
      { title: 'Sistemas conectados', text: 'Tus herramientas hablan entre sí sin copiar y pegar.' },
      { title: 'Operación escalable', text: 'Crece el volumen de trabajo sin crecer la nómina.' },
    ],
```

`crm`:
```ts
    benefits: [
      { title: 'Nada se pierde', text: 'Cada lead y cada conversación registrados en un solo lugar.' },
      { title: 'Seguimiento a tiempo', text: 'Recordatorios y pipelines que empujan la venta.' },
      { title: 'Embudo medible', text: 'Visibilidad total del pipeline comercial.' },
    ],
```

`inteligencia-artificial`:
```ts
    benefits: [
      { title: 'Casos de uso reales', text: 'IA aplicada a procesos concretos de tu negocio, no experimentos.' },
      { title: 'Atención 24/7', text: 'Asistentes y chatbots que responden al instante.' },
      { title: 'Ventaja competitiva', text: 'Automatiza análisis y decisiones antes que tu competencia.' },
    ],
```

`diseno-grafico`:
```ts
    benefits: [
      { title: 'Identidad consistente', text: 'Piezas alineadas a tu marca en todos los canales.' },
      { title: 'Diseño que comunica', text: 'Cada pieza con un objetivo claro, no solo decoración.' },
      { title: 'Entrega ágil', text: 'Un sistema de trabajo que mantiene calidad y velocidad.' },
    ],
```

`branding`:
```ts
    benefits: [
      { title: 'Marca memorable', text: 'Una identidad que se reconoce y se recuerda.' },
      { title: 'Coherencia total', text: 'Manual y sistema visual para aplicar la marca sin dudas.' },
      { title: 'Diferenciación real', text: 'Posicionamiento claro frente a tu competencia.' },
    ],
```

`consultoria-tecnologica`:
```ts
    benefits: [
      { title: 'Decisiones informadas', text: 'Roadmap tecnológico alineado al negocio, no a la moda.' },
      { title: 'Menos riesgo', text: 'Auditoría de sistemas y procesos antes de invertir.' },
      { title: 'Acompañamiento senior', text: 'Experiencia real en arquitectura y producto.' },
    ],
```

- [ ] **Step 3: Crear/actualizar servicios con los campos nuevos en `cms/src/seed/index.ts`**

Reemplazar el bucle de servicios para que (a) al crear incluya los campos nuevos y (b) si el doc existe pero tiene `benefits` vacío, lo complete (idempotencia por campo):

```ts
import { getPayload } from 'payload'

import config from '../payload.config'
import { coreFaqQuestions, seedCompany } from './company'
import { seedGlobals } from './globals'
import { lexicalParagraphs } from './lexical'
import { seedProjects } from './projects'
import { serviceProcess, services } from './services'

// Siembra idempotente: 14 servicios (FASE 2 + campos FASE 4), datos de
// empresa, casos de ejemplo y globals del frontend.
// Correr con: pnpm seed (desde /cms). Requiere PostgreSQL y MinIO.
const seed = async (): Promise<void> => {
  const payload = await getPayload({ config })

  // FAQs primero: los servicios las relacionan
  await seedCompany(payload)

  const coreFaqs = await payload.find({
    collection: 'faqs',
    where: { question: { in: coreFaqQuestions } },
    limit: coreFaqQuestions.length,
  })
  const coreFaqIds = coreFaqs.docs.map((doc) => doc.id)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const service of services) {
    const existing = await payload.find({
      collection: 'services',
      where: { slug: { equals: service.slug } },
      limit: 1,
    })

    const fase4Fields = {
      benefits: service.benefits,
      process: serviceProcess,
      faqs: coreFaqIds,
    }

    const doc = existing.docs[0]
    if (doc) {
      // Idempotencia por campo: solo completa lo que siga vacío (FASE 4)
      if (!doc.benefits?.length) {
        await payload.update({
          collection: 'services',
          id: doc.id,
          data: fase4Fields,
        })
        updated += 1
      } else {
        skipped += 1
      }
      continue
    }

    await payload.create({
      collection: 'services',
      data: {
        title: service.title,
        slug: service.slug,
        excerpt: service.excerpt,
        content: lexicalParagraphs(service.paragraphs),
        features: service.features.map((text) => ({ text })),
        ...fase4Fields,
        order: service.order,
        meta: {
          title: `${service.title} | ZiftLab`,
          description: service.excerpt,
        },
        _status: 'published',
      },
    })
    created += 1
  }

  payload.logger.info(
    `Seed de servicios: ${created} creados, ${updated} completados, ${skipped} ya al día`,
  )

  await seedProjects(payload)
  await seedGlobals(payload)
}

// Top-level await: `payload run` solo espera la evaluación del módulo,
// una promesa suelta moriría cuando el proceso del CLI termina
try {
  await seed()
  process.exit(0)
} catch (error) {
  console.error('Seed falló:', error)
  process.exit(1)
}
```

(Nota: `seedCompany` sube al inicio y desaparece su llamada previa duplicada — queda una sola vez, antes del bucle.)

- [ ] **Step 4: Quality gate y commit**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add cms/src/seed/services.ts cms/src/seed/index.ts
git commit -m "feat(cms): seed completa beneficios, proceso y FAQs de los 14 servicios"
```

---

### Task 7: Seed — globals FASE 4 (home completo, about, contact, nav) y ejecución

**Files:**
- Modify: `cms/src/seed/globals.ts`

**Interfaces:**
- Consumes: services/testimonials/projects sembrados (Tasks 4–6).
- Produces: globals `home-page`, `about-page`, `contact-page` publicados; nav de `header`/`footer` solo con rutas FASE 4. Después de esta task la API devuelve todo lo que las páginas web consumen.

- [ ] **Step 1: Actualizar el seed de `header` (nav FASE 4, autocorrige el de FASE 3)**

En `cms/src/seed/globals.ts`, reemplazar el bloque del header por:

```ts
  const header = await payload.findGlobal({ slug: 'header' })
  // Escribe si está vacío o si conserva el nav de FASE 3 (enlazaba fases futuras)
  const headerStale = header.navItems?.some((item) => item.href === '/portafolio') ?? false
  if (!header.navItems?.length || headerStale) {
    await payload.updateGlobal({
      slug: 'header',
      data: {
        navItems: [
          { label: 'Servicios', href: '/servicios' },
          { label: 'Quiénes somos', href: '/quienes-somos' },
          { label: 'Contacto', href: '/contacto' },
        ],
        cta: { label: 'Agenda una asesoría', href: '/contacto' },
      },
    })
    payload.logger.info('Seed: global header poblado')
  }
```

- [ ] **Step 2: Actualizar el seed de `footer` con el mismo criterio**

Reemplazar el bloque del footer para que solo enlace rutas existentes (mantener `bottomText` como esté):

```ts
  const footer = await payload.findGlobal({ slug: 'footer' })
  const footerStale =
    footer.columns?.some((column) =>
      column.links?.some((link) => link.href === '/portafolio' || link.href === '/blog'),
    ) ?? false
  if (!footer.columns?.length || footerStale) {
    await payload.updateGlobal({
      slug: 'footer',
      data: {
        columns: [
          {
            title: 'Servicios',
            links: [
              { label: 'Desarrollo web', href: '/servicios/desarrollo-web' },
              { label: 'E-commerce', href: '/servicios/e-commerce' },
              { label: 'Automatización', href: '/servicios/automatizacion' },
              { label: 'Inteligencia artificial', href: '/servicios/inteligencia-artificial' },
            ],
          },
          {
            title: 'Empresa',
            links: [
              { label: 'Quiénes somos', href: '/quienes-somos' },
              { label: 'Contacto', href: '/contacto' },
            ],
          },
        ],
        bottomText: '© 2026 ZiftLab. Todos los derechos reservados.',
      },
    })
    payload.logger.info('Seed: global footer poblado')
  }
```

- [ ] **Step 3: Añadir el seed de `home-page` al final de `seedGlobals`**

```ts
  const homePage = await payload.findGlobal({ slug: 'home-page', depth: 0 })
  if (!homePage.hero?.title) {
    const [featured, featuredProjects, featuredTestimonials] = await Promise.all([
      payload.find({
        collection: 'services',
        where: {
          slug: {
            in: [
              'desarrollo-web',
              'e-commerce',
              'automatizacion',
              'inteligencia-artificial',
              'google-ads',
              'crm',
            ],
          },
        },
        sort: 'order',
        limit: 6,
      }),
      payload.find({ collection: 'projects', sort: 'createdAt', limit: 3 }),
      payload.find({ collection: 'testimonials', sort: 'order', limit: 4 }),
    ])

    await payload.updateGlobal({
      slug: 'home-page',
      data: {
        hero: {
          eyebrow: 'Agencia digital',
          title: 'Tecnología moderna para empresas que quieren vender más',
          subtitle:
            'Sitios web, sistemas digitales, automatizaciones y soluciones con IA que trabajan juntos para hacer crecer tu negocio.',
          primaryCta: { label: 'Agenda una asesoría', href: '/contacto' },
          secondaryCta: { label: 'Ver servicios', href: '/servicios' },
        },
        valueProposition: {
          title: 'Menos improvisación, más sistema',
          text: 'No vendemos horas ni piezas sueltas: diseñamos sistemas digitales completos — web, marketing, automatización e IA — que trabajan juntos para hacer crecer tu negocio.',
        },
        stats: [
          { value: '+120', label: 'proyectos entregados' },
          { value: '8', label: 'años construyendo digital' },
          { value: '14', label: 'servicios integrados' },
          { value: '92%', label: 'de clientes que repiten' },
        ],
        servicesSection: {
          title: 'Lo que construimos',
          subtitle:
            'Del sitio web al sistema completo: catorce servicios que se combinan según lo que tu negocio necesita.',
          featuredServices: featured.docs.map((doc) => doc.id),
        },
        benefits: {
          title: 'Por qué trabajar con ZiftLab',
          items: [
            { title: 'Un solo equipo', text: 'Estrategia, diseño, desarrollo y marketing bajo el mismo techo.' },
            { title: 'Enfoque comercial', text: 'Cada entrega se mide por su impacto en ventas, no por horas.' },
            { title: 'Tecnología moderna', text: 'Stack actual y probado, sin deuda técnica desde el día uno.' },
            { title: 'Precios claros', text: 'Propuestas cerradas por alcance, sin sorpresas en la factura.' },
            { title: 'Entregas por fases', text: 'Avances visibles cada semana, no un big bang al final.' },
            { title: 'Soporte real', text: 'Acompañamiento después del lanzamiento, con acuerdos claros.' },
          ],
        },
        process: {
          title: 'Cómo trabajamos',
          subtitle: 'Un método probado, el mismo en cada proyecto.',
          steps: [
            { title: 'Descubrimiento', text: 'Entendemos tu negocio, objetivos y punto de partida.' },
            { title: 'Propuesta', text: 'Alcance, plazos y precio claros antes de empezar.' },
            { title: 'Construcción', text: 'Ejecución por fases con entregas visibles cada semana.' },
            { title: 'Lanzamiento y mejora', text: 'Salida a producción, medición y optimización continua.' },
          ],
        },
        clientsSection: {
          title: 'Confían en nosotros',
        },
        projectsSection: {
          title: 'Casos destacados',
          subtitle: 'Resultados medibles en proyectos reales.',
          featuredProjects: featuredProjects.docs.map((doc) => doc.id),
        },
        testimonialsSection: {
          title: 'Lo que dicen nuestros clientes',
          featuredTestimonials: featuredTestimonials.docs.map((doc) => doc.id),
        },
        trustBlock: {
          title: 'Trabajar con nosotros es simple y seguro',
          text: 'Sabemos lo que es apostar el presupuesto a un proveedor. Por eso operamos con reglas claras:',
          items: [
            { text: 'Propuesta cerrada antes de empezar' },
            { text: 'Código y cuentas a tu nombre' },
            { text: 'Comunicación directa, sin intermediarios' },
            { text: 'Soporte garantizado después del lanzamiento' },
          ],
        },
        ctaSection: {
          title: '¿Listo para vender más con tecnología?',
          text: 'Agenda una asesoría gratuita de 30 minutos. Te decimos qué haríamos y cuánto costaría, sin compromiso.',
          cta: { label: 'Agenda una asesoría', href: '/contacto' },
        },
        _status: 'published',
      },
    })
    payload.logger.info('Seed: global home-page poblado')
  }
```

- [ ] **Step 4: Añadir el seed de `about-page` y `contact-page`**

```ts
  const aboutPage = await payload.findGlobal({ slug: 'about-page', depth: 0 })
  if (!aboutPage.intro?.title) {
    await payload.updateGlobal({
      slug: 'about-page',
      data: {
        intro: {
          eyebrow: 'Quiénes somos',
          title: 'Un equipo pequeño que construye sistemas grandes',
          text: 'Somos una agencia digital que combina ingeniería y marketing para hacer crecer negocios reales.',
        },
        story: lexicalParagraphs([
          'ZiftLab nació de una frustración: ver a empresas invertir en sitios bonitos que no venden, campañas que no se miden y sistemas que nadie sabe mantener. Decidimos hacerlo al revés — empezar por el negocio y construir la tecnología que ese negocio necesita.',
          'Hoy combinamos desarrollo, marketing, automatización e inteligencia artificial en un solo equipo. Trabajamos con pocas cuentas a la vez, con comunicación directa y entregas por fases que se pueden medir.',
        ]),
        values: [
          { title: 'Claridad', text: 'Propuestas, precios y plazos que se entienden a la primera.' },
          { title: 'Oficio', text: 'Tecnología moderna aplicada con criterio, no por moda.' },
          { title: 'Resultados', text: 'El trabajo se mide por su impacto comercial.' },
          { title: 'Largo plazo', text: 'Construimos relaciones y sistemas que duran.' },
        ],
        teamSection: {
          title: 'El equipo',
          subtitle: 'Las personas detrás de cada proyecto.',
        },
        ctaSection: {
          title: '¿Quieres trabajar con nosotros?',
          text: 'Cuéntanos tu proyecto y te respondemos en menos de 24 horas.',
          cta: { label: 'Agenda una asesoría', href: '/contacto' },
        },
        _status: 'published',
      },
    })
    payload.logger.info('Seed: global about-page poblado')
  }

  const contactPage = await payload.findGlobal({ slug: 'contact-page', depth: 0 })
  if (!contactPage.title) {
    await payload.updateGlobal({
      slug: 'contact-page',
      data: {
        title: 'Hablemos de tu proyecto',
        text: 'Cuéntanos qué necesitas y te respondemos en menos de 24 horas hábiles con próximos pasos claros.',
        _status: 'published',
      },
    })
    payload.logger.info('Seed: global contact-page poblado')
  }
```

Añadir el import de `lexicalParagraphs` arriba del archivo:

```ts
import { lexicalParagraphs } from './lexical'
```

- [ ] **Step 5: Correr el seed completo**

```bash
# desde /
make start   # o asegurarse de que PostgreSQL y MinIO están arriba
# desde /cms
pnpm seed
```

Expected: logs `Seed de clientes: 6 creados…`, `Seed de FAQs: 8 creadas…`, `Seed de servicios: 0 creados, 14 completados…`, `Seed de proyectos: 3 creados…`, `Seed: global home-page poblado`, `about-page`, `contact-page`, header/footer. Correrlo **dos veces**: la segunda todo debe salir como «ya existían / ya al día» sin errores.

- [ ] **Step 6: Verificar por API**

```bash
# desde /
curl -s http://localhost:3000/api/globals/home-page | head -c 400
curl -s "http://localhost:3000/api/services?where[slug][equals]=desarrollo-web" | head -c 400
```

Expected: JSON con `hero.title` y con `benefits` del servicio.

- [ ] **Step 7: Quality gate y commit**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add cms/src/seed/globals.ts
git commit -m "feat(cms): seed de globals FASE 4 — home completo, about, contact y nav"
```

---

### Task 8: Web — fundaciones (rich text, utilidades, Button inverse, BaseLayout)

**Files:**
- Modify: `web/package.json` (devDependency)
- Create: `web/src/components/sections/RichText.astro`
- Modify: `web/src/styles/global.css` (estilos `.rich-text` + utilidad `lab-grid`)
- Modify: `web/src/components/ui/Button.astro` (variante `inverse`)
- Modify: `web/src/lib/payload.ts` (helper `resolveDocs`)
- Modify: `web/src/layouts/BaseLayout.astro` (prop `absoluteTitle`)

**Interfaces:**
- Produces: `<RichText content={unknown} class? />`; `resolveDocs<T>(rel): T[]`; `Button variant="inverse"` (para fondos ink); `BaseLayout` acepta `absoluteTitle?: string` (título ya compuesto, p. ej. el `meta.title` del plugin SEO que ya trae «| ZiftLab»); clase `lab-grid` (retícula milimétrica para secciones ink).

- [ ] **Step 1: Añadir el conversor como devDependency de web**

```bash
# desde /web
pnpm add -D @payloadcms/richtext-lexical@3.85.2
```

Expected: instala sin prompts (los peers ya están en el store del monorepo vía cms). Verificar en `web/package.json` que quedó pinneado exacto `"3.85.2"`.

- [ ] **Step 2: Crear `web/src/components/sections/RichText.astro`**

```astro
---
/**
 * Rich text de Payload (Lexical) → HTML en build con el conversor oficial.
 * No llega JS al cliente: la conversión ocurre al generar la página.
 */
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

interface Props {
  /** Campo richText de Payload (puede venir null si el doc no lo tiene) */
  content: unknown
  class?: string
}

const { content, class: className } = Astro.props

const html = content
  ? convertLexicalToHTML({ data: content as SerializedEditorState, disableContainer: true })
  : ''
---

{html && <div class:list={['rich-text', className]} set:html={html} />}
```

- [ ] **Step 3: Estilos `.rich-text` y utilidad `lab-grid` en `web/src/styles/global.css`**

Añadir al final del archivo:

```css
/* Retícula de papel milimétrico para el mundo tinta (hero y CTA del home) */
@utility lab-grid {
  background-image:
    linear-gradient(to right, var(--color-ink-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--color-ink-line) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(120% 90% at 18% 0%, black 35%, transparent 78%);
}

/* Prosa del rich text de Payload (componente RichText.astro) */
@layer components {
  .rich-text {
    @apply text-base leading-relaxed;
  }
  .rich-text > * + * {
    margin-top: calc(var(--spacing) * 5);
  }
  .rich-text h2 {
    @apply font-display mt-12 text-2xl sm:text-3xl;
  }
  .rich-text h3 {
    @apply font-display mt-10 text-xl sm:text-2xl;
  }
  .rich-text ul {
    @apply list-disc pl-6;
  }
  .rich-text ol {
    @apply list-decimal pl-6;
  }
  .rich-text li + li {
    margin-top: calc(var(--spacing) * 2);
  }
  .rich-text a {
    @apply text-zift underline underline-offset-4 hover:text-zift-deep;
  }
  .rich-text strong {
    @apply font-semibold;
  }
}
```

- [ ] **Step 4: Variante `inverse` en `web/src/components/ui/Button.astro`**

Ampliar el tipo y el mapa de variantes:

```ts
  variant?: 'primary' | 'secondary' | 'ghost' | 'inverse'
```

```ts
const variants = {
  primary: 'bg-zift text-white hover:bg-zift-deep',
  secondary: 'border border-line bg-white text-ink hover:border-ink',
  ghost: 'text-zift hover:bg-zift-tint',
  // Para fondos ink (hero/CTA oscuros)
  inverse: 'border border-ink-line text-white hover:border-zift-glow hover:text-zift-glow',
}
```

- [ ] **Step 5: Helper `resolveDocs` en `web/src/lib/payload.ts`**

Añadir al final del archivo:

```ts
/**
 * Relaciones hasMany con depth ≥ 1 llegan como (id | doc)[] — devuelve solo
 * los docs poblados, en el orden guardado en el CMS.
 */
export function resolveDocs<T extends object>(
  rel: (number | T)[] | null | undefined,
): T[] {
  return (rel ?? []).filter((item): item is T => typeof item === 'object' && item !== null)
}
```

- [ ] **Step 6: Prop `absoluteTitle` en `web/src/layouts/BaseLayout.astro`**

En la interface y el destructure:

```ts
interface Props {
  /** Título de la página; se compone como "Título | SiteName". Si falta, se usa el SEO por defecto del CMS. */
  title?: string
  /** Título ya compuesto (p. ej. meta.title del plugin SEO) — se usa tal cual, sin añadir "| SiteName" */
  absoluteTitle?: string
  description?: string
  /** URL absoluta de la imagen OG; default: ogImage de Ajustes del sitio */
  ogImage?: string | null
  noindex?: boolean
}

const { title, absoluteTitle, description, ogImage, noindex = false } = Astro.props
```

Y el cálculo del título:

```ts
const seoTitle = absoluteTitle ?? (title ? `${title} | ${siteName}` : defaultTitle)
```

- [ ] **Step 7: Quality gate y commit**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add web/package.json pnpm-lock.yaml web/src/components/sections/RichText.astro web/src/styles/global.css web/src/components/ui/Button.astro web/src/lib/payload.ts web/src/layouts/BaseLayout.astro
git commit -m "feat(web): fundaciones FASE 4 — rich text, lab-grid, Button inverse, resolveDocs"
```

**Fallback (solo si `astro check`/build fallan por el paquete):** eliminar la devDependency y crear `web/src/lib/richtext.ts` con un serializador propio para los nodos del seed (root/paragraph/heading/list/listitem/link/text con formatos bold=1 e italic=2), manteniendo la misma interfaz del componente `RichText.astro` (`content: unknown` → string HTML con escape de `&<>"`). Documentar el motivo en el commit.

---

### Task 9: Web — componentes de sección núcleo

**Files:**
- Create: `web/src/components/sections/SectionIntro.astro`
- Create: `web/src/components/sections/ServiceCard.astro`
- Create: `web/src/components/sections/BenefitsGrid.astro`
- Create: `web/src/components/sections/ProcessSteps.astro`
- Create: `web/src/components/sections/CTASection.astro`

**Interfaces:**
- Consumes: UI kit (`Card`, `Heading`, `Text`, `Eyebrow`, `Button`, `Section`, `Container`), tipos `Service` de `@cms/types`.
- Produces:
  - `<SectionIntro eyebrow? title? text? tone?='light'|'dark' as?='h1'|'h2' size?='display'|'xl' />`
  - `<ServiceCard service={Service} />` (link a `/servicios/<slug>`, código `SRV-XX` desde `order`)
  - `<BenefitsGrid items={{title: string; text?: string | null}[]} />`
  - `<ProcessSteps steps={{title: string; text?: string | null}[]} tone?='paper'|'ink' />`
  - `<CTASection title? text? cta?={label?, href?, newTab?} />` (Section tone ink completa; no renderiza sin title)

- [ ] **Step 1: `SectionIntro.astro`** — cabecera estándar de sección

```astro
---
/** Cabecera de sección: eyebrow mono + titular display + entradilla. */
import Eyebrow from '@/components/ui/Eyebrow.astro'
import Heading from '@/components/ui/Heading.astro'
import Text from '@/components/ui/Text.astro'

interface Props {
  eyebrow?: string | null
  title?: string | null
  text?: string | null
  /** dark = sobre fondos ink */
  tone?: 'light' | 'dark'
  as?: 'h1' | 'h2'
  size?: 'display' | 'xl' | 'lg'
  class?: string
}

const {
  eyebrow,
  title,
  text,
  tone = 'light',
  as = 'h2',
  size = 'xl',
  class: className,
}: Props = Astro.props
---

{
  (eyebrow || title || text) && (
    <div class:list={['max-w-2xl', className]}>
      {eyebrow && <Eyebrow tone={tone}>{eyebrow}</Eyebrow>}
      {title && (
        <Heading as={as} size={size} class="mt-6">
          {title}
        </Heading>
      )}
      {text && (
        <Text
          size="lead"
          class:list={['mt-6', tone === 'dark' ? 'text-ink-muted' : 'text-muted']}
        >
          {text}
        </Text>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `ServiceCard.astro`** — espécimen de catálogo (firma visual de la fase)

```astro
---
/**
 * Tarjeta de servicio como espécimen de catálogo: código mono SRV-XX
 * (derivado del campo order del CMS) sobre regla hairline de índice.
 */
import Card from '@/components/ui/Card.astro'
import Heading from '@/components/ui/Heading.astro'
import Text from '@/components/ui/Text.astro'
import type { Service } from '@cms/types'

interface Props {
  service: Service
  class?: string
}

const { service, class: className } = Astro.props

const code = service.order ? `SRV-${String(service.order).padStart(2, '0')}` : 'SRV-—'
---

<Card href={`/servicios/${service.slug}`} class:list={['flex h-full flex-col', className]}>
  <p class="flex items-baseline justify-between border-b border-line pb-3 font-mono text-xs tracking-[0.18em] text-muted uppercase">
    <span>{code}</span>
    <span aria-hidden="true" class="text-line transition-colors group-hover:text-zift">→</span>
  </p>
  <Heading as="h3" size="sm" class="mt-4 transition-colors group-hover:text-zift">
    {service.title}
  </Heading>
  <Text size="sm" muted class="mt-3">
    {service.excerpt}
  </Text>
</Card>
```

- [ ] **Step 3: `BenefitsGrid.astro`**

```astro
---
/** Grid de beneficios {título, texto} con marcador cuadrado ultramar. */
import Card from '@/components/ui/Card.astro'
import Heading from '@/components/ui/Heading.astro'
import Text from '@/components/ui/Text.astro'

interface Props {
  items: { title: string; text?: string | null }[]
  class?: string
}

const { items, class: className } = Astro.props
---

{
  items.length > 0 && (
    <ul class:list={['grid gap-5 sm:grid-cols-2 lg:grid-cols-3', className]} role="list">
      {items.map((item) => (
        <li>
          <Card class="h-full">
            <span class="block size-2 bg-zift" aria-hidden="true" />
            <Heading as="h3" size="sm" class="mt-4">
              {item.title}
            </Heading>
            {item.text && (
              <Text size="sm" muted class="mt-3">
                {item.text}
              </Text>
            )}
          </Card>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 4: `ProcessSteps.astro`** — la única sección con numeración (secuencia real)

```astro
---
/**
 * Pasos de proceso numerados en mono — la numeración encodea el orden real
 * de trabajo (única sección numerada del sistema, spec FASE 4 §4).
 */
interface Props {
  steps: { title: string; text?: string | null }[]
  /** ink = sobre Section tone="ink" (home); paper = sobre fondos claros */
  tone?: 'paper' | 'ink'
  class?: string
}

const { steps, tone = 'paper', class: className }: Props = Astro.props

const border = tone === 'ink' ? 'border-ink-line' : 'border-line'
const number = tone === 'ink' ? 'text-zift-glow' : 'text-zift'
const title = tone === 'ink' ? 'text-white' : 'text-ink'
const text = tone === 'ink' ? 'text-ink-muted' : 'text-muted'
---

{
  steps.length > 0 && (
    <ol class:list={['grid gap-8 sm:grid-cols-2 lg:grid-cols-4', className]} role="list">
      {steps.map((step, index) => (
        <li class:list={['border-t pt-5', border]}>
          <span class:list={['font-mono text-xs tracking-[0.18em]', number]}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 class:list={['font-display mt-3 text-lg', title]}>{step.title}</h3>
          {step.text && <p class:list={['mt-2 text-sm leading-relaxed', text]}>{step.text}</p>}
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 5: `CTASection.astro`** — cierre en tinta, reutilizado por home/servicio/about

```astro
---
/** Sección CTA final sobre tinta. No renderiza nada sin título. */
import Button from '@/components/ui/Button.astro'
import Container from '@/components/ui/Container.astro'
import Heading from '@/components/ui/Heading.astro'
import Section from '@/components/ui/Section.astro'
import Text from '@/components/ui/Text.astro'

interface Props {
  title?: string | null
  text?: string | null
  cta?: { label?: string | null; href?: string | null; newTab?: boolean | null } | null
  class?: string
}

const { title, text, cta, class: className } = Astro.props

const button = cta?.label && cta?.href ? cta : null
---

{
  title && (
    <Section tone="ink" class:list={['relative overflow-hidden', className]}>
      <div class="lab-grid absolute inset-0" aria-hidden="true" />
      <Container class="relative text-center">
        <Heading as="h2" size="xl" class="mx-auto max-w-3xl">
          {title}
        </Heading>
        {text && (
          <Text size="lead" class="mx-auto mt-6 max-w-2xl text-ink-muted">
            {text}
          </Text>
        )}
        {button && (
          <div class="mt-10">
            <Button href={button.href!} newTab={button.newTab ?? false} size="lg">
              {button.label}
            </Button>
          </div>
        )}
      </Container>
    </Section>
  )
}
```

- [ ] **Step 6: Quality gate y commit**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add web/src/components/sections
git commit -m "feat(web): componentes de sección núcleo FASE 4"
```

---

### Task 10: Web — componentes de prueba social

**Files:**
- Create: `web/src/components/sections/LogoWall.astro`
- Create: `web/src/components/sections/TestimonialCard.astro`
- Create: `web/src/components/sections/ProjectCard.astro`
- Create: `web/src/components/sections/FaqAccordion.astro`

**Interfaces:**
- Consumes: `Client`, `Testimonial`, `Project`, `Faq` de `@cms/types`; `PayloadImage`, `resolveMedia`; `RichText` (Task 8).
- Produces:
  - `<LogoWall clients={Client[]} />`
  - `<TestimonialCard testimonial={Testimonial} />`
  - `<ProjectCard project={Project} />` (sin link — el detalle llega en FASE 5)
  - `<FaqAccordion faqs={Faq[]} />` (details/summary nativo)

- [ ] **Step 1: `LogoWall.astro`**

```astro
---
/** Muro de logos de clientes en escala de grises, hairlines de índice. */
import PayloadImage from '@/components/PayloadImage.astro'
import type { Client } from '@cms/types'

interface Props {
  clients: Client[]
  class?: string
}

const { clients, class: className } = Astro.props
---

{
  clients.length > 0 && (
    <ul
      class:list={['grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-6', className]}
      role="list"
    >
      {clients.map((client) => (
        <li class="flex h-24 items-center justify-center bg-paper px-6">
          <PayloadImage
            media={client.logo}
            class="max-h-10 w-auto opacity-70 grayscale"
            sizes="160px"
          />
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: `TestimonialCard.astro`**

```astro
---
/** Testimonio: cita + autor con cargo. El avatar es opcional. */
import PayloadImage from '@/components/PayloadImage.astro'
import Card from '@/components/ui/Card.astro'
import Text from '@/components/ui/Text.astro'
import type { Testimonial } from '@cms/types'

interface Props {
  testimonial: Testimonial
  class?: string
}

const { testimonial, class: className } = Astro.props
---

<Card class:list={['flex h-full flex-col', className]}>
  <span class="font-display text-3xl leading-none text-zift" aria-hidden="true">“</span>
  <blockquote class="mt-3 flex-1">
    <Text>{testimonial.quote}</Text>
  </blockquote>
  <footer class="mt-6 flex items-center gap-3 border-t border-line pt-5">
    <PayloadImage media={testimonial.avatar} class="size-10 rounded-full object-cover" sizes="40px" />
    <div>
      <p class="text-sm font-medium">{testimonial.authorName}</p>
      {testimonial.authorRole && (
        <p class="font-mono text-xs tracking-wide text-muted">{testimonial.authorRole}</p>
      )}
    </div>
  </footer>
</Card>
```

- [ ] **Step 3: `ProjectCard.astro`**

```astro
---
/**
 * Caso destacado. Sin link: la página de detalle de portafolio llega en
 * FASE 5 — entonces esta card recibirá href.
 */
import PayloadImage from '@/components/PayloadImage.astro'
import Card from '@/components/ui/Card.astro'
import Heading from '@/components/ui/Heading.astro'
import Text from '@/components/ui/Text.astro'
import { resolveMedia } from '@/lib/media'
import type { Project } from '@cms/types'

interface Props {
  project: Project
  class?: string
}

const { project, class: className } = Astro.props

const client = typeof project.client === 'object' ? project.client : null
const cover = resolveMedia(project.coverImage)
---

<Card padding="none" class:list={['flex h-full flex-col overflow-hidden', className]}>
  {
    cover && (
      <PayloadImage
        media={cover}
        class="aspect-[3/2] w-full border-b border-line object-cover"
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
    )
  }
  <div class="flex flex-1 flex-col p-6 md:p-8">
    {
      client && (
        <p class="font-mono text-xs tracking-[0.18em] text-muted uppercase">{client.name}</p>
      )
    }
    <Heading as="h3" size="sm" class="mt-3">
      {project.title}
    </Heading>
    <Text size="sm" muted class="mt-3">
      {project.excerpt}
    </Text>
  </div>
</Card>
```

- [ ] **Step 4: `FaqAccordion.astro`**

```astro
---
/** FAQs con details/summary nativo — accesible y sin JavaScript. */
import RichText from '@/components/sections/RichText.astro'
import type { Faq } from '@cms/types'

interface Props {
  faqs: Faq[]
  class?: string
}

const { faqs, class: className } = Astro.props
---

{
  faqs.length > 0 && (
    <div class:list={['divide-y divide-line border-y border-line', className]}>
      {faqs.map((faq) => (
        <details class="group py-5">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
            {faq.question}
            <span
              class="font-mono text-lg text-muted transition-transform group-open:rotate-45"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <RichText content={faq.answer} class="mt-4 text-muted" />
        </details>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Quality gate y commit**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add web/src/components/sections
git commit -m "feat(web): componentes de prueba social FASE 4"
```

---

### Task 11: Web — Home comercial completa

**Files:**
- Modify: `web/src/pages/index.astro` (reemplazo completo del demo FASE 3)

**Interfaces:**
- Consumes: global `home-page` (depth 2), colección `clients`; todos los componentes de Tasks 9–10; `resolveDocs`, `getMediaUrl`.

- [ ] **Step 1: Reemplazar `web/src/pages/index.astro`**

```astro
---
/**
 * Home comercial (FASE 4): todo el contenido sale del global home-page.
 * Cada sección solo se pinta si el CMS tiene contenido para ella.
 * Orden según docs/FASES.MD §FASE 4.
 */
import BenefitsGrid from '@/components/sections/BenefitsGrid.astro'
import CTASection from '@/components/sections/CTASection.astro'
import LogoWall from '@/components/sections/LogoWall.astro'
import ProcessSteps from '@/components/sections/ProcessSteps.astro'
import ProjectCard from '@/components/sections/ProjectCard.astro'
import SectionIntro from '@/components/sections/SectionIntro.astro'
import ServiceCard from '@/components/sections/ServiceCard.astro'
import TestimonialCard from '@/components/sections/TestimonialCard.astro'
import Button from '@/components/ui/Button.astro'
import Container from '@/components/ui/Container.astro'
import Eyebrow from '@/components/ui/Eyebrow.astro'
import Heading from '@/components/ui/Heading.astro'
import Section from '@/components/ui/Section.astro'
import Text from '@/components/ui/Text.astro'
import BaseLayout from '@/layouts/BaseLayout.astro'
import { getMediaUrl } from '@/lib/media'
import { getCollection, getGlobal, resolveDocs } from '@/lib/payload'
import type { Client, Project, Service, Testimonial } from '@cms/types'

const [home, clientsResult] = await Promise.all([
  getGlobal('home-page', { depth: 2 }),
  getCollection('clients', { sort: 'order', limit: 12 }),
])

const hero = home.hero
const primaryCta = hero?.primaryCta?.label && hero.primaryCta.href ? hero.primaryCta : null
const secondaryCta =
  hero?.secondaryCta?.label && hero.secondaryCta.href ? hero.secondaryCta : null

const featuredServices = resolveDocs<Service>(home.servicesSection?.featuredServices)
const featuredProjects = resolveDocs<Project>(home.projectsSection?.featuredProjects)
const featuredTestimonials = resolveDocs<Testimonial>(
  home.testimonialsSection?.featuredTestimonials,
)
const clients: Client[] = clientsResult.docs
const benefits = home.benefits?.items ?? []
const steps = home.process?.steps ?? []
const trustItems = home.trustBlock?.items ?? []
const stats = home.stats ?? []
---

<BaseLayout
  absoluteTitle={home.meta?.title ?? undefined}
  description={home.meta?.description ?? undefined}
  ogImage={getMediaUrl(home.meta?.image)}
>
  {/* Hero — umbral del laboratorio: tinta + retícula milimétrica */}
  <Section tone="ink" class="relative overflow-hidden md:py-32">
    <div class="lab-grid absolute inset-0" aria-hidden="true"></div>
    <Container class="relative">
      {hero?.eyebrow && <Eyebrow tone="dark">{hero.eyebrow}</Eyebrow>}
      <Heading as="h1" size="display" class="mt-6 max-w-4xl text-white">
        {hero?.title}
      </Heading>
      {
        hero?.subtitle && (
          <Text size="lead" class="mt-6 max-w-2xl text-ink-muted">
            {hero.subtitle}
          </Text>
        )
      }
      <div class="mt-10 flex flex-wrap gap-4">
        {
          primaryCta && (
            <Button href={primaryCta.href!} newTab={primaryCta.newTab ?? false} size="lg">
              {primaryCta.label}
            </Button>
          )
        }
        {
          secondaryCta && (
            <Button
              href={secondaryCta.href!}
              newTab={secondaryCta.newTab ?? false}
              variant="inverse"
              size="lg"
            >
              {secondaryCta.label}
            </Button>
          )
        }
      </div>
    </Container>
  </Section>

  {/* Propuesta de valor */}
  {
    home.valueProposition?.title && (
      <Section>
        <Container size="narrow">
          <SectionIntro
            eyebrow="Propuesta de valor"
            title={home.valueProposition.title}
            text={home.valueProposition.text}
            class="max-w-none"
          />
        </Container>
      </Section>
    )
  }

  {/* Servicios destacados */}
  {
    featuredServices.length > 0 && (
      <Section tone="surface" id="servicios">
        <Container>
          <SectionIntro
            eyebrow="Servicios"
            title={home.servicesSection?.title}
            text={home.servicesSection?.subtitle}
          />
          <ul class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {featuredServices.map((service) => (
              <li>
                <ServiceCard service={service} />
              </li>
            ))}
          </ul>
          <div class="mt-10">
            <Button href="/servicios" variant="secondary">
              Ver los 14 servicios
            </Button>
          </div>
        </Container>
      </Section>
    )
  }

  {/* Beneficios */}
  {
    home.benefits?.title && benefits.length > 0 && (
      <Section>
        <Container>
          <SectionIntro eyebrow="Beneficios" title={home.benefits.title} />
          <BenefitsGrid items={benefits} class="mt-12" />
        </Container>
      </Section>
    )
  }

  {/* Proceso de trabajo — vuelta a tinta */}
  {
    home.process?.title && steps.length > 0 && (
      <Section tone="ink">
        <Container>
          <SectionIntro
            eyebrow="Proceso"
            title={home.process.title}
            text={home.process.subtitle}
            tone="dark"
          />
          <ProcessSteps steps={steps} tone="ink" class="mt-12" />
        </Container>
      </Section>
    )
  }

  {/* Logos de clientes */}
  {
    home.clientsSection?.title && clients.length > 0 && (
      <Section>
        <Container>
          <SectionIntro eyebrow="Clientes" title={home.clientsSection.title} />
          <LogoWall clients={clients} class="mt-12" />
        </Container>
      </Section>
    )
  }

  {/* Casos destacados */}
  {
    featuredProjects.length > 0 && (
      <Section tone="surface">
        <Container>
          <SectionIntro
            eyebrow="Casos"
            title={home.projectsSection?.title}
            text={home.projectsSection?.subtitle}
          />
          <ul class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {featuredProjects.map((project) => (
              <li>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    )
  }

  {/* Testimonios */}
  {
    featuredTestimonials.length > 0 && (
      <Section>
        <Container>
          <SectionIntro eyebrow="Testimonios" title={home.testimonialsSection?.title} />
          <ul class="mt-12 grid gap-5 sm:grid-cols-2" role="list">
            {featuredTestimonials.map((testimonial) => (
              <li>
                <TestimonialCard testimonial={testimonial} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    )
  }

  {/* Bloque de confianza + cifras */}
  {
    home.trustBlock?.title && (
      <Section tone="surface">
        <Container>
          <div class="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionIntro
                eyebrow="Confianza"
                title={home.trustBlock.title}
                text={home.trustBlock.text}
              />
              {trustItems.length > 0 && (
                <ul class="mt-8 space-y-3" role="list">
                  {trustItems.map((item) => (
                    <li class="flex items-start gap-3">
                      <span class="mt-2 size-2 shrink-0 bg-zift" aria-hidden="true" />
                      <Text>{item.text}</Text>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {stats.length > 0 && (
              <dl class="grid content-start gap-px border border-line bg-line sm:grid-cols-2">
                {stats.map((stat) => (
                  <div class="bg-paper p-6 md:p-8">
                    <dd class="font-display text-4xl">{stat.value}</dd>
                    <dt class="mt-2 font-mono text-xs tracking-[0.18em] text-muted uppercase">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </Container>
      </Section>
    )
  }

  {/* CTA final */}
  <CTASection
    title={home.ctaSection?.title}
    text={home.ctaSection?.text}
    cta={home.ctaSection?.cta}
  />
</BaseLayout>
```

**Nota:** la home NO lleva FAQs (van en el detalle de servicio). No dejar imports sin uso (rompe lint).

- [ ] **Step 2: Verificar en dev**

```bash
# desde / (stack arriba)
pnpm dev:web
```

Abrir http://localhost:4321 — expected: hero en tinta con retícula, y las 10 secciones en el orden del spec con contenido del seed.

- [ ] **Step 3: Quality gate y commit**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add web/src/pages/index.astro
git commit -m "feat(web): home comercial completa FASE 4"
```

---

### Task 12: Web — /servicios y /servicios/[slug]

**Files:**
- Create: `web/src/pages/servicios/index.astro`
- Create: `web/src/pages/servicios/[slug].astro`

**Interfaces:**
- Consumes: `getCollection('services')`, componentes de Tasks 9–10, `absoluteTitle` de BaseLayout, `resolveDocs`.
- Produces: rutas `/servicios` y `/servicios/<slug>` estáticas para todos los servicios publicados.

- [ ] **Step 1: Crear `web/src/pages/servicios/index.astro`**

```astro
---
/** Catálogo completo de servicios (FASE 4). */
import SectionIntro from '@/components/sections/SectionIntro.astro'
import ServiceCard from '@/components/sections/ServiceCard.astro'
import Container from '@/components/ui/Container.astro'
import Section from '@/components/ui/Section.astro'
import BaseLayout from '@/layouts/BaseLayout.astro'
import { getCollection } from '@/lib/payload'

const services = await getCollection('services', { sort: 'order', limit: 100 })
---

<BaseLayout
  title="Servicios"
  description="Catálogo completo de servicios ZiftLab: desarrollo web, e-commerce, marketing, automatización e inteligencia artificial."
>
  <Section class="md:pb-16">
    <Container>
      <SectionIntro
        eyebrow={`Catálogo · ${services.totalDocs} servicios`}
        title="Lo que construimos"
        text="Cada servicio funciona solo o combinado con los demás. Todos empiezan igual: entendiendo tu negocio."
        as="h1"
        size="display"
      />
    </Container>
  </Section>
  <Section tone="surface">
    <Container>
      <ul class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {
          services.docs.map((service) => (
            <li>
              <ServiceCard service={service} />
            </li>
          ))
        }
      </ul>
    </Container>
  </Section>
</BaseLayout>
```

- [ ] **Step 2: Crear `web/src/pages/servicios/[slug].astro`**

```astro
---
/**
 * Detalle de servicio (FASE 4): H1 único, descripción, beneficios, qué
 * incluye, proceso, casos relacionados, FAQs y CTA a asesoría. El SEO
 * sale del grupo meta del plugin con fallback a título + excerpt.
 */
import PayloadImage from '@/components/PayloadImage.astro'
import BenefitsGrid from '@/components/sections/BenefitsGrid.astro'
import CTASection from '@/components/sections/CTASection.astro'
import FaqAccordion from '@/components/sections/FaqAccordion.astro'
import ProcessSteps from '@/components/sections/ProcessSteps.astro'
import ProjectCard from '@/components/sections/ProjectCard.astro'
import RichText from '@/components/sections/RichText.astro'
import SectionIntro from '@/components/sections/SectionIntro.astro'
import Button from '@/components/ui/Button.astro'
import Container from '@/components/ui/Container.astro'
import Eyebrow from '@/components/ui/Eyebrow.astro'
import Heading from '@/components/ui/Heading.astro'
import Section from '@/components/ui/Section.astro'
import Text from '@/components/ui/Text.astro'
import BaseLayout from '@/layouts/BaseLayout.astro'
import { getMediaUrl } from '@/lib/media'
import { getCollection, resolveDocs } from '@/lib/payload'
import type { Faq, Project, Service } from '@cms/types'

export async function getStaticPaths() {
  const services = await getCollection('services', { sort: 'order', limit: 100, depth: 2 })
  return services.docs
    .filter((service): service is Service & { slug: string } => Boolean(service.slug))
    .map((service) => ({ params: { slug: service.slug }, props: { service } }))
}

interface Props {
  service: Service
}

const { service } = Astro.props

const code = service.order ? `SRV-${String(service.order).padStart(2, '0')}` : null
const benefits = service.benefits ?? []
const features = service.features ?? []
const steps = service.process ?? []
const relatedProjects = resolveDocs<Project>(service.relatedProjects)
const faqs = resolveDocs<Faq>(service.faqs)
const contactHref = `/contacto?servicio=${service.slug}`
---

<BaseLayout
  absoluteTitle={service.meta?.title ?? undefined}
  title={service.meta?.title ? undefined : service.title}
  description={service.meta?.description ?? service.excerpt}
  ogImage={getMediaUrl(service.meta?.image)}
>
  {/* Cabecera: espécimen del catálogo */}
  <Section class="md:pb-16">
    <Container>
      <Eyebrow>{code ? `Servicios · ${code}` : 'Servicios'}</Eyebrow>
      <Heading as="h1" size="display" class="mt-6 max-w-4xl">
        {service.title}
      </Heading>
      <Text size="lead" muted class="mt-6 max-w-2xl">
        {service.excerpt}
      </Text>
      <div class="mt-10 flex flex-wrap gap-4">
        <Button href={contactHref} size="lg">Agenda una asesoría</Button>
      </div>
      <PayloadImage
        media={service.image}
        priority
        class="mt-14 w-full rounded-xl border border-line object-cover"
        sizes="(min-width: 1152px) 1152px, 100vw"
      />
    </Container>
  </Section>

  {/* Descripción larga */}
  <Section tone="surface" class="border-t-0">
    <Container size="narrow">
      <RichText content={service.content} />
    </Container>
  </Section>

  {/* Beneficios */}
  {
    benefits.length > 0 && (
      <Section>
        <Container>
          <SectionIntro eyebrow="Beneficios" title="Qué gana tu negocio" />
          <BenefitsGrid items={benefits} class="mt-12" />
        </Container>
      </Section>
    )
  }

  {/* Qué incluye */}
  {
    features.length > 0 && (
      <Section tone="surface">
        <Container>
          <SectionIntro eyebrow="Alcance" title="Qué incluye" />
          <ul class="mt-12 grid gap-x-10 gap-y-4 sm:grid-cols-2" role="list">
            {features.map((feature) => (
              <li class="flex items-start gap-3 border-b border-line pb-4">
                <span class="mt-2 size-2 shrink-0 bg-zift" aria-hidden="true" />
                <Text>{feature.text}</Text>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    )
  }

  {/* Proceso */}
  {
    steps.length > 0 && (
      <Section>
        <Container>
          <SectionIntro eyebrow="Proceso" title="Cómo lo trabajamos" />
          <ProcessSteps steps={steps} class="mt-12" />
        </Container>
      </Section>
    )
  }

  {/* Casos relacionados */}
  {
    relatedProjects.length > 0 && (
      <Section tone="surface">
        <Container>
          <SectionIntro eyebrow="Casos" title="Casos relacionados" />
          <ul class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {relatedProjects.map((project) => (
              <li>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    )
  }

  {/* Preguntas frecuentes */}
  {
    faqs.length > 0 && (
      <Section>
        <Container size="narrow">
          <SectionIntro eyebrow="FAQs" title="Preguntas frecuentes" />
          <FaqAccordion faqs={faqs} class="mt-12" />
        </Container>
      </Section>
    )
  }

  {/* CTA a asesoría */}
  <CTASection
    title="¿Hablamos de tu proyecto?"
    text="Agenda una asesoría gratuita de 30 minutos. Te decimos qué haríamos y cuánto costaría, sin compromiso."
    cta={{ label: 'Agenda una asesoría', href: contactHref }}
  />
</BaseLayout>
```

**Nota:** `Section tone="surface"` pinta `border-y`; en la sección de descripción se anula el borde superior con `class="border-t-0"` para que el corte con la cabecera sea limpio.

- [ ] **Step 3: Verificar en dev**

Abrir http://localhost:4321/servicios y http://localhost:4321/servicios/desarrollo-web — expected: catálogo con 14 especímenes `SRV-XX`; detalle con las 8 secciones del spec y `<title>` «Desarrollo web | ZiftLab» (sin duplicar «| ZiftLab»).

- [ ] **Step 4: Quality gate y commit**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add web/src/pages/servicios
git commit -m "feat(web): catálogo y detalle de servicios FASE 4"
```

---

### Task 13: Web — /quienes-somos

**Files:**
- Create: `web/src/pages/quienes-somos.astro`

**Interfaces:**
- Consumes: global `about-page` (depth 2), colección `team-members`; `RichText`, `BenefitsGrid`, `CTASection`, `SectionIntro`, `PayloadImage`.

- [ ] **Step 1: Crear `web/src/pages/quienes-somos.astro`**

```astro
---
/** Quiénes somos (FASE 4): global about-page + equipo desde team-members. */
import PayloadImage from '@/components/PayloadImage.astro'
import BenefitsGrid from '@/components/sections/BenefitsGrid.astro'
import CTASection from '@/components/sections/CTASection.astro'
import RichText from '@/components/sections/RichText.astro'
import SectionIntro from '@/components/sections/SectionIntro.astro'
import Container from '@/components/ui/Container.astro'
import Heading from '@/components/ui/Heading.astro'
import Section from '@/components/ui/Section.astro'
import Text from '@/components/ui/Text.astro'
import BaseLayout from '@/layouts/BaseLayout.astro'
import { getCollection, getGlobal } from '@/lib/payload'

const [about, team] = await Promise.all([
  getGlobal('about-page', { depth: 2 }),
  getCollection('team-members', { sort: 'order', limit: 20 }),
])

const values = about.values ?? []
---

<BaseLayout
  title={about.intro?.title ?? 'Quiénes somos'}
  description={about.intro?.text ?? undefined}
>
  <Section class="md:pb-16">
    <Container>
      <SectionIntro
        eyebrow={about.intro?.eyebrow}
        title={about.intro?.title}
        text={about.intro?.text}
        as="h1"
        size="display"
        class="max-w-3xl"
      />
      <PayloadImage
        media={about.intro?.image}
        priority
        class="mt-14 w-full rounded-xl border border-line object-cover"
        sizes="(min-width: 1152px) 1152px, 100vw"
      />
    </Container>
  </Section>

  {
    about.story && (
      <Section tone="surface">
        <Container size="narrow">
          <RichText content={about.story} />
        </Container>
      </Section>
    )
  }

  {
    values.length > 0 && (
      <Section>
        <Container>
          <SectionIntro eyebrow="Valores" title="Cómo trabajamos" />
          <BenefitsGrid items={values} class="mt-12" />
        </Container>
      </Section>
    )
  }

  {
    team.docs.length > 0 && (
      <Section tone="surface">
        <Container>
          <SectionIntro
            eyebrow="Equipo"
            title={about.teamSection?.title}
            text={about.teamSection?.subtitle}
          />
          <ul class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {team.docs.map((member) => (
              <li class="rounded-xl border border-line bg-white p-6 md:p-8">
                <PayloadImage
                  media={member.photo}
                  class="mb-5 size-16 rounded-full object-cover"
                  sizes="64px"
                />
                <Heading as="h3" size="sm">
                  {member.name}
                </Heading>
                <p class="mt-1 font-mono text-xs tracking-[0.18em] text-muted uppercase">
                  {member.role}
                </p>
                {member.bio && (
                  <Text size="sm" muted class="mt-3">
                    {member.bio}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    )
  }

  <CTASection
    title={about.ctaSection?.title}
    text={about.ctaSection?.text}
    cta={about.ctaSection?.cta}
  />
</BaseLayout>
```

- [ ] **Step 2: Verificar, quality gate y commit**

Abrir http://localhost:4321/quienes-somos — expected: intro, historia, 4 valores, 3 miembros, CTA.

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add web/src/pages/quienes-somos.astro
git commit -m "feat(web): página quiénes somos FASE 4"
```

---

### Task 14: Web — LeadForm, /contacto y /gracias

**Files:**
- Create: `web/src/components/sections/LeadForm.astro`
- Create: `web/src/pages/contacto.astro`
- Create: `web/src/pages/gracias.astro`

**Interfaces:**
- Consumes: `PAYLOAD_URL` de `@/lib/payload`, colección `services` (para el select), global `contact-page`, `site-settings`.
- Produces: flujo de lead completo — POST navegador → `/api/leads` → redirect `/gracias`.

- [ ] **Step 1: Crear `web/src/components/sections/LeadForm.astro`**

```astro
---
/**
 * Formulario de lead FASE 4: validación HTML5 + fetch a /api/leads
 * (create: anyone + CORS, FASE 1). El hardening (Zod, honeypot, rate
 * limiting, emails) llega en FASE 7 sobre este mismo markup.
 */
import Button from '@/components/ui/Button.astro'
import { PAYLOAD_URL } from '@/lib/payload'
import type { Service } from '@cms/types'

interface Props {
  services: Service[]
}

const { services } = Astro.props

const inputClasses =
  'h-11 rounded-md border border-line bg-white px-4 text-base font-normal transition-colors placeholder:text-muted/60 focus:border-zift focus:outline-none'
---

<form id="lead-form" data-api={`${PAYLOAD_URL}/api/leads`} class="grid gap-5">
  <div class="grid gap-5 sm:grid-cols-2">
    <label class="grid gap-2 text-sm font-medium">
      Nombre
      <input name="name" required autocomplete="name" class={inputClasses} />
    </label>
    <label class="grid gap-2 text-sm font-medium">
      Email
      <input name="email" type="email" required autocomplete="email" class={inputClasses} />
    </label>
    <label class="grid gap-2 text-sm font-medium">
      Teléfono / WhatsApp <span class="font-normal text-muted">(opcional)</span>
      <input name="phone" type="tel" autocomplete="tel" class={inputClasses} />
    </label>
    <label class="grid gap-2 text-sm font-medium">
      Empresa <span class="font-normal text-muted">(opcional)</span>
      <input name="company" autocomplete="organization" class={inputClasses} />
    </label>
  </div>
  <label class="grid gap-2 text-sm font-medium">
    Servicio de interés <span class="font-normal text-muted">(opcional)</span>
    <select name="service" class={inputClasses}>
      <option value="">Aún no lo sé</option>
      {
        services.map((service) => (
          <option value={service.id} data-slug={service.slug}>
            {service.title}
          </option>
        ))
      }
    </select>
  </label>
  <label class="grid gap-2 text-sm font-medium">
    Cuéntanos tu proyecto <span class="font-normal text-muted">(opcional)</span>
    <textarea
      name="message"
      rows="5"
      class="rounded-md border border-line bg-white px-4 py-3 text-base font-normal transition-colors placeholder:text-muted/60 focus:border-zift focus:outline-none"
      placeholder="Qué necesitas, plazos, contexto…"></textarea>
  </label>
  <div class="flex flex-wrap items-center gap-4">
    <Button type="submit" size="lg">Enviar mensaje</Button>
    <p id="lead-form-status" class="text-sm text-muted" role="status" aria-live="polite"></p>
  </div>
</form>

<script>
  const form = document.getElementById('lead-form') as HTMLFormElement
  const status = document.getElementById('lead-form-status') as HTMLParagraphElement
  const submit = form.querySelector('button[type="submit"]') as HTMLButtonElement

  // Preselección del servicio vía ?servicio=<slug> (CTA del detalle de servicio)
  const slug = new URLSearchParams(window.location.search).get('servicio')
  if (slug) {
    const option = form.querySelector<HTMLOptionElement>(`option[data-slug="${CSS.escape(slug)}"]`)
    if (option) option.selected = true
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const data = new FormData(form)
    const service = data.get('service')

    submit.disabled = true
    status.textContent = 'Enviando…'

    try {
      const response = await fetch(form.dataset.api!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone') || undefined,
          company: data.get('company') || undefined,
          service: service ? Number(service) : undefined,
          message: data.get('message') || undefined,
          source: 'formulario-contacto',
        }),
      })
      if (!response.ok) throw new Error(`Payload respondió ${response.status}`)
      window.location.assign('/gracias')
    } catch {
      submit.disabled = false
      status.textContent =
        'No se pudo enviar el mensaje. Inténtalo de nuevo o escríbenos por email.'
    }
  })
</script>
```

- [ ] **Step 2: Crear `web/src/pages/contacto.astro`**

```astro
---
/** Contacto (FASE 4): intro del global + datos de site-settings + LeadForm. */
import LeadForm from '@/components/sections/LeadForm.astro'
import SectionIntro from '@/components/sections/SectionIntro.astro'
import Container from '@/components/ui/Container.astro'
import Section from '@/components/ui/Section.astro'
import BaseLayout from '@/layouts/BaseLayout.astro'
import { getCachedGlobal, getCollection, getGlobal } from '@/lib/payload'

const [page, settings, services] = await Promise.all([
  getGlobal('contact-page'),
  getCachedGlobal('site-settings'),
  getCollection('services', { sort: 'order', limit: 100 }),
])

const whatsappHref = settings.whatsapp
  ? `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, '')}`
  : null
---

<BaseLayout title={page.title ?? 'Contacto'} description={page.text ?? undefined}>
  <Section>
    <Container>
      <div class="grid gap-14 lg:grid-cols-[2fr_1fr] lg:gap-20">
        <div>
          <SectionIntro
            eyebrow="Contacto"
            title={page.title}
            text={page.text}
            as="h1"
            size="display"
          />
          <div class="mt-12">
            <LeadForm services={services.docs} />
          </div>
        </div>

        <aside class="h-fit rounded-xl border border-line bg-surface p-6 md:p-8">
          <h2 class="font-mono text-xs tracking-[0.18em] text-muted uppercase">
            Datos de contacto
          </h2>
          <dl class="mt-6 space-y-5 text-sm">
            {
              settings.contactEmail && (
                <div>
                  <dt class="font-medium">Email</dt>
                  <dd class="mt-1">
                    <a href={`mailto:${settings.contactEmail}`} class="text-zift hover:underline">
                      {settings.contactEmail}
                    </a>
                  </dd>
                </div>
              )
            }
            {
              settings.phone && (
                <div>
                  <dt class="font-medium">Teléfono</dt>
                  <dd class="mt-1 text-muted">{settings.phone}</dd>
                </div>
              )
            }
            {
              whatsappHref && (
                <div>
                  <dt class="font-medium">WhatsApp</dt>
                  <dd class="mt-1">
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-zift hover:underline"
                    >
                      Escríbenos por WhatsApp
                    </a>
                  </dd>
                </div>
              )
            }
            {
              settings.address && (
                <div>
                  <dt class="font-medium">Dirección</dt>
                  <dd class="mt-1 text-muted">{settings.address}</dd>
                </div>
              )
            }
          </dl>
        </aside>
      </div>
    </Container>
  </Section>
</BaseLayout>
```

- [ ] **Step 3: Crear `web/src/pages/gracias.astro`**

```astro
---
/** Confirmación de lead (FASE 4). noindex: es una página de flujo, no de búsqueda. */
import Button from '@/components/ui/Button.astro'
import Container from '@/components/ui/Container.astro'
import Eyebrow from '@/components/ui/Eyebrow.astro'
import Heading from '@/components/ui/Heading.astro'
import Section from '@/components/ui/Section.astro'
import Text from '@/components/ui/Text.astro'
import BaseLayout from '@/layouts/BaseLayout.astro'

const title = 'Mensaje enviado'
---

<BaseLayout title={title} noindex>
  <Section class="md:py-32">
    <Container size="narrow" class="text-center">
      <Eyebrow as="p" class="justify-center">Mensaje enviado</Eyebrow>
      <Heading as="h1" size="display" class="mt-6">Gracias — te leemos ya</Heading>
      <Text size="lead" muted class="mx-auto mt-6 max-w-xl">
        Recibimos tu mensaje. Te respondemos en menos de 24 horas hábiles con próximos pasos
        claros.
      </Text>
      <div class="mt-10 flex flex-wrap justify-center gap-4">
        <Button href="/servicios" size="lg">Ver servicios</Button>
        <Button href="/" variant="secondary" size="lg">Volver al inicio</Button>
      </div>
    </Container>
  </Section>
</BaseLayout>
```

- [ ] **Step 4: Probar el flujo completo en dev**

Con el stack arriba: abrir http://localhost:4321/contacto, llenar nombre/email, enviar. Expected: redirect a `/gracias`; el lead aparece en http://localhost:3000/admin/collections/leads con `source: formulario-contacto`. Probar también http://localhost:4321/contacto?servicio=seo → el select llega preseleccionado en «SEO». Probar el error: parar el cms (`make stop` o matar el proceso) y enviar → mensaje inline de error, botón rehabilitado.

- [ ] **Step 5: Quality gate y commit**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
git add web/src/components/sections/LeadForm.astro web/src/pages/contacto.astro web/src/pages/gracias.astro
git commit -m "feat(web): contacto con formulario de leads y página gracias"
```

---

### Task 15: Verificación integral FASE 4

**Files:** ninguno nuevo (correcciones menores si la verificación las destapa).

- [ ] **Step 1: Build completo con stack arriba**

```bash
# desde /
make start
pnpm build
```

Expected: build de cms y web en verde; el build de web genera `/`, `/servicios`, 14 rutas `/servicios/<slug>`, `/quienes-somos`, `/contacto`, `/gracias`.

- [ ] **Step 2: Quality gate completo**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check
```

Expected: verde.

- [ ] **Step 3: Recorrido de páginas (contra FASES.MD §FASE 4)**

Con `pnpm dev:web` o `pnpm preview`, verificar:

- `/` — hero, propuesta de valor, servicios destacados, beneficios, proceso, logos, casos, testimonios, CTA principal y secundario, bloque de confianza. Responsive en 375px y 1440px.
- `/servicios` — 14 tarjetas con códigos SRV-01…SRV-14.
- `/servicios/desarrollo-web` — H1 único, descripción, beneficios, qué incluye, proceso, casos relacionados (si el seed los relacionó), FAQs, CTA a asesoría.
- `/quienes-somos`, `/contacto`, `/gracias`.
- Nav del header: Servicios / Quiénes somos / Contacto + CTA — sin Portafolio ni Blog.
- Foco visible con teclado en nav, cards y formulario; `prefers-reduced-motion` sin animaciones.

- [ ] **Step 4: SEO**

```bash
curl -s http://localhost:4321/servicios/desarrollo-web | grep -o '<title>[^<]*</title>'
curl -s http://localhost:4321/gracias | grep -o 'noindex[^"]*'
```

Expected: `<title>Desarrollo web | ZiftLab</title>` (una sola vez «| ZiftLab»); `noindex, nofollow` en gracias.

- [ ] **Step 5: Flujo de lead end-to-end** (si no se hizo en Task 14): formulario → lead en admin → `/gracias`.

- [ ] **Step 6: Commit de cierre si hubo correcciones + verificación de fase**

```bash
# desde /
git add -A && git commit -m "fix(web): ajustes de verificación FASE 4"   # solo si hubo cambios
git commit --allow-empty -m "DEV A4.01 — FASE 4 Páginas comerciales core verificada"
```

- [ ] **Step 7: Respuesta final al usuario en el formato de 16 secciones de `docs/FASES.MD` §7** (análisis → objetivos → … → commit recomendado → checklist).
