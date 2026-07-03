# FASE 12 — Analítica y conversión (diseño)

Fecha: 2026-07-03 · Rama: `dev` · Estado: aprobado

## Objetivo

Medir resultados comerciales del sitio: tráfico (GA4), comportamiento (Clarity),
conversiones (leads, reservas, WhatsApp), embudo y atribución de campañas (UTM).
Todo cargado a través del consentimiento de FASE 16, nunca alrededor de él.

Decisión de orden: la FASE 12 se hace antes que la 10 (seguridad) y la 11
(performance), que quedan pendientes — mismo criterio que la FASE 16.

## Punto de partida (ya existe)

- `web/src/lib/analytics.ts` (FASE 7): `track(event, params)` que encola en
  `window.dataLayer`.
- Eventos ya emitidos: `whatsapp_click` (FAB), `generate_lead` (submit OK de
  LeadForm, con `form_type`), `asesoria_agendada` (postMessage de Calendly).
- Consentimiento (FASE 16): Consent Mode v2 con `default: denied` inline en
  `BaseLayout.astro`, banner `CookieConsent.astro`, estado en
  `web/src/lib/consent.ts` (`localStorage ziftlab-consent`, evento
  `zift:consent`, updates de `analytics_storage`/`ad_storage` al dataLayer).

## 1. Configuración

Dos env vars públicas en `web/.env`:

- `PUBLIC_GA4_ID` — measurement ID `G-…`
- `PUBLIC_CLARITY_ID` — project ID de Microsoft Clarity

Sin ID no se inyecta el script correspondiente: dev queda limpio sin tocar
código. No son secretos (van en el HTML público), pero viven en `.env` como el
resto de configuración. La "plantilla" del proyecto es el target `env` del
Makefile: se añaden ahí vacías (nunca pisa `.env` existentes) y se documentan
en `ANALITICA.md`.

## 2. Carga de scripts, consent-gated (modo básico)

Nuevo componente `web/src/components/Analytics.astro`, incluido desde
`BaseLayout.astro` solo cuando hay al menos un ID. Script inline que:

1. Lee el consentimiento guardado (`ziftlab-consent`).
2. Si `analytics: true` → inyecta `gtag.js` (config con el GA4 ID) y el snippet
   de Clarity.
3. Si no hay decisión o es `false` → escucha `zift:consent` y los inyecta al
   concederse (funciona a mitad de sesión, sin recargar).
4. Si el usuario revoca analytics con la página abierta → `window.clarity?.('stop')`;
   GA4 queda cubierto por el `consent update` que ya empuja `consent.ts`.

Criterio: **modo básico de Consent Mode** — ningún script de Google/Microsoft
se carga antes del consentimiento (línea AEPD). El `default: denied` inline
existente queda como segunda red de seguridad y no se toca.

`page_view` lo envía automáticamente el `config` de gtag; el enhanced
measurement de GA4 aporta `form_start`, `scroll`, `outbound click`, etc.

## 3. Upgrade interno de `track()`

`track()` hoy empuja objetos planos (`{event, …}`), formato que **gtag.js
directo ignora** (es sintaxis de GTM). Se cambia el interno a formato gtag:

```ts
export function track(event: string, params: TrackParams = {}): void {
  window.dataLayer ??= []
  function gtag() {
    window.dataLayer!.push(arguments as unknown as Record<string, unknown>)
  }
  gtag('event', event, params)
}
```

La firma pública no cambia: los tres call sites existentes quedan intactos.
Los eventos emitidos antes de que cargue gtag.js quedan encolados en el
dataLayer y se procesan al cargar (solo si el usuario consintió; si nunca
consiente, gtag.js nunca carga y la cola es inerte).

## 4. Clics de CTA

Evento `cta_click` por delegación: un único listener global, registrado desde
el script de `Analytics.astro`, sobre `[data-track-cta]`:

```
track('cta_click', { label, location, href })
```

- `label`: texto o identificador del CTA (`data-track-cta="asesoria"`).
- `location`: `data-track-location` (header | hero | footer | services | …).

Se instrumentan con atributos (sin JS nuevo por componente): CTA del header,
CTAs del hero de home, CTAs de cards/detalle de servicios, CTA del footer.
El enlace de WhatsApp del footer emite `whatsapp_click` con
`location: 'footer'` (el FAB ya emite el suyo; se le añade `location: 'fab'`).

## 5. UTM tracking

Nuevo `web/src/lib/utm.ts`:

- Captura first-touch **por sesión** de `utm_source`, `utm_medium`,
  `utm_campaign`, `utm_term`, `utm_content` en `sessionStorage`
  (`ziftlab-utm`); no se sobreescribe si ya existe.
- Sin gate de consentimiento, con criterio documentado: first-party, vida de
  sesión, sin tracking cross-sesión, propósito único de atribuir un formulario
  que el usuario envía voluntariamente.

Destinos:

- **Leads**: `LeadForm.astro` añade las UTMs guardadas al payload del submit.
  En el CMS: campos opcionales en `cms/src/leads/schema.ts` (Zod, saneados,
  máx. 200 chars como el resto), espejo en `web/src/lib/leads.ts` (deben
  seguir en sync), y grupo `utm` en `cms/src/collections/Leads.ts` (sidebar,
  read-only en admin). Regenerar tipos con `pnpm generate:types`.
- **Calendly**: en `asesoria.astro`, un script cliente añade las UTMs a la URL
  del widget antes de que Calendly lo inicialice (Calendly persiste `utm_*` en
  cada reserva).

GA4 atribuye UTMs por su cuenta; esto solo cubre el CMS y Calendly.

## 6. Embudo y conversiones (configuración GA4, sin código)

- Key events en GA4: `generate_lead`, `asesoria_agendada`, `whatsapp_click`.
- Embudo en Explorations:
  `page_view → cta_click → form_start (enhanced measurement) → generate_lead`.

## 7. Dashboard y documentación

`ANALITICA.md` en la raíz del repo (misma ubicación que `FASES.MD` tras la
purga de `docs/`), con:

- Taxonomía completa de eventos y sus parámetros (tabla).
- Pasos para marcar los key events en GA4.
- Montaje del embudo en Explorations.
- Guía de plantilla Looker Studio conectada a GA4 (el "dashboard básico":
  sin código, GA4 + Looker Studio son el dashboard).
- Convención de nombres UTM para campañas (valores de source/medium/campaign).
- Cómo verificar en local (IDs dummy + DebugView).

## 8. Verificación

- Quality gate: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`,
  `pnpm build` (stack local arriba: CMS + MinIO).
- Manual con Playwright local (IDs dummy en `web/.env`):
  - Rechazar consentimiento → **cero requests** a `googletagmanager.com` /
    `clarity.ms`.
  - Aceptar → ambos cargan; `cta_click`, `whatsapp_click`, `generate_lead`
    aparecen en el dataLayer con formato gtag.
  - Aceptar a mitad de sesión (sin recargar) → los scripts se inyectan.
  - Lead enviado con `?utm_source=test…` → el lead en el CMS guarda las UTMs.

No hay suite de tests (llega en FASE 15).

## Fuera de alcance

- Google Tag Manager, píxeles de marketing/remarketing (la categoría
  `marketing` del consentimiento queda reservada, sin uso).
- Dashboard custom en el admin de Payload / GA4 Data API.
- FASE 10 (seguridad) y FASE 11 (performance): pendientes, no se mezclan.

## Archivos afectados

| Archivo | Cambio |
| --- | --- |
| `web/.env` + target `env` del Makefile | `PUBLIC_GA4_ID`, `PUBLIC_CLARITY_ID` |
| `web/src/components/Analytics.astro` | nuevo: carga consent-gated + listener CTA |
| `web/src/layouts/BaseLayout.astro` | incluir `Analytics` |
| `web/src/lib/analytics.ts` | interno de `track()` a formato gtag |
| `web/src/lib/utm.ts` | nuevo: captura first-touch por sesión |
| `web/src/components/sections/LeadForm.astro` | UTMs en el payload |
| `web/src/pages/asesoria.astro` | UTMs → URL de Calendly |
| `web/src/components/Header.astro`, `Footer.astro`, hero/cards | atributos `data-track-cta` / `location` |
| `web/src/components/WhatsAppButton.astro` | `location: 'fab'` |
| `cms/src/leads/schema.ts` + `cms/src/collections/Leads.ts` | campos UTM (+ `generate:types`) |
| `web/src/lib/leads.ts` | espejo Zod de las UTMs |
| `ANALITICA.md` | nuevo: taxonomía, GA4, embudo, Looker Studio, UTMs |
