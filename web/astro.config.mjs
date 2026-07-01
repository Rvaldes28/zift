// @ts-check
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

// loadEnv porque import.meta.env aún no existe al evaluar la config
const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '')

// https://astro.build/config
export default defineConfig({
  // Necesario para URLs canónicas y Open Graph absolutas (componente SEO)
  site: PUBLIC_SITE_URL || 'http://localhost:4321',
  vite: {
    plugins: [tailwindcss()],
  },
})
