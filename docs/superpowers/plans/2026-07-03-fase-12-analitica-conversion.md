# FASE 12 — Analítica y conversión: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar GA4 y Microsoft Clarity al consentimiento existente, instrumentar CTAs/WhatsApp/UTMs y documentar embudo y dashboard.

**Architecture:** Un componente `Analytics.astro` (incluido desde BaseLayout) carga gtag.js/Clarity solo tras consentimiento de analítica (modo básico de Consent Mode), captura UTMs first-touch por sesión y delega los clics de CTA/WhatsApp. `track()` pasa a formato gtag manteniendo su firma. Las UTMs viajan con los leads (grupo `utm` en el CMS) y con las reservas de Calendly.

**Tech Stack:** Astro 5, Payload CMS v3, Zod, gtag.js (GA4), Clarity. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-07-03-fase-12-analitica-conversion-design.md`

## Global Constraints

- Solo FASE 12; no mezclar con FASE 10/11.
- No hay suite de tests (llega en FASE 15): cada task se verifica con `pnpm typecheck` (+ lint/build al final) y verificación manual en Task 7.
- Ningún script de Google/Microsoft se carga antes de `analytics: true`; el `default: denied` inline de BaseLayout no se toca.
- IDs solo en `web/.env` (`PUBLIC_GA4_ID`, `PUBLIC_CLARITY_ID`); nada hardcodeado.
- Comandos siempre indicando directorio (`# desde /`, `# desde /cms`).
- Commits estilo del repo (`feat(web): … FASE 12`) terminando con `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- El espejo web de validación de leads debe seguir en sync con `cms/src/leads/schema.ts` (el shape UTM vive en `web/src/lib/utm.ts`).

---

### Task 1: `track()` a formato gtag

**Files:**
- Modify: `web/src/lib/analytics.ts` (reemplazo completo)

**Interfaces:**
- Produces: `track(event: string, params?: TrackParams): void` (firma intacta — los call sites de WhatsAppButton/LeadForm/asesoria no se tocan) y tipos globales `Window.dataLayer` / `Window.clarity`.

- [ ] **Step 1: Reemplazar `web/src/lib/analytics.ts` completo**

```ts
/**
 * Puente de eventos con GA4: FASE 7 encolaba en dataLayer; FASE 12 conecta
 * gtag.js (Analytics.astro). track() usa el formato de gtag (objeto
 * `arguments`): lo emitido antes de que cargue el script queda encolado y se
 * procesa al cargar; si el usuario no consiente, gtag.js nunca carga y la
 * cola es inerte.
 */

export type TrackParams = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    /** Función/stub de Microsoft Clarity (la inyecta Analytics.astro) */
    clarity?: { (...args: unknown[]): void; q?: unknown[] }
  }
}

export function track(event: string, params: TrackParams = {}): void {
  window.dataLayer ??= []
  // gtag.js exige `arguments` — los objetos planos son sintaxis de GTM y los ignora
  function gtag(..._args: unknown[]) {
    window.dataLayer!.push(arguments as unknown as Record<string, unknown>)
  }
  gtag('event', event, params)
}
```

- [ ] **Step 2: Verificar tipos**

Run: `pnpm typecheck` (desde `/`)
Expected: PASS (0 errors en web y cms)

- [ ] **Step 3: Commit**

```bash
# desde /
git add web/src/lib/analytics.ts
git commit -m "feat(web): track() en formato gtag para GA4 directo FASE 12"
```

---

### Task 2: UTMs, Analytics.astro y env vars

**Files:**
- Create: `web/src/lib/utm.ts`
- Create: `web/src/components/Analytics.astro`
- Modify: `web/src/layouts/BaseLayout.astro` (import + render tras `<CookieConsent />`)
- Modify: `Makefile` (target `env`, bloque web)
- Modify: `web/.env` (añadir las dos vars vacías)

**Interfaces:**
- Consumes: `track` (Task 1), `readConsent`/`CONSENT_EVENT`/`StoredConsent` de `web/src/lib/consent.ts` (existente).
- Produces: `UTM_KEY = 'ziftlab-utm'`, `type UtmData = Partial<Record<'source'|'medium'|'campaign'|'term'|'content', string>>`, `captureUtm(): void`, `readUtm(): UtmData | null`. Listener global de `[data-track-cta]` (→ `cta_click` con `label`, `location`, `href`) y `[data-track-whatsapp]` (→ `whatsapp_click` con `location`) que usan Tasks 3.

- [ ] **Step 1: Crear `web/src/lib/utm.ts`**

```ts
/**
 * Atribución de campañas (FASE 12): captura first-touch por sesión de los
 * parámetros utm_* y los guarda en sessionStorage con claves limpias
 * (source, medium…) — el shape espeja el grupo `utm` de
 * cms/src/leads/schema.ts. Sin gate de consentimiento, con criterio: es
 * first-party, vive solo la sesión y su único fin es atribuir un formulario
 * que el usuario envía voluntariamente (sin tracking cross-sesión).
 */

export const UTM_KEY = 'ziftlab-utm'

const UTM_FIELDS = ['source', 'medium', 'campaign', 'term', 'content'] as const

export type UtmData = Partial<Record<(typeof UTM_FIELDS)[number], string>>

/** Guarda las UTMs de la URL actual; first-touch: no pisa las de la sesión. */
export function captureUtm(): void {
  try {
    if (sessionStorage.getItem(UTM_KEY)) return
    const params = new URLSearchParams(window.location.search)
    const utm: UtmData = {}
    for (const field of UTM_FIELDS) {
      const value = params.get(`utm_${field}`)?.trim()
      if (value) utm[field] = value.slice(0, 200)
    }
    if (Object.keys(utm).length > 0) sessionStorage.setItem(UTM_KEY, JSON.stringify(utm))
  } catch {
    // sessionStorage bloqueado (p. ej. Safari privado): sin atribución
  }
}

/** UTMs de la sesión, o null si el usuario no llegó con campaña. */
export function readUtm(): UtmData | null {
  try {
    const raw = sessionStorage.getItem(UTM_KEY)
    if (!raw) return null
    const utm = JSON.parse(raw) as UtmData
    return Object.keys(utm).length > 0 ? utm : null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Crear `web/src/components/Analytics.astro`**

```astro
---
/**
 * Analítica (FASE 12): carga GA4 y Clarity SOLO tras consentimiento de
 * analítica — modo básico de Consent Mode, criterio AEPD; el default denied
 * inline de BaseLayout queda como segunda red. Sin IDs en web/.env no se
 * inyecta nada (dev limpio). También captura las UTMs de la sesión y delega
 * los clics de CTA ([data-track-cta]) y WhatsApp ([data-track-whatsapp]).
 */
---

<script>
  import { track } from '@/lib/analytics'
  import { CONSENT_EVENT, readConsent, type StoredConsent } from '@/lib/consent'
  import { captureUtm } from '@/lib/utm'

  const GA4_ID = (import.meta.env.PUBLIC_GA4_ID as string | undefined) || undefined
  const CLARITY_ID = (import.meta.env.PUBLIC_CLARITY_ID as string | undefined) || undefined

  captureUtm()

  // --- Carga consent-gated: nada de Google/Microsoft sin analytics granted ---

  let loaded = false

  const inject = (src: string): void => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    document.head.appendChild(script)
  }

  const loadVendors = (): void => {
    if (loaded) return
    loaded = true
    if (GA4_ID) {
      window.dataLayer ??= []
      // gtag exige `arguments`, como en lib/consent.ts
      function gtag(..._args: unknown[]) {
        window.dataLayer!.push(arguments as unknown as Record<string, unknown>)
      }
      gtag('js', new Date())
      gtag('config', GA4_ID)
      inject(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`)
    }
    if (CLARITY_ID) {
      // Equivalente tipado del snippet oficial: stub con cola + tag del proyecto
      window.clarity ??= Object.assign(
        function (...args: unknown[]) {
          ;(window.clarity!.q ??= []).push(args)
        },
        { q: [] as unknown[] },
      )
      inject(`https://www.clarity.ms/tag/${CLARITY_ID}`)
    }
  }

  if (GA4_ID || CLARITY_ID) {
    if (readConsent()?.analytics) loadVendors()
    window.addEventListener(CONSENT_EVENT, (event) => {
      const consent = (event as CustomEvent<StoredConsent>).detail
      if (consent.analytics) {
        if (loaded) window.clarity?.('start')
        else loadVendors()
      } else {
        window.clarity?.('stop')
      }
    })
  }

  // --- Delegación de clics: CTAs y WhatsApp (atributos data-track-*) ---

  document.addEventListener('click', (event) => {
    const target = event.target as Element | null
    const cta = target?.closest<HTMLElement>('[data-track-cta]')
    if (cta) {
      track('cta_click', {
        label: cta.dataset.trackCta,
        location: cta.dataset.trackLocation,
        href: cta.getAttribute('href') ?? undefined,
      })
      return
    }
    const whatsapp = target?.closest<HTMLElement>('[data-track-whatsapp]')
    if (whatsapp) track('whatsapp_click', { location: whatsapp.dataset.trackWhatsapp })
  })
</script>
```

- [ ] **Step 3: Incluirlo en `web/src/layouts/BaseLayout.astro`**

Añadir el import (orden alfabético del bloque existente):

```ts
import Analytics from '@/components/Analytics.astro'
```

Y renderizarlo justo después de `<CookieConsent />`:

```astro
    <CookieConsent />
    <Analytics />
```

- [ ] **Step 4: Env vars en `Makefile` y `web/.env`**

En el target `env` del `Makefile`, bloque de `web/.env`, añadir dos líneas tras `PUBLIC_PAYLOAD_API_URL`:

```make
	@if [ -f web/.env ]; then echo "✓ web/.env"; else \
		{ \
			echo "PUBLIC_SITE_URL=http://localhost:4321"; \
			echo "PUBLIC_PAYLOAD_API_URL=http://localhost:3000"; \
			echo "PUBLIC_GA4_ID="; \
			echo "PUBLIC_CLARITY_ID="; \
		} > web/.env; \
		echo "→ web/.env creado"; \
	fi
```

Y en el `web/.env` local existente, añadir al final:

```
PUBLIC_GA4_ID=
PUBLIC_CLARITY_ID=
```

- [ ] **Step 5: Verificar**

Run: `pnpm typecheck` (desde `/`)
Expected: PASS

- [ ] **Step 6: Commit**

```bash
# desde /
git add web/src/lib/utm.ts web/src/components/Analytics.astro web/src/layouts/BaseLayout.astro Makefile
git commit -m "feat(web): GA4 y Clarity consent-gated + captura UTM de sesión FASE 12"
```

(`web/.env` no se versiona.)

---

### Task 3: Instrumentación de CTAs y WhatsApp

**Files:**
- Modify: `web/src/components/ui/Button.astro` (props `data-track-*`)
- Modify: `web/src/components/Header.astro:81,140`
- Modify: `web/src/pages/index.astro:92,99`
- Modify: `web/src/pages/servicios/[slug].astro:80-81`
- Modify: `web/src/pages/[slug].astro:100-101`
- Modify: `web/src/components/sections/CTASection.astro:36`
- Modify: `web/src/components/Footer.astro:78` (link WhatsApp)
- Modify: `web/src/components/WhatsAppButton.astro` (atributo en vez de script propio)

**Interfaces:**
- Consumes: listener global de Task 2 (`[data-track-cta]` + `data-track-location`; `[data-track-whatsapp]`).
- Produces: nada nuevo para tasks posteriores.

Decisión registrada: las cards de servicio (`ServiceCard`/`Card`) NO se instrumentan — son navegación, no CTA; el `page_view` del destino ya las mide. Los CTAs reales del detalle de servicio/landing sí.

- [ ] **Step 1: `Button.astro` acepta los data-attributes**

En `interface Props` añadir:

```ts
  /** Analítica (FASE 12): identifican el CTA para el evento cta_click */
  'data-track-cta'?: string
  'data-track-location'?: string
```

En el destructure añadir:

```ts
  'data-track-cta': trackCta,
  'data-track-location': trackLocation,
```

Y en AMBOS elementos (el `<a>` y el `<button>`) añadir los atributos (undefined los omite):

```astro
data-track-cta={trackCta}
data-track-location={trackLocation}
```

- [ ] **Step 2: Header (desktop y móvil)**

Ambos `<Button href={cta.href} …>` de `Header.astro` (líneas ~81 y ~140) reciben:

```astro
data-track-cta={cta.label}
data-track-location="header"
```

- [ ] **Step 3: Hero del home**

En `index.astro`, el Button de `primaryCta` (línea ~92) y el de `secondaryCta` (línea ~99) reciben:

```astro
data-track-cta={primaryCta.label!}
data-track-location="hero"
```

```astro
data-track-cta={secondaryCta.label!}
data-track-location="hero"
```

- [ ] **Step 4: Detalle de servicio y landings**

`servicios/[slug].astro` líneas 80-81:

```astro
<Button href={quoteHref} size="lg" data-track-cta="pedir-cotizacion" data-track-location="servicio-detalle">Pedir cotización</Button>
<Button href="/asesoria" variant="secondary" size="lg" data-track-cta="agenda-asesoria" data-track-location="servicio-detalle">Agenda una asesoría</Button>
```

`[slug].astro` líneas 100-101: mismos atributos pero `data-track-location="landing"`.

- [ ] **Step 5: CTASection**

En `CTASection.astro` línea ~36:

```astro
<Button href={button.href!} newTab={button.newTab ?? false} size="lg" data-track-cta={button.label!} data-track-location="cta-banner">
```

- [ ] **Step 6: WhatsApp footer y FAB**

`Footer.astro` (~línea 78), el `<a href={\`https://wa.me/...\`}>` recibe `data-track-whatsapp="footer"`.

`WhatsAppButton.astro`: añadir `data-track-whatsapp="fab"` al `<a>` y **eliminar el bloque `<script>` completo** (el listener global de Analytics.astro lo cubre). Actualizar el comentario de cabecera: el clic lo captura el listener global de Analytics.astro (FASE 12).

- [ ] **Step 7: Verificar**

Run: `pnpm typecheck && pnpm lint` (desde `/`)
Expected: PASS

- [ ] **Step 8: Commit**

```bash
# desde /
git add web/src
git commit -m "feat(web): eventos cta_click y whatsapp_click con location FASE 12"
```

---

### Task 4: UTMs en los leads (CMS + formulario)

**Files:**
- Modify: `cms/src/leads/schema.ts` (campo `utm` en el objeto Zod)
- Modify: `cms/src/collections/Leads.ts` (grupo `utm` tras `source`)
- Modify: `web/src/components/sections/LeadForm.astro` (payload del submit)
- Regenerar: `cms/src/payload-types.ts` (via `pnpm generate:types`, no editar a mano)

**Interfaces:**
- Consumes: `readUtm(): UtmData | null` (Task 2).
- Produces: el POST `/api/leads/submit` acepta `utm?: { source?, medium?, campaign?, term?, content? }` (strings saneados máx. 200); el lead lo persiste en el grupo `utm`.

- [ ] **Step 1: Zod del servidor — `cms/src/leads/schema.ts`**

Dentro del `z.object({...})`, después de la línea de `source`, añadir:

```ts
    // Atribución UTM (FASE 12): la captura el cliente (web/src/lib/utm.ts)
    utm: z
      .object({
        source: z.preprocess(emptyToUndefined, text(200).optional()),
        medium: z.preprocess(emptyToUndefined, text(200).optional()),
        campaign: z.preprocess(emptyToUndefined, text(200).optional()),
        term: z.preprocess(emptyToUndefined, text(200).optional()),
        content: z.preprocess(emptyToUndefined, text(200).optional()),
      })
      .optional(),
```

(El endpoint `submit.ts` hace `payload.create({ data: { ...data, status: 'new' } })` — el objeto anidado encaja con el grupo sin tocar el endpoint.)

- [ ] **Step 2: Grupo en la colección — `cms/src/collections/Leads.ts`**

Después del campo `source`, añadir:

```ts
    {
      name: 'utm',
      type: 'group',
      admin: {
        position: 'sidebar',
        description: 'Atribución de campaña capturada al enviar el formulario (FASE 12)',
        readOnly: true,
      },
      fields: [
        { name: 'source', type: 'text' },
        { name: 'medium', type: 'text' },
        { name: 'campaign', type: 'text' },
        { name: 'term', type: 'text' },
        { name: 'content', type: 'text' },
      ],
    },
```

- [ ] **Step 3: Regenerar tipos**

Run: `pnpm generate:types` (desde `/cms`)
Expected: `payload-types.ts` actualizado con `utm` en `Lead` (sin editarlo a mano).

- [ ] **Step 4: Payload del formulario — `web/src/components/sections/LeadForm.astro`**

En el `<script>`, añadir el import:

```ts
import { readUtm } from '@/lib/utm'
```

Y en el `body: JSON.stringify({ ... })` del fetch, tras `source: form.dataset.source,`:

```ts
            utm: readUtm() ?? undefined,
```

- [ ] **Step 5: Verificar**

Run: `pnpm typecheck` (desde `/`)
Expected: PASS. (En dev, Payload sincroniza el esquema de Postgres al arrancar: reiniciar el cms si estaba corriendo — `make stop && make start` desde `/`.)

- [ ] **Step 6: Commit**

```bash
# desde /
git add cms/src web/src/components/sections/LeadForm.astro
git commit -m "feat: UTMs first-touch guardadas con cada lead FASE 12"
```

---

### Task 5: UTMs en las reservas de Calendly

**Files:**
- Modify: `web/src/pages/asesoria.astro` (import de `UTM_KEY` + script inline antes del widget)

**Interfaces:**
- Consumes: `UTM_KEY` (Task 2); claves limpias (`source`, `medium`, …) del JSON en sessionStorage.

- [ ] **Step 1: Import en el frontmatter de `asesoria.astro`**

```ts
import { UTM_KEY } from '@/lib/utm'
```

- [ ] **Step 2: Reescribir la URL del widget antes de que cargue Calendly**

Dentro del bloque `calendlyUrl ? (...)`, ENTRE el `<div class="calendly-inline-widget" …/>` y el `<script src="https://assets.calendly.com/..." />`, insertar:

```astro
<script is:inline define:vars={{ utmKey: UTM_KEY }}>
  // UTMs de la sesión → URL del widget ANTES de que Calendly la lea
  // (widget.js es async y escanea data-url al inicializar; este script es
  // síncrono y va antes en el DOM, así que siempre gana la carrera).
  // Calendly persiste los utm_* con cada reserva.
  try {
    var utm = JSON.parse(sessionStorage.getItem(utmKey) || 'null')
    var el = document.querySelector('.calendly-inline-widget')
    if (utm && el) {
      var url = new URL(el.getAttribute('data-url'))
      for (var key in utm) if (utm[key]) url.searchParams.set('utm_' + key, utm[key])
      el.setAttribute('data-url', url.toString())
    }
  } catch (e) {}
</script>
```

- [ ] **Step 3: Verificar**

Run: `pnpm typecheck && pnpm lint` (desde `/`)
Expected: PASS

- [ ] **Step 4: Commit**

```bash
# desde /
git add web/src/pages/asesoria.astro
git commit -m "feat(web): UTMs de sesión en las reservas de Calendly FASE 12"
```

---

### Task 6: ANALITICA.md (taxonomía, embudo, dashboard)

**Files:**
- Create: `ANALITICA.md` (raíz del repo, junto a `FASES.MD`)

**Interfaces:** ninguna (documentación).

- [ ] **Step 1: Crear `ANALITICA.md`**

Contenido completo (ajustar solo si la implementación divergió):

```markdown
# Analítica y conversión (FASE 12)

Cómo mide ZiftLab: GA4 (tráfico y conversiones) + Microsoft Clarity
(comportamiento). Nada se carga sin consentimiento de analítica (banner de
cookies, FASE 16). Los IDs viven en `web/.env`:

    PUBLIC_GA4_ID=G-XXXXXXXXXX
    PUBLIC_CLARITY_ID=xxxxxxxxxx

Sin IDs no se inyecta ningún script (dev queda limpio).

## Taxonomía de eventos

| Evento | Cuándo | Parámetros | Origen |
| --- | --- | --- | --- |
| `page_view` | Cada página | automáticos | gtag config |
| `form_start` | Primer input en un form | automáticos | Enhanced measurement |
| `cta_click` | Clic en un CTA instrumentado | `label`, `location` (header \| hero \| servicio-detalle \| landing \| cta-banner), `href` | `[data-track-cta]` |
| `whatsapp_click` | Clic en WhatsApp | `location` (fab \| footer) | `[data-track-whatsapp]` |
| `generate_lead` | Submit OK del formulario | `form_type` (contacto \| asesoria \| cotizacion) | `LeadForm.astro` |
| `asesoria_agendada` | Reserva confirmada en Calendly | — | postMessage en `asesoria.astro` |

Para instrumentar un CTA nuevo basta con atributos — el listener global de
`Analytics.astro` hace el resto:

    <Button href="…" data-track-cta="mi-cta" data-track-location="mi-seccion">

## Configuración GA4 (una vez, en la propiedad)

1. Admin → Data streams → Web: crear el stream con la URL de producción y
   copiar el measurement ID a `PUBLIC_GA4_ID`.
2. Enhanced measurement: dejar activado (aporta `form_start`, scroll, etc.).
3. Admin → Events: marcar como **key events**: `generate_lead`,
   `asesoria_agendada`, `whatsapp_click`.
4. Clarity: crear proyecto en clarity.microsoft.com y copiar el ID a
   `PUBLIC_CLARITY_ID`.

## Embudo de conversión

Explore → Funnel exploration, pasos:

1. `page_view`
2. `cta_click`
3. `form_start`
4. `generate_lead`

Variante reservas: `page_view (/asesoria)` → `asesoria_agendada`.

## Dashboard (Looker Studio)

El "dashboard básico" es GA4 + una vista en Looker Studio (sin código):

1. lookerstudio.google.com → Create → Data source → conector GA4 → la
   propiedad de ZiftLab.
2. Informe con: usuarios y sesiones por semana; key events por semana;
   `cta_click` por `location` (dimensión personalizada de evento);
   `generate_lead` por `form_type`; sesiones por `session_source/medium`
   (las UTM).
3. Compartir el informe con el equipo (solo lectura).

Los leads con su UTM también se ven en el admin de Payload
(`/admin/collections/leads`, grupo «Utm» en el sidebar de cada lead).

## Convención UTM para campañas

    https://ziftlab.com/?utm_source=google&utm_medium=cpc&utm_campaign=lanzamiento-2026

- `utm_source`: plataforma en minúsculas — google, meta, linkedin, newsletter, whatsapp
- `utm_medium`: cpc, social, email, referral
- `utm_campaign`: kebab-case descriptivo — `lanzamiento-2026`, `seo-local-panama`
- `utm_term` / `utm_content`: opcionales (keyword / variante del anuncio)

First-touch por sesión: la primera UTM con la que entra el visitante se
guarda para toda la sesión y viaja con el lead y con la reserva de Calendly.

## Verificar en local

    # desde /
    make start
    # web/.env: poner IDs de prueba (p. ej. G-TEST y un id cualquiera) y
    # reiniciar el dev server para que Vite los lea

1. Abrir `http://localhost:4321/?utm_source=test&utm_medium=cpc` con las
   DevTools en Network.
2. **Rechazar** cookies → no debe aparecer ninguna request a
   `googletagmanager.com` ni `clarity.ms`.
3. Borrar `ziftlab-consent` de localStorage, recargar, **Aceptar** → ambos
   scripts cargan; en consola `window.dataLayer` muestra los eventos.
4. Enviar el formulario de contacto → el lead en el admin trae el grupo Utm.
5. Con el ID real: GA4 → Admin → DebugView muestra los eventos en vivo.
6. Dejar los IDs vacíos al terminar.
```

- [ ] **Step 2: Commit**

```bash
# desde /
git add ANALITICA.md
git commit -m "docs: ANALITICA.md — eventos, embudo, dashboard y UTMs FASE 12"
```

---

### Task 7: Verificación final y cierre

**Files:**
- Modify: `CLAUDE.md` (estado del proyecto: FASE 12 completa, siguiente FASE 10)

- [ ] **Step 1: Stack arriba y quality gate**

```bash
# desde /
make status   # PostgreSQL, MinIO, cms:3000, web:4321 (make start si falta algo)
pnpm lint && pnpm typecheck && pnpm format:check
pnpm build
```

Expected: todo PASS. Si Prettier se queja de archivos nuevos: `pnpm format` y re-verificar.

- [ ] **Step 2: Verificación manual (Playwright local, headless)**

Con IDs dummy en `web/.env` (`PUBLIC_GA4_ID=G-TEST123`, `PUBLIC_CLARITY_ID=test123`) y el dev server reiniciado (`make stop && make start` para que Vite relea el .env). Script con `playwright-core` + Chromium cacheado (patrón conocido del proyecto; guion en el scratchpad, no en el repo):

- Ir a `http://localhost:4321/?utm_source=test&utm_medium=cpc&utm_campaign=fase12`, interceptando requests.
- Clic en «Rechazar todo» → assert: 0 requests a `googletagmanager.com`/`clarity.ms`.
- Limpiar storage, recargar, clic en «Aceptar todo» → assert: ambos hosts requesteados.
- Clic en un CTA del hero → assert: `window.dataLayer` contiene una entrada `arguments` con `cta_click`.
- Assert: `sessionStorage['ziftlab-utm']` contiene `{"source":"test","medium":"cpc","campaign":"fase12"}`.
- POST del formulario (interceptar request a `/api/leads/submit`) → assert: body incluye `utm`.

Al terminar: devolver `web/.env` a IDs vacíos y reiniciar el stack si se tocó.

- [ ] **Step 3: Actualizar `CLAUDE.md`**

En «What this project is», actualizar el estado: FASE 12 completa (además de 7, 8, 9 y 16); siguiente FASE 10. Añadir una línea sobre las piezas FASE 12: `Analytics.astro` (carga consent-gated + delegación `data-track-*`), `web/src/lib/utm.ts` (first-touch por sesión → leads y Calendly), IDs en `web/.env`, documentación en `ANALITICA.md`.

- [ ] **Step 4: Commit de cierre**

```bash
# desde /
git add CLAUDE.md
git commit -m "docs: CLAUDE.md — FASE 12 completada, siguiente FASE 10"
```
