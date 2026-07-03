# FASE 9 — UX/UI premium: diseño

Fecha: 2026-07-02 · Estado: aprobado en brainstorming

## Contexto

FASE 7 completada (+ FASE 16 adelantada). La base visual de FASE 3/4 ya cubre:
design system con tokens (`web/src/styles/global.css` `@theme`), voz display
(Archivo Variable expandida 125 %), etiquetas mono (IBM Plex Mono), kit UI
(`web/src/components/ui/`), `prefers-reduced-motion`, `:focus-visible` y
`::selection` globales. **Todos los pares de color de los tokens pasan WCAG AA
para texto normal (≥ 4.5:1)** — verificado por cálculo el 2026-07-02; el par
más bajo es `ok/paper` (5.17) y el más alto `white/ink` (18.08).

FASE 9 añade la capa de percepción premium: movimiento, profundidad, estados y
remate de accesibilidad. FASE 8 (SEO técnico) queda pendiente y se hará después,
por decisión explícita del propietario (igual que FASE 16 se adelantó).

## Decisiones

- **Motor de animación: CSS + IntersectionObserver** (elegido por el usuario).
  Cero dependencias; un único script vanilla pequeño en `BaseLayout`.
- **Refinamiento sistémico, no rediseño.** La identidad tinta + ultramar +
  retícula milimétrica se mantiene; se eleva, no se reemplaza.

## Alcance

### 1. Tokens de movimiento y elevación (`global.css`)

- Easings: `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)` (salidas expresivas) y
  `--ease-inout` para transiciones simétricas.
- Duraciones: rápida (~150 ms, hover), media (~300 ms, despliegues), lenta
  (~600 ms, reveals de entrada).
- Sombras de elevación: 2 niveles sutiles tintados con ink frío
  (`--shadow-lift`, `--shadow-lift-lg`) para cards en hover y header al scroll.
- Regla: **ningún componente declara curvas ni tiempos ad hoc**; todo movimiento
  referencia estos tokens.

### 2. Sistema scroll-reveal

- Atributo `data-reveal` en el elemento a animar; `data-reveal-delay` (o
  `style="--reveal-delay"`) para stagger en grids.
- Script inline (~30 líneas, sin dependencias) en `BaseLayout.astro`:
  IntersectionObserver que añade una clase al entrar en viewport; se desconecta
  tras revelar (una sola vez, no re-anima al re-entrar).
- Efecto: opacidad 0→1 + translate-y ~16 px con `--ease-out` y duración lenta.
- **Sin JS el contenido es visible**: el estado oculto solo se aplica cuando el
  script marca `document.documentElement` (p. ej. clase `js-reveal`); si el
  script no corre, no hay estado oculto.
- `prefers-reduced-motion` ya anula transiciones globalmente (regla existente);
  además el script no observa nada si la media query está activa.

### 3. Hero premium (`index.astro` + `lab-grid`)

- Glow radial ultramar (`--color-zift` a baja opacidad) sobre el fondo tinta,
  detrás de la retícula.
- Entrada escalonada al cargar: eyebrow → título → subtítulo → CTAs (stagger de
  ~80 ms con los tokens de movimiento; solo primera carga, no scroll-reveal).
- La retícula `lab-grid` aparece con un fundido suave.

### 4. Microinteracciones (kit UI y componentes)

- **Button**: `active:scale` sutil; en `primary`/`inverse` flecha `→` que se
  desliza en hover cuando recibe `href` (render `<a>`); nueva prop `loading`
  (spinner + `disabled` + `aria-busy`).
- **Card**: hover = borde zift (ya existe) + `--shadow-lift` + lift de 2 px.
- **Header**: underline animado (scale-x) en los items de nav; sombra
  `--shadow-lift` cuando hay scroll (ya es sticky con blur).
- **FaqAccordion**: mantiene `details/summary` nativo y el `+` rotatorio;
  apertura suavizada como mejora progresiva (`interpolate-size` /
  `::details-content` donde exista soporte; sin JS extra).
- **LogoWall**: logos en escala de grises → color en hover/focus.
- **LeadForm**: focus ring consistente con el sistema, errores con transición
  de entrada (no shake), botón de envío usa `loading`.

### 5. Estados

- **`EmptyState.astro`** (nuevo, en `components/ui/`): icono/marca mono +
  mensaje + CTA opcional. Se usa en listados filtrados sin resultados
  (portafolio por categoría, blog).
- **`404.astro`** (nueva página, hoy no existe): en el mundo tinta con
  retícula, mensaje breve y CTAs a home/servicios/contacto.
- **Loading**: envío del LeadForm con `Button loading`; imágenes de cards con
  fade-in al cargar (`PayloadImage`).
- **Error**: presentación de errores del formulario elevada (mensaje por campo
  + resumen accesible con `aria-live`, ya en línea con FASE 7).

### 6. Ritmo visual y accesibilidad AA

- Escala de espaciado vertical consistente entre secciones (auditar `Section`:
  un solo sistema py-16/24/32 según variante, sin valores sueltos por página).
- **Skip-link** («Saltar al contenido») en `BaseLayout` + `id` en el `main`.
- Tap targets ≥ 44 px en nav móvil, chips de categoría y paginación.
- Auditoría de jerarquía de encabezados y landmarks en las plantillas.
- Contraste: ya verificado (ver Contexto); solo vigilar que los estados nuevos
  (hover/disabled) no caigan por debajo de 4.5:1 (texto) / 3:1 (UI).

## No-objetivos

- Rediseño de layouts o del concepto del hero.
- Dark mode (no está en FASES.MD).
- Librerías JS de animación, Astro View Transitions.
- Contenido nuevo en el CMS (FASE 9 es presentación).

## Verificación

- `pnpm lint`, `pnpm typecheck`, `pnpm build` en verde (puerta de fase).
- Recorrido visual con Playwright (móvil 390 px y desktop 1440 px) por home,
  servicios, detalle de servicio, portafolio, blog, contacto y 404:
  screenshots antes/después.
- Checklist AA manual: skip-link, foco visible en todos los interactivos,
  navegación completa por teclado del menú móvil y el formulario.
- `prefers-reduced-motion` emulado en Playwright: sin reveals ni stagger.
