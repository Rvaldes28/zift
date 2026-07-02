// Construye estados lexical válidos a partir de texto plano — suficiente
// para contenido sembrado, editable luego en /admin

/** Bloque de contenido sembrado: encabezado h2/h3 o párrafo. */
export type LexicalBlock = { heading: string; tag?: 'h2' | 'h3' } | { paragraph: string }

const textNode = (text: string) => ({
  type: 'text',
  text,
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

const blockNode = (block: LexicalBlock) =>
  'heading' in block
    ? {
        type: 'heading',
        tag: block.tag ?? 'h2',
        version: 1,
        children: [textNode(block.heading)],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
      }
    : {
        type: 'paragraph',
        version: 1,
        children: [textNode(block.paragraph)],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        textFormat: 0,
      }

/** Documento lexical (root > heading|paragraph > text) a partir de bloques. */
export const lexicalBlocks = (blocks: LexicalBlock[]) => ({
  root: {
    type: 'root' as const,
    children: blocks.map(blockNode),
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

/** Documento lexical de solo párrafos (contenido FASE 2–5). */
export const lexicalParagraphs = (paragraphs: string[]) =>
  lexicalBlocks(paragraphs.map((paragraph) => ({ paragraph })))
