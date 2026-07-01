import type { Payload } from 'payload'

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
  if (!header.navItems?.length) {
    await payload.updateGlobal({
      slug: 'header',
      data: {
        navItems: [
          { label: 'Servicios', href: '/servicios' },
          { label: 'Portafolio', href: '/portafolio' },
          { label: 'Blog', href: '/blog' },
          { label: 'Quiénes somos', href: '/quienes-somos' },
        ],
        cta: { label: 'Agenda una asesoría', href: '/contacto' },
      },
    })
    payload.logger.info('Seed: global header poblado')
  }

  const footer = await payload.findGlobal({ slug: 'footer' })
  if (!footer.columns?.length) {
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
              { label: 'Quiénes somos', href: '/quienes-somos' },
              { label: 'Portafolio', href: '/portafolio' },
              { label: 'Blog', href: '/blog' },
            ],
          },
          {
            title: 'Contacto',
            links: [
              { label: 'Agenda una asesoría', href: '/contacto' },
              { label: 'hola@ziftlab.com', href: 'mailto:hola@ziftlab.com' },
            ],
          },
        ],
        bottomText: `© ${new Date().getFullYear()} ZiftLab. Todos los derechos reservados.`,
      },
    })
    payload.logger.info('Seed: global footer poblado')
  }
}
