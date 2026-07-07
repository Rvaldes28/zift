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
  'ul',
])

const ALLOWED_ATTRIBUTES = new Set(['href', 'target', 'rel'])

function sanitizeAttributes(rawAttributes: string): string {
  const attributes: string[] = []
  const attributePattern = /([a-zA-Z0-9:-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match: RegExpExecArray | null

  while ((match = attributePattern.exec(rawAttributes))) {
    const name = match[1]?.toLowerCase()
    const value = match[3] ?? match[4] ?? match[5] ?? ''
    if (!name || name.startsWith('on') || !ALLOWED_ATTRIBUTES.has(name)) continue
    if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(value)) continue

    const escaped = value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    attributes.push(`${name}="${escaped}"`)
  }

  if (attributes.some((attribute) => attribute.startsWith('target='))) {
    const hasRel = attributes.some((attribute) => attribute.startsWith('rel='))
    if (!hasRel) attributes.push('rel="noopener noreferrer"')
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
