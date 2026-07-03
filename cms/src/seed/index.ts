import { getPayload } from 'payload'

import config from '../payload.config'
import { coreFaqQuestions, seedCompany } from './company'
import { seedGlobals } from './globals'
import { seedLandings } from './landings'
import { lexicalParagraphs } from './lexical'
import { seedPosts } from './posts'
import { seedProjects } from './projects'
import { serviceProcess, services } from './services'

// Siembra idempotente: 14 servicios (FASE 2 + campos FASE 4), datos de
// empresa, casos de ejemplo, blog (FASE 6), landings SEO y redirecciones
// (FASE 8) y globals del frontend.
// Correr con: pnpm seed (desde /cms). Requiere PostgreSQL y MinIO.
const seed = async (): Promise<void> => {
  const payload = await getPayload({ config })

  // FAQs primero: los servicios las relacionan
  await seedCompany(payload)

  const coreFaqs = await payload.find({
    collection: 'faqs',
    where: { question: { in: coreFaqQuestions } },
    limit: coreFaqQuestions.length,
  })
  const coreFaqIds = coreFaqs.docs.map((doc) => doc.id)

  let created = 0
  let updated = 0
  let skipped = 0

  for (const service of services) {
    const existing = await payload.find({
      collection: 'services',
      where: { slug: { equals: service.slug } },
      limit: 1,
    })

    const fase4Fields = {
      benefits: service.benefits,
      process: serviceProcess,
      faqs: coreFaqIds,
    }

    const doc = existing.docs[0]
    if (doc) {
      // Idempotencia por campo: solo completa lo que siga vacío (FASE 4)
      if (!doc.benefits?.length) {
        await payload.update({
          collection: 'services',
          id: doc.id,
          data: fase4Fields,
        })
        updated += 1
      } else {
        skipped += 1
      }
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
        ...fase4Fields,
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

  payload.logger.info(
    `Seed de servicios: ${created} creados, ${updated} completados, ${skipped} ya al día`,
  )

  await seedProjects(payload)
  await seedPosts(payload)
  await seedLandings(payload)
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
