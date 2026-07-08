interface RichTextNode {
  children?: RichTextNode[]
  fields?: { url?: string }
  format?: number | string | string[]
  tag?: string
  text?: string
  type?: string
  url?: string
}

const ALLOWED_TAGS = new Set([
  'a',
  'blockquote',
  'br',
  'code',
  'em',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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

function sanitizeHtml(input: string): string {
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

function paragraphize(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function hasFormat(format: RichTextNode['format'], expected: string, bit?: number): boolean {
  if (Array.isArray(format)) return format.includes(expected)
  if (typeof format === 'string') return format.split(/\s+/).includes(expected)
  if (typeof format === 'number' && bit) return Boolean(format & bit)
  return false
}

function renderChildren(node: RichTextNode): string {
  return (node.children ?? []).map(renderNode).join('')
}

function renderTextNode(node: RichTextNode): string {
  let html = escapeHtml(node.text ?? '')
  if (hasFormat(node.format, 'bold', 1)) html = `<strong>${html}</strong>`
  if (hasFormat(node.format, 'italic', 2)) html = `<em>${html}</em>`
  if (hasFormat(node.format, 'underline', 8)) html = `<u>${html}</u>`
  if (hasFormat(node.format, 'code', 16)) html = `<code>${html}</code>`
  return html
}

function renderNode(node: RichTextNode): string {
  if (typeof node.text === 'string') return renderTextNode(node)

  const children = renderChildren(node)
  switch (node.type) {
    case 'heading': {
      const tag = node.tag && /^h[1-6]$/.test(node.tag) ? node.tag : 'h2'
      return `<${tag}>${children}</${tag}>`
    }
    case 'list':
      return `<ul>${children}</ul>`
    case 'listitem':
      return `<li>${children}</li>`
    case 'quote':
      return `<blockquote>${children}</blockquote>`
    case 'link': {
      const href = node.url ?? node.fields?.url
      return href ? `<a href="${escapeHtml(href)}">${children}</a>` : children
    }
    case 'linebreak':
      return '<br />'
    case 'paragraph':
      return children.trim() ? `<p>${children}</p>` : ''
    case 'root':
      return children
    default:
      return children.trim() ? `<p>${children}</p>` : ''
  }
}

export function richTextToHtml(content: unknown): string {
  if (!content) return ''

  if (typeof content === 'string') {
    const trimmed = content.trim()
    if (!trimmed) return ''
    return /^<[\s\S]+>$/.test(trimmed) ? sanitizeHtml(trimmed) : paragraphize(trimmed)
  }

  if (typeof content !== 'object') return ''

  const record = content as Record<string, unknown>
  if (typeof record.html === 'string') return sanitizeHtml(record.html)
  if (typeof record.text === 'string') return paragraphize(record.text)
  if (typeof record.markdown === 'string') return paragraphize(record.markdown)

  const root = record.root as RichTextNode | undefined
  if (root) return sanitizeHtml(renderNode(root))

  return ''
}

export function richTextPlainText(content: unknown): string {
  if (!content) return ''
  if (typeof content === 'string') return content.replace(/<[^>]*>/g, ' ')
  if (typeof content !== 'object') return ''

  const record = content as Record<string, unknown>
  if (typeof record.text === 'string') return record.text
  if (typeof record.html === 'string') return record.html.replace(/<[^>]*>/g, ' ')

  const root = record.root as RichTextNode | undefined
  const parts: string[] = []
  const walk = (node: RichTextNode): void => {
    if (typeof node.text === 'string') parts.push(node.text)
    node.children?.forEach(walk)
  }
  if (root) walk(root)

  return parts.join(' ')
}
