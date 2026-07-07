export type JsonValue =
  JsonValue[] | boolean | null | number | string | { [key: string]: JsonValue }

export type JsonRecord = Record<string, JsonValue>

export interface Media {
  id: string
  alt: string
  caption?: string | null
  filename?: string | null
  filesize?: number | null
  height?: number | null
  mimeType?: string | null
  url?: string | null
  width?: number | null
}

export type MediaRef = Media | number | string | null | undefined

export interface SeoFields {
  canonicalUrl?: string | null
  description?: string | null
  image?: MediaRef
  imageId?: string | null
  noindex?: boolean | null
  ogDescription?: string | null
  ogImage?: MediaRef
  ogImageId?: string | null
  ogTitle?: string | null
  robotsDirectives?: string[]
  schemaJsonLd?: JsonRecord | JsonRecord[] | null
  sitemapInclude?: boolean | null
  title?: string | null
}

export interface LinkItem {
  href: string
  label: string
  newTab?: boolean | null
}

export interface Cta {
  href?: string | null
  label?: string | null
  newTab?: boolean | null
}

export interface SiteSetting {
  id?: string
  siteName: string
  tagline?: string | null
  contactEmail?: string | null
  phone?: string | null
  whatsapp?: string | null
  address?: string | null
  calendlyUrl?: string | null
  defaultSeo?: {
    description?: string | null
    ogImage?: MediaRef
    title?: string | null
  } | null
  socialLinks?: {
    platform: string
    url: string
  }[]
}

export interface Header {
  id?: string
  logo?: MediaRef
  navItems?: LinkItem[]
  cta?: Cta | null
}

export interface Footer {
  id?: string
  bottomText?: string | null
  columns?: {
    title: string
    links?: LinkItem[]
  }[]
}

export interface HomePage {
  hero?: {
    eyebrow?: string | null
    primaryCta?: Cta | null
    secondaryCta?: Cta | null
    subtitle?: string | null
    title?: string | null
  } | null
  valueProposition?: { title?: string | null; text?: string | null } | null
  servicesSection?: {
    featuredServices?: (Service | string | number)[]
    subtitle?: string | null
    title?: string | null
  } | null
  projectsSection?: {
    featuredProjects?: (Project | string | number)[]
    subtitle?: string | null
    title?: string | null
  } | null
  testimonialsSection?: {
    featuredTestimonials?: (Testimonial | string | number)[]
    title?: string | null
  } | null
  clientsSection?: { title?: string | null } | null
  benefits?: {
    items?: { text?: string | null; title: string }[]
    title?: string | null
  } | null
  process?: {
    steps?: { text?: string | null; title: string }[]
    subtitle?: string | null
    title?: string | null
  } | null
  trustBlock?: {
    items?: { text?: string | null }[]
    text?: string | null
    title?: string | null
  } | null
  stats?: { label?: string | null; value?: string | null }[]
  ctaSection?: { cta?: Cta | null; text?: string | null; title?: string | null } | null
  meta?: SeoFields | null
}

export interface AboutPage {
  intro?: {
    eyebrow?: string | null
    image?: MediaRef
    text?: string | null
    title?: string | null
  } | null
  story?: unknown
  values?: { text?: string | null; title: string }[]
  teamSection?: { subtitle?: string | null; title?: string | null } | null
  ctaSection?: { cta?: Cta | null; text?: string | null; title?: string | null } | null
  meta?: SeoFields | null
}

export interface ContactPage {
  id?: string
  text?: string | null
  title?: string | null
  meta?: SeoFields | null
}

export interface Category {
  id: string
  createdAt?: string
  description?: string | null
  slug?: string | null
  title: string
  updatedAt?: string
}

export interface Tag {
  id: string
  createdAt?: string
  slug?: string | null
  title: string
  updatedAt?: string
}

export interface Faq {
  id: string
  answer?: unknown
  question: string
}

export interface Client {
  id: string
  logo?: MediaRef
  name: string
  order?: number | null
}

export interface Testimonial {
  id: string
  authorName: string
  authorRole?: string | null
  avatar?: MediaRef
  quote: string
}

export interface TeamMember {
  id: string
  bio?: string | null
  name: string
  photo?: MediaRef
  role?: string | null
}

export interface Service {
  id: string
  _status?: string | null
  benefits?: { text?: string | null; title: string }[]
  content?: unknown
  createdAt?: string
  excerpt: string
  faqs?: (Faq | string | number)[]
  features?: { text?: string | null; title?: string | null }[]
  image?: MediaRef
  meta?: SeoFields | null
  order?: number | null
  process?: { text?: string | null; title: string }[]
  relatedProjects?: (Project | string | number)[]
  slug?: string | null
  title: string
  updatedAt?: string
}

export interface Project {
  id: string
  _status?: string | null
  client?: Client | string | number | null
  completedAt?: string | null
  content?: unknown
  coverImage?: MediaRef
  createdAt?: string
  excerpt: string
  externalUrl?: string | null
  gallery?: { image?: MediaRef }[]
  industry?: string | null
  meta?: SeoFields | null
  problem?: string | null
  results?: { label?: string | null; value?: string | null }[]
  services?: (Service | string | number)[]
  slug?: string | null
  solution?: string | null
  stack?: string[]
  testimonial?: Testimonial | string | number | null
  title: string
  updatedAt?: string
}

export interface Post {
  id: string
  _status?: string | null
  author?: TeamMember | string | number | null
  categories?: (Category | string | number)[]
  content?: unknown
  coverImage?: MediaRef
  createdAt: string
  excerpt: string
  meta?: SeoFields | null
  publishedAt?: string | null
  relatedPosts?: (Post | string | number)[]
  scheduledAt?: string | null
  slug?: string | null
  tags?: (Tag | string | number)[]
  title: string
  updatedAt: string
}

export interface Landing {
  id: string
  _status?: string | null
  content?: unknown
  excerpt?: string | null
  faqs?: (Faq | string | number)[]
  meta?: SeoFields | null
  order?: number | null
  service?: Service | string | number | null
  slug?: string | null
  title: string
}

export interface Redirect {
  id: string
  from?: string
  fromPath?: string
  permanent?: boolean
  statusCode?: number
  to?: string
  toPath?: string
}

export interface Config {
  collections: {
    categories: Category
    clients: Client
    faqs: Faq
    landings: Landing
    media: Media
    posts: Post
    projects: Project
    redirects: Redirect
    services: Service
    tags: Tag
    testimonials: Testimonial
    'team-members': TeamMember
  }
  globals: {
    'about-page': AboutPage
    'contact-page': ContactPage
    footer: Footer
    header: Header
    'home-page': HomePage
    'site-settings': SiteSetting
  }
}

export type CollectionSlug = keyof Config['collections']
export type GlobalSlug = keyof Config['globals']

export interface PaginatedDocs<T> {
  docs: T[]
  hasNextPage: boolean
  hasPrevPage: boolean
  limit: number
  nextPage: number | null
  page: number
  pagingCounter: number
  prevPage: number | null
  totalDocs: number
  totalPages: number
}
