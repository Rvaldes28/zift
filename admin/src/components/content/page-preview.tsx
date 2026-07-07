import type { MediaAsset, PageSection } from '@ziftlab/db'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function mediaFor(data: Record<string, unknown>, media: MediaAsset[]) {
  const id = typeof data.imageId === 'string' ? data.imageId : null
  return id ? media.find((asset) => asset.id === id) : null
}

export function PagePreview({ media, sections }: { media: MediaAsset[]; sections: PageSection[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
      {sections
        .filter((section) => section.enabled && !section.deletedAt)
        .sort((a, b) => a.position - b.position)
        .map((section) => {
          const data = asRecord(section.data)
          const image = mediaFor(data, media)

          return (
            <article key={section.id} className="border-b border-[var(--line)] p-6 last:border-b-0">
              <p className="font-mono text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                {section.kind}
              </p>
              {image && (
                <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 text-sm">
                  Imagen: {image.alt || image.filename}
                </div>
              )}
              {'eyebrow' in data && (
                <p className="mt-4 font-mono text-xs tracking-[0.16em] text-[var(--muted)] uppercase">
                  {text(data.eyebrow)}
                </p>
              )}
              {'title' in data && (
                <h2 className="mt-3 text-2xl font-semibold">{text(data.title)}</h2>
              )}
              {'subtitle' in data && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  {text(data.subtitle)}
                </p>
              )}
              {'text' in data && (
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  {text(data.text)}
                </p>
              )}
              {'body' in data && (
                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                  {text(data.body)}
                </div>
              )}
              {Array.isArray(data.items) && (
                <ul className="mt-5 grid gap-3 md:grid-cols-2" role="list">
                  {data.items.map((item, index) => {
                    const record = asRecord(item)
                    return (
                      <li
                        key={index}
                        className="rounded-md border border-[var(--line)] p-3 text-sm"
                      >
                        <strong>{text(record.title) || text(record.value)}</strong>
                        <p className="mt-1 text-[var(--muted)]">
                          {text(record.text) || text(record.label)}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </article>
          )
        })}
    </section>
  )
}
