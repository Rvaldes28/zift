interface RichTextNode {
  children?: RichTextNode[]
  fields?: { url?: string }
  format?: number | string | string[]
  tag?: string
  text?: string
  type?: string
  url?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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
    return /^<[\s\S]+>$/.test(trimmed) ? trimmed : paragraphize(trimmed)
  }

  if (typeof content !== 'object') return ''

  const record = content as Record<string, unknown>
  if (typeof record.html === 'string') return record.html
  if (typeof record.text === 'string') return paragraphize(record.text)
  if (typeof record.markdown === 'string') return paragraphize(record.markdown)

  const root = record.root as RichTextNode | undefined
  if (root) return renderNode(root)

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
