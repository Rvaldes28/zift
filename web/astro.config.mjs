// @ts-check
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

// loadEnv porque import.meta.env aún no existe al evaluar la config
const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')

// https://astro.build/config
export default defineConfig({
  // Necesario para URLs canónicas y Open Graph absolutas (componente SEO)
  site: PUBLIC_SITE_URL || 'http://localhost:4321',
  integrations: [
    // Genera /sitemap-index.xml en build; /gracias es noindex y se excluye
    sitemap({ filter: (page) => !page.includes('/gracias') }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})
