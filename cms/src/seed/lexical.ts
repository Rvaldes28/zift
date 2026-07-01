// Construye un estado lexical válido (root > paragraph > text) a partir de
// párrafos de texto plano — suficiente para contenido sembrado, editable luego en /admin
export const lexicalParagraphs = (paragraphs: string[]) => ({
  root: {
    type: 'root' as const,
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      version: 1,
      children: [
        {
          type: 'text',
          text,
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
          version: 1,
        },
      ],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      textFormat: 0,
    })),
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})
