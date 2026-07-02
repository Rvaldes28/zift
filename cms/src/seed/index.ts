import { getPayload } from 'payload'

import config from '../payload.config'
import { seedCompany } from './company'
import { seedGlobals } from './globals'
import { lexicalParagraphs } from './lexical'
import { seedProjects } from './projects'
import { services } from './services'

// Siembra idempotente: 14 servicios mínimos (FASE 2) + globals del
// frontend (FASE 3). Correr con: pnpm seed (desde /cms). Requiere PostgreSQL.
const seed = async (): Promise<void> => {
  const payload = await getPayload({ config })

  let created = 0
  let skipped = 0

  for (const service of services) {
    const existing = await payload.find({
      collection: 'services',
      where: { slug: { equals: service.slug } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      skipped += 1
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

  payload.logger.info(`Seed de servicios: ${created} creados, ${skipped} ya existían`)

  await seedCompany(payload)
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
