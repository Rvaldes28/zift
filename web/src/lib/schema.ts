/**
 * Builders de JSON-LD (FASE 8). Cada función devuelve el objeto schema.org
 * listo para serializar con el componente JsonLd.astro. Los datos salen del
 * CMS (site-settings y documentos); aquí no se inventa contenido.
 */
import type { Faq, SiteSetting } from '@cms/types'

import { lexicalPlainText } from './blog'

export type JsonLdObject = Record<string, unknown>

/** Un tramo de la miga: el último no lleva href (es la página actual). */
export interface BreadcrumbItem {
  /** Nombre para el schema y, salvo `label` en el componente, visible */
  name: string
  href?: string
}

const CONTEXT = 'https://schema.org'

/** @id estable de la organización — LocalBusiness y Service lo referencian. */
export function organizationId(site: URL): string {
  return new URL('/#organizacion', site).href
}

function sameAs(settings: SiteSetting): string[] {
  return (settings.socialLinks ?? []).map((link) => link.url).filter(Boolean)
}

/** Schema Organization — global del sitio, lo emite BaseLayout en cada página. */
export function organizationSchema(settings: SiteSetting, site: URL): JsonLdObject {
  const social = sameAs(settings)
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': organizationId(site),
    name: settings.siteName,
    url: site.href,
    ...(settings.contactEmail && { email: settings.contactEmail }),
    ...(settings.phone && { telephone: settings.phone }),
    ...(social.length > 0 && { sameAs: social }),
  }
}

/**
 * Schema LocalBusiness (SEO local Panamá) — solo en el home y en /contacto,
 * las páginas que Google asocia con la ficha del negocio.
 */
export function localBusinessSchema(settings: SiteSetting, site: URL): JsonLdObject {
  const social = sameAs(settings)
  return {
    '@context': CONTEXT,
    '@type': 'ProfessionalService',
    '@id': new URL('/#negocio-local', site).href,
    name: settings.siteName,
    ...(settings.tagline && { description: settings.tagline }),
    url: site.href,
    ...(settings.contactEmail && { email: settings.contactEmail }),
    ...(settings.phone && { telephone: settings.phone }),
    address: {
      '@type': 'PostalAddress',
      ...(settings.address && { streetAddress: settings.address }),
      addressLocality: 'Ciudad de Panamá',
      addressCountry: 'PA',
    },
    areaServed: 'Panamá',
    parentOrganization: { '@id': organizationId(site) },
    ...(social.length > 0 && { sameAs: social }),
  }
}

/** Schema BreadcrumbList — lo emite el componente Breadcrumbs junto a la miga visible. */
export function breadcrumbSchema(items: BreadcrumbItem[], site: URL): JsonLdObject {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.href && { item: new URL(item.href, site).href }),
    })),
  }
}

/** Schema Service — detalle de servicio y landings SEO. */
export function serviceSchema(
  options: { name: string; description: string; url: string },
  site: URL,
): JsonLdObject {
  return {
    '@context': CONTEXT,
    '@type': 'Service',
    name: options.name,
    description: options.description,
    url: options.url,
    provider: { '@id': organizationId(site) },
    areaServed: 'Panamá',
  }
}

/** Schema FAQPage a partir de las FAQs del CMS (respuestas Lexical → texto plano). */
export function faqPageSchema(faqs: Faq[]): JsonLdObject {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: lexicalPlainText(faq.answer),
      },
    })),
  }
}

/** Schema Article — posts del blog (resultados enriquecidos, FASE 6/8). */
export function articleSchema(options: {
  headline: string
  description?: string | null
  image?: string | null
  datePublished: string
  dateModified: string
  author?: { name: string; jobTitle?: string | null } | null
  publisherName: string
  canonical: string
}): JsonLdObject {
  return {
    '@context': CONTEXT,
    '@type': 'Article',
    headline: options.headline,
    ...(options.description && { description: options.description }),
    ...(options.image && { image: [options.image] }),
    datePublished: options.datePublished,
    dateModified: options.dateModified,
    ...(options.author && {
      author: [
        {
          '@type': 'Person',
          name: options.author.name,
          ...(options.author.jobTitle && { jobTitle: options.author.jobTitle }),
        },
      ],
    }),
    publisher: { '@type': 'Organization', name: options.publisherName },
    mainEntityOfPage: { '@type': 'WebPage', '@id': options.canonical },
  }
}
