# FASE 9 — UX/UI premium: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar la percepción visual del sitio ZiftLab a nivel premium: tokens de movimiento, scroll-reveal, hero con profundidad, microinteracciones, estados (loading/empty/error/404) y remate WCAG AA — sin rediseñar la identidad.

**Architecture:** Todo el movimiento sale de tokens nuevos en `@theme` (`--ease-zift`, `--shadow-lift*`, `--animate-*`); un único script de IntersectionObserver en `BaseLayout` activa el scroll-reveal (progresivo: sin JS no hay estado oculto); los componentes del kit UI ganan microinteracciones referenciando esos tokens. Spec: `docs/superpowers/specs/2026-07-02-fase-9-ux-ui-premium-design.md`.

**Tech Stack:** Astro 5 + Tailwind CSS 4 (`@theme` en `web/src/styles/global.css`). Sin dependencias nuevas. Sin librerías JS de animación.

## Global Constraints

- **No hay suite de tests (llega en FASE 15).** La verificación por tarea es `pnpm lint && pnpm typecheck` (desde la raíz) + comprobación visual en el dev server; la tarea final corre `pnpm build` completo + recorrido Playwright.
- El stack local debe estar arriba: `make start` desde la raíz (Postgres + MinIO + cms `:3000` + web `:4321`). Comprobar con `make status`.
- Solo tokens ZiftLab (`--color-*: initial` borra la paleta Tailwind). Ningún color, curva o sombra ad hoc: todo referencia tokens de `@theme`.
- Titulares con `font-display`; etiquetas mono con `font-mono` + tracking ancho + uppercase (patrón existente).
- `prefers-reduced-motion` ya anula transiciones/animaciones globalmente en `global.css` — no añadir reglas por componente.
- Astro: componentes que destructuran props dinámicas anotan `: Props` en el destructure (gotcha del repo, `CLAUDE.md`).
- Commits estilo repo: `feat(web): <qué> FASE 9`, cuerpo en español si hace falta.
- Todo comando indica su directorio; los de pnpm/make van desde la raíz del repo.

---

### Task 1: Tokens de movimiento, elevación y animaciones

**Files:**

- Modify: `web/src/styles/global.css` (bloque `@theme`, líneas 9-37)

**Interfaces:**

- Produces: utilidades `ease-zift`, `shadow-lift`, `shadow-lift-lg`, `animate-fade-up`, `animate-fade-in`, `animate-menu` que consumen TODAS las tareas siguientes.

- [ ] **Step 1: Añadir tokens al `@theme`**

En `web/src/styles/global.css`, dentro del bloque `@theme` existente, después de `--font-mono`:

```css
  /* Movimiento y elevación (FASE 9). Ningún componente declara curvas,
     tiempos ni sombras ad hoc: todo referencia estos tokens. */
  --ease-zift: cubic-bezier(0.22, 1, 0.36, 1);
  --shadow-lift: 0 2px 6px -2px rgb(20 22 28 / 0.06), 0 8px 20px -6px rgb(20 22 28 / 0.1);
  --shadow-lift-lg: 0 4px 12px -4px rgb(20 22 28 / 0.08), 0 16px 40px -12px rgb(20 22 28 / 0.14);

  --animate-fade-up: fade-up 0.7s var(--ease-zift) both;
  --animate-fade-in: fade-in 0.9s var(--ease-zift) both;
  --animate-menu: fade-up 0.25s var(--ease-zift) both;

  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
```

- [ ] **Step 2: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

Expected: ambos en verde. Abrir http://localhost:4321 y confirmar que el sitio renderiza igual (los tokens aún no se usan).

- [ ] **Step 3: Commit**

```bash
# desde /
git add web/src/styles/global.css
git commit -m "feat(web): tokens de movimiento y elevación FASE 9"
```

---

### Task 2: Sistema scroll-reveal + aplicación en home y portafolio

**Files:**

- Modify: `web/src/styles/global.css` (nuevo bloque al final de `@layer components`)
- Modify: `web/src/layouts/BaseLayout.astro`
- Modify: `web/src/components/sections/SectionIntro.astro`
- Modify: `web/src/pages/index.astro`
- Modify: `web/src/pages/portafolio/index.astro`

**Interfaces:**

- Consumes: `--ease-zift` (Task 1).
- Produces: atributo `data-reveal` (+ `--reveal-delay` opcional en `style`) usable en cualquier elemento; clase `js-reveal` en `<html>` cuando el reveal está activo (la reutiliza Task 10 para el fade de imágenes).

- [ ] **Step 1: CSS del reveal en `global.css`**

Al final del bloque `@layer components` existente:

```css
  /* Scroll-reveal (FASE 9). html.js-reveal lo pone el script de BaseLayout
     solo si hay JS + IntersectionObserver y sin reduced-motion: sin él no
     existe estado oculto (mejora progresiva). */
  html.js-reveal [data-reveal] {
    opacity: 0;
    translate: 0 16px;
    transition:
      opacity 0.7s var(--ease-zift),
      translate 0.7s var(--ease-zift);
    transition-delay: var(--reveal-delay, 0s);
  }
  html.js-reveal [data-reveal].is-revealed {
    opacity: 1;
    translate: 0 0;
  }
```

- [ ] **Step 2: Scripts en `BaseLayout.astro`**

En el `<head>`, inmediatamente después del `<script is:inline set:html={consentInit} />`:

```astro
<script is:inline>
  // Activa el scroll-reveal solo si va a poder ejecutarse; así el contenido
  // nunca queda oculto sin JS ni con movimiento reducido.
  if (
    'IntersectionObserver' in window &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    document.documentElement.classList.add('js-reveal')
  }
</script>
```

Antes de `</body>` (después de `<CookieConsent />`):

```astro
<script>
  if (document.documentElement.classList.contains('js-reveal')) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el))
  }
</script>
```

- [ ] **Step 3: `data-reveal` en `SectionIntro.astro`**

Cambiar el `div` raíz:

```astro
<div class:list={['max-w-2xl', className]} data-reveal>
```

Esto da reveal a todas las cabeceras de sección del sitio sin tocar cada página.

- [ ] **Step 4: Stagger en las grids del home (`index.astro`)**

Servicios destacados — el `map` pasa a usar índice y cada `li` recibe reveal + delay:

```astro
{featuredServices.map((service, index) => (
  <li data-reveal style={`--reveal-delay: ${Math.min(index, 5) * 70}ms`}>
    <ServiceCard service={service} />
  </li>
))}
```

Aplicar el mismo patrón (idéntico salvo la variable) a los `map` de `featuredProjects` y `featuredTestimonials`.

Bloques que no son grid de `li`: envolver con reveal sin tocar el componente —

```astro
{/* Beneficios */}
<div data-reveal>
  <BenefitsGrid items={benefits} class="mt-12" />
</div>

{/* Proceso */}
<div data-reveal>
  <ProcessSteps steps={steps} tone="ink" class="mt-12" />
</div>
```

y al `<dl>` de stats añadirle `data-reveal` directamente en su tag.

- [ ] **Step 5: Stagger en la grid del portafolio (`portafolio/index.astro`)**

```astro
{projects.docs.map((project, index) => (
  <li data-services={projectServiceSlugs(project)} data-reveal style={`--reveal-delay: ${Math.min(index, 5) * 70}ms`}>
    <ProjectCard project={project} class="h-full" />
  </li>
))}
```

- [ ] **Step 6: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

En http://localhost:4321: al bajar, las secciones entran con fundido + subida escalonada; recargar con DevTools → Rendering → «Emulate CSS prefers-reduced-motion: reduce» y confirmar que todo es visible sin animar; desactivar JS (DevTools) y confirmar que nada queda oculto.

- [ ] **Step 7: Commit**

```bash
# desde /
git add web/src/styles/global.css web/src/layouts/BaseLayout.astro web/src/components/sections/SectionIntro.astro web/src/pages/index.astro web/src/pages/portafolio/index.astro
git commit -m "feat(web): sistema scroll-reveal progresivo FASE 9"
```

---

### Task 3: Hero premium

**Files:**

- Modify: `web/src/styles/global.css` (nueva `@utility hero-glow` junto a `lab-grid`)
- Modify: `web/src/pages/index.astro` (bloque hero, líneas 52-89)

**Interfaces:**

- Consumes: `animate-fade-up`, `animate-fade-in` (Task 1).
- Produces: utilidad `hero-glow` (la reutiliza Task 9 en la 404).

- [ ] **Step 1: Utilidad `hero-glow` en `global.css`**

Después de la `@utility lab-grid` existente:

```css
/* Resplandor ultramar del mundo tinta (hero y 404): profundidad sin imagen */
@utility hero-glow {
  background: radial-gradient(100% 80% at 75% -20%, rgb(70 51 255 / 0.28), transparent 65%);
}
```

- [ ] **Step 2: Glow + fundido de retícula + entrada escalonada en `index.astro`**

El hero queda así (cambios: div `hero-glow` nuevo antes de la retícula, `animate-fade-in` en la retícula, `animate-fade-up` + delays en el contenido):

```astro
<Section tone="ink" class="relative overflow-hidden md:py-32">
  <div class="hero-glow absolute inset-0" aria-hidden="true"></div>
  <div class="lab-grid animate-fade-in absolute inset-0" aria-hidden="true"></div>
  <Container class="relative">
    {hero?.eyebrow && (
      <div class="animate-fade-up">
        <Eyebrow tone="dark">{hero.eyebrow}</Eyebrow>
      </div>
    )}
    <Heading as="h1" size="display" class="animate-fade-up mt-6 max-w-4xl text-white [animation-delay:90ms]">
      {hero?.title}
    </Heading>
    {
      hero?.subtitle && (
        <Text size="lead" class="animate-fade-up mt-6 max-w-2xl text-ink-muted [animation-delay:180ms]">
          {hero.subtitle}
        </Text>
      )
    }
    <div class="animate-fade-up mt-10 flex flex-wrap gap-4 [animation-delay:270ms]">
      {/* …los dos <Button> existentes sin cambios… */}
    </div>
  </Container>
</Section>
```

(Nota: `Eyebrow` y `Heading`/`Text` aceptan `class`; el eyebrow se envuelve en `div` porque su clase raíz no se conoce aquí.)

- [ ] **Step 3: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

En http://localhost:4321: glow ultramar arriba-derecha del hero, retícula funde al entrar, contenido entra escalonado una sola vez. Con reduced-motion emulado: hero visible al instante en su estado final (`both` + duración ~0).

- [ ] **Step 4: Commit**

```bash
# desde /
git add web/src/styles/global.css web/src/pages/index.astro
git commit -m "feat(web): hero premium con glow y entrada escalonada FASE 9"
```

---

### Task 4: Button — flecha, active, loading

**Files:**

- Modify: `web/src/components/ui/Button.astro`
- Modify: `web/src/styles/global.css` (reglas `.btn-spinner` en `@layer components`)
- Modify: `web/src/components/sections/LeadForm.astro` (script, líneas 185-299)

**Interfaces:**

- Consumes: `ease-zift` (Task 1).
- Produces: prop `loading?: boolean` en Button; contrato runtime `button[data-loading='true']` (+ `disabled` + `aria-busy`) que usa el script de LeadForm; span `.btn-spinner` presente en todo Button que renderiza `<button>`.

- [ ] **Step 1: Reescribir `Button.astro`**

Contenido completo:

```astro
---
/**
 * Botón del sistema. Renderiza <a> si recibe href, <button> si no.
 * primary = acción principal (ultramar), secondary = alternativa sobre fondos
 * claros, ghost = terciaria de bajo peso. Con href en primary/inverse pinta
 * flecha que se desliza en hover; loading muestra spinner y deshabilita.
 */
interface Props {
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'inverse'
  size?: 'sm' | 'md' | 'lg'
  newTab?: boolean
  type?: 'button' | 'submit'
  loading?: boolean
  class?: string
}

const {
  href,
  variant = 'primary',
  size = 'md',
  newTab = false,
  type = 'button',
  loading = false,
  class: className,
} = Astro.props

const variants = {
  primary: 'bg-zift text-white hover:bg-zift-deep',
  secondary: 'border border-line bg-white text-ink hover:border-ink',
  ghost: 'text-zift hover:bg-zift-tint',
  // Para fondos ink (hero/CTA oscuros)
  inverse: 'border border-ink-line text-white hover:border-zift-glow hover:text-zift-glow',
}

const sizes = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
}

const classes = [
  'group/btn inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition duration-150 ease-zift active:scale-[0.98] disabled:opacity-60',
  variants[variant],
  sizes[size],
  className,
]

const showArrow = Boolean(href) && (variant === 'primary' || variant === 'inverse')
---

{
  href ? (
    <a
      {href}
      class:list={classes}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
    >
      <slot />
      {showArrow && (
        <span
          aria-hidden="true"
          class="transition-transform duration-150 ease-zift group-hover/btn:translate-x-1"
        >
          →
        </span>
      )}
    </a>
  ) : (
    <button
      {type}
      class:list={classes}
      disabled={loading || undefined}
      data-loading={loading ? 'true' : undefined}
      aria-busy={loading ? 'true' : undefined}
    >
      <span
        class="btn-spinner size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
      <slot />
    </button>
  )
}
```

- [ ] **Step 2: Reglas del spinner en `global.css`**

Al final de `@layer components` (después del CSS del reveal de Task 2):

```css
  /* Spinner de Button: oculto salvo con data-loading (lo activa el script
     del formulario en runtime o la prop loading en server). */
  .btn-spinner {
    display: none;
  }
  button[data-loading='true'] .btn-spinner {
    display: inline-block;
  }
```

(Va en `@layer components` y no como utilidades en el markup porque el estado se togglea en runtime por atributo.)

- [ ] **Step 3: Loading real en el script de `LeadForm.astro`**

1. Eliminar la línea `const submitLabel = submitBtn.textContent` (deja de usarse).
2. Sustituir el bloque de envío:

```ts
submitBtn.disabled = true
submitBtn.textContent = 'Enviando…'
statusEl.textContent = ''
```

por:

```ts
submitBtn.disabled = true
submitBtn.dataset.loading = 'true'
submitBtn.setAttribute('aria-busy', 'true')
statusEl.textContent = 'Enviando…'
```

3. En el `catch`, sustituir:

```ts
submitBtn.disabled = false
submitBtn.textContent = submitLabel
```

por:

```ts
submitBtn.disabled = false
delete submitBtn.dataset.loading
submitBtn.removeAttribute('aria-busy')
```

(El texto del botón ya no se toca: el spinner comunica el estado y `statusEl` — `role="status"` `aria-live="polite"` — lo anuncia.)

- [ ] **Step 4: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

En http://localhost:4321: CTAs del hero muestran flecha que se desliza en hover; click en cualquier botón encoge 2 %. En `/contacto`, enviar con datos válidos pero con el CMS parado (`make stop` solo si hace falta simular error; mejor: enviar 4 veces seguidas para provocar el 429) → spinner visible + botón deshabilitado + status «Enviando…» y luego mensaje de error; el botón se restaura.

- [ ] **Step 5: Commit**

```bash
# desde /
git add web/src/components/ui/Button.astro web/src/styles/global.css web/src/components/sections/LeadForm.astro
git commit -m "feat(web): microinteracciones y estado loading de Button FASE 9"
```

---

### Task 5: Cards — lift, sombra y zoom de imagen

**Files:**

- Modify: `web/src/components/ui/Card.astro`
- Modify: `web/src/components/sections/ProjectCard.astro`
- Modify: `web/src/components/sections/PostCard.astro`
- Modify: `web/src/components/sections/ServiceCard.astro`

**Interfaces:**

- Consumes: `ease-zift`, `shadow-lift` (Task 1); `.group` que Card ya pone cuando tiene `href`.

- [ ] **Step 1: Hover premium en `Card.astro`**

Sustituir la línea del hover:

```ts
href && 'group transition-colors hover:border-zift',
```

por:

```ts
href && 'group transition duration-300 ease-zift hover:-translate-y-0.5 hover:border-zift hover:shadow-lift',
```

- [ ] **Step 2: Zoom sutil de portada en `ProjectCard.astro` y `PostCard.astro`**

En ambos, la clase del `PayloadImage` de portada pasa de:

```
class="aspect-[3/2] w-full border-b border-line object-cover"
```

a:

```
class="aspect-[3/2] w-full border-b border-line object-cover transition-transform duration-700 ease-zift group-hover:scale-[1.03]"
```

(Card ya tiene `overflow-hidden` en estos usos, el zoom queda recortado.)

- [ ] **Step 3: Flecha del índice en `ServiceCard.astro`**

El span de la flecha pasa de:

```astro
<span aria-hidden="true" class="text-line transition-colors group-hover:text-zift">→</span>
```

a:

```astro
<span
  aria-hidden="true"
  class="text-line transition duration-150 ease-zift group-hover:translate-x-1 group-hover:text-zift">→</span
>
```

- [ ] **Step 4: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

En home/servicios/portafolio/blog: hover sobre cualquier card = borde ultramar + sombra suave + lift 2 px; portadas de casos/posts hacen zoom lento; flecha SRV se desliza.

- [ ] **Step 5: Commit**

```bash
# desde /
git add web/src/components/ui/Card.astro web/src/components/sections/ProjectCard.astro web/src/components/sections/PostCard.astro web/src/components/sections/ServiceCard.astro
git commit -m "feat(web): hover premium de cards FASE 9"
```

---

### Task 6: Header — underline animado, sombra al scroll, tap targets, menú móvil

**Files:**

- Modify: `web/src/components/Header.astro`

**Interfaces:**

- Consumes: `ease-zift`, `shadow-lift`, `animate-menu` (Task 1).

- [ ] **Step 1: Sombra al despegar + underline animado (desktop)**

El tag `<header>` pasa a:

```astro
<header
  class="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur transition-shadow duration-300 ease-zift data-scrolled:shadow-lift"
>
```

Las clases del `<a>` de nav desktop pasan de:

```ts
'text-sm font-medium transition-colors hover:text-ink',
isCurrent(item.href) ? 'text-ink' : 'text-muted',
```

a:

```ts
'relative py-1 text-sm font-medium transition-colors hover:text-ink',
'after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-zift after:transition-transform after:duration-300 after:ease-zift hover:after:scale-x-100',
isCurrent(item.href) ? 'text-ink after:scale-x-100' : 'text-muted',
```

- [ ] **Step 2: Tap targets y animación del panel móvil**

- Botón hamburguesa: `size-10` → `size-11` (44 px).
- Links del panel móvil: `py-2.5` → `py-3` (≥44 px de alto).
- Nav móvil: añadir `animate-menu` a sus clases —

```astro
<nav
  id="nav-movil"
  class="animate-menu hidden border-t border-line bg-paper md:hidden"
  aria-label="Principal"
  data-nav-panel
>
```

(Al quitar `hidden`, el cambio de display re-dispara la animación: el panel entra con fade-up de 250 ms.)

- [ ] **Step 3: Script — apertura, Escape y sombra**

Sustituir el `<script>` completo del final por:

```astro
<script>
  const toggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]')
  const panel = document.querySelector<HTMLElement>('[data-nav-panel]')

  const setOpen = (open: boolean) => {
    panel?.classList.toggle('hidden', !open)
    toggle?.setAttribute('aria-expanded', String(open))
  }

  toggle?.addEventListener('click', () => {
    setOpen(panel?.classList.contains('hidden') ?? false)
  })

  // Cerrar con Escape devolviendo el foco al botón (teclado/a11y)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel && !panel.classList.contains('hidden')) {
      setOpen(false)
      toggle?.focus()
    }
  })

  // Sombra de elevación solo cuando el header despega del borde superior
  const header = document.querySelector<HTMLElement>('header')
  const onScroll = () => header?.toggleAttribute('data-scrolled', window.scrollY > 4)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
</script>
```

- [ ] **Step 4: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

Desktop: hover en nav = línea ultramar creciendo desde la izquierda; item activo la mantiene; al hacer scroll el header gana sombra (y la pierde arriba). Móvil (≤768 px): botón de 44 px, panel entra animado, Escape lo cierra y devuelve el foco.

- [ ] **Step 5: Commit**

```bash
# desde /
git add web/src/components/Header.astro
git commit -m "feat(web): header con underline animado y sombra al scroll FASE 9"
```

---

### Task 7: FAQ con apertura suave + LogoWall a color en hover

**Files:**

- Modify: `web/src/styles/global.css`
- Modify: `web/src/components/sections/FaqAccordion.astro`
- Modify: `web/src/components/sections/LogoWall.astro`

**Interfaces:**

- Consumes: `--ease-zift` (Task 1).
- Produces: atributo `data-faq` en los `<details>` del acordeón (ancla del CSS).

- [ ] **Step 1: CSS progresivo del acordeón en `global.css`**

Al final de `@layer components`:

```css
  /* Apertura suave del acordeón FAQ: mejora progresiva — solo navegadores
     con interpolate-size animan block-size hasta auto; el resto abre al
     corte como hasta ahora. Sin JS. */
  @supports (interpolate-size: allow-keywords) {
    details[data-faq] {
      interpolate-size: allow-keywords;
    }
    details[data-faq]::details-content {
      block-size: 0;
      overflow: clip;
      transition:
        block-size 0.3s var(--ease-zift),
        content-visibility 0.3s allow-discrete;
    }
    details[data-faq][open]::details-content {
      block-size: auto;
    }
  }
```

- [ ] **Step 2: Anclar el acordeón**

En `FaqAccordion.astro`: `<details class="group py-5">` → `<details class="group py-5" data-faq>`.

- [ ] **Step 3: Logos a color en hover (`LogoWall.astro`)**

El `<li>` gana `group`:

```astro
<li class="group flex h-24 items-center justify-center bg-paper px-6">
```

y la clase del `PayloadImage` pasa a:

```
class="max-h-10 w-auto opacity-70 grayscale transition duration-300 ease-zift group-hover:opacity-100 group-hover:grayscale-0"
```

- [ ] **Step 4: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

En un detalle de servicio (p. ej. http://localhost:4321/servicios — entrar al primero) abrir/cerrar FAQs: en Chrome la respuesta se despliega suave; el `+` sigue rotando. En el home, hover sobre un logo = color + opacidad plena.

- [ ] **Step 5: Commit**

```bash
# desde /
git add web/src/styles/global.css web/src/components/sections/FaqAccordion.astro web/src/components/sections/LogoWall.astro
git commit -m "feat(web): FAQ con apertura suave y logos a color en hover FASE 9"
```

---

### Task 8: EmptyState + vacíos de portafolio y blog

**Files:**

- Create: `web/src/components/ui/EmptyState.astro`
- Modify: `web/src/pages/portafolio/index.astro`
- Modify: `web/src/pages/blog/index.astro`
- Modify: `web/src/pages/blog/categoria/[slug].astro`

**Interfaces:**

- Produces: `EmptyState` con props `{ title: string; text?: string; class?: string }` y slot para acción; contenedor `[data-filter-empty]` que togglea el script del filtro del portafolio.

- [ ] **Step 1: Crear `web/src/components/ui/EmptyState.astro`**

```astro
---
/**
 * Estado vacío del sistema: marcador mono + mensaje + acción opcional (slot).
 * Se usa en listados sin resultados (filtro del portafolio, blog).
 */
interface Props {
  title: string
  text?: string
  class?: string
}

const { title, text, class: className } = Astro.props
---

<div
  class:list={[
    'rounded-xl border border-dashed border-line bg-surface/60 px-6 py-16 text-center',
    className,
  ]}
>
  <p class="font-mono text-xs tracking-[0.18em] text-muted uppercase" aria-hidden="true">
    [ sin resultados ]
  </p>
  <p class="font-display mt-4 text-xl">{title}</p>
  {text && <p class="mx-auto mt-2 max-w-md text-sm text-muted">{text}</p>}
  <slot />
</div>
```

- [ ] **Step 2: Vacío del filtro en `portafolio/index.astro`**

Import nuevo: `import EmptyState from '@/components/ui/EmptyState.astro'`.

Después del `</ul>` de la grid:

```astro
<div data-filter-empty hidden class="mt-6">
  <EmptyState
    title="Ningún caso con ese servicio"
    text="Prueba con otro filtro o mira todos los casos."
  />
</div>
```

En el script, añadir tras `const status = ...`:

```ts
const emptyState = document.querySelector<HTMLElement>('[data-filter-empty]')
```

y dentro de `applyFilter`, después del `if (status) ...`:

```ts
if (emptyState) emptyState.hidden = visible > 0
```

- [ ] **Step 3: Vacío del blog (`blog/index.astro`)**

Imports nuevos: `EmptyState` (ruta de arriba) y `Button` (`@/components/ui/Button.astro`) si no está ya.

Sustituir el bloque `!featured && <Text muted>…</Text>` por:

```astro
{
  !featured && (
    <EmptyState
      title="Aún no hay artículos publicados"
      text="Vuelve pronto — publicamos guías y casos con métricas reales."
    >
      <div class="mt-6">
        <Button href="/rss.xml" variant="secondary" size="sm">
          Seguir por RSS
        </Button>
      </div>
    </EmptyState>
  )
}
```

- [ ] **Step 4: Vacío por categoría (`blog/categoria/[slug].astro`)**

Mismos imports. Sustituir la rama vacía (`<Text muted>Aún no hay artículos en esta categoría…`) por:

```astro
<EmptyState title="Aún no hay artículos en esta categoría">
  <div class="mt-6">
    <Button href="/blog" variant="secondary" size="sm">
      Ver todos los artículos
    </Button>
  </div>
</EmptyState>
```

Si `Text` queda sin uso en la página, quitar su import (lint lo señala).

- [ ] **Step 5: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

En `/portafolio`: filtrar por un servicio sin casos comunes (o comprobar con un filtro y el aria-live «Mostrando 0 casos») → aparece el EmptyState; volver a «Todos» lo oculta. Blog: si hay posts no se ve vacío (correcto); comprobar una categoría sin posts si existe.

- [ ] **Step 6: Commit**

```bash
# desde /
git add web/src/components/ui/EmptyState.astro web/src/pages/portafolio/index.astro web/src/pages/blog/index.astro 'web/src/pages/blog/categoria/[slug].astro'
git commit -m "feat(web): EmptyState del sistema y vacíos de portafolio/blog FASE 9"
```

---

### Task 9: Página 404

**Files:**

- Create: `web/src/pages/404.astro`

**Interfaces:**

- Consumes: `hero-glow` (Task 3), `lab-grid`, kit UI existente.

- [ ] **Step 1: Crear `web/src/pages/404.astro`**

```astro
---
/**
 * 404 en el mundo tinta (FASE 9): misma señalética que el hero,
 * con salidas claras a home, servicios y contacto. noindex.
 */
import Button from '@/components/ui/Button.astro'
import Container from '@/components/ui/Container.astro'
import Heading from '@/components/ui/Heading.astro'
import Section from '@/components/ui/Section.astro'
import Text from '@/components/ui/Text.astro'
import BaseLayout from '@/layouts/BaseLayout.astro'
---

<BaseLayout title="Página no encontrada" noindex>
  <Section tone="ink" class="relative overflow-hidden md:py-40">
    <div class="hero-glow absolute inset-0" aria-hidden="true"></div>
    <div class="lab-grid absolute inset-0" aria-hidden="true"></div>
    <Container class="relative">
      <p class="font-mono text-xs tracking-[0.18em] text-ink-muted uppercase">Error 404</p>
      <Heading as="h1" size="display" class="mt-6 max-w-3xl text-white">
        Esta página no existe.
      </Heading>
      <Text size="lead" class="mt-6 max-w-2xl text-ink-muted">
        El enlace puede estar roto o la página se movió. Estos caminos sí llevan a algún sitio:
      </Text>
      <div class="mt-10 flex flex-wrap gap-4">
        <Button href="/" size="lg">Ir al inicio</Button>
        <Button href="/servicios" variant="inverse" size="lg">Ver servicios</Button>
        <Button href="/contacto" variant="inverse" size="lg">Contacto</Button>
      </div>
    </Container>
  </Section>
</BaseLayout>
```

- [ ] **Step 2: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

Abrir http://localhost:4321/no-existe → 404 en tinta con glow, retícula y las tres salidas; título de pestaña «Página no encontrada | …»; `<meta name="robots" content="noindex">` presente (ver código fuente).

- [ ] **Step 3: Commit**

```bash
# desde /
git add web/src/pages/404.astro
git commit -m "feat(web): página 404 FASE 9"
```

---

### Task 10: Fade-in de imágenes lazy

**Files:**

- Modify: `web/src/components/PayloadImage.astro`
- Modify: `web/src/styles/global.css`
- Modify: `web/src/layouts/BaseLayout.astro` (script del reveal de Task 2)

**Interfaces:**

- Consumes: clase `js-reveal` en `<html>` (Task 2) — mismo gate progresivo.
- Produces: clase `img-fade` + `is-loaded` en imágenes no priority.

- [ ] **Step 1: `PayloadImage.astro` — clase y onload**

El `<img>` pasa a:

```astro
<img
  src={src}
  alt={doc.alt}
  width={doc.width ?? undefined}
  height={doc.height ?? undefined}
  loading={priority ? 'eager' : 'lazy'}
  decoding={priority ? 'sync' : 'async'}
  fetchpriority={priority ? 'high' : undefined}
  sizes={sizes}
  class:list={[!priority && 'img-fade', className]}
  onload={!priority ? "this.classList.add('is-loaded')" : undefined}
/>
```

(Las priority — hero/logo — no se tocan: nada de fade above the fold.)

- [ ] **Step 2: CSS en `global.css`** (final de `@layer components`)

```css
  /* Fade-in de imágenes lazy: el estado oculto solo existe con JS activo
     (html.js-reveal); onload o el chequeo de BaseLayout lo levantan. */
  img.img-fade {
    transition: opacity 0.6s var(--ease-zift);
  }
  html.js-reveal img.img-fade:not(.is-loaded) {
    opacity: 0;
  }
```

- [ ] **Step 3: Cinturón de seguridad en el script de reveal (`BaseLayout.astro`)**

Dentro del `if (document.documentElement.classList.contains('js-reveal'))`, al final:

```ts
// Imágenes que ya estaban completas cuando corrió este script
document.querySelectorAll<HTMLImageElement>('img.img-fade').forEach((img) => {
  if (img.complete) img.classList.add('is-loaded')
})
```

- [ ] **Step 4: Verificar**

```bash
# desde /
pnpm lint && pnpm typecheck
```

Con Network throttling (Fast 4G) recargar `/portafolio`: las portadas funden al cargar, sin saltos (width/height ya evitan CLS). Sin JS: imágenes visibles normales. Recarga con caché: ninguna imagen se queda invisible.

- [ ] **Step 5: Commit**

```bash
# desde /
git add web/src/components/PayloadImage.astro web/src/styles/global.css web/src/layouts/BaseLayout.astro
git commit -m "feat(web): fade-in progresivo de imágenes lazy FASE 9"
```

---

### Task 11: Verificación integral FASE 9 (build + Playwright + AA) y cierre

**Files:**

- Modify: `CLAUDE.md` (línea de estado, actualizar a «FASE 9 completada — siguiente FASE 8»)

**Interfaces:**

- Consumes: todo lo anterior.

- [ ] **Step 1: Puerta de fase completa**

```bash
# desde /
pnpm lint && pnpm typecheck && pnpm format:check && pnpm build
```

Expected: los cuatro en verde (el build necesita cms corriendo; `make status` primero). Si `format:check` falla: `pnpm format` y revisar el diff.

- [ ] **Step 2: Recorrido Playwright (MCP)**

Con el stack arriba, recorrer y capturar screenshot en 390×844 (móvil) y 1440×900 (desktop) de: `/`, `/servicios`, un detalle de servicio, `/portafolio`, `/blog`, `/contacto`, `/no-existe` (404). Comprobar en el snapshot de accesibilidad: un solo `h1` por página, landmarks (`header`/`nav`/`main`/`footer`), foco visible tabulando por header → skip-link «Saltar al contenido» primero. Ritmo: ningún espaciado vertical de sección fuera del sistema de `Section` (`py-16 md:py-24` + los overrides deliberados `md:py-32` del hero y `md:py-40` de la 404).

- [ ] **Step 3: Reduced-motion y no-JS**

En Playwright: emular `prefers-reduced-motion: reduce` y recargar `/` → sin reveals ni stagger, todo visible. Con JS deshabilitado → contenido completo visible (sin estados ocultos).

- [ ] **Step 4: Formulario end-to-end**

En `/contacto`: enviar vacío → errores por campo + foco al primero; corregir un campo → su error desaparece; enviar válido → spinner + redirección a `/gracias?de=contacto` (el CMS loguea el email en consola si no hay `RESEND_API_KEY`).

- [ ] **Step 5: Actualizar `CLAUDE.md`**

En la línea de estado del proyecto (§ What this project is), cambiar «**FASE 7 (lead capture and forms) complete** … next up is FASE 8 (advanced technical SEO)» por «**FASE 9 (premium UX/UI) complete** (FASE 7 y 16 ya completadas) — next up is FASE 8 (advanced technical SEO)».

- [ ] **Step 6: Commit de cierre**

```bash
# desde /
git add CLAUDE.md
git commit -m "docs: CLAUDE.md — FASE 9 completada, siguiente FASE 8"
```
