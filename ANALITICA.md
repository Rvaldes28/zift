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
