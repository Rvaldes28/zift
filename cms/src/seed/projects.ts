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
