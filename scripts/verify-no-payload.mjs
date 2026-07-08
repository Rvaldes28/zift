import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const blockedPatterns = [
  /@payloadcms\//,
  /from ['"]payload['"]/,
  /import\s+type\s+.*from ['"]payload['"]/,
  /"payload"\s*:/,
  /@cms\/types/,
  /PayloadImage/,
  /PUBLIC_PAYLOAD/,
  /\bPAYLOAD_[A-Z0-9_]+/,
  /\bdev:cms\b/,
  /\bbuild:cms\b/,
]

const excludedDirs = new Set([
  '.astro',
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'doc',
  'node_modules',
])

function shouldSkip(path) {
  const normalized = path.split('/').join('/')
  return (
    normalized === 'scripts/verify-no-payload.mjs' ||
    normalized === '.env' ||
    (normalized.endsWith('/.env') && !normalized.endsWith('.env.example')) ||
    normalized.startsWith('packages/db/drizzle/') ||
    normalized.startsWith('packages/db/dist/') ||
    normalized.endsWith('.log')
  )
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (excludedDirs.has(entry)) continue
    const path = join(dir, entry)
    const rel = relative(root, path)
    if (shouldSkip(rel)) continue
    const stat = statSync(path)
    if (stat.isDirectory()) {
      walk(path, files)
    } else if (stat.isFile()) {
      files.push(path)
    }
  }
  return files
}

const failures = []

if (existsSync(join(root, 'cms'))) {
  failures.push('cms/ todavia existe en el workspace')
}

for (const file of walk(root)) {
  const rel = relative(root, file)
  const content = readFileSync(file, 'utf8')
  for (const pattern of blockedPatterns) {
    if (pattern.test(content)) {
      failures.push(`${rel}: contiene ${pattern}`)
    }
  }
}

if (failures.length > 0) {
  console.error('Verificacion anti-Payload fallida:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.info('OK: no hay dependencias, imports ni variables activas de Payload.')
