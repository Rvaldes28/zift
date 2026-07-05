import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const nextConfig: NextConfig = {
  serverExternalPackages: ['argon2', 'pg'],
  turbopack: {
    root: path.resolve(dirname, '..'),
  },
}

export default nextConfig
