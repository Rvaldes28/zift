import path from 'path'
import { fileURLToPath } from 'url'

import type { Payload } from 'payload'

import { lexicalParagraphs } from './lexical'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// 3 casos de éxito completos (FASE 5): ficha técnica, problema/solución,
// resultados medibles y testimonio relacionado. También alimentan
// «Casos destacados» del home (FASE 4).
const projects = [
  {
    title: 'Plataforma e-commerce Faro Retail',
    slug: 'faro-retail-ecommerce',
    excerpt:
      'Rediseño y migración de tienda con 12.000 SKUs: +42% de ventas y un checkout tres veces más rápido.',
    clientName: 'Faro Retail',
    industry: 'Retail y moda',
    serviceSlugs: ['e-commerce', 'marketing-digital'],
    cover: 'cover-faro.svg',
    problem:
      'Faro Retail vendía bien en tienda física pero su e-commerce no acompañaba: páginas lentas, un catálogo de 12.000 SKUs difícil de administrar y un checkout de cinco pasos donde se perdían clientes que ya habían decidido comprar.',
    solution:
      'Migramos el catálogo completo a una arquitectura headless con checkout de un solo paso, rediseñamos el flujo de compra móvil y automatizamos la recuperación de carritos abandonados por email. El equipo administra ahora productos y campañas sin tocar código.',
    stack: ['Next.js', 'Medusa.js', 'PostgreSQL', 'Redis'],
    results: [
      { value: '+42%', label: 'ventas online en el primer trimestre' },
      { value: '3×', label: 'checkout más rápido' },
      { value: '−28%', label: 'carritos abandonados' },
    ],
    testimonialAuthor: 'Mariana Setién',
    completedAt: '2025-09-12',
    paragraphs: [
      'El proyecto se entregó en diez semanas trabajando por etapas: primero el checkout (donde estaba la pérdida más cara), después el catálogo y al final la capa de marketing. Cada etapa salió a producción por separado, con métricas antes y después para validar el impacto real.',
    ],
  },
  {
    title: 'Portal de clientes Nimbo',
    slug: 'portal-clientes-nimbo',
    excerpt:
      'Portal de autoservicio que redujo 60% los tickets de soporte y digitalizó el alta de clientes.',
    clientName: 'Nimbo',
    industry: 'Logística',
    serviceSlugs: ['web-apps', 'automatizacion'],
    cover: 'cover-nimbo.svg',
    problem:
      'El equipo de soporte de Nimbo atendía por correo lo que sus clientes podían resolver solos: estado de envíos, facturas y cambios de datos. El alta de un cliente nuevo tomaba hasta cinco días de idas y vueltas en papel.',
    solution:
      'Construimos un portal de autoservicio con seguimiento de envíos en tiempo real, descarga de facturación y alta digital con validación automática de documentos, integrado con los sistemas internos que ya usaba la operación.',
    stack: ['Next.js', 'NestJS', 'PostgreSQL', 'Docker'],
    results: [
      { value: '−60%', label: 'tickets de soporte' },
      { value: '1 h', label: 'alta de cliente (antes 5 días)' },
      { value: '87%', label: 'de clientes activos en el portal' },
    ],
    testimonialAuthor: 'Lucía Ferrán',
    completedAt: '2025-06-20',
    paragraphs: [
      'La clave fue no reemplazar los sistemas internos sino conectarlos: el portal lee y escribe sobre la operación real de Nimbo, así que el equipo no mantiene datos duplicados. El soporte pasó de responder correos repetidos a atender solo los casos que de verdad necesitan a una persona.',
    ],
  },
  {
    title: 'Captación digital Kuorum Legal',
    slug: 'captacion-kuorum-legal',
    excerpt:
      'Embudo de captación con Google Ads y CRM: 3× más leads calificados con el mismo presupuesto.',
    clientName: 'Kuorum Legal',
    industry: 'Servicios legales',
    serviceSlugs: ['google-ads', 'crm'],
    cover: 'cover-kuorum.svg',
    problem:
      'Kuorum invertía en anuncios sin saber qué campañas traían clientes reales. Los leads llegaban a un buzón compartido, nadie medía el costo por caso cerrado y el presupuesto se repartía por intuición.',
    solution:
      'Rehicimos el embudo completo: una landing page por práctica legal, campañas segmentadas por intención de búsqueda y un CRM que registra cada lead desde el primer clic hasta el cierre. Hoy cada peso invertido tiene un retorno rastreable.',
    stack: ['Astro', 'Tailwind CSS', 'Google Ads', 'HubSpot'],
    results: [
      { value: '3×', label: 'leads calificados con el mismo presupuesto' },
      { value: '−37%', label: 'costo por lead' },
      { value: '100%', label: 'de leads con origen rastreado' },
    ],
    testimonialAuthor: 'Diego Arriaga',
    completedAt: '2025-03-07',
    paragraphs: [
      'El primer mes se dedicó solo a medición: instrumentar formularios, llamadas y campañas para saber de dónde venía cada caso. Con esos datos se apagaron las campañas que no cerraban y se reinvirtió en las que sí — el salto a 3× vino de ahí, no de gastar más.',
    ],
  },
]

type ProjectSeed = (typeof projects)[number]

// Campos FASE 5, resueltos contra testimonios ya sembrados (seedCompany corre
// antes). Incluye el content: la narrativa FASE 4 duplicaba problema/solución
// y aquí se reemplaza por el relato de cómo se trabajó.
const fase5Fields = async (payload: Payload, project: ProjectSeed) => {
  const testimonial = await payload.find({
    collection: 'testimonials',
    where: { authorName: { equals: project.testimonialAuthor } },
    limit: 1,
  })
  return {
    industry: project.industry,
    problem: project.problem,
    solution: project.solution,
    stack: project.stack,
    results: project.results,
    testimonial: testimonial.docs[0]?.id ?? null,
    completedAt: project.completedAt,
    content: lexicalParagraphs(project.paragraphs),
  }
}

export const seedProjects = async (payload: Payload): Promise<void> => {
  let created = 0
  let updated = 0
  let skipped = 0

  for (const project of projects) {
    const existing = await payload.find({
      collection: 'projects',
      where: { slug: { equals: project.slug } },
      limit: 1,
    })

    const doc = existing.docs[0]
    if (doc) {
      // Idempotencia por campo: completa la ficha FASE 5 solo si sigue vacía
      if (!doc.problem) {
        await payload.update({
          collection: 'projects',
          id: doc.id,
          data: await fase5Fields(payload, project),
        })
        updated += 1
      } else {
        skipped += 1
      }
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
        services: services.docs.map((serviceDoc) => serviceDoc.id),
        coverImage: cover.id,
        ...(await fase5Fields(payload, project)),
        meta: {
          title: `${project.title} | ZiftLab`,
          description: project.excerpt,
        },
        _status: 'published',
      },
    })
    created += 1
  }
  payload.logger.info(
    `Seed de proyectos: ${created} creados, ${updated} completados, ${skipped} ya al día`,
  )
}
