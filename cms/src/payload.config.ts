import { postgresAdapter } from '@payloadcms/db-postgres'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Services } from './collections/Services'
import { Projects } from './collections/Projects'
import { Posts } from './collections/Posts'
import { Categories } from './collections/Categories'
import { Clients } from './collections/Clients'
import { Testimonials } from './collections/Testimonials'
import { TeamMembers } from './collections/TeamMembers'
import { FAQs } from './collections/FAQs'
import { Leads } from './collections/Leads'
import { Redirects } from './collections/Redirects'
import { SiteSettings } from './globals/SiteSettings'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'
import { HomePage } from './globals/HomePage'
import { AboutPage } from './globals/AboutPage'
import { ContactPage } from './globals/ContactPage'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  cors: [process.env.WEB_URL || 'http://localhost:4321'],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Media,
    Services,
    Projects,
    Posts,
    Categories,
    Clients,
    Testimonials,
    TeamMembers,
    FAQs,
    Leads,
    Redirects,
  ],
  globals: [SiteSettings, Header, Footer, HomePage, AboutPage, ContactPage],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT || '',
        region: process.env.S3_REGION || '',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        // MinIO requiere path-style (http://host:9000/bucket/key)
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      },
    }),
    seoPlugin({
      collections: ['services', 'projects', 'posts'],
      globals: ['home-page'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => (doc?.title ? `${doc.title} | ZiftLab` : 'ZiftLab'),
      generateDescription: ({ doc }) => doc?.excerpt ?? '',
    }),
  ],
})
