import type { Payload } from 'payload'

import { lexicalParagraphs } from './lexical'

// Contenido inicial de los globals que consume el frontend (FASE 3).
// Idempotente: solo escribe si el global sigue vacío, para no pisar
// lo que ya se haya editado desde el admin.
export const seedGlobals = async (payload: Payload): Promise<void> => {
  const siteSettings = await payload.findGlobal({ slug: 'site-settings' })
  if (!siteSettings.tagline && !siteSettings.contactEmail) {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: {
        siteName: 'ZiftLab',
        tagline: 'Tecnología que vende',
        contactEmail: 'hola@ziftlab.com',
        defaultSeo: {
          title: 'ZiftLab — Agencia digital: web, automatización e IA',
          description:
            'Creamos sitios web, sistemas digitales, automatizaciones, campañas y soluciones con IA para empresas que quieren vender más, operar mejor y escalar con tecnología moderna.',
        },
      },
    })
    payload.logger.info('Seed: global site-settings poblado')
  }

  const header = await payload.findGlobal({ slug: 'header' })
  // Escribe si está vacío, si aún no enlaza el blog (FASE 6) o si el CTA
  // sigue apuntando al default de FASE 4 (la asesoría vive en /asesoria)
  const headerStale =
    !header.navItems?.some((item) => item.href === '/blog') || header.cta?.href === '/contacto'
  if (!header.navItems?.length || headerStale) {
    await payload.updateGlobal({
      slug: 'header',
      data: {
        navItems: [
          { label: 'Servicios', href: '/servicios' },
          { label: 'Portafolio', href: '/portafolio' },
          { label: 'Blog', href: '/blog' },
          { label: 'Quiénes somos', href: '/quienes-somos' },
          { label: 'Contacto', href: '/contacto' },
        ],
        cta: { label: 'Agenda una asesoría', href: '/asesoria' },
      },
    })
    payload.logger.info('Seed: global header poblado')
  }

  const footer = await payload.findGlobal({ slug: 'footer' })
  const footerLinks = footer.columns?.flatMap((column) => column.links ?? []) ?? []
  // Escribe si está vacío o si falta alguna sección ya construida
  const footerStale =
    !footerLinks.some((link) => link.href === '/blog') ||
    !footerLinks.some((link) => link.href === '/portafolio') ||
    !footerLinks.some((link) => link.href === '/cotizacion')
  if (!footer.columns?.length || footerStale) {
    await payload.updateGlobal({
      slug: 'footer',
      data: {
        columns: [
          {
            title: 'Servicios',
            links: [
              { label: 'Desarrollo web', href: '/servicios/desarrollo-web' },
              { label: 'E-commerce', href: '/servicios/e-commerce' },
              { label: 'Automatización', href: '/servicios/automatizacion' },
              { label: 'Inteligencia artificial', href: '/servicios/inteligencia-artificial' },
            ],
          },
          {
            title: 'Empresa',
            links: [
              { label: 'Portafolio', href: '/portafolio' },
              { label: 'Blog', href: '/blog' },
              { label: 'Quiénes somos', href: '/quienes-somos' },
            ],
          },
          {
            title: 'Contacto',
            links: [
              { label: 'Agenda una asesoría', href: '/asesoria' },
              { label: 'Pide una cotización', href: '/cotizacion' },
              { label: 'Escríbenos', href: '/contacto' },
              { label: 'hola@ziftlab.com', href: 'mailto:hola@ziftlab.com' },
            ],
          },
        ],
        bottomText: `© ${new Date().getFullYear()} ZiftLab. Todos los derechos reservados.`,
      },
    })
    payload.logger.info('Seed: global footer poblado')
  }

  const homePage = await payload.findGlobal({ slug: 'home-page', depth: 0 })
  if (!homePage.hero?.title) {
    const [featured, featuredProjects, featuredTestimonials] = await Promise.all([
      payload.find({
        collection: 'services',
        where: {
          slug: {
            in: [
              'desarrollo-web',
              'e-commerce',
              'automatizacion',
              'inteligencia-artificial',
              'google-ads',
              'crm',
            ],
          },
        },
        sort: 'order',
        limit: 6,
      }),
      payload.find({ collection: 'projects', sort: 'createdAt', limit: 3 }),
      payload.find({ collection: 'testimonials', sort: 'order', limit: 4 }),
    ])

    await payload.updateGlobal({
      slug: 'home-page',
      data: {
        hero: {
          eyebrow: 'Agencia digital',
          title: 'Tecnología moderna para empresas que quieren vender más',
          subtitle:
            'Sitios web, sistemas digitales, automatizaciones y soluciones con IA que trabajan juntos para hacer crecer tu negocio.',
          primaryCta: { label: 'Agenda una asesoría', href: '/asesoria' },
          secondaryCta: { label: 'Ver servicios', href: '/servicios' },
        },
        valueProposition: {
          title: 'Menos improvisación, más sistema',
          text: 'No vendemos horas ni piezas sueltas: diseñamos sistemas digitales completos — web, marketing, automatización e IA — que trabajan juntos para hacer crecer tu negocio.',
        },
        stats: [
          { value: '+120', label: 'proyectos entregados' },
          { value: '8', label: 'años construyendo digital' },
          { value: '14', label: 'servicios integrados' },
          { value: '92%', label: 'de clientes que repiten' },
        ],
        servicesSection: {
          title: 'Lo que construimos',
          subtitle:
            'Del sitio web al sistema completo: catorce servicios que se combinan según lo que tu negocio necesita.',
          featuredServices: featured.docs.map((doc) => doc.id),
        },
        benefits: {
          title: 'Por qué trabajar con ZiftLab',
          items: [
            {
              title: 'Un solo equipo',
              text: 'Estrategia, diseño, desarrollo y marketing bajo el mismo techo.',
            },
            {
              title: 'Enfoque comercial',
              text: 'Cada entrega se mide por su impacto en ventas, no por horas.',
            },
            {
              title: 'Tecnología moderna',
              text: 'Stack actual y probado, sin deuda técnica desde el día uno.',
            },
            {
              title: 'Precios claros',
              text: 'Propuestas cerradas por alcance, sin sorpresas en la factura.',
            },
            {
              title: 'Entregas por fases',
              text: 'Avances visibles cada semana, no un big bang al final.',
            },
            {
              title: 'Soporte real',
              text: 'Acompañamiento después del lanzamiento, con acuerdos claros.',
            },
          ],
        },
        process: {
          title: 'Cómo trabajamos',
          subtitle: 'Un método probado, el mismo en cada proyecto.',
          steps: [
            {
              title: 'Descubrimiento',
              text: 'Entendemos tu negocio, objetivos y punto de partida.',
            },
            { title: 'Propuesta', text: 'Alcance, plazos y precio claros antes de empezar.' },
            {
              title: 'Construcción',
              text: 'Ejecución por fases con entregas visibles cada semana.',
            },
            {
              title: 'Lanzamiento y mejora',
              text: 'Salida a producción, medición y optimización continua.',
            },
          ],
        },
        clientsSection: {
          title: 'Confían en nosotros',
        },
        projectsSection: {
          title: 'Casos destacados',
          subtitle: 'Resultados medibles en proyectos reales.',
          featuredProjects: featuredProjects.docs.map((doc) => doc.id),
        },
        testimonialsSection: {
          title: 'Lo que dicen nuestros clientes',
          featuredTestimonials: featuredTestimonials.docs.map((doc) => doc.id),
        },
        trustBlock: {
          title: 'Trabajar con nosotros es simple y seguro',
          text: 'Sabemos lo que es apostar el presupuesto a un proveedor. Por eso operamos con reglas claras:',
          items: [
            { text: 'Propuesta cerrada antes de empezar' },
            { text: 'Código y cuentas a tu nombre' },
            { text: 'Comunicación directa, sin intermediarios' },
            { text: 'Soporte garantizado después del lanzamiento' },
          ],
        },
        ctaSection: {
          title: '¿Listo para vender más con tecnología?',
          text: 'Agenda una asesoría gratuita de 30 minutos. Te decimos qué haríamos y cuánto costaría, sin compromiso.',
          cta: { label: 'Agenda una asesoría', href: '/asesoria' },
        },
        _status: 'published',
      },
    })
    payload.logger.info('Seed: global home-page poblado')
  }

  const aboutPage = await payload.findGlobal({ slug: 'about-page', depth: 0 })
  if (!aboutPage.intro?.title) {
    await payload.updateGlobal({
      slug: 'about-page',
      data: {
        intro: {
          eyebrow: 'Quiénes somos',
          title: 'Un equipo pequeño que construye sistemas grandes',
          text: 'Somos una agencia digital que combina ingeniería y marketing para hacer crecer negocios reales.',
        },
        story: lexicalParagraphs([
          'ZiftLab nació de una frustración: ver a empresas invertir en sitios bonitos que no venden, campañas que no se miden y sistemas que nadie sabe mantener. Decidimos hacerlo al revés — empezar por el negocio y construir la tecnología que ese negocio necesita.',
          'Hoy combinamos desarrollo, marketing, automatización e inteligencia artificial en un solo equipo. Trabajamos con pocas cuentas a la vez, con comunicación directa y entregas por fases que se pueden medir.',
        ]),
        values: [
          {
            title: 'Claridad',
            text: 'Propuestas, precios y plazos que se entienden a la primera.',
          },
          { title: 'Oficio', text: 'Tecnología moderna aplicada con criterio, no por moda.' },
          { title: 'Resultados', text: 'El trabajo se mide por su impacto comercial.' },
          { title: 'Largo plazo', text: 'Construimos relaciones y sistemas que duran.' },
        ],
        teamSection: {
          title: 'El equipo',
          subtitle: 'Las personas detrás de cada proyecto.',
        },
        ctaSection: {
          title: '¿Quieres trabajar con nosotros?',
          text: 'Cuéntanos tu proyecto y te respondemos en menos de 24 horas.',
          cta: { label: 'Agenda una asesoría', href: '/asesoria' },
        },
        _status: 'published',
      },
    })
    payload.logger.info('Seed: global about-page poblado')
  }

  const contactPage = await payload.findGlobal({ slug: 'contact-page', depth: 0 })
  if (!contactPage.title) {
    await payload.updateGlobal({
      slug: 'contact-page',
      data: {
        title: 'Hablemos de tu proyecto',
        text: 'Cuéntanos qué necesitas y te respondemos en menos de 24 horas hábiles con próximos pasos claros.',
        _status: 'published',
      },
    })
    payload.logger.info('Seed: global contact-page poblado')
  }
}
