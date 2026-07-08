import 'server-only'

const ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h2',
  'h3',
  'h4',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'u',
  'ul',
])

const ALLOWED_ATTRIBUTES = new Set(['href', 'id', 'target', 'rel'])
const ALLOWED_TARGETS = new Set(['_blank', '_self', '_parent', '_top'])
const ALLOWED_REL_TOKENS = new Set(['nofollow', 'noopener', 'noreferrer', 'sponsored', 'ugc'])

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function isSafeHref(value: string): boolean {
  const href = value.trim()
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return false

  const scheme = href.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/)
  if (!scheme) return true

  return ['http:', 'https:', 'mailto:', 'tel:'].includes(`${scheme[1].toLowerCase()}:`)
}

function sanitizeRel(value: string): string | null {
  const tokens = value
    .split(/\s+/)
    .map((token) => token.toLowerCase())
    .filter((token) => ALLOWED_REL_TOKENS.has(token))

  return tokens.length > 0 ? [...new Set(tokens)].join(' ') : null
}

function sanitizeAttributes(rawAttributes: string): string {
  const attributes: string[] = []
  const attributePattern = /([a-zA-Z0-9:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(rawAttributes))) {
    const name = match[1]?.toLowerCase()
    const value = match[3] ?? match[4] ?? match[5] ?? ''
    if (!name || name.startsWith('on') || !ALLOWED_ATTRIBUTES.has(name)) continue

    if (name === 'href') {
      if (!isSafeHref(value)) continue
      attributes.push(`${name}="${escapeAttribute(value.trim())}"`)
      continue
    }

    if (name === 'target') {
      const target = value.trim().toLowerCase()
      if (!ALLOWED_TARGETS.has(target)) continue
      attributes.push(`${name}="${target}"`)
      continue
    }

    if (name === 'rel') {
      const rel = sanitizeRel(value)
      if (!rel) continue
      attributes.push(`${name}="${rel}"`)
      continue
    }

    attributes.push(`${name}="${escapeAttribute(value)}"`)
  }

  if (attributes.some((attribute) => attribute.startsWith('target='))) {
    const relIndex = attributes.findIndex((attribute) => attribute.startsWith('rel='))
    if (relIndex >= 0) {
      const currentRel = attributes[relIndex]?.match(/^rel="([^"]*)"/)?.[1] ?? ''
      const rel = sanitizeRel(`${currentRel} noopener noreferrer`) ?? 'noopener noreferrer'
      attributes[relIndex] = `rel="${rel}"`
    } else {
      attributes.push('rel="noopener noreferrer"')
    }
  }

  return attributes.length > 0 ? ` ${attributes.join(' ')}` : ''
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*\/?\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\s*\/?\s*([a-zA-Z0-9-]+)([^>]*)>/g, (full, tagName: string, attrs: string) => {
      const tag = tagName.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) return ''
      if (full.startsWith('</')) return `</${tag}>`
      if (tag === 'br' || tag === 'hr') return `<${tag}>`
      return `<${tag}${sanitizeAttributes(attrs)}>`
    })
}
