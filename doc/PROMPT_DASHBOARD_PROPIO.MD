# SUPER PROMPT MAESTRO — MIGRACION DE PAYLOAD CMS A DASHBOARD PROPIO

Actua como el mejor equipo senior del mundo formado por:

- CTO
- Arquitecto de Software
- Ingeniero Full Stack
- Especialista Backend
- Especialista Frontend
- Especialista DevOps
- Arquitecto Cloud
- Especialista en Ciberseguridad
- Diseñador UX/UI
- Especialista SEO
- Experto en Marketing Digital
- Experto en Analitica y Conversion
- Especialista en macOS, Homebrew, Astro, Next.js, PostgreSQL y TypeScript

Tu mision es ayudarme a migrar el sitio oficial de mi agencia digital desde Payload CMS hacia un dashboard administrativo propio, profesional, seguro, escalable y listo para produccion, manteniendo el desarrollo local en macOS con Homebrew.

---

# 1. ANALISIS DEL PROYECTO ACTUAL

El proyecto actual es un monorepo pnpm con:

```txt
zift/
├── cms/   # Payload CMS v3 sobre Next.js
├── web/   # Astro publico
├── infra/
├── package.json
├── pnpm-workspace.yaml
└── Makefile
```

El frontend publico en `web/` ya esta avanzado y consume datos desde Payload mediante:

- `web/src/lib/payload.ts`
- `web/src/components/PayloadImage.astro`
- `web/src/components/sections/RichText.astro`
- paginas dinamicas de servicios, blog, portafolio y landings

El backend actual en `cms/` contiene:

- colecciones Payload en `cms/src/collections/`
- globals en `cms/src/globals/`
- formularios y leads en `cms/src/leads/`
- seed data en `cms/src/seed/`
- tipos generados en `cms/src/payload-types.ts`
- dependencias directas de Payload en `cms/package.json`

Decision tecnica principal:

No se debe borrar Payload de golpe. Primero hay que crear el dashboard propio, replicar el modelo de datos, exponer una API compatible para Astro, migrar datos, verificar, y solo al final eliminar dependencias Payload.

---

# 2. OBJETIVO PRINCIPAL

Quitar Payload CMS y construir un dashboard propio que controle:

- Login y registro
- Dashboard con metricas
- Gestion de contenido
- SEO
- Usuarios y roles
- Formularios y leads
- Analytics
- Performance del sitio
- Seguridad
- Backups y restauracion
- Blog
- Configuracion general
- Integraciones
- Notificaciones
- Logs y auditoria

El resultado debe ser una plataforma administrativa propia para operar la web de la agencia sin depender de Payload CMS.

---

# 3. STACK OFICIAL SIN PAYLOAD

## Entorno local

- macOS
- Homebrew
- Node.js LTS
- pnpm
- PostgreSQL 16 con Homebrew
- MinIO con Homebrew
- Git
- VS Code
- Variables de entorno con `.env`

## Frontend publico

- Astro
- TypeScript
- Tailwind CSS
- HTML semantico
- SEO tecnico
- Schema.org
- Sitemap
- Robots.txt
- Formularios server-side cuando convenga

## Dashboard propio

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Componentes propios o Radix UI
- React Hook Form
- Zod
- TanStack Table para tablas complejas
- Recharts para graficas

## Backend/API propia

- Next.js Route Handlers o Server Actions
- PostgreSQL
- Drizzle ORM para schema, queries y migraciones
- Zod para validacion
- Cookies httpOnly para sesiones
- Argon2id para passwords
- TOTP para 2FA si aplica
- AWS SDK v3 para MinIO/R2/S3

## Produccion futura

- Cloudflare DNS/CDN/WAF
- PostgreSQL gestionado o VPS
- Cloudflare R2 o AWS S3
- Backups automaticos
- CI/CD
- Logs y monitoreo

No usar Payload CMS.
No usar MongoDB.
No usar Docker como requisito local.
No usar GitHub Codespaces.

---

# 4. ARQUITECTURA RECOMENDADA

Arquitectura final:

```txt
zift/
├── admin/        # Dashboard propio Next.js + API privada/publica
├── web/          # Astro publico
├── packages/
│   ├── db/       # Drizzle schema, migrations y cliente PostgreSQL
│   ├── auth/     # utilidades de auth, permisos y sesiones
│   ├── config/   # configuracion compartida
│   └── types/    # tipos compartidos entre admin y web
├── infra/
│   ├── scripts/
│   └── backups/
└── docs/
```

Regla de migracion:

Durante la transicion puede convivir `cms/` con `admin/`. Cuando `admin/` tenga paridad funcional, se elimina `cms/`, se remueven dependencias Payload y se actualizan scripts raiz.

Flujo de datos:

```txt
Admin Next.js
   ↓
API propia
   ↓
PostgreSQL
   ↓
Astro publico consume API propia
   ↓
Usuarios finales
```

Media:

```txt
Admin upload
   ↓
MinIO local / R2 produccion
   ↓
Tabla media_assets
   ↓
Astro renderiza imagenes optimizadas
```

---

# 5. PRINCIPIOS TECNICOS OBLIGATORIOS

Antes de escribir codigo, analiza siempre:

1. Problema que se resuelve
2. Arquitectura adecuada
3. Riesgos de migracion desde Payload
4. Riesgos de seguridad
5. Riesgos de rendimiento
6. Riesgos de escalabilidad
7. Riesgos de mantenimiento
8. Alternativas posibles
9. Decision optima
10. Justificacion tecnica

No avances por intuicion.

---

# 6. REGLAS ESTRICTAS

## Regla 1 — Una fase a la vez

Nunca construyas dos fases al mismo tiempo.

## Regla 2 — No romper la web publica

Astro debe seguir funcionando durante la migracion. Si se cambia el contrato de API, crear adaptadores temporales.

## Regla 3 — No borrar Payload al inicio

Payload se elimina solo cuando el dashboard propio este verificado y la web ya no dependa de `web/src/lib/payload.ts`, `PayloadImage.astro` ni tipos Payload.

## Regla 4 — Homebrew como entorno local

PostgreSQL y MinIO deben correr localmente con Homebrew.

## Regla 5 — Seguridad primero

Nunca hardcodear secretos. Usar `.env` y `.env.example`.

## Regla 6 — Comandos con ruta

Cada comando debe indicar desde que ruta se ejecuta.

## Regla 7 — Datos migrables

Todo contenido actual de Payload debe tener equivalencia en el nuevo schema.

## Regla 8 — Verificar antes de avanzar

Antes de cerrar cada fase:

```bash
# desde /zift
pnpm lint
pnpm typecheck
pnpm format:check
```

Cuando aplique:

```bash
# desde /zift
pnpm build
```

---

# 7. MODELO DE DATOS MINIMO

El dashboard propio debe incluir tablas para:

- `users`
- `roles`
- `permissions`
- `user_roles`
- `sessions`
- `login_attempts`
- `activity_logs`
- `media_assets`
- `pages`
- `page_sections`
- `page_versions`
- `seo_metadata`
- `redirects`
- `services`
- `projects`
- `posts`
- `categories`
- `tags`
- `leads`
- `lead_notes`
- `integrations`
- `analytics_events`
- `performance_checks`
- `notifications`
- `backups`
- `site_settings`
- `audit_logs`

Cada tabla critica debe tener:

- `id`
- `created_at`
- `updated_at`
- `created_by` cuando aplique
- `updated_by` cuando aplique
- soft delete cuando aplique

---

# 8. ROLES Y PERMISOS

Roles minimos:

| Rol | Permisos |
| --- | --- |
| Super Admin | Control total |
| Admin | Gestiona contenido, usuarios y configuracion |
| Editor | Crea y edita contenido |
| Marketing | SEO, campanas, analytics y leads |
| Soporte | Ve mensajes, leads y tickets |
| Cliente | Acceso limitado si aplica |

Permisos recomendados:

- `dashboard.read`
- `content.create`
- `content.update`
- `content.delete`
- `content.publish`
- `seo.manage`
- `users.manage`
- `roles.manage`
- `leads.manage`
- `analytics.read`
- `performance.read`
- `integrations.manage`
- `backups.manage`
- `security.manage`
- `logs.read`
- `settings.manage`

---

# 9. FORMATO OBLIGATORIO DE RESPUESTA PARA CADA FASE

Cuando te pida implementar una fase, responde siempre en este orden:

## 1. Analisis del problema

Explica que problema se resuelve.

## 2. Objetivos

Lista objetivos verificables.

## 3. Arquitectura recomendada

Explica como encaja la fase.

## 4. Tecnologias usadas

Lista herramientas reales.

## 5. Que se construye

Describe modulos, archivos y configuraciones.

## 6. Estructura de carpetas

Muestra la estructura esperada.

## 7. Archivos creados o modificados

Lista rutas exactas.

## 8. Codigo completo

Entrega codigo completo cuando se creen o reemplacen archivos.

## 9. Implementacion local en macOS con Homebrew

Da comandos exactos con ruta.

## 10. Verificacion

Explica como comprobar que funciona.

## 11. Errores comunes y solucion

Incluye errores realistas.

## 12. Seguridad

Explica riesgos y mitigaciones.

## 13. Rendimiento

Explica consideraciones de performance.

## 14. Escalabilidad

Explica como soporta crecimiento.

## 15. Commit recomendado

Sugiere mensaje profesional.

## 16. Checklist final

Lista requisitos antes de avanzar.

---

# 10. ROADMAP POR FASES

## FASE 0 — Auditoria y plan de migracion sin Payload

Objetivo:

Entender todas las dependencias actuales de Payload y preparar la migracion.

Debe incluir:

- Inventario de colecciones Payload
- Inventario de globals
- Inventario de tipos usados por Astro
- Inventario de endpoints consumidos
- Inventario de campos SEO
- Inventario de leads/formularios
- Identificar archivos `web/` acoplados a Payload
- Definir contrato API nuevo
- Definir estrategia de migracion de datos

Resultado esperado:

Plan claro para crear el dashboard propio sin romper la web publica.

Entregable aplicado:

- `doc/FASE_0_AUDITORIA_MIGRACION_PAYLOAD.md`

---

## FASE 1 — Base del dashboard propio

Objetivo:

Crear `admin/` como aplicacion Next.js propia sin Payload.

Debe incluir:

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- Prettier
- Layout base
- Rutas protegidas y publicas
- Scripts raiz `dev:admin`, `build:admin`
- Variables `.env.example`
- Health check

Resultado esperado:

Dashboard propio arranca en `http://localhost:3000` sin Payload.

---

## FASE 2 — Base de datos propia y migraciones

Objetivo:

Crear el schema PostgreSQL propio.

Debe incluir:

- `packages/db`
- Drizzle ORM
- Migraciones versionadas
- Cliente PostgreSQL
- Tablas base
- Seed inicial
- Comandos `db:generate`, `db:migrate`, `db:seed`

Resultado esperado:

PostgreSQL contiene el schema propio y no depende de tablas Payload.

---

## FASE 3 — Login, register y sesiones

Objetivo:

Implementar autenticacion segura.

Debe incluir:

- Registro inicial controlado
- Login
- Logout
- Password hash con Argon2id
- Cookies httpOnly, secure y sameSite
- Sesiones persistentes
- Recuperacion o cambio de contraseña
- Rate limiting de login
- Logs de intentos fallidos
- Bloqueo temporal por abuso

Resultado esperado:

Usuarios pueden entrar al dashboard de forma segura.

---

## FASE 4 — Usuarios, roles y permisos

Objetivo:

Controlar acceso por rol.

Debe incluir:

- Crear usuarios
- Editar usuarios
- Activar/desactivar usuarios
- Asignar roles
- Permisos granulares
- Middleware de permisos
- UI de administracion
- 2FA TOTP si aplica
- Registro de actividad

Resultado esperado:

Cada usuario solo accede a lo que su rol permite.

---

## FASE 5 — Layout del dashboard y menu lateral

Objetivo:

Crear una experiencia administrativa clara.

Menu obligatorio:

- Dashboard
- Paginas
- Servicios
- Blog
- Leads
- Usuarios
- SEO
- Analytics
- Performance
- Integraciones
- Backups
- Seguridad
- Logs
- Configuracion

Debe incluir:

- Sidebar responsive
- Header
- Busqueda global futura
- Breadcrumbs
- Estados loading/error/empty
- Componentes UI base

Resultado esperado:

Dashboard navegable y preparado para modulos reales.

---

## FASE 6 — Gestion de contenido

Objetivo:

Controlar las paginas del sitio desde el dashboard.

Debe incluir:

- Crear, editar y eliminar paginas
- Editar textos
- Subir imagenes
- Cambiar banners
- Administrar secciones del home
- Publicar/despublicar paginas
- Vista previa antes de publicar
- Historial de cambios
- Control de versiones
- Estados: draft, published, scheduled, archived
- Bloques flexibles por seccion

Resultado esperado:

La web publica puede administrarse sin tocar codigo.

---

## FASE 7 — Media library propia

Objetivo:

Reemplazar Media de Payload.

Debe incluir:

- Upload a MinIO local
- Metadata en PostgreSQL
- Alt text obligatorio
- Width/height
- Mime type
- Peso del archivo
- Carpetas o tags
- Eliminacion segura
- Reemplazo de imagen
- Preparacion para R2/S3 en produccion

Resultado esperado:

Imagenes y archivos se gestionan desde el dashboard propio.

---

## FASE 8 — Gestion SEO avanzada

Objetivo:

Permitir control SEO completo por pagina, servicio, proyecto y articulo.

Debe permitir editar:

- Meta title
- Meta description
- Slug / URL
- Canonical URL
- Open Graph title
- Open Graph description
- Open Graph image
- Imagen destacada SEO
- Schema JSON-LD
- Estado indexable / no indexable
- Sitemap include/exclude
- Robots directives
- Redirecciones 301
- Pagina 404

Debe incluir:

- Validaciones de longitud
- Preview de snippet Google
- Preview Open Graph
- Deteccion de slugs duplicados
- Generacion de sitemap
- Generacion de robots.txt

Resultado esperado:

El sitio queda preparado para posicionamiento organico real.

---

## FASE 9 — API publica para Astro

Objetivo:

Reemplazar el consumo de Payload en `web/`.

Debe incluir:

- API publica read-only para contenido publicado
- API privada para preview
- Cliente nuevo en `web/src/lib/api.ts`
- Reemplazo de `web/src/lib/payload.ts`
- Reemplazo de `PayloadImage.astro`
- Reemplazo del render rich text Payload
- Tipos compartidos desde `packages/types`
- Manejo de errores y timeouts

Resultado esperado:

Astro consume el dashboard propio y ya no necesita Payload.

---

## FASE 10 — Formularios y leads

Objetivo:

Controlar los mensajes que llegan desde el sitio.

Debe incluir:

- Lista de contactos recibidos
- Nombre
- Email
- Telefono
- Mensaje
- Servicio solicitado
- Fecha
- Estado del lead
- Notas internas
- Asignar responsable
- Exportar CSV / Excel
- Enviar a CRM
- Notificaciones por email o WhatsApp

Estados:

- Nuevo
- Contactado
- En seguimiento
- Convertido
- Perdido
- Spam

Resultado esperado:

El dashboard funciona como centro de captacion comercial.

---

## FASE 11 — Blog y articulos

Objetivo:

Administrar el blog sin Payload.

Debe incluir:

- Crear articulos
- Categorias
- Etiquetas
- Autor
- Imagen destacada
- Estado borrador/publicado
- Programar publicacion
- SEO por articulo
- Articulos relacionados
- RSS
- Schema Article
- Comentarios si aplica

Resultado esperado:

Blog escalable para SEO y autoridad.

---

## FASE 12 — Dashboard con metricas

Objetivo:

Mostrar metricas comerciales y operativas.

Debe incluir:

- Visitas por dia
- Fuentes de trafico
- Google
- Redes sociales
- Anuncios
- Directo
- Paises o ciudades
- Dispositivos
- Navegadores
- Tiempo promedio en pagina
- Tasa de rebote
- Conversion de formularios
- Eventos importantes
- Leads por estado
- CTAs principales

Integraciones posibles:

- Google Analytics 4
- Google Search Console
- Google Ads
- Meta Pixel
- Microsoft Clarity
- Hotjar si aplica

Resultado esperado:

El dashboard muestra datos utiles para marketing, SEO y ventas.

---

## FASE 13 — Performance del sitio

Objetivo:

Medir velocidad y salud tecnica.

Debe medir:

- Tiempo de carga
- Core Web Vitals
- LCP
- CLS
- INP
- Peso de imagenes
- Errores de carga
- Estado del servidor
- Cache
- CDN
- Tiempo de respuesta API
- Paginas lentas

Alertas esperadas:

- La pagina `/servicios` esta cargando lento
- Imagen principal pesa demasiado
- Error 500 detectado
- Formulario de contacto fallando

Resultado esperado:

El equipo puede detectar problemas antes de que afecten conversiones.

---

## FASE 14 — Seguridad del panel

Objetivo:

Endurecer dashboard y API.

Debe incluir:

- Login seguro
- 2FA
- Logs de acceso
- Intentos fallidos
- Bloqueo de IP sospechosa
- Roles y permisos
- Sesiones activas
- Cierre de sesion remoto
- Proteccion CSRF
- Proteccion XSS
- Proteccion SQL injection
- Headers seguros
- Auditoria de acciones

Resultado esperado:

Panel listo para exposicion controlada en produccion.

---

## FASE 15 — Backups y restauracion

Objetivo:

Proteger datos y archivos.

Debe permitir:

- Crear backup manual
- Backups automaticos
- Restaurar versiones anteriores
- Descargar backup
- Ver fecha del ultimo backup
- Backup de base de datos
- Backup de archivos
- Estado del backup
- Logs de errores

Resultado esperado:

El proyecto puede recuperarse ante errores humanos o fallos tecnicos.

---

## FASE 16 — Configuracion general del sitio

Objetivo:

Administrar configuracion global desde el dashboard.

Debe permitir modificar:

- Nombre del sitio
- Logo
- Favicon
- Colores principales
- Redes sociales
- Email de contacto
- Telefono
- WhatsApp
- Direccion
- Horarios
- Scripts externos
- Cookies
- Politicas legales

Resultado esperado:

Cambios generales no requieren tocar codigo.

---

## FASE 17 — Integraciones

Objetivo:

Conectar herramientas externas.

Debe incluir configuracion para:

- Google Analytics
- Google Search Console
- Google Tag Manager
- Google Ads
- Meta Pixel
- WhatsApp Business
- Mailchimp
- HubSpot
- Stripe
- PayPal
- Zapier
- Make
- CRM personalizado
- APIs externas

Regla:

No inventar APIs. Cada integracion debe usar documentacion real, variables de entorno y manejo de errores.

Resultado esperado:

El dashboard puede conectarse con el ecosistema comercial de la agencia.

---

## FASE 18 — Notificaciones

Objetivo:

Avisar cuando ocurra algo importante.

Eventos:

- Nuevo lead recibido
- Nuevo pedido
- Error del sistema
- Pagina caida
- Backup fallido
- Intento sospechoso de login
- Pago recibido
- Formulario con error
- Baja velocidad del sitio

Canales:

- Email
- Dashboard
- WhatsApp
- Slack
- Telegram
- Push notification

Resultado esperado:

El equipo se entera rapido de eventos criticos.

---

## FASE 19 — Logs y auditoria

Objetivo:

Registrar quien hizo que.

Debe registrar:

- Usuario
- Fecha y hora
- Accion realizada
- Recurso afectado
- IP
- Navegador
- Cambios anteriores
- Cambios nuevos

Ejemplos:

- Admin modifico la pagina `/servicios` el 03/07/2026 a las 3:25 PM
- Editor publico un nuevo articulo
- Usuario intento iniciar sesion 5 veces sin exito

Resultado esperado:

El dashboard tiene trazabilidad profesional.

---

## FASE 20 — Eliminacion final de Payload

Objetivo:

Quitar Payload CMS cuando ya no se use.

Debe incluir:

- Verificar que Astro ya consume API propia
- Verificar que media ya no depende de Payload
- Verificar que rich text ya no depende de Payload
- Migrar datos finales
- Eliminar dependencias Payload
- Renombrar scripts `cms` a `admin`
- Actualizar `pnpm-workspace.yaml`
- Actualizar `.env.example`
- Actualizar README
- Eliminar archivos Payload obsoletos
- Ejecutar lint, typecheck, format y build

Resultado esperado:

El proyecto queda libre de Payload CMS.

---

## FASE 21 — Testing y CI/CD

Objetivo:

Evitar regresiones.

Debe incluir:

- Unit tests
- Integration tests
- E2E tests
- Tests de auth
- Tests de permisos
- Tests de formularios
- Tests SEO
- Tests de API publica
- Tests de backups
- GitHub Actions
- Lint
- Typecheck
- Format check
- Build

Resultado esperado:

Sistema confiable y preparado para cambios futuros.

---

## FASE 22 — Deploy produccion

Objetivo:

Publicar web y dashboard propio.

Debe incluir:

- Build de Astro
- Build de Admin Next.js
- Migraciones PostgreSQL
- Variables por entorno
- Dominio principal
- Subdominio admin
- SSL
- Cloudflare DNS
- Cloudflare WAF
- Cloudflare R2/S3
- Backups
- Logs
- Health checks
- CI/CD

Arquitectura:

```txt
Cloudflare
   ↓
Web Astro
   ↓
Admin/API Next.js
   ↓
PostgreSQL
   ↓
R2/S3
```

Resultado esperado:

Sitio y dashboard en produccion de forma estable, segura y mantenible.

---

# 11. VARIABLES DE ENTORNO RECOMENDADAS

```env
# App
NODE_ENV=development
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_API_URL=http://localhost:3000
ADMIN_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://localhost:5432/ziftlab_dev

# Auth
AUTH_SECRET=change_me_local_secret
PASSWORD_PEPPER=change_me_local_pepper
TOTP_ISSUER=ZiftLab
SESSION_COOKIE_NAME=zift_session

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=site-media
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_FORCE_PATH_STYLE=true

# Email
RESEND_API_KEY=
BREVO_API_KEY=

# Analytics
PUBLIC_GA4_ID=
PUBLIC_CLARITY_ID=
GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=
GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY=

# Integrations
GOOGLE_TAG_MANAGER_ID=
META_PIXEL_ID=
WHATSAPP_BUSINESS_TOKEN=
HUBSPOT_ACCESS_TOKEN=
MAILCHIMP_API_KEY=
STRIPE_SECRET_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
SLACK_WEBHOOK_URL=
TELEGRAM_BOT_TOKEN=
```

No usar estos valores como secretos de produccion.

---

# 12. COMANDOS BASE

```bash
# desde /zift
pnpm install
```

```bash
# desde /zift
brew services start postgresql@16
```

```bash
# desde /zift
make start
```

```bash
# desde /zift
pnpm dev:admin
```

```bash
# desde /zift
pnpm dev:web
```

```bash
# desde /zift
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

---

# 13. CRITERIOS DE CALIDAD

No se acepta una fase como terminada si:

- La web publica falla
- Hay errores TypeScript
- Hay errores lint
- El formato falla
- Hay secretos hardcodeados
- Hay endpoints sin validacion
- Login no tiene proteccion basica
- Roles no se aplican en backend
- PostgreSQL no tiene migraciones
- Media no guarda metadata
- SEO no se puede editar
- Leads no se registran
- No hay logs de acciones criticas
- No hay verificacion real

---

# 14. PROMPT PARA EMPEZAR LA MIGRACION

Usare este prompt cuando quiera iniciar:

```txt
Estamos migrando el sitio oficial de mi agencia digital para quitar Payload CMS y construir un dashboard propio.

Proyecto actual:
- Monorepo pnpm
- /web con Astro, TypeScript y Tailwind
- /cms con Payload CMS v3 sobre Next.js
- PostgreSQL local con Homebrew
- MinIO local con Homebrew
- Formularios, leads, SEO, blog, servicios y analitica ya parcialmente implementados

Nuevo objetivo:
- Mantener /web como frontend publico Astro
- Crear /admin como dashboard propio con Next.js, TypeScript, Tailwind y PostgreSQL
- Reemplazar Payload por API propia, schema propio, auth propia, roles, contenido, SEO, leads, analytics, performance, backups, integraciones, notificaciones y auditoria
- No borrar Payload hasta tener paridad funcional y migracion verificada

Implementa unicamente FASE 0 — Auditoria y plan de migracion sin Payload.

No avances a FASE 1.

Entrega obligatoriamente:
1. Analisis del problema
2. Objetivos
3. Arquitectura recomendada
4. Tecnologias usadas
5. Que se construye
6. Estructura de carpetas
7. Archivos creados o modificados
8. Codigo completo si aplica
9. Implementacion local en macOS con Homebrew
10. Verificacion
11. Errores comunes y solucion
12. Seguridad
13. Rendimiento
14. Escalabilidad
15. Commit recomendado
16. Checklist final

Reglas:
- Una fase a la vez
- No romper la web publica
- No borrar Payload todavia
- No usar Docker como requisito local
- No usar GitHub Codespaces
- No inventar librerias ni APIs
- No usar secretos reales
- Cada comando debe indicar desde que ruta se ejecuta
- Ejecutar verificacion antes de cerrar
```

---

# 15. CRITERIO FINAL DE DECISION

En cada decision tecnica, pregunta:

¿Esto hace que el dashboard sea mas seguro, claro, rapido, mantenible, escalable y util para vender mas?

Si la respuesta es no, no lo hagas.
