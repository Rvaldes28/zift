
Plataforma inteligente para crear, gestionar y optimizar productos digitales con inteligencia artificial.

ZIFTLAB no es una agencia tradicional.
Es un sistema que combina captacion, conversion, ejecucion y seguimiento dentro de una misma experiencia.

## Vision

ZIFTLAB se posiciona como una plataforma hibrida:

- SaaS
- IA aplicada al negocio
- servicios digitales premium

La promesa central es simple:

> Construimos tu proyecto digital y te damos el control total con inteligencia artificial.

## Que estamos construyendo

El producto se compone de tres bloques principales:

### 1. Web publica

La capa de venta y posicionamiento del sistema.

Incluye:

- Home enfocada en conversion
- About
- Services
- Projects
- Blog
- Contact
- acceso a herramientas IA

### 2. Herramientas IA

La capa de captacion, educacion y preconfiguracion.

Herramientas previstas:

- AI Project Calculator
- Idea Generator
- Business Analyzer
- Service Configurator
- AI Assistant global

### 3. Dashboard del cliente

La capa de ejecucion, control y relacion post-conversion.

Incluye:

- overview del proyecto
- progreso y estado
- tareas
- archivos
- timeline
- mensajes
- pagos
- documentos
- AI insights

## Diferencial

ZIFTLAB convierte el proceso tradicional de contratar servicios digitales en una experiencia integrada:

1. el usuario descubre la plataforma
2. usa herramientas IA para entender su necesidad
3. configura o solicita su proyecto
4. recibe propuesta y se convierte en cliente
5. gestiona el avance desde un dashboard
6. recibe recomendaciones para optimizar y escalar

Esto posiciona a ZIFTLAB como:

**Agencia + SaaS + IA**

## Arquitectura objetivo

La estructura de referencia del proyecto es:

```text
ziftlab/
├── web/
├── dashboard/
├── api/
├── ai/
├── db/
├── docs/
```

Responsabilidad esperada por carpeta:

- `web/`: sitio publico, contenido, SEO, conversion y herramientas visibles
- `dashboard/`: panel del cliente y flujos autenticados
- `api/`: auth, endpoints, dominio de negocio e integraciones
- `ai/`: prompts, herramientas, orquestacion y logging IA
- `db/`: Prisma, schema, migraciones y seeds
- `docs/`: vision, prompts, roadmap y decisiones

## Stack objetivo

### Frontend

- Next.js
- React
- Tailwind CSS
- TypeScript

### Backend

- API routes o servicios HTTP
- Prisma ORM
- PostgreSQL

### Inteligencia artificial

- OpenAI API

### Infraestructura

- Vercel para aplicaciones web
- base de datos cloud
- observabilidad y seguridad desde etapas tempranas

## Roadmap por fases

### Fase 0

Setup base del proyecto y estructura monorepo.

### Fase 1

Base de datos core con entidades:

- User
- Project
- ProjectPhase
- Task
- File
- Message
- Payment
- Document
- AIRequest

### Fase 2

Autenticacion con roles:

- CLIENT
- ADMIN

### Fase 3

Sistema de proyectos con estados:

- PLANNING
- DESIGN
- DEVELOPMENT
- REVIEW
- COMPLETED

### Fase 4 a Fase 7

Dashboard, detalle de proyecto, pagos y documentos.

### Fase 8 a Fase 13

Core de IA y herramientas inteligentes del producto.

### Fase 14 a Fase 20

Web publica completa, blog, optimizacion, seguridad, responsive, testing y deploy.

## Principios del producto

- No vender servicios sueltos, vender sistema.
- No construir paginas aisladas, construir experiencia conectada.
- No usar tono generico de agencia.
- No agregar IA como adorno; debe resolver dudas, reducir friccion y generar accion.
- Cada modulo debe reforzar claridad, confianza y control.

## Principios tecnicos

- arquitectura modular
- TypeScript strict
- validacion estricta
- seguridad desde el inicio
- componentes reutilizables
- dominio bien separado
- trazabilidad para funciones IA

## Seguridad minima esperada

- rate limiting
- JWT seguro
- sanitizacion de inputs
- proteccion XSS
- proteccion CSRF cuando aplique
- manejo seguro de secretos
- no exponer datos sensibles

## Estado actual

La `Fase 0` ya quedo completada.

Hoy el repo ya tiene:

- `web/` inicializado con Next.js
- `dashboard/` inicializado con Next.js
- scripts base en raiz para desarrollo y lint
- configuracion compartida de formato
- archivo `.env.example` con criterios iniciales

## Docker

El repo ahora puede correr como stack Docker con:

- PostgreSQL
- API HTTP
- web publica
- dashboard

Comandos base:

```bash
npm run docker:up
```

```bash
npm run docker:down
```

```bash
npm run docker:logs
```

Mas detalle en [docs/DOCKER.md](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/docs/DOCKER.md).

La siguiente fase recomendada es la base de datos core.

## Comandos base

Desde la raiz del repo:

- `npm run dev:web`
- `npm run dev:dashboard`
- `npm run lint:web`
- `npm run lint:dashboard`
- `npm run format`
- `npm run format:check`

## Setup compartido

La base comun del proyecto vive en:

- [package.json](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/package.json)
- [.prettierrc.json](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/.prettierrc.json)
- [.prettierignore](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/.prettierignore)
- [.editorconfig](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/.editorconfig)
- [.env.example](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/.env.example)

La documentacion fuente de vision y roadmap vive en:

- [docs/NOTA.MD](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/docs/NOTA.MD)
- [docs/PROMT.MD](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/docs/PROMT.MD)
- [docs/FASES.MD](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/docs/FASES.MD)
- [AGENT.md](/Users/ramiro/Downloads/PROYECTOS/ZiftLab/AGENT.md)

## Regla base para construir

Antes de implementar cualquier modulo, debemos responder:

1. objetivo
2. que se construye
3. estructura
4. archivos
5. codigo completo
6. implementacion
7. verificacion

## Nota final

La meta no es lanzar una web corporativa.
La meta es construir una plataforma premium, clara, escalable y comercialmente fuerte para convertir ideas en productos digitales reales.