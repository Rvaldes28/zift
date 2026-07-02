import path from 'path'
import { fileURLToPath } from 'url'

import type { Payload } from 'payload'

import { lexicalParagraphs } from './lexical'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// Datos de empresa para las páginas comerciales (FASE 4). Placeholders
// realistas y editables desde /admin — FASE 16 los sustituye por contenido final.

const clients = [
  { name: 'Nimbo', file: 'logo-nimbo.svg', website: 'https://example.com', order: 1 },
  { name: 'Altura Capital', file: 'logo-altura.svg', website: 'https://example.com', order: 2 },
  { name: 'Vetta Estudio', file: 'logo-vetta.svg', website: 'https://example.com', order: 3 },
  { name: 'Kuorum Legal', file: 'logo-kuorum.svg', website: 'https://example.com', order: 4 },
  { name: 'Faro Retail', file: 'logo-faro.svg', website: 'https://example.com', order: 5 },
  { name: 'Andamio', file: 'logo-andamio.svg', website: 'https://example.com', order: 6 },
]

const testimonials = [
  {
    quote:
      'ZiftLab rehízo nuestro e-commerce y las ventas subieron 42% en el primer trimestre. La inversión se pagó sola.',
    authorName: 'Mariana Setién',
    authorRole: 'Directora de e-commerce, Faro Retail',
    clientName: 'Faro Retail',
    order: 1,
  },
  {
    quote:
      'Automatizaron nuestra operación de leads y hoy respondemos en minutos lo que antes tomaba días.',
    authorName: 'Diego Arriaga',
    authorRole: 'Socio, Kuorum Legal',
    clientName: 'Kuorum Legal',
    order: 2,
  },
  {
    quote:
      'Entienden de negocio, no solo de tecnología. Cada decisión técnica vino con un porqué comercial.',
    authorName: 'Lucía Ferrán',
    authorRole: 'CEO, Nimbo',
    clientName: 'Nimbo',
    order: 3,
  },
  {
    quote:
      'El sitio nuevo carga al instante y el equipo lo actualiza sin llamarnos a nadie. Justo lo que pedimos.',
    authorName: 'Roberto Anaya',
    authorRole: 'Director general, Vetta Estudio',
    clientName: 'Vetta Estudio',
    order: 4,
  },
]

const teamMembers = [
  {
    name: 'Ramiro Valdés',
    role: 'Fundador y dirección tecnológica',
    bio: 'Lidera la arquitectura y la entrega de cada proyecto, del kickoff al lanzamiento.',
    order: 1,
  },
  {
    name: 'Sofía Herrera',
    role: 'Diseño y experiencia',
    bio: 'Convierte objetivos de negocio en interfaces claras que convierten.',
    order: 2,
  },
  {
    name: 'Marco Juárez',
    role: 'Desarrollo',
    bio: 'Construye sistemas rápidos y mantenibles con TypeScript de punta a punta.',
    order: 3,
  },
]

const faqs = [
  {
    question: '¿Cuánto cuesta un proyecto?',
    answer:
      'Depende del alcance. Después de una asesoría gratuita te entregamos una propuesta cerrada, con precio y plazos claros, sin sorpresas.',
    order: 1,
  },
  {
    question: '¿Cuánto tarda un proyecto?',
    answer:
      'Un sitio comercial típico toma de 4 a 8 semanas. Los proyectos más grandes se entregan por fases, con avances visibles desde la primera semana.',
    order: 2,
  },
  {
    question: '¿El código y el contenido son míos?',
    answer:
      'Sí. Todo lo que construimos —código, diseño, contenido y cuentas— queda a tu nombre desde el día uno.',
    order: 3,
  },
  {
    question: '¿Cómo empezamos?',
    answer:
      'Agenda una asesoría gratuita. En una llamada de 30 minutos entendemos tu caso y te decimos si podemos ayudarte y cómo.',
    order: 4,
  },
  {
    question: '¿Qué pasa después del lanzamiento?',
    answer:
      'Ofrecemos planes de soporte y mejora continua, o te dejamos todo documentado para que tu equipo lo opere.',
    order: 5,
  },
  {
    question: '¿Puedo editar el contenido yo mismo?',
    answer:
      'Sí. Entregamos un panel de administración desde el que tu equipo edita textos, imágenes y páginas sin tocar código.',
    order: 6,
  },
  {
    question: '¿Con qué tecnologías trabajan?',
    answer:
      'Tecnología moderna y probada: Astro, Next.js, TypeScript, Payload CMS y PostgreSQL, entre otras. Elegimos según el proyecto, no al revés.',
    order: 7,
  },
  {
    question: '¿Trabajan con empresas fuera de México?',
    answer: 'Sí, trabajamos en remoto con clientes de toda Latinoamérica y España.',
    order: 8,
  },
]

// Las 4 FAQs núcleo que se relacionan a cada servicio (FASE 4)
export const coreFaqQuestions = faqs.slice(0, 4).map((faq) => faq.question)

export const seedCompany = async (payload: Payload): Promise<void> => {
  let created = 0
  let skipped = 0

  for (const client of clients) {
    const existing = await payload.find({
      collection: 'clients',
      where: { name: { equals: client.name } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }
    const logo = await payload.create({
      collection: 'media',
      data: { alt: `Logo de ${client.name}` },
      filePath: path.resolve(dirname, 'assets', client.file),
    })
    await payload.create({
      collection: 'clients',
      data: {
        name: client.name,
        logo: logo.id,
        website: client.website,
        order: client.order,
      },
    })
    created += 1
  }
  payload.logger.info(`Seed de clientes: ${created} creados, ${skipped} ya existían`)

  created = 0
  skipped = 0
  for (const testimonial of testimonials) {
    const existing = await payload.find({
      collection: 'testimonials',
      where: { authorName: { equals: testimonial.authorName } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }
    const client = await payload.find({
      collection: 'clients',
      where: { name: { equals: testimonial.clientName } },
      limit: 1,
    })
    await payload.create({
      collection: 'testimonials',
      data: {
        quote: testimonial.quote,
        authorName: testimonial.authorName,
        authorRole: testimonial.authorRole,
        client: client.docs[0]?.id ?? null,
        order: testimonial.order,
      },
    })
    created += 1
  }
  payload.logger.info(`Seed de testimonios: ${created} creados, ${skipped} ya existían`)

  created = 0
  skipped = 0
  for (const member of teamMembers) {
    const existing = await payload.find({
      collection: 'team-members',
      where: { name: { equals: member.name } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }
    await payload.create({
      collection: 'team-members',
      data: member,
    })
    created += 1
  }
  payload.logger.info(`Seed de equipo: ${created} creados, ${skipped} ya existían`)

  created = 0
  skipped = 0
  for (const faq of faqs) {
    const existing = await payload.find({
      collection: 'faqs',
      where: { question: { equals: faq.question } },
      limit: 1,
    })
    if (existing.docs.length > 0) {
      skipped += 1
      continue
    }
    await payload.create({
      collection: 'faqs',
      data: {
        question: faq.question,
        answer: lexicalParagraphs([faq.answer]),
        order: faq.order,
      },
    })
    created += 1
  }
  payload.logger.info(`Seed de FAQs: ${created} creadas, ${skipped} ya existían`)
}
